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

## Offene Punkte
- **Token-Rotation nötig:** Im `.git/config` stand bis 2026-10-03 ein GitHub-PAT im Klartext in der Remote-URL. Remote ist bereinigt (`https://github.com/0xguenther/GuentherBuilds.git`), der Token selbst ist aber **noch nicht widerrufen**. Zu tun: Token in GitHub widerrufen, neuen im KeePassXC-Tresor ablegen. Auth läuft jetzt über Git Credential Manager.
- **Uncommitted Änderung:** `scripts/deploy-to-proxmox.ps1` (noch nicht geprüft/committed).
- **Remote-Historie:** `origin` zeigt auf dasselbe Repo wie `gunther-core` (`0xguenther/GuentherBuilds`). Vor einem Push prüfen, ob Historien kollidieren.
- **Strategie-Frage offen:** Mögliche Neuausrichtung von "digitale Produkte verkaufen" hin zu "Services betreiben" (AgentCheck, AgentWatch, …). Noch nicht entschieden, keine Umsetzung begonnen.

## Status: Phase 1 COMPLETE ✅

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
- [ ] MetricsService → Funnel-Metriken (Besucher → Checkout → Zahlung)
- [ ] any-Typen abbauen (15+ Stellen, später)

### ⏳ Phase 2 – Produkte ausreifen (Tag 4–10)
- [ ] Write-Path Check: Canary-Runner auf CT 115, Bericht-Erzeugung, Beispiel-Report Live
- [ ] Produkte (Craft, Claw Mart, Clawcommerce): Checklisten pro Produkt
- [ ] Live-Blocker abhaken (Nutzer: Rückerstattung, Domain, Rechtsform/MWST)

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
