# Trace schema — agent tool calls

Use these names **exactly**. The SQL queries in `queries.sql` and the
example trace assume them. Renaming attributes breaks the queries.

---

## Span hierarchy

```
agent.run                          # one user request / autonomous turn
├── llm.completion                 # model call that produced tool arguments
│   └── (events: llm.request, llm.response)
└── tool.call                      # one tool invocation
    ├── tool.request               # optional child if you split network I/O
    └── tool.response | tool.error
```

If your tracer only supports two levels, flatten to `agent.run` → `tool.call`
and keep all attributes on `tool.call`.

---

## `agent.run` attributes

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `agent.run_id` | string | yes | UUID. Same id across retries of the *same logical turn*. |
| `agent.name` | string | yes | e.g. `invoice-bot`, `support-rea` |
| `agent.trigger` | string | yes | `user` \| `cron` \| `webhook` |
| `agent.session_id` | string | no | Conversation or ticket id |

## `llm.completion` attributes

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `llm.model` | string | yes | |
| `llm.input_tokens` | int | no | |
| `llm.output_tokens` | int | no | |
| `llm.finish_reason` | string | no | `stop` \| `tool_calls` \| `length` |

Link the completion to the tool call via span parent or
`tool.call.llm_span_id`.

## `tool.call` attributes (the important ones)

| Attribute | Type | Required | Notes |
|---|---|---|---|
| `tool.name` | string | yes | `create_invoice`, `send_email`, … |
| `tool.kind` | string | yes | `read` \| `write` |
| `tool.outcome` | string | yes | `ok` \| `error` \| `timeout` \| `unknown` |
| `tool.duration_ms` | int | yes | |
| `tool.attempt` | int | yes | 1-based. First try = 1. |
| `tool.idempotency_key` | string | if write | See `examples/idempotency-key.md` |
| `tool.payload_hash` | string | if write | sha256 hex of canonical request body. Never the body. |
| `tool.http_status` | int | no | |
| `tool.error_type` | string | if not ok | `timeout`, `http_5xx`, `http_4xx`, `network`, `schema`, … |
| `tool.retryable` | bool | no | Whether the caller is allowed to retry |

### Outcome rules

| Situation | `tool.outcome` |
|---|---|
| HTTP 2xx and parsed | `ok` |
| HTTP 4xx / validation | `error` |
| HTTP 5xx after all retries | `error` |
| Timed out, **no** readback | `timeout` |
| Timed out, readback says write exists | `ok` + event `write.verified` |
| Timed out, readback says write missing | `error` + event `write.verified` |
| Process crashed mid-call | `unknown` (backfill later if you can) |

`timeout` is not a synonym for `error`. Callers and dashboards must treat
them differently.

---

## Events (on `tool.call` unless noted)

| Event | When | Attributes |
|---|---|---|
| `retry.scheduled` | Before a retry | `retry.delay_ms`, `retry.reason`, `tool.attempt` |
| `write.verified` | After ambiguous write | `write.state` = `exists` \| `missing` \| `mismatch`, `write.checked_at_ms` |
| `duplicate.risk` | Retry of a write without matching idempotency key | `duplicate.same_payload` (bool) |
| `llm.request` | On `llm.completion` | `llm.prompt_hash` |
| `llm.response` | On `llm.completion` | `llm.response_hash` |

---

## Naming rules (enforced in review)

1. Attribute keys use `snake_case` and a dotted namespace (`tool.*`, `llm.*`, `agent.*`).
2. No free-text customer data in attributes. Hash or omit.
3. No secrets: keys, tokens, Authorization headers, connection strings.
4. `payload_hash` is stable: same logical body → same hash across retries.
5. Child spans inherit `agent.run_id` via context, not via a copied attribute.

---

## Minimal TypeScript shape (for typed loggers)

```ts
export type ToolOutcome = 'ok' | 'error' | 'timeout' | 'unknown';
export type ToolKind = 'read' | 'write';

export interface ToolCallAttrs {
  'tool.name': string;
  'tool.kind': ToolKind;
  'tool.outcome': ToolOutcome;
  'tool.duration_ms': number;
  'tool.attempt': number;
  'tool.idempotency_key'?: string;
  'tool.payload_hash'?: string;
  'tool.http_status'?: number;
  'tool.error_type'?: string;
  'tool.retryable'?: boolean;
}
```

Paste into your codebase and use as the tracer attribute bag. No runtime
dependency on this pack.
