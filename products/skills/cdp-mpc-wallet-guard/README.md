# CDP MPC Wallet Guard for Autonomous AI Agents

Secure Multi-Party Computation (MPC) wallet manager for autonomous agents running on Base L2 via Coinbase Developer Platform (CDP).

## Security Guarantee
- **Zero Plaintext Private Keys**: No seed phrases or raw private keys in `.env`, SQLite, or memory dumps.
- **Gas Spike Circuit Breaker**: Aborts transactions if base fee exceeds configurable ceiling.
- **Dynamic Session Restorations**: Restores MPC seed securely via CDP cloud vault.
