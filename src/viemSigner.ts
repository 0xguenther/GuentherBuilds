import { createWalletClient, http, stringToHex, parseGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

export class BaseSigner {
  /**
   * Executes a verifiable on-chain audit trail transaction on Base L2.
   * Embeds custom calldata without exposing private keys.
   */
  static async executeProofOfBurn(paymentId: string, amountCents: number): Promise<string> {
    const privateKey = (process.env.BASE_WALLET_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`;
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    const burnAddress = (process.env.BURN_DESTINATION_ADDRESS || '0x000000000000000000000000000000000000dEaD') as `0x${string}`;

    if (privateKey.startsWith('0x0000')) {
      console.log(`[BaseSigner] (Simulated Mode) Burning tokens for ${paymentId} on Base L2...`);
      return `0xbase_simulated_${Date.now()}`;
    }

    const account = privateKeyToAccount(privateKey);
    const wallet = createWalletClient({
      account,
      chain: base,
      transport: http(rpcUrl),
    });

    const calldata = stringToHex(`GUNTER_BURN:${paymentId}:${amountCents}`);

    const txHash = await wallet.sendTransaction({
      to: burnAddress,
      value: 0n,
      data: calldata,
      maxFeePerGas: parseGwei('0.1'), // Safe gas bound
    });

    return txHash;
  }
}
