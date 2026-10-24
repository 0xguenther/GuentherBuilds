# Idempotency keys for agent writes

An idempotency key must identify the **logical business action**, not the
HTTP attempt. Retries of the same action reuse the key. A new action gets
a new key.

## Derivation

```
idempotency_key = tool_name + ":" + payload_hash_short + ":" + run_id
```

Example (TypeScript):

```ts
import { createHash } from 'crypto';

export function idempotencyKey(
  toolName: string,
  payload: unknown,
  runId: string
): string {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const hash = createHash('sha256').update(canonical).digest('hex');
  return `${toolName}:${hash.slice(0, 16)}:${runId}`;
}
```

## Rules

1. **Canonical JSON** before hashing (sorted keys, no whitespace variance),
   so the same logical body always hashes the same.
2. **Include `run_id`** so two *different* user requests that happen to
   send the same body are still distinct actions.
3. **Do not include timestamps or attempt numbers** in the key.
4. **Persist the key with the business record** if your tool supports it
   (Stripe `Idempotency-Key`, DB unique constraint, …).
5. **On retry, pass the identical key** to the tool and to the span
   (`tool.idempotency_key`).

## What "duplicate risk" means

If you see a write retry where `tool.idempotency_key` changed but
`tool.payload_hash` stayed the same, two different keys can create two
records for one intent. That is the `duplicate.risk` event. Fix the caller
so retries reuse the key.

## Non-writes

Reads do not need idempotency keys. Skip the attribute.
