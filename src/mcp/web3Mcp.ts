import {
  BaseError,
  HttpRequestError,
  RpcRequestError,
  concatHex,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  fallback,
  http,
  keccak256,
  stringToHex,
  formatEther,
  type Hash,
  type Hex,
  type Address,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { config } from '../config/index.js';

export interface BurnTokenParams {
  amount: bigint;
  referenceId: string;
}

/** Broadcast erfolgreich, Bestätigung ausstehend. Der Hash darf nicht verloren gehen. */
export class BurnPendingError extends Error {
  constructor(public readonly txHash: string) {
    super('Burn broadcast, receipt pending: ' + txHash);
    this.name = 'BurnPendingError';
  }
}

export interface BurnTokenResult {
  txHash: string;
  blockNumber?: number;
  gasUsed?: bigint;
}

/** Keyless public Base RPCs, used after BASE_RPC_URL when it is rate-limited (-32016/429) or down. */
const PUBLIC_RPCS = {
  mainnet: ['https://mainnet.base.org', 'https://base-rpc.publicnode.com', 'https://base.drpc.org', 'https://1rpc.io/base'],
  sepolia: ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com'],
} as const;

/** BASE_RPC_URL (comma-separated list allowed) first, then the public endpoints, without duplicates. */
export function resolveRpcUrls(isMainnet: boolean, configured: string): string[] {
  const own = configured.split(',').map((u) => u.trim()).filter(Boolean);
  return [...new Set([...own, ...(isMainnet ? PUBLIC_RPCS.mainnet : PUBLIC_RPCS.sepolia)])];
}

// Safe for broadcasts: the burn is signed once, so a re-broadcast via the next RPC carries the same hash.
function buildTransport(isMainnet: boolean) {
  return fallback(resolveRpcUrls(isMainnet, config.web3.rpcUrl).map((url) => http(url, { retryCount: 2 })));
}

/** The node explicitly refused the request (JSON-RPC error or HTTP 429): the tx was not accepted. */
function isDefiniteRejection(err: unknown): boolean {
  if (!(err instanceof BaseError)) return false;
  return Boolean(err.walk((e) => e instanceof RpcRequestError || (e instanceof HttpRequestError && e.status === 429)));
}

const erc20TransferAbi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export class Web3McpClient {
  /**
   * Exponential backoff retry helper
   */
  private static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelayMs = 1000
  ): Promise<T> {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: unknown) {
        // Pending-Burn NICHT erneut senden: die Transaktion liegt bereits auf der Chain.
        if (err instanceof BurnPendingError) throw err;
        if (attempt === maxRetries) throw err;
        console.warn(`[Web3Mcp] Attempt ${attempt} failed: ${(err instanceof Error ? err.message : 'Unknown error')}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Checks whether the client should operate in live on-chain mode or simulation mode.
   */
  private static isLiveMode(): boolean {
    const isTestEnv = process.env.NODE_ENV === 'test' || config.server.env === 'test';
    const isSimulationNetwork = config.web3.networkId === 'simulation';
    const hasValidKey =
      Boolean(config.web3.walletPrivateKey) &&
      config.web3.walletPrivateKey.startsWith('0x') &&
      config.web3.walletPrivateKey.length === 66;

    return !isTestEnv && !isSimulationNetwork && hasValidKey;
  }

  /**
   * Executes a token burn on Base L2 using native viem signer or simulated fallback.
   * Embeds cryptographic referenceId into on-chain calldata for immutable proof of burn.
   */
  /** Prüft den Status eines bereits gesendeten Burns auf der Chain. */
  static async getReceiptStatus(txHash: string): Promise<'success' | 'reverted' | 'pending'> {
    if (!this.isLiveMode()) return 'success';
    const isMainnet = config.web3.networkId === 'base' || config.web3.networkId.includes('mainnet');
    const chain = isMainnet ? base : baseSepolia;
    const publicClient = createPublicClient({ chain, transport: buildTransport(isMainnet) });
    try {
      const r = await publicClient.getTransactionReceipt({ hash: txHash as Hash });
      return r.status === 'reverted' ? 'reverted' : 'success';
    } catch {
      return 'pending';
    }
  }

  static async burnTokens(params: BurnTokenParams): Promise<BurnTokenResult> {
    // 1. Simulation fallback for tests, local dev, or missing credentials
    if (!this.isLiveMode()) {
      console.log(
        `[Web3Mcp] (Simulation Mode) Executing burn of ${params.amount.toString()} $GÜNTER on ${config.web3.networkId}...`
      );
      const rawSimulated = `0xbase${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;
      return { txHash: rawSimulated.padEnd(66, '0'), blockNumber: 1234567, gasUsed: 21000n };
    }

    // 2. Live On-Chain Execution on Base L2
    const isMainnet = config.web3.networkId === 'base' || config.web3.networkId.includes('mainnet');
    const chain: Chain = isMainnet ? base : baseSepolia;
    const account = privateKeyToAccount(config.web3.walletPrivateKey);
    const transport = buildTransport(isMainnet);
    const publicClient = createPublicClient({ chain, transport });
    const walletClient = createWalletClient({ account, chain, transport });

    const hasCustomToken =
      config.web3.gunterTokenAddress &&
      config.web3.gunterTokenAddress !== '0x0000000000000000000000000000000000000000';
    const destination = config.web3.burnDestinationAddress as Address;
    // Proof-of-burn reference: appended to the ERC-20 calldata (ignored by the ABI decoder) or sent as calldata.
    const reference = stringToHex(`GUNTER_BURN:${params.referenceId}:${params.amount.toString()}`);
    const to = hasCustomToken ? (config.web3.gunterTokenAddress as Address) : destination;
    const data = hasCustomToken
      ? concatHex([encodeFunctionData({ abi: erc20TransferAbi, functionName: 'transfer', args: [destination, params.amount] }), reference])
      : reference;

    // Signed exactly once: retries only re-broadcast the identical raw transaction (same nonce),
    // so a lost or rate-limited RPC response can never produce a second burn.
    let signed: { raw: Hex; hash: Hash } | undefined;
    let broadcastAttempted = false;

    const attempt = async (): Promise<BurnTokenResult> => {
      if (!signed) {
        console.log(`[Web3Mcp] Executing live on-chain burn on Base (${chain.name}) from ${account.address}...`);
        const balance = await publicClient.getBalance({ address: account.address });
        if (balance === 0n) {
          throw new Error(`Insufficient ETH balance on ${account.address} (${formatEther(balance)} ETH). Cannot pay gas fees.`);
        }
        const request = await walletClient.prepareTransactionRequest({ to, data, value: 0n });
        if (request.maxFeePerGas && request.maxFeePerGas > 100n * 10n ** 9n) {
          console.warn(`[Web3Mcp] Gas price unusually high: ${request.maxFeePerGas.toString()} wei. Proceeding with caution.`);
        }
        const raw = await walletClient.signTransaction(request);
        signed = { raw, hash: keccak256(raw) };
        console.log(`[Web3Mcp] Signed burn ${signed.hash} (nonce ${request.nonce}, ${params.amount.toString()} units -> ${destination}).`);
      }

      broadcastAttempted = true;
      try {
        await publicClient.sendRawTransaction({ serializedTransaction: signed.raw });
      } catch (err) {
        // Identical transaction already in the mempool or mined: the broadcast is done.
        const msg = err instanceof Error ? err.message : String(err);
        if (!/already known|known transaction|already imported|nonce too low/i.test(msg)) throw err;
      }

      console.log(`[Web3Mcp] Transaction broadcasted. Waiting for confirmation: ${signed.hash}...`);
      let receipt;
      try {
        receipt = await publicClient.waitForTransactionReceipt({ hash: signed.hash, timeout: 30_000 });
      } catch {
        throw new BurnPendingError(signed.hash);
      }
      if (receipt.status === 'reverted') {
        throw new Error(`Transaction reverted on Base L2: ${signed.hash}`);
      }
      console.log(
        `[Web3Mcp] ✓ Live Base L2 burn confirmed in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed}. Tx: ${signed.hash}`
      );
      return { txHash: signed.hash, blockNumber: Number(receipt.blockNumber), gasUsed: receipt.gasUsed };
    };

    try {
      return await this.retryWithBackoff(attempt);
    } catch (err) {
      // Broadcast outcome unknown (network error/timeout): the tx may be on chain.
      // Keep the hash so the payment stays 'burning' and is only confirmed, never re-burned.
      if (signed && broadcastAttempted && !(err instanceof BurnPendingError) && !isDefiniteRejection(err)) {
        throw new BurnPendingError(signed.hash);
      }
      throw err;
    }
  }
}
