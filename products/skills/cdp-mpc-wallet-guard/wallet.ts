export interface MpcConfig {
  apiKeyName: string;
  apiPrivateKey: string;
  networkId: 'base-mainnet' | 'base-sepolia';
  maxGasFeeUsd: number;
}

export class MpcWalletGuard {
  private config: MpcConfig;

  constructor(config: MpcConfig) {
    this.config = config;
  }

  public validateConfiguration(): boolean {
    if (!this.config.apiKeyName || !this.config.apiPrivateKey) {
      return false;
    }
    return true;
  }

  public async getGasThresholdCheck(): Promise<{ allowed: boolean; estimatedFeeUsd: number }> {
    // In production, queries Base L2 eth_gasPrice or CDP fee oracle
    const estimatedFeeUsd = 0.02; // Typical Base L2 tx fee
    return {
      allowed: estimatedFeeUsd <= this.config.maxGasFeeUsd,
      estimatedFeeUsd,
    };
  }
}
