import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Regression: a single public RPC (mainnet.base.org) answered -32016 "over rate limit" and stalled
// burns. The transport must fall through to the next endpoint instead of failing.
const cfg = vi.hoisted(() => ({
  config: {
    server: { env: 'production' },
    web3: {
      networkId: 'base',
      rpcUrl: '',
      walletPrivateKey: `0x${'11'.repeat(32)}`,
      gunterTokenAddress: '0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24',
      burnDestinationAddress: '0x000000000000000000000000000000000000dEaD',
    },
  },
}));
vi.mock('../src/config/index.js', () => cfg);

const { Web3McpClient, resolveRpcUrls } = await import('../src/mcp/web3Mcp.js');

const TX = `0x${'ab'.repeat(32)}`;
const receipt = {
  blockHash: `0x${'cd'.repeat(32)}`,
  blockNumber: '0x31dd0c9',
  contractAddress: null,
  cumulativeGasUsed: '0xcb20',
  effectiveGasPrice: '0x5b8d80',
  from: '0x19e7e376e7c213b7e7e7e46cc70a5dd086daff2a',
  gasUsed: '0xcb20',
  logs: [],
  logsBloom: `0x${'00'.repeat(256)}`,
  status: '0x0',
  to: '0xb0e8a9d8b5542fc907736d19a018bbe131c8cd24',
  transactionHash: TX,
  transactionIndex: '0x1',
  type: '0x2',
};

function rpcServer(reply: (id: unknown) => unknown, hits: string[], name: string): Promise<Server> {
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const msg = JSON.parse(body) as { id: unknown; method: string };
      hits.push(`${name}:${msg.method}`);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(reply(msg.id)));
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}
const urlOf = (s: Server) => `http://127.0.0.1:${(s.address() as AddressInfo).port}`;

describe('resolveRpcUrls', () => {
  it('puts BASE_RPC_URL entries first, then keyless public endpoints, deduplicated', () => {
    expect(resolveRpcUrls(true, ' https://a.example , https://mainnet.base.org,')).toEqual([
      'https://a.example',
      'https://mainnet.base.org',
      'https://base-rpc.publicnode.com',
      'https://base.drpc.org',
      'https://1rpc.io/base',
    ]);
    expect(resolveRpcUrls(false, '')).toEqual(['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com']);
  });
});

describe('Web3 RPC fallback transport', () => {
  const hits: string[] = [];
  const servers: Server[] = [];
  const nodeEnv = process.env.NODE_ENV;

  beforeAll(async () => {
    const limited = await rpcServer((id) => ({ jsonrpc: '2.0', id, error: { code: -32016, message: 'over rate limit' } }), hits, 'limited');
    const healthy = await rpcServer((id) => ({ jsonrpc: '2.0', id, result: receipt }), hits, 'healthy');
    servers.push(limited, healthy);
    // Both local: the public endpoints that follow are never reached, so the test stays offline.
    cfg.config.web3.rpcUrl = `${urlOf(limited)},${urlOf(healthy)}`;
  });
  afterAll(() => Promise.all(servers.map((s) => new Promise((ok) => s.close(ok)))));
  beforeEach(() => {
    hits.length = 0;
    process.env.NODE_ENV = 'production';
  });
  afterEach(() => {
    process.env.NODE_ENV = nodeEnv;
  });

  it('answers from the next RPC when the first one is rate-limited (-32016)', async () => {
    // status 0x0 -> 'reverted' is only reachable through a real receipt from the healthy node
    await expect(Web3McpClient.getReceiptStatus(TX)).resolves.toBe('reverted');
    expect(hits[0]).toBe('limited:eth_getTransactionReceipt');
    expect(hits).toContain('healthy:eth_getTransactionReceipt');
  });
});
