# Agent Trace Pack — Observability for LLM Agent Tool Calls

**Version 1.0 · USD 39 · Instant download · No subscription**

Templates and conventions so you can *see* what your agent does when tool
calls fail, retry, or return after a timeout. This is documentation and
copy-paste schemas — not a hosted service, not an SDK, not an audit.

---

## Who this is for

You ship an agent that writes: Stripe charges, invoices, emails, tickets,
SQL. When a tool call times out you currently guess whether the write
happened. You want Langfuse or OpenTelemetry spans that answer that
question later.

## What you get

| File | Purpose |
|---|---|
| `trace-schema.md` | Span hierarchy, attribute names, events. Drop-in naming convention. |
| `checklist.md` | 12 acceptance criteria to review your instrumentation before production. |
| `queries.sql` | Queries for retry storms, ghost writes, p95 tool latency. |
| `examples/agent-run-trace.json` | One complete, realistic agent run (success + timeout + retry). |
| `examples/idempotency-key.md` | How to derive write keys so retries are safe. |
| `examples/otel-collector.yaml` | Minimal collector config excerpt (OTEL → your backend). |
| `LICENSE.md` | What you may and may not do with these files. |

## What this is **not**

- Not an APM product. You still run Langfuse / Honeycomb / Jaeger / etc.
- Not the Agent Write-Path Check ($90+). That one *tests* your agent with
  failure injection. This pack only helps you *observe* it.
- Not legal, security or compliance advice.
- Not a guarantee that your agent will be correct after using it.

If you need someone to test your tool schema against 10 failure modes,
buy the Write-Path Audit on 0xguenther.org. This pack is the instrumentation
layer underneath that.

## Quick start (15 minutes)

1. Read `trace-schema.md` (5 min).
2. Copy the span/attribute names into your tracer (Langfuse, OTEL SDK, or
   a structured logger). Keep the names exactly — the queries assume them.
3. Instrument one write tool call end-to-end using
   `examples/agent-run-trace.json` as the target shape.
4. Walk `checklist.md`. Fix gaps before the next release.
5. Point `queries.sql` at your trace store and schedule a daily look at
   `duplicate_risk`.

## Design rules baked into the schema

1. **One span per network boundary.** LLM call and each tool call are separate.
2. **Timeout is not error.** `tool.outcome=timeout` means "we do not know".
3. **Never log payloads or secrets.** Use `payload_hash` (sha256).
4. **Writes carry an idempotency key.** Retries reuse it.
5. **Readback after ambiguous write.** Emit `write.verified` when you check.

## Support

Issues with these files: open a ticket on
[github.com/0xguenther/agent-write-path-runs](https://github.com/0xguenther/agent-write-path-runs)
or write to the contact on 0xguenther.org. Digital good: once downloaded,
no refund (Swiss distance-selling rules for digital content apply). If a
file is corrupt or missing, you get a replacement.

## Licence

See `LICENSE.md`. Short version: use it in your own projects, including
commercial ones; do not resell the pack itself.
