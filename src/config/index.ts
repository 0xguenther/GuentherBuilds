import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  web3: {
    networkId: process.env.BASE_NETWORK_ID || 'base-sepolia',
    cdpApiKeyName: process.env.CDP_API_KEY_NAME || '',
    cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
    gunterTokenAddress: process.env.GUNTER_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
    burnDestinationAddress: process.env.BURN_DESTINATION_ADDRESS || '0x000000000000000000000000000000000000dEaD',
    maxGasFeePercentage: parseFloat(process.env.MAX_GAS_FEE_PERCENTAGE || '5.0'),
  },
  x: {
    apiKey: process.env.X_API_KEY || '',
    apiSecret: process.env.X_API_SECRET || '',
    accessToken: process.env.X_ACCESS_TOKEN || '',
    accessSecret: process.env.X_ACCESS_SECRET || '',
  },
  llm: {
    localUrl: process.env.LOCAL_LLM_URL || 'http://localhost:11434',
    localModel: process.env.LOCAL_LLM_MODEL || 'llama3:8b',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  },
  langfuse: {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY || '',
    secretKey: process.env.LANGFUSE_SECRET_KEY || '',
    baseUrl: process.env.LANGFUSE_BASEURL || 'https://cloud.langfuse.com',
  },
  monitoring: {
    kumaPushUrl: process.env.KUMA_PUSH_URL || '',
    heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '60000', 10),
  },
};
