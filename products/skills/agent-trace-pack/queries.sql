-- queries.sql — Agent Trace Pack
-- Dialect: ANSI-ish SQL. Adjust table/column names to your trace store.
-- Assumed table: tool_spans
--   agent_run_id, agent_name, tool_name, tool_kind, tool_outcome,
--   tool_attempt, tool_idempotency_key, tool_payload_hash,
--   tool_duration_ms, tool_error_type, started_at, ended_at
-- Assumed events table (optional): tool_events
--   agent_run_id, tool_name, event_name, event_attrs_json, occurred_at

-- ---------------------------------------------------------------------------
-- 1. Retry storms: runs where the same write tool was attempted 3+ times
-- ---------------------------------------------------------------------------
SELECT
  agent_run_id,
  tool_name,
  COUNT(*) AS attempts,
  MIN(started_at) AS first_attempt,
  MAX(ended_at) AS last_attempt
FROM tool_spans
WHERE tool_kind = 'write'
  AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
GROUP BY agent_run_id, tool_name
HAVING COUNT(*) >= 3
ORDER BY attempts DESC;

-- ---------------------------------------------------------------------------
-- 2. Ghost-write candidates: timed-out writes later verified as existing
--    (event write.verified with write.state = 'exists')
-- ---------------------------------------------------------------------------
SELECT
  s.agent_run_id,
  s.tool_name,
  s.tool_attempt,
  s.tool_outcome,
  e.occurred_at AS verified_at
FROM tool_spans s
JOIN tool_events e
  ON e.agent_run_id = s.agent_run_id
 AND e.tool_name = s.tool_name
WHERE s.tool_outcome = 'timeout'
  AND e.event_name = 'write.verified'
  AND e.event_attrs_json LIKE '%exists%'
  AND s.started_at >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
ORDER BY s.started_at DESC;

-- ---------------------------------------------------------------------------
-- 3. Duplicate risk: write retries that changed the idempotency key
-- ---------------------------------------------------------------------------
SELECT DISTINCT
  s.agent_run_id,
  s.tool_name,
  s.tool_attempt,
  s.tool_idempotency_key,
  s.tool_payload_hash
FROM tool_spans s
JOIN tool_events e
  ON e.agent_run_id = s.agent_run_id
 AND e.tool_name = s.tool_name
WHERE e.event_name = 'duplicate.risk'
  AND s.started_at >= CURRENT_TIMESTAMP - INTERVAL '7' DAY
ORDER BY s.started_at DESC;

-- ---------------------------------------------------------------------------
-- 4. p95 tool latency per tool (writes only)
-- ---------------------------------------------------------------------------
SELECT
  tool_name,
  COUNT(*) AS n,
  AVG(tool_duration_ms) AS avg_ms,
  MAX(tool_duration_ms) AS max_ms
FROM tool_spans
WHERE tool_kind = 'write'
  AND started_at >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
GROUP BY tool_name
ORDER BY avg_ms DESC;

-- For true p95 use your engine's percentile, e.g. PostgreSQL:
--   PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY tool_duration_ms) AS p95_ms

-- ---------------------------------------------------------------------------
-- 5. Outcome mix per tool — watch the timeout share
-- ---------------------------------------------------------------------------
SELECT
  tool_name,
  tool_outcome,
  COUNT(*) AS n,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY tool_name), 1) AS pct
FROM tool_spans
WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '24' HOUR
GROUP BY tool_name, tool_outcome
ORDER BY tool_name, n DESC;

-- ---------------------------------------------------------------------------
-- 6. Alert feed: unknown outcomes in the last hour (page someone)
-- ---------------------------------------------------------------------------
SELECT
  started_at,
  agent_run_id,
  agent_name,
  tool_name,
  tool_error_type
FROM tool_spans
WHERE tool_outcome = 'unknown'
  AND started_at >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
ORDER BY started_at DESC;

-- ---------------------------------------------------------------------------
-- 7. Daily safety summary (one row per day)
-- ---------------------------------------------------------------------------
SELECT
  DATE(started_at) AS day,
  COUNT(*) FILTER (WHERE tool_kind = 'write') AS writes,
  COUNT(*) FILTER (WHERE tool_outcome = 'timeout') AS timeouts,
  COUNT(*) FILTER (WHERE tool_outcome = 'unknown') AS unknowns,
  COUNT(*) FILTER (WHERE tool_kind = 'write' AND tool_idempotency_key IS NULL) AS unkeyed_writes
FROM tool_spans
WHERE started_at >= CURRENT_TIMESTAMP - INTERVAL '14' DAY
GROUP BY DATE(started_at)
ORDER BY day DESC;
