# Fastify Stripe Webhook MCP Gateway

Production-hardened Fastify webhook gateway with Model Context Protocol (MCP) tool exposure for Stripe payments.

## Features
- **Raw-Body HMAC-SHA256 Verification**: Preserves raw request payload buffers to prevent signature forgery attacks.
- **Idempotency Deduplication**: Out-of-the-box Redis/SQLite idempotency guard.
- **MCP Tool Protocol**: Exposes tools `stripe_create_checkout`, `stripe_list_transactions`, and `stripe_refund_payment`.
