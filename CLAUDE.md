# Project Context: Günther

## Purpose
Du entwickelst und wartest die Codebasis von Günther. Fokus: Stabile ReAct-Loops, sichere Web3-Transaktionen (CDP AgentKit), saubere MCP-Integrationen und resiliente APIs.

## Tech Stack
- TypeScript (Strict Mode) & Node.js (v20+)
- Framework: ElizaOS
- Tools: Model Context Protocol (MCP)
- State: SQLite via Prisma ORM
- Blockchain: Base L2 via CDP AgentKit
- Observability: Langfuse / Helicone

## Coding Standards
- **MCP First:** Third-Party-Integrationen (Stripe, X, Base) werden als isolierte MCP-Server geschrieben, nicht als Spaghetti-Skripte im Core-Loop.
- **Structured Outputs:** Zwinge lokale Modelle beim Task-Routing strikt auf JSON-Schemas (via Ollama/vLLM). Kein Prosa-Text im ReAct-Loop.
- **Exponential Backoff:** Implementiere bei allen APIs (X, Stripe) striktes Exponential Backoff bei HTTP 429.
- **Observability:** Jeder LLM-Call muss mit Tags (Task-ID, Modell, User) an Langfuse gesendet werden.

## Security Rules
- **Wallets:** Keine Private Keys in der `.env` oder im Code. Nutze ausschliesslich das CDP AgentKit (MPC Wallets) für Token-Transaktionen.
- **Idempotenz:** Prüfe vor jeder Aktion die SQLite-Datenbank.
- **Webhook-Validierung:** Jeder Stripe-Webhook muss über die Stripe-Signatur validiert werden.

## Do Not Do
- Lass das lokalen Routing-Modell niemals freitext generieren (Bruch des ReAct-Loops).
- Schreibe keine Textblöcke im Logging.
- Nutze kein Hard-Polling für Echtzeit-Events (nutze Webhooks).