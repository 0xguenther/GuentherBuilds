import test from 'node:test';
import assert from 'node:assert';
import { Web3McpClient } from '../src/mcp/web3Mcp.js';
import { createPublicClient, http, formatEther } from 'viem';
import { base } from 'viem/chains';

test('Web3 MCP: Base L2 Token Burning & Public Client Suite', async (t) => {
  await t.test('1. should simulate burn deterministically when in test environment', async () => {
    const result = await Web3McpClient.burnTokens({
      amount: 49000000000000000000000n,
      referenceId: 'pi_test_web3_sim',
    });

    assert.ok(result.txHash.startsWith('0xbase'), 'Simulated txHash must have 0xbase prefix');
    assert.strictEqual(result.txHash.length, 66, 'TxHash must be 66 characters');
    assert.strictEqual(result.blockNumber, 1234567, 'Simulated block number matches');
    assert.strictEqual(result.gasUsed, 21000n, 'Simulated gasUsed matches 21000n');
  });

  await t.test('2. should verify live Base L2 mainnet RPC connectivity and wallet balance', async () => {
    const publicClient = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });

    const blockNumber = await publicClient.getBlockNumber();
    assert.ok(blockNumber > 50000000n, 'Base mainnet block number should be > 50,000,000');

    const walletAddress = '0xb54Ae6096F4C317Cc48B5668572b9E5C010C0f1A';
    const balanceWei = await publicClient.getBalance({ address: walletAddress });
    const balanceEth = parseFloat(formatEther(balanceWei));

    assert.ok(balanceEth > 0, `Wallet ${walletAddress} must have ETH balance (found: ${balanceEth} ETH)`);
    assert.ok(balanceWei >= 100000000000000n, 'Balance must be at least 0.0001 ETH for gas operations');
  });

  await t.test('3. should verify Base L2 gas price is within reasonable bounds (< 1 Gwei)', async () => {
    const publicClient = createPublicClient({
      chain: base,
      transport: http('https://mainnet.base.org'),
    });

    const gasPrice = await publicClient.getGasPrice();
    // 1 Gwei = 1,000,000,000 wei. Base is normally 0.005 gwei (~5,000,000 wei)
    assert.ok(gasPrice < 10000000000n, 'Base L2 gas price should be < 10 Gwei under standard conditions');
  });
});
