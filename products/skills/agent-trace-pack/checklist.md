# 12-point write-path observability checklist

Print this. Walk it before every production release of an agent that
performs writes. Each item is pass/fail. All 12 must be green.

---

## Spans

**1. Every write tool call has a `tool.call` span**
Verify: trigger one write. The span appears with `tool.name` and
`tool.kind=write`. No write happens without a span.

**2. Every write carries `tool.idempotency_key`**
Verify: two retries of the same logical write show the same key value.

**3. `tool.attempt` increments and is 1-based**
Verify: a forced timeout then retry shows attempt 1 and 2, not 0 and 1.

## Outcomes

**4. Timeouts are `tool.outcome=timeout`, not `error`**
Verify: kill the network mid-call. Dashboard must separate timeout from
HTTP 500.

**5. HTTP 4xx and schema failures are `tool.outcome=error` with `tool.error_type`**
Verify: send an invalid payload. Error type is `http_4xx` or `schema`.

**6. Success is `tool.outcome=ok` only after a parseable success response**
Verify: a 200 with a broken JSON body does **not** count as `ok`.

## Retries and duplicates

**7. Retries emit `retry.scheduled` with delay and reason**
Verify: one business action produces N `retry.scheduled` events and N
`tool.call` spans.

**8. Ambiguous writes emit `write.verified` after readback**
Verify: timeout after a POST that actually landed shows
`write.verified` + `write.state=exists` and final outcome `ok`.

**9. Unkeyed write retries emit `duplicate.risk`**
Verify: retry a write with a *different* key → `duplicate.risk=true`.
Same key → no event.

## Hygiene

**10. `tool.payload_hash` is stable across identical retries**
Verify: same body twice → same sha256. Body never appears in attributes.

**11. No secrets in span attributes (spot-check 10 spans)**
Search your exporter config and one hour of live spans for `Bearer`,
`sk-`, `postgres://`, `AKIA`. Zero hits.

**12. Traces survive process restart**
Verify: SIGKILL during a tool call. The spans that already finished are
in the backend. Queue/exporter is not synchronous-only.

---

## Sign-off

| Date | Release | All 12 green? | Reviewer |
|---|---|---|---|
|  |  |  |  |

If any item fails, do not ship write permissions to production.
