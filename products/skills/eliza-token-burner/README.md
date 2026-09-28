# ElizaOS Plugin: Base L2 Token Burner ($GÜNTER Edition)

Production-ready ElizaOS Action Plugin to execute programmatic, mathematically bounded token burns on Base L2 using Coinbase Developer Platform (CDP) AgentKit MPC wallets.

## Features
- **Idempotency Guard**: Guarantees zero duplicate burns through cryptographic tx tracking.
- **Gas Spike Shield**: Auto-pauses if gas fee exceeds 5% of burn transaction value.
- **ERC-20 Safe**: Supports any Base L2 ERC-20 token address.
- **Proof-of-Burn Metadata**: Emits standardized event payload for automated social broadcasts.

## Quickstart
```typescript
import { baseTokenBurnerPlugin } from './index';
import { AgentRuntime } from '@elizaos/core';

const runtime = new AgentRuntime({
  plugins: [baseTokenBurnerPlugin],
  // ...
});
```
