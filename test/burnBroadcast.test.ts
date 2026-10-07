import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpRequestError, RpcRequestError, keccak256, stringToHex, type Hex } from 'viem';

// Regression: burnTokens used to retry the whole sign+send sequence. A lost or rate-limited RPC
// response after a successful broadcast re-sent the transfer with a new nonce (= double burn).
const fakes = vi.hoisted(() => ({ public: {} as Record<string, unknown>, wallet: {} as Record<string, unknown> }));

vi.mock('viem', async (orig) => ({
  ...(await orig<typeof import('viem')>()),
  createPublicClient: () => fakes.public,
  createWalletClient: () => fakes.wallet,
}));

vi.mock('../src/config/index.js', () => ({
  config: {
    server: { env: 'production' },
    web3: {
      networkId: 'base',
      rpcUrl: 'http://rpc.invalid',
      walletPrivateKey: `0x${'11'.repeat(32)}`,
      gunterTokenAddress: '0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24',
      burnDestinationAddress: '0x000000000000000000000000000000000000dEaD',
    },
  },
}));

const { Web3McpClient, BurnPendingError } = await import('../src/mcp/web3Mcp.js');

const RAW: Hex = '0x02f8b1';
const networkError = () => new HttpRequestError({ url: 'http://rpc.invalid', details: 'fetch failed' });
const rateLimited = () =>
  new RpcRequestError({ body: {}, error: { code: -32016, message: 'over rate limit' }, url: 'http://rpc.invalid' });

describe('Web3McpClient.burnTokens broadcast idempotency', () => {
  let sign: ReturnType<typeof vi.fn>;
  let prepare: ReturnType<typeof vi.fn>;
  let send: ReturnType<typeof vi.fn>;
  const nodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    prepare = vi.fn(async (req: Record<string, unknown>) => ({ ...req, nonce: 7, maxFeePerGas: 6_000_000n }));
    sign = vi.fn(async () => RAW);
    send = vi.fn();
    fakes.wallet = { prepareTransactionRequest: prepare, signTransaction: sign };
    fakes.public = {
      getBalance: vi.fn(async () => 10n ** 15n),
      sendRawTransaction: send,
      waitForTransactionReceipt: vi.fn(async () => ({ status: 'success', blockNumber: 52_300_000n, gasUsed: 52_000n })),
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('re-broadcasts the identical signed tx after a lost response and confirms it', async () => {
    send.mockRejectedValueOnce(networkError()).mockRejectedValueOnce(new Error('already known'));

    const result = await Web3McpClient.burnTokens({ amount: 490n * 10n ** 18n, referenceId: 'pi_test' });

    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls.every(([arg]) => arg.serializedTransaction === RAW)).toBe(true);
    expect(result.txHash).toBe(keccak256(RAW));
  });

  it('keeps the hash (pending) when the broadcast outcome stays unknown', async () => {
    send.mockRejectedValue(networkError());

    const err = await Web3McpClient.burnTokens({ amount: 1n, referenceId: 'pi_unknown' }).catch((e) => e);

    expect(err).toBeInstanceOf(BurnPendingError);
    expect(err.txHash).toBe(keccak256(RAW));
    expect(sign).toHaveBeenCalledTimes(1);
  });

  it('fails cleanly (no pending hash) when the node explicitly rejects every broadcast', async () => {
    send.mockRejectedValue(rateLimited());

    const err = await Web3McpClient.burnTokens({ amount: 1n, referenceId: 'pi_rejected' }).catch((e) => e);

    expect(err).not.toBeInstanceOf(BurnPendingError);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('sends an ERC-20 transfer to the dead address with the payment reference appended', async () => {
    send.mockResolvedValue(keccak256(RAW));

    await Web3McpClient.burnTokens({ amount: 490n, referenceId: 'pi_ref' });

    const { to, data } = prepare.mock.calls[0][0] as { to: string; data: Hex };
    expect(to).toBe('0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24');
    expect(data.startsWith('0xa9059cbb000000000000000000000000000000000000000000000000000000000000dead')).toBe(true);
    expect(data.endsWith(stringToHex('GUNTER_BURN:pi_ref:490').slice(2))).toBe(true);
  });
});
