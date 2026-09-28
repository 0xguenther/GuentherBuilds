# Project Memory (Append-Only)

- **[2026-09-28]** Initialisierung der Architektur. Setup von Günther als ElizaOS-Agent auf Proxmox Intel NUC.
- **[2026-09-28]** Core-Produktportfolio definiert: Günther Craft (PDF), Claw Mart, Clawcommerce, $GÜNTER Token.
- **[2026-09-28]** Architektur-Upgrade (State & Events): Migration auf Event-driven Webhooks. SQLite via Prisma für Idempotenz integriert. Exponential Backoff für APIs etabliert.
- **[2026-09-28]** Architektur-Upgrade (Security & Scale):
  - Wallet-Sicherheit von Raw-Keys auf CDP AgentKit (MPC) migriert.
  - Third-Party-Tools (X, Stripe, Base) in MCP-Server ausgelagert.
  - Lokales LLM-Routing strikt auf Structured Outputs (JSON) gezwungen.
  - Langfuse/Helicone für Observability und Token-Tracing integriert.
- **[2026-09-28]** Vollständige Codebasis implementiert & verifiziert (15/15 Tests passed):
  - Fastify Webhook-Server mit Signatur-Validierung und Idempotenz-Layer auf SQLite/Prisma.
  - Web3 CDP AgentKit MCP Client für Base L2 Burns inkl. 64-Bit Integritätsprüfung und Gas-Fee Guard.
  - X MCP Client mit Exponential Backoff bei HTTP 429.
  - Landingpage (`public/index.html`) & Günther Craft Playbook (`products/gunther-craft/PLAYBOOK.md`).
  - Production Multi-Stage Dockerfile & Docker Compose für Proxmox Intel NUC Deployment.