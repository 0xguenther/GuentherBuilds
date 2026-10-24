# Project Context: Günther

## Purpose
Entwicklung und Wartung der Produktiv-Codebasis von Günther (0xGünther). Fokus: Deterministischer Fastify-Core-Server, vollautomatisches Fulfillment des Agent Write-Path Checks ($90 / $290 / $690 USD), autonome Multi-Channel-Distribution (Hacker News, Reddit, X) und verifizierte Base L2 Token-Burns ($GUNTER).

## Tech Stack
- **Runtime:** Node.js 22 LTS, TypeScript 5.7 (Strict Mode)
- **Web Framework:** Fastify v5 (`@fastify/cors`, `@fastify/static`, `fastify-raw-body`)
- **State & Persistenz:** SQLite via Prisma ORM mit strikten Compare-and-Swap (CAS) Statusübergängen
- **Blockchain Engine:** `viem` v2 auf Base Mainnet (ERC-20 $GUNTER Contract: `0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24`)
- **Distribution:** VM100 Browser-Poster (`10.0.1.233:9333`, Brave CDP Port 9222) für Reddit & Hacker News; X API v2 (@GuentherBuilds)
- **Test Suite:** Vitest v5 (154 Tests in 22 Suiten)
- **Observability:** Langfuse TraceService mit Tagging; Uptime Kuma Heartbeat

## Coding Standards & Architectural Rules
- **State-Safety (Atomic CAS):** Statuswechsel (z.B. `pending` → `paid` → `running` → `delivered`) müssen immer über atomare CAS-Prüfungen in der Datenbank erfolgen. Race Conditions und Doppelbuchungen sind strikt ausgeschlossen.
- **E2E Test Guard:** Alle Test- und E2E-Skripte importieren zuerst [`test/e2eGuard.ts`](file:///C:/ClaudeProjects/günther/test/e2eGuard.ts). Tests dürfen unter keinen Umständen die Produktions-Datenbank berühren oder verändern.
- **Zod Schema Validierung:** Sämtliche API-Eingaben (z.B. `/api/audit/orders`) werden client- und serverseitig strikt über Zod validiert.
- **Idempotenter Web3-Signer:** Transaktionen werden vor dem Broadcast signiert. Bei Timeouts oder RPC-Fehlern wird dieselbe signierte Transaktion mit identischem Nonce erneut gesendet.
- **Resiliente APIs & Retries:** Verwendung von `executeWithRetry` und `fetchWithRetry` für alle externen Aufrufe mit Exponential Backoff bei HTTP 429 und 5xx.

## Deployment & Verification
- **Test-Befehl:** `npm test` (muss immer 154/154 grün sein)
- **Build-Befehl:** `npm run build`
- **Proxmox Deployment:** `pwsh scripts/deploy-to-proxmox.ps1` (führt atomares Packen, SCP-Transfer auf CT 115 und `systemctl restart gunther-core` aus).
- **Keine Secrets im Git:** Private Keys, API-Tokens und Passwörter verbleiben ausschließlich in `.env` (Tresor-Eintrag `Projects/Gunther` in KeePassXC).