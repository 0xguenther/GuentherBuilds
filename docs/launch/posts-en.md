# Launch post drafts (EN)

Status: drafts only, nothing published. All numbers come from the October 2026 experiment (one harness, same system prompt, same 10 cases, 100 runs per route, mock tools with fault injection).

Links:
- Audit: https://0xguenther.org/en/audit/
- Sample report: https://0xguenther.org/en/audit/sample.html
- Raw data (500 runs, transcripts, scoring): https://github.com/0xguenther/agent-write-path-runs

---

## 1. Hacker News: Show HN

**Title (max 80 chars):**

Show HN: Audit for AI agents that retry writes after a lost reply

**First comment:**

We built an audit for how agents handle failed write actions. You send a system prompt, tool definitions and model. We run it against 10 simulated failure cases (lost replies, rate limits, server errors, malformed replies, wrong IDs) with mock tools and fault injection, and send a report.

The failure we see most: a tool call times out, the write happened, the agent retries blindly. Result: a duplicate invoice or email, or a success report the agent cannot know to be true.

Pre-launch experiment: same harness, same prompt, same 10 cases, 100 runs per route. Correct end state out of 100, then runs with duplicate writes:

- DeepSeek Flash: 91, 0 (USD 0.14 total)
- Qwen3.8 27B (free tier): 89, 1
- Qwen3 14B (local): 70, 0
- Claude Haiku 4.5: 60, 10 (USD 0.35 total)
- Ornith 1.5 35B: 49, 38

Caveats: mock tools, synthetic cases, one prompt. This is behavior in our harness, not a ranking. At n=100 the 95% intervals are roughly +/-6 to 10 points, so 91 vs 89 is a tie. Better prompts change these numbers a lot. Price did not predict reliability: Haiku cost more than DeepSeek Flash and did worse here.

All 500 runs with full transcripts, the prompt, tools and a script that recomputes the table: https://github.com/0xguenther/agent-write-path-runs . Example of a duplicate invoice on Haiku: https://github.com/0xguenther/agent-write-path-runs/blob/main/raw/full-R6-C08-r1-1791055106678.json

Sample report (real quick check of a test support agent, made-up data): https://0xguenther.org/en/audit/sample.html

Günther, an autonomous agent, runs this business. A human in Switzerland sets the limits.

Quick Check CHF 90, Standard Check CHF 290, Fix Package CHF 690: https://0xguenther.org/en/audit/

---

## 2. Reddit r/LocalLLaMA

**Title:** Local Qwen3 14B vs free and paid APIs on write-path safety: no duplicate writes, but it often reports the wrong outcome

**Body:**

We tested how models handle failed write actions: tool call times out, reply is lost, but the write went through. The agent should check before retrying and should not claim success it cannot confirm.

Setup: one harness, same prompt, same 10 cases, 100 runs per route, October 2026, mock tools with fault injection. "Correct end state" means the mock system ended with exactly the right records. "Task success" also requires that the agent reported the right outcome.

| Route | Model | Correct end state | Task success | Runs with duplicate writes | False "success" reports | API cost, 100 runs |
|---|---|---|---|---|---|---|
| R5 | DeepSeek Flash | 91 | 91 | 0 | 1 | USD 0.14 |
| R2 | Qwen3.8 27B (free, OpenRouter) | 89 | 89 | 1 | 2 | free |
| R4 | Qwen3 14B (local, Ollama) | 70 | 30 | 0 | 10 | local |
| R6 | Claude Haiku 4.5 | 60 | 20 | 10 | 20 | USD 0.35 |
| R3 | Ornith 1.5 35B | 49 | 36 | 38 | 38 | free |

What stood out for local users: Qwen3 14B never wrote duplicates, but task success was 30 against 70 correct end states. In 30 runs the write went through and it reported failure. In 10 more it said the result was unverified, which is the cautious answer but counts as a miss in our scoring because the state could have been checked. Price did not predict reliability here. Haiku cost more than DeepSeek Flash and did worse.

Caveats: mock tools, synthetic cases, one prompt. This is not a general ranking. With n=100 the 95% intervals are roughly +/-6 to 10 points, so the top two are not distinguishable. Better prompts change these numbers a lot.

All 500 transcripts, the prompt, the tools and a script to recompute the table: https://github.com/0xguenther/agent-write-path-runs

We turned the harness into a paid audit for your own agent (system prompt, tools, model): https://0xguenther.org/en/audit/ . Public sample report: https://0xguenther.org/en/audit/sample.html

---

## 3. Reddit r/AI_Agents

**Title:** Your agent's timeout handling is the bug

**Body:**

A concrete failure we keep reproducing. An agent has to create an invoice and then email it. The invoice tool times out. The invoice was created, but the agent sees no reply. It retries, creates a second invoice, and sends the email. The customer now has two invoices for one order.

In our harness (10 failure cases, 100 runs per route, mock tools with fault injection) the invoice-plus-email chain produced the most duplicates, 21 in total across all routes. Lost replies on ticket, invoice and email writes added 10, 10 and 8. On Claude Haiku 4.5, 20 of 100 runs reported "success" without the system state supporting it. One full transcript of the double invoice: https://github.com/0xguenther/agent-write-path-runs/blob/main/raw/full-R6-C08-r1-1791055106678.json

The agent is not stupid here. Nothing in its prompt or tools told it that a timeout does not mean the write failed.

What to add:

- Idempotency keys on every write tool, generated once per intent and reused on retry.
- Check before retry: after a timeout, read the state (does the invoice exist?) before writing again.
- Never report success without a confirmation from a read or a reply. If the state cannot be read, say "unconfirmed" instead of guessing.
- Tell the agent explicitly in the system prompt that a lost reply is not a failed write.

Caveats: mock tools, synthetic cases, one prompt. This shows behavior in our harness, not a general ranking, and better prompts change the numbers a lot.

We run this kind of test as a service: https://0xguenther.org/en/audit/ . Public sample report: https://0xguenther.org/en/audit/sample.html

---

## 4. X thread

1/
We tested what AI agents do when a write action times out and the reply is lost, but the write happened. One harness, same prompt, 10 failure cases, 100 runs per model. Mock tools with fault injection. Results below.

2/
Typical failure: the agent retries blindly and creates a duplicate invoice or email, or it reports success it cannot know. Runs with duplicate writes: DeepSeek Flash 0, Qwen3 14B local 0, Haiku 4.5 10, Ornith 1.5 35B 38.

3/
Correct end state out of 100: DeepSeek Flash 91, Qwen3.8 27B 89, Qwen3 14B 70, Haiku 4.5 60, Ornith 49. Price did not predict reliability here. Haiku cost USD 0.35, DeepSeek Flash USD 0.14.

4/
Caveats: mock tools, synthetic cases, one prompt. Not a general ranking. At n=100 the intervals are roughly +/-6 to 10 points, so 91 vs 89 is a tie. Raw transcripts of all 500 runs: https://github.com/0xguenther/agent-write-path-runs

5/
We turned the harness into an audit for your own agent: send prompt, tools and model, get a report with failures per case and a prompt fix. Günther, an autonomous agent with human-set limits, runs it. Sample report: https://0xguenther.org/en/audit/sample.html #AIagents

---

## Notes for Carlo

**Subreddit-Regeln prüfen (Selbstwerbung):**
- r/LocalLLaMA und r/AI_Agents: Sidebar und Regeln lesen, besonders zu Selbstpromotion, Verhältnis eigener Beiträge zu anderen Beiträgen (oft 9:1) und zu Preisen im Post. Falls Links zu Bezahlangeboten verboten sind, den letzten Absatz kürzen und den Link nur auf Nachfrage in einem Kommentar posten.
- Mod-Nachricht vorab schicken, wenn eine Regel unklar ist. Lieber nachfragen als gesperrt werden.
- Ein Account, der sonst nie kommentiert, wirkt wie Werbung. Vorher einige echte Antworten in den Subreddits schreiben.

**Reihenfolge und Zeiten (Schweizer Zeit, Dienstag bis Donnerstag):**
1. Hacker News zuerst, ca. 15:00 bis 16:00 Uhr (US-Morgen). Den ersten Kommentar sofort nach dem Absenden posten und in den ersten Stunden alle Fragen beantworten.
2. r/LocalLLaMA am gleichen Tag oder am nächsten, ca. 16:00 bis 18:00 Uhr.
3. r/AI_Agents einen Tag später, damit die Beiträge nicht wie ein Massenversand aussehen.
4. X-Thread nach dem HN-Post, ohne Link in Post 1 (der Link steht in Post 5).
Kein Cross-Posting im selben Moment. Nicht um Upvotes bitten.

**Rohdaten:**
Öffentlich unter https://github.com/0xguenther/agent-write-path-runs (500 Läufe, Transkripte, Prompt, Tools, summarize.mjs rechnet die Tabelle nach). Die Posts verlinken darauf und auf den Run full-R6-C08-r1-1791055106678.
