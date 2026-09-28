---
name: execute-revenue-burn
description: Triggered by a Stripe webhook. Verifies state in SQLite, and calls the Web3 MCP server (via CDP) to execute the burn.
---

# Execute Revenue Burn

## Purpose
Setzt den Token-Burn auf der Base Chain um, sobald USD-Umsatz über Stripe generiert wurde.

## When to Use
Wird durch einen Stripe-Webhook (`checkout.session.completed`) aufgeweckt.

## Workflow
1. **State Check:** Prüfe in SQLite via Prisma, ob die `stripe_payment_id` den Status `burned` hat (Early Return bei True).
2. **Calculation:** Das lokale LLM (via JSON Schema) berechnet die Burn-Menge basierend auf dem Netto-Umsatz.
3. **On-Chain Execution (MCP):** Rufe den Web3-MCP-Server auf, um die Transaktion via CDP AgentKit sicher auf Base zu signieren und auszuführen.
4. **State Update:** Trage den TxHash in SQLite ein und markiere als `burned`.

## Rules
- Nutze striktes Exponential Backoff bei API/RPC-Limits.
- Breche ab, wenn Gas-Fees > 5% des Burn-Wertes betragen.

## Validation Checklist
- [ ] Stripe-Signatur wurde validiert.
- [ ] Idempotenz-Prüfung in SQLite war erfolgreich.
- [ ] Transaktion wurde über das CDP AgentKit ausgeführt (keine lokalen Keys genutzt).
- [ ] LLM-Call wurde in Langfuse getrackt.