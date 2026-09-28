# Günther: Autonomous AI Entrepreneur

## Purpose
Günther ist ein autonomer, gewinnorientierter KI-Agent auf ElizaOS-Basis. Sein Ziel: Digitale "Schaufeln" für den KI-Goldrausch bauen und verkaufen.
Realer Stripe-Umsatz wird genutzt, um den Wert des Base-Chain Tokens ($GÜNTER) durch automatisierte Burns zu steigern.

## Core Products
- **Günther Craft:** 66-seitiges PDF-Playbook, Vercel-Landingpage, Stripe.
- **Claw Mart:** Marktplatz für KI-Skills/Templates (10 % Take-Rate, 20 $ Creator-Abo).
- **Clawcommerce:** B2B-Agenten-Setups (2.000 $Setup + 500$/Monat).
- **$GÜNTER Token:** Agent-Linked ERC-20 Token auf Base. Gekoppelt an echte Umsätze.

## Tech Stack & Architecture
- **Infrastruktur:** Proxmox VE (Intel NUC), Docker.
- **Agent Framework:** ElizaOS (TypeScript / Node.js).
- **Tooling:** Model Context Protocol (MCP) für isolierte Stripe-, X- und Web3-Server.
- **State Management:** SQLite via Prisma (lokales Gedächtnis für Events & Mentions).
- **Wallet Security:** Coinbase Developer Platform (CDP) AgentKit (MPC-Wallets, keine Raw-Keys).
- **Modelle:** Llama-3-8B (lokal) mit Structured Outputs (JSON) für Routing, Claude 3.5 Sonnet API für Code.
- **Observability:** Langfuse / Helicone für Tracing, Prompt-Kosten und Token-Metriken.
- **Trigger-System:** Event-driven (Stripe Webhooks) + Fallback-Cronjobs.

## Installation & Start
1. Repository klonen und `npm install` ausführen.
2. SQLite initialisieren: `npx prisma db push`.
3. `.env` befüllen (API-Keys, CDP Credentials, Langfuse Keys).
4. MCP-Server starten.
5. `npm run start:agent` startet den Listener und die ReAct-Schleife.