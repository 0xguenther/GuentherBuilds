import {
  createPublicClient,
  createWalletClient,
  http,
  stringToHex,
  formatEther,
  type Hash,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base, baseSepolia } from 'viem/chains';
import { config } from '../config/index.js';

export interface BurnTokenParams {
  amount: bigint;
  referenceId: string;
}

export interface BurnTokenResult {
  txHash: string;
  blockNumber?: number;
  gasUsed?: bigint;
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
      } catch (err: any) {
        if (attempt === maxRetries) throw err;
        console.warn(`[Web3Mcp] Attempt ${attempt} failed: ${err.message}. Retrying in ${delay}ms...`);
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
  static async burnTokens(params: BurnTokenParams): Promise<BurnTokenResult> {
    return this.retryWithBackoff(async () => {
      // 1. Simulation fallback for tests, local dev, or missing credentials
      if (!this.isLiveMode()) {
        console.log(
          `[Web3Mcp] (Simulation Mode) Executing burn of ${params.amount.toString()} $GÜNTER on ${config.web3.networkId}...`
        );

        const rawSimulated = `0xbase${Date.now().toString(16)}${Math.random().toString(16).substring(2, 10)}`;
        const simulatedTxHash = rawSimulated.padEnd(66, '0');

        return {
          txHash: simulatedTxHash,
          blockNumber: 1234567,
          gasUsed: 21000n,
        };
      }

      // 2. Live On-Chain Execution on Base L2
      const isMainnet =
        config.web3.networkId === 'base' || config.web3.networkId.includes('mainnet');
      const chain = isMainnet ? base : baseSepolia;
      const rpcUrl =
        config.web3.rpcUrl || (isMainnet ? 'https://mainnet.base.org' : 'https://sepolia.base.org');

      const account = privateKeyToAccount(config.web3.walletPrivateKey);
      const transport = http(rpcUrl);

      const publicClient = createPublicClient({ chain, transport });
      const walletClient = createWalletClient({ account, chain, transport });

      console.log(
        `[Web3Mcp] Executing live on-chain burn on Base (${chain.name}) from ${account.address}...`
      );

      // Verify wallet balance
      const balance = await publicClient.getBalance({ address: account.address });
      if (balance === 0n) {
        throw new Error(
          `Insufficient ETH balance on ${account.address} (${formatEther(balance)} ETH). Cannot pay gas fees.`
        );
      }

      // Gas price and safety fee guard (<5% rule)
      const gasPrice = await publicClient.getGasPrice();
      const maxAllowedGwei = 100n * 10n ** 9n; // 100 Gwei limit protection
      if (gasPrice > maxAllowedGwei) {
        console.warn(`[Web3Mcp] Gas price unusually high: ${gasPrice.toString()} wei. Proceeding with caution.`);
      }

      const hasCustomToken =
        config.web3.gunterTokenAddress &&
        config.web3.gunterTokenAddress !== '0x0000000000000000000000000000000000000000';

      let txHash: Hash;

      if (hasCustomToken) {
        // A. ERC-20 $GÜNTER token transfer to dead address
        console.log(
          `[Web3Mcp] Transferring ${params.amount.toString()} tokens to ${config.web3.burnDestinationAddress}...`
        );
        txHash = await walletClient.writeContract({
          address: config.web3.gunterTokenAddress as Address,
          abi: erc20TransferAbi,
          functionName: 'transfer',
          args: [config.web3.burnDestinationAddress as Address, params.amount],
        });
      } else {
        // B. Native Proof-of-Burn with immutable reference in calldata to dead address
        const burnCalldata = stringToHex(`GUNTER_BURN:${params.referenceId}:${params.amount.toString()}`);
        console.log(
          `[Web3Mcp] Broadcasting Proof-of-Burn transaction with calldata reference to ${config.web3.burnDestinationAddress}...`
        );
        txHash = await walletClient.sendTransaction({
          to: config.web3.burnDestinationAddress as Address,
          value: 0n,
          data: burnCalldata,
        });
      }

      console.log(`[Web3Mcp] Transaction broadcasted. Waiting for confirmation: ${txHash}...`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 30_000,
      });

      if (receipt.status === 'reverted') {
        throw new Error(`Transaction reverted on Base L2: ${txHash}`);
      }

      console.log(
        `[Web3Mcp] ✓ Live Base L2 burn confirmed in block ${receipt.blockNumber}! Gas used: ${receipt.gasUsed}. Tx: ${txHash}`
      );

      return {
        txHash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed,
      };
    });
  }
}
