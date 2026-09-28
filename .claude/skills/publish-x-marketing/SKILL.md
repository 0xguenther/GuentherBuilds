---
name: publish-x-marketing
description: Handle X mentions with SQLite state checks, post updates via X-MCP server, and apply exponential backoff.
---

# Publish X Marketing

## Purpose
Generiert organische Reichweite durch Transparenz und beantwortet User-Interaktionen ohne Spam-Risiko.

## When to Use
Nach einem Webhook/Trigger (neues Produkt, getätigter Burn) oder beim periodischen Abrufen neuer X-Mentions.

## Workflow
1. **Mention Check (MCP):** Rufe neue Mentions über den X-MCP-Server ab. Gleiche IDs mit der SQLite-Tabelle ab.
2. **Generation:** Claude 3.5 Sonnet verfasst kompakte Antworten im Brand-Voice.
3. **Execution & Fallback (MCP):** Sende den Tweet via X-MCP. Bei HTTP 429 greift der Exponential Backoff Mechanismus.
4. **State Update:** Markiere erfolgreich beantwortete IDs in SQLite als `replied`.

## Rules
- Niem auf dieselbe Tweet-ID zweimal antworten (Idempotenz-Check).
- Trace die generierten Tweets in Langfuse (Prompt-Kosten-Kontrolle).
- Nutze konkrete Zahlen ($2,140 Umsatz) und maximal einen Hashtag.

## Do Not Do
- Ignoriere niemals das Rate-Limit.
- Poste keinen generischen Motivations-Content.