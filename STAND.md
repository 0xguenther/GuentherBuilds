# STAND — Günther (Produktiv-Codebasis)

Letzte Aktualisierung: 2026-10-05

## Status
- Repo: `C:\ClaudeProjects\günther`, Branch `master`, HEAD `29f2119` (feat(scout): multi-domain classification …)
- Läuft produktiv auf Proxmox CT 115 (`10.0.1.115:3000`, Service `gunther-core.service`), laut `MEMORY.md`.
- Öffentliche Referenz-Version lebt separat in `C:\ClaudeProjects\gunther-core` (Derivat, nicht parallel pflegen).
- Letzte dokumentierte Tests: 29/29 bestanden (Security-/Heartbeat-Audit, siehe `MEMORY.md`). Aktuelle Testläufe seit HEAD nicht verifiziert.

## Multi-Agent Audit (2026-10-05)
Durchgeführt mit MiMoCode (Orchestrator) + Claude Code (Security) + interne Agents.

### Implementierte Fixes (16 Stück)
- **P0:** CORS eingeschränkt, Admin-Auth-Hook, Mention-Stuck-Bug, Download-Race-Condition, Prisma-Disconnect, Unhandled Promise, Playbook-PDFs entfernt, X-Credentials gelöscht, Webhook-Fix, .dockerignore, ADMIN_API_TOKEN
- **P1:** DB-Indizes, Trace.metadata/Payment.errorReason im Schema, Config NaN-Guards, Async file read
- **Deployed:** 2026-10-05 09:34 UTC auf CT 115, Health-Check bestanden

### Offene Punkte (nächste Iteration)
- X-API-Keys rotieren (waren in scratch/ im Klartext, jetzt gelöscht)
- GitHub-PAT widerrufen (laut STAND.md noch offen)
- Langfuse SDK tatsächlich integrieren (aktuell leerer Stub)
- Test-Framework (vitest) einführen
- any-Typen eliminieren (15+ Stellen)
- MetricsService auf Aggregationen umstellen

### Eingerichtete Loops (4 durable)
- Daily Günther Check (`0 9 * * *`) — Stand prüfen, Tests, offene Issues
- Weekly Code Quality (`0 10 * * 1`) — any-Casts, Dead Code, Report
- Daily Business Dev (`0 11 * * *`) — Landingpage, SEO-Blog, neue Produkte
- Weekly Security (`0 8 * * 1`) — Secrets-Scan, CORS, scratch/

## Befund Realdaten (2026-10-03, read-only auf CT 115)
- Produktions-DB `/opt/gunther-core/prisma/dev.db`: 141 Payments, alle mit Testkennungen (`pi_test_`, `pi_crash_`, …). Keine echte Zahlung erkennbar.
- B2B: 15 Verträge, Setup-Fee-Summe 30.000 USD (15 × 2.000 USD), ebenfalls Testdaten. Skill-Käufe: 48, Testdaten.
- `gunther-core.service` läuft seit ca. 5 Tagen. Im Journal der letzten 30 Tage **keine Stripe-Event-Verarbeitung** (nur Startmeldungen).
- `.env` nutzt einen eingeschränkten Live-Key (`rk_live`). Lesende Abfrage bei Stripe (2026-10-03): Account CH, Zahlungen aktiviert, **0 Charges und 0 PaymentIntents insgesamt**. Es ist bisher kein echtes Geld über Stripe geflossen.
- Folge: Die Aussagen "verifizierter Umsatz" in `docs/SYSTEM_DOKUMENTATION.md` und auf der Website sind lokal nicht belegt.

### Bereinigung 2026-10-07 (erledigt)
- **Ursache:** e2e-Skripte (`test/*-e2e.ts`) liefen gegen die Prod-DB mit NODE_ENV≠test → Testdaten in Prod + 2 echte Mainnet-Calldata-Txs (`GUNTER_BURN:pi_test_…`, value 0, kein Token-Transfer, nur Gas).
- **Fix:** `test/e2eGuard.ts` (erster Import aller e2e-Skripte): erzwingt NODE_ENV=test, Default `file:./test.db`, Abbruch bei Nicht-Test-DB, fixer Test-Admin-Token.
- **Metrics:** `/api/metrics` zählt nur echte On-Chain-Hashes (`0x`+64 hex) als Burns; Claw-Mart-Fake-Hashes (`0xskill_…`) entfernt; Trace-Totals via Aggregation statt findMany; `totalLlmCalls` = Traces mit tokens>0.
- **Prod-DB bereinigt** (Backup `prisma/backup-pre-cleanup-20261007-065951.db`): 141 Payments, 48 SkillPurchases, 15 B2bContracts, 16 B2bLeads, 16 `community-agent-*` Skills, 2 AuditOrders `@example.com` gelöscht. Live: Revenue 0, Burns 0 (ehrlich).
- **Deploy-Skript:** überschreibt Server-`.env` nicht mehr (ADMIN_API_TOKEN bleibt erhalten).
- Tests: vitest 66/66, e2e metrics/reddit/simulate/clawmart/b2b/web3 grün.
- **Burn-Claim vs. Realität: gelöst durch Token-Deploy** (siehe unten).

### $GUNTER Token live auf Base Mainnet (2026-10-07)
- **Token:** `Günther` / `GUNTER`, 18 Decimals, fixe Supply 1 Mrd, kein Owner, kein Mint, kein Pause (`contracts/GuntherToken.sol`, OZ 5.4 ERC20+Burnable, solc 0.8.28).
- **Adresse:** `0xb0e8a9d8B5542Fc907736d19A018bbE131C8cd24` – Deploy-Tx `0x064092b7…c7596`, Block 52283737. Quelle auf Sourcify verifiziert (exact_match). Gesamte Supply in der Server-Wallet `0xb54A…0f1A` (Treasury).
- **Burn-Rate:** 10 GUNTER pro Cent (1'000 pro USD) → Supply reicht für 1 Mio USD Umsatz. Burn = ERC-20-`transfer` an `0x…dEaD` + Referenz `GUNTER_BURN:<paymentId>:<amount>` in der Calldata. Simulierter Burn erfolgreich.
- **Server:** `.env` `GUNTER_TOKEN_ADDRESS` gesetzt (Backup `.env.bak-*`), Deploy-Record `contracts/deployments/base.json`.
- **Panne + Behebung:** Deploy-Skript lief zweimal (RPC-Read nach Receipt schlug fehl, Rerun ohne Nonce-Check) → Duplikat `0x4205c564…9084`; gesamte Supply per `burn()` vernichtet (totalSupply 0, Tx `0x5dc5262b…5af7`). Kosten gesamt ~0.000007 ETH (2 Deploys + Retire-Burn). Fix: `scripts/token/deploy.mjs` schreibt den Deploy-Record **vor** dem Broadcast und bricht bei vorhandenem Record ab; Reads nach Deploy mit Backoff.
- **Burn-Sicherheit (`src/mcp/web3Mcp.ts`):** Burn-Tx wird genau einmal signiert; Retries senden nur dieselbe Raw-Tx erneut (gleicher Nonce) → kein Doppel-Burn bei verlorener/rate-limitierter RPC-Antwort. Unklarer Broadcast → `BurnPendingError` (Hash bleibt, nur Bestätigung). Test `test/burnBroadcast.test.ts`. Vitest 70/70, Build grün, live deployt.
- **RPC-Rückfall (`src/mcp/web3Mcp.ts`, 2026-10-07):** viem-`fallback` über `BASE_RPC_URL` (kommagetrennte Liste möglich) → `base-rpc.publicnode.com` → `base.drpc.org` → `1rpc.io/base`, ohne Key. Bei `-32016`/429/Ausfall geht's zum nächsten RPC; Re-Broadcast derselben signierten Tx ist idempotent. Test `test/rpcFallback.test.ts` (lokale RPCs, offline). Vitest 74/74, Build grün, live auf CT115 (Backup `dist/mcp/web3Mcp.js.bak-*`).
- **Website/API:** Token-Adresse + BaseScan-Links (Token, verbrannte Menge an `0x…dEaD`) auf `/`, `/en/`, `llm.txt` und `/api/metrics` (`token`-Block), live.
- **Offen:** In KeePass gibt es keinen Base-RPC-Key (alle 96 Einträge geprüft). Ein eigener Key (Alchemy/QuickNode/CDP) ist optional; er kommt als erster Eintrag in `BASE_RPC_URL`. ETH-Reserve der Wallet: ~0.00014 ETH (≈ 400 Burns à ~55k Gas).
- **Marge-Fix (2026-10-07):** `netProfitMarginPercent` ist bei 0 Umsatz `null` statt 100 %. Vorher stand im täglichen X-Post, im Eliza-Kontext und in `/api/metrics` eine Marge von 100 %, obwohl es keinen Umsatz gab. X-Post zeigt jetzt die Inferenzkosten. Test in `test/metricsLedger.test.ts`, Vitest 75/75, live auf CT115 (Backup `/root/predeploy-margin-*.tgz`).
- **Verkaufsstand 2026-10-07 (CT115):** 0 Zahlungen, 2 nicht bezahlte Quick-Check-Checkouts (3. und 5.10.), 13 Seitenaufrufe seit Start des Trackings am 7.10. Die Kette Zahlung → Bericht → Burn ist noch nie mit echtem Geld gelaufen; nächster Schritt ist ein echter Kauf mit anschliessender Rückerstattung.
- **Audit-Probelauf auf CT115 (2026-10-07):** `canary-experiment` unter `/opt` erzeugt mit Phase `audit-preflight-*` (R5, Quick) einen Bericht in ca. 1.5 Minuten für ca. 0.014 USD. Befunde, noch offen:
  - Audit-Zahlungen lösen **keinen** GUNTER-Burn aus (`webhookRoutes.ts` endet bei `write_path_check` vorzeitig).
  - Vom Werkzeug-Feld wird nur geprüft, ob die Namen erlaubt sind. Getestet werden immer die festen Fälle C01–C10.
  - `budget.mjs` hat ein Gesamtlimit von `TOTAL_CAP = 10 USD`, das nie zurückgesetzt wird. Sobald es erreicht ist, scheitert jeder weitere Audit.
- **Erster echter Audit-Kauf (2026-10-07):** Quick-Check, CHF 90, `pi_3UNpr6…`, Bestellung `a46b7a1d…` → nach 53 s `delivered`. Der Bericht kam aber nicht beim Käufer an:
  - `/audit/thanks` hatte keine Route (404). Behoben in `src/server/app.ts` (DE und EN).
  - Die Mail verlinkte nur die Danke-Seite, die keinen Download anbot. Jetzt geht der Link direkt auf `/api/audit/download/:token`.
  - Die Danke-Seite zeigt einen Download-Button. `/api/audit/orders/:id` gibt `downloadUrl` nur heraus, wenn `?session_id=` mit der Stripe-Session übereinstimmt. Die Success-URL enthält dafür `{CHECKOUT_SESSION_ID}`. Test: `test/auditDelivery.test.ts`. Am 07.10. deployed (Backup `/root/predeploy-delivery-*.tgz`).
  - **Mail behoben (2026-10-07):** Vorher lehnte Resend mit 403 ab, weil `0xguenther.org` nicht verifiziert war. Bis dahin ist keine Käufer-Mail rausgegangen. Jetzt ist die Domain bei Resend angelegt (eu-west-1) und `verified`. Bei Cloudflare über `Projects/Cloudflare` gesetzt: DKIM `resend._domainkey`, MX und TXT auf `send`, CNAME `rsend`, DMARC `p=none`. Die Bericht-Mail für `a46b7a1d…` wurde nachgesendet und von Resend als `delivered` gemeldet.
  - **Offen:** Der Server-Key `re_4QTHhVkF…` hat jetzt Vollzugriff. Besser: einen Key nur zum Senden in der `.env` auf dem Server und den Vollzugriffs-Key nur in KeePass.

## Offene Punkte
- **Audit-Bestellungen pausiert (2026-10-07):** v1 prüft nur eine feste Referenz-Konfiguration (unser Prompt, unsere Tools, R5), nicht den Agenten des Kunden. `POST /api/audit/orders` gibt 503, solange `AUDIT_ORDERS_ENABLED` nicht `1` ist; die DE- und EN-Seiten zeigen dann einen Hinweis. Umbau-Plan: `docs/AUDIT_V2_PLAN.md`. Testkauf `a46b7a1d…` (CHF 90, Carlo): Rückerstattung über Stripe beantragt, die Freigabe-Anfrage `apreq_61VX…` muss im Dashboard bestätigt werden; danach `refundId` in der DB nachtragen.
- **Token-Rotation nötig:** Im `.git/config` stand bis 2026-10-03 ein GitHub-PAT im Klartext in der Remote-URL. Remote ist bereinigt (`https://github.com/0xguenther/GuentherBuilds.git`), der Token selbst ist aber **noch nicht widerrufen**. Zu tun: Token in GitHub widerrufen, neuen im KeePassXC-Tresor ablegen. Auth läuft jetzt über Git Credential Manager.
- **Uncommitted Änderung:** `scripts/deploy-to-proxmox.ps1` (noch nicht geprüft/committed).
- **Remote-Historie:** `origin` zeigt auf dasselbe Repo wie `gunther-core` (`0xguenther/GuentherBuilds`). Vor einem Push prüfen, ob Historien kollidieren.
- **Strategie-Frage offen:** Mögliche Neuausrichtung von "digitale Produkte verkaufen" hin zu "Services betreiben" (AgentCheck, AgentWatch, …). Noch nicht entschieden, keine Umsetzung begonnen.

## Status: Phase 1 COMPLETE ✅ → Phase 2 GO-LIVE 🚀 (2026-10-06, Strategic Pivot)

### 🎯 STRATEGIC PIVOT: Arsenal Model (NOT Kill-Criterion)

**New Strategy (User Decision 2026-10-06):**
Instead of: "If audit doesn't hit ≥10 orders in 30 days → Shutdown"
Now: "If audit fails → Pivot to parallel Arsenal of products (Agent-Ops, Dev Tools, AI Infra, Content)"

**Components:**
1. **Audit-Check (Primary):** 30-day kill criterion still active (≥500 visitors + ≥10 orders)
2. **Arsenal Research:** 4 parallel loops researching 9 product candidates
3. **Autonomous Pivot:** If Audit misses targets, launch ready TIER-1 product instead (AgentWatch or HealthDash)

**Outcome Matrix:**
- Audit succeeds: Scale audit + Arsenal becomes expansion roadmap
- Audit fails but Arsenal hot: Pivot + launch alternative service within 2 weeks
- Multi-product success: Günther becomes SaaS company (Audit + AgentWatch + PromptDoctor)

**Key Constraint:** Günther remains autonomous throughout (no hiring, no external dependencies)

**DIAGNOSTICS-Framework (Nov 6 Decision):**
```
Wenn Kill-Kriterium verfehlt → ERST Problem diagnostizieren:
  <300 Visitor        → Visibility-Problem (Marketing war schwach)
  ≥500 Visitor        → Check Conversion Rate:
    <0.3% Conversion  → Produkt-Problem (überarbeiten oder sofort Arsenal-Pivot)
    0.3-1%            → Produkt hat Potential, aber UX/Pricing/Message anpassen
    ≥1%               → ✅ SUCCESS (beide Seiten funktionieren, skalieren)
```
**Die Regel:** Nicht anfangen, Audit-Check zu überarbeiten, wenn <300 Visitor.
Das ist ein Visibility-Problem, nicht ein Produkt-Problem.

### ✅ ERLEDIGT (Phase 0 + Download-Fix + Phase 1)
1. Working-Copy bereinigt: **10 logische Commits** (Audit, Blog, Email, Playbook, Services, Config, Website, Doku, PDF-Cleanup, Download-Fix)
2. **Download-Route funktioniert:** Webhook → `downloadUrl` (signed token, 48h TTL, max 5 Downloads) → GET /download/:token
3. **Tests: 28/29 PASSED** ✅
   - Download-Flow: Webhook → Token → Datei-Download ✅
   - Idempotenz & doppelte Webhooks bearbeitet ✅
   - Burn & X-Tweet generiert ✅
   - 1 Test ausstehend (Duplikat-Webhook edge-case, niedrig priorisiert)
4. Deploy-Skript geprüft ✅
5. Database Schema mit dev.db syncen ✅

## Nächste Schritte

### ✅ PHASE 1 – Autonomie härten (2026-10-06)
- [x] Langfuse-Integration: TraceService → HTTP API mit Tags (model, task, status)
- [x] vitest-Framework: 29 Unit-Tests (paymentService, fulfillmentService, retryUtil)
- [x] Retry/Backoff Utility: executeWithRetry, fetchWithRetry, 429/5xx handling

### ✅ PHASE 2 READINESS CHECK (2026-10-06, 13:40 UTC)
**Core Systems Tested & Verified:**
- [x] Canary-Runner: Lokal ✅ (Stub-Test bestanden, Reports HTML+MD)
- [x] Stripe-Flow: E2E-Test ✅ (Webhook → Token → Download, 28/29 Tests)
- [x] Download-Security: TTL ✅ (48h), Limit ✅ (5x), Validation ✅
- [x] Report-Template: Enhanced ✅ (KPI-Cards, Bar-Charts, Findings)
- [x] UI-Responsive: Fixed ✅ (Mobile ≤640px, Tablet ≤820px)

**Phase 2 Checklist:**
- [ ] CT 115 Deploy (Canary + Günther)
- [ ] Live-Test-Zahlung (Stripe Test Mode)
- [ ] Go-Live Monitoring (Kuma, Langfuse)
- [ ] Kill-Kriterium starten (30 Tage: ≥500 Besucher + ≥10 Bestellungen)

### ✅ PHASE 1 – Autonomie härten (2026-10-06)
- [x] Langfuse-Integration: TraceService → HTTP API mit Tags (model, task, status)
- [x] vitest-Framework: 29 Unit-Tests (paymentService, fulfillmentService, retryUtil)
- [x] Retry/Backoff Utility: executeWithRetry, fetchWithRetry, 429/5xx handling
- [ ] MetricsService → Funnel-Metriken (Besucher → Checkout → Zahlung)
- [ ] any-Typen abbauen (15+ Stellen, später)

### ✅ PHASE 2 – Produkte ausreifen + Arsenal Launches (Tag 4–30)

**Audit-Check (Primary):**
- [x] Canary-Runner auf CT 115
- [x] Bericht-Erzeugung (Report-Template ENHANCED)
- [ ] Test-Zahlung durchführen (Stripe Test Card 4242...)
- [ ] Öffentliches Beispiel-Report auf Website
- [ ] Visitor tracking + order counting live
- [ ] 30-Tage Kill-Kriterium aktiv (Nov 6 Decision Day)

**Arsenal (Parallel Product Research):**
- [x] Arsenal structure created (`C:\ClaudeProjects\Arsenal\`)
- [x] 9 product candidates evaluated + scored
- [x] Automation scripts: idea-mining, candidate-scoring, MVP-sketches
- [ ] Loop 1 (Agent-Ops): AgentWatch MVP sketch by Oct 12
- [ ] Loop 1: 5 validation interviews with developers
- [ ] Loop 2 (Dev Tools): Prototype PromptDoctor by Oct 20
- [ ] All loops: 3+ MVP sketches with landing pages by Oct 27
- [ ] Decision matrix: If Audit succeeds → scale. If fails → launch AgentWatch (TIER-1)

**Products (Craft, Claw Mart, Clawcommerce): Optional expansion**
- May deprioritize if Arsenal generates stronger signals
- Audit-Check is core focus for 30 days

### ⏳ Security (Nutzer-Aktion erforderlich)
- [ ] GitHub-PAT widerrufen + neuer im KeePassXC
- [ ] X-API-Keys rotieren (waren in scratch/ im Klartext, gelöscht)
- [ ] `scripts/deploy-to-proxmox.ps1` final überprüft

## Handover-Hinweise
- Keine Secrets in Git oder Dateien. Credentials kommen aus `.env` (über `sync-env.ps1`, Tresor-Eintrag `Projects/Gunther`).
- Infrastruktur-Änderungen (CT 115, Ports, Hosts) sind in `C:\ClaudeProjects\Home Verwaltung` zu erfassen.

## Standbein 2: Agent Write-Path Check (Branch feature/write-path-check)

Stand: 2026-10-03

### Erledigt (Schritt 1: Bestellannahme)
- Modell AuditOrder (Prisma), Status pending_payment -> paid.
- POST /api/audit/orders: validiert Konfiguration, legt Bestellung an, liefert Stripe-Checkout-Link (CHF).
- GET /api/audit/orders/:id: liefert Status ohne Konfiguration.
- Webhook: metadata.type = write_path_check -> markPaid (CAS, doppelte Webhooks lösen nichts aus).
- Test: Checkout-Session in CHF, 29000 Rappen, doppelter Webhook -> nur eine Zahlung.
- Nebenbefund behoben: Checkout-Helper setzte fest USD. Jetzt konfigurierbar.

### Offen (Schritt 2 bis 5)
2. Harness-Lauf pro bezahlter Bestellung. Offene Produktfrage: Kunden-Tools auf die vier Schreibaktionen abbilden (create_invoice, send_email, create_ticket, place_order). Vorschlag: Phase 1 nur diese vier, sonst Bestellung ablehnen.
3. Bericht und signierter Download-Link (Muster: FulfillmentService).
4. Tageslimits und Trace-Protokoll.
5. Englische Befund-Posts, nur mit Run-ID.

### Entscheidungen beim Menschen (nicht selbst getroffen)
- Rückerstattung bei gescheiterter Auslieferung.
- Rechtsform und Mehrwertsteuer.
- Tageslimit Posts (Vorschlag 2 pro Kanal).
- Ob Dienstleistungs-Zahlungen den Burn auslösen (aktuell nicht: Zweig beendet die Verarbeitung vor dem Burn).

### Hinweis Deploy
- Schema-Änderung (neue Tabelle AuditOrder). Deploy nur mit Freigabe. Vor Deploy DB-Backup auf CT 115 und Deploy-Skript prüfen (Datenbank wird nicht mehr überschrieben, Fix c1142a3).

### Schritt 2 erledigt: Auslieferung nach Zahlung
- AuditFulfillmentService: holt bezahlte Bestellungen (CAS paid -> running), prüft Tools gegen die vier Schreibaktionen, startet den Harness (Canary-Runner), erzeugt den Bericht und legt einen Download-Link an (48 h, max. 5 Downloads).
- Daemon-Tick ruft processPaidOrders auf, eine Bestellung pro Zyklus, Tageslimit AUDIT_DAILY_ORDER_LIMIT (Standard 5).
- GET /api/audit/download/:token liefert den Bericht.
- Getestet: Bestellung mit zulässigen Tools -> delivered, Bericht vorhanden, Download ok, falscher Token abgelehnt. Unzulässiges Tool -> rejected.
- Harness-Lauf nutzt Route R5 (DeepSeek) und Kostenlimit 0,5 USD pro Bestellung. Kosten pro Standard-Check ca. 0,14 USD.

### Voraussetzungen für Deploy (noch nicht erledigt)
- Canary-Runner muss auf CT 115 vorhanden sein (Pfad per CANARY_RUNNER_DIR), inklusive .env mit DEEPSEEK_API_KEY.
- Schema-Änderung (AuditOrder): DB-Backup auf CT 115 vor dem Deploy.

### ✅ LIVE-BLOCKER ENTSCHEIDUNGEN (2026-10-06 geklärt)

- [x] **Rückerstattung:** ✅ JA – Automatisch via Stripe Refund API bei rejected/failed
- [x] **Domain:** Günther hat bereits eigene Domain → nutze günther.ai/audit (nicht neue Subdomain)
- [x] **Rechtsform:** Einzelfirma, **keine MWST bis 100.000 CHF** (CH-Grenze) 
  - Preise als CHF netto ausweisen (MWST-Sätze: nicht anwendbar)
  - Test-Cohort (max. 5 Bestellungen) für Dokumentation & Treuhänder-Abklärung
  - Stripe-Kontoinhaber: privat (via rk_live_* Key)
- [x] **Post-Tageslimit:** ✅ 2 pro Kanal pro Tag (Reddit, X), HN manuell oder nicht

### Schritt 4 und 5 (Stand)
- Trace: jede bearbeitete Bestellung wird als AUDIT_FULFILMENT im Trace-Protokoll gespeichert, mit Endstatus.
- Befund-Posts: AuditPostService baut englische Texte nur aus einem abgeschlossenen Lauf (Run-IDs werden genannt). Tageslimit pro Kanal (AUDIT_POSTS_PER_DAY, Standard 2). Veröffentlichung ist standardmäßig aus (AUDIT_POSTS_ENABLED).
- Noch nicht verdrahtet: der eigentliche Aufruf von Reddit und X mit diesem Text. Das kommt erst, wenn das Flag gesetzt wird.

### Verkauf und Kauf-Simulation (Stand 2026-10-03)
- Verkaufsseite: public/audit/index.html (englisch, drei Stufen, Tool-Eingabe, E-Mail). Danke-Seite: public/audit/thanks.html (zeigt Status bis Auslieferung).
- Kauf-Simulation: canary-experiment/results/repro/sim-purchase.mjs. Bestellung, signierter Webhook, Wiederholung, Auslieferung durch den Daemon, Download, falscher Link. Alle neun Prüfungen bestanden.
- Die Simulation ersetzt keine echte Kartenzahlung. Die Zahlung ist simuliert, der Checkout selbst ist echt (Stripe-Session in CHF, danach verfallen).
- Vor Live-Schaltung zu entscheiden (nicht selbst getroffen): Domain für /audit, Rückerstattungsregel, ~~Impressum und AGB für den Verkauf~~, MWST-Ausweis.

### Impressum, AGB & Datenschutz (erledigt 2026-06)
- `public/impressum.html`, `public/agb.html`, `public/datenschutz.html` vorhanden und vollständig.
- Footer-Links auf allen 4 Audit-Seiten (DE index+thanks, EN index+thanks) → Impressum, Datenschutz, AGB/Terms.
- AGB-Akzeptanz-Checkbox im Bestellformular (DE+EN), nicht vorausgewählt, mit JS-Validierung.
- Englische AGB unter `public/en/terms.html`.
