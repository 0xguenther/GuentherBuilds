# STAND — Günther
Stand: 2026-10-16 | Letzter Agent: Claude (Posting-Kette gehärtet, LLM + Kuma repariert) | Historie: `docs/STAND_HISTORIE_20261014.md`

## Status
- Läuft produktiv auf CT115 (`10.0.1.115:3000`, `gunther-core.service`), erreichbar unter `https://0xguenther.org`. Branch `master`; Änderungen vom 16.10. sind deployt, aber **noch nicht committet**.
- **Tests: 177/177 grün (23 Dateien).** TypeScript-Build ok. Remote Healthcheck ok.
- Frontend v3 (Design-System, Three.js ASCII-Büste) + Self-Service Checkout (Stripe, 3 Stufen USD) integriert.

## Posting-Kette (HN / Reddit) — Architektur
`gunther-core` (CT115) → HTTP `:9333` (Bearer) → **Browser-Poster** auf VM100 `10.0.1.233` (`browser-poster/server.mjs`, User-Unit `browser-poster`) → **Brave per CDP `127.0.0.1:9222`** (User-Unit `brave-cdp`, eingeloggte Sessions). X läuft separat über die X-API (OAuth 1.0a).
- **Selbstheilung:** Poster startet `brave-cdp` neu, wenn CDP tot ist (Cooldown 2 min). Beide Units `Restart=always`.
- **Watchdog** (`src/services/postingWatchdogService.ts`, jede Minute aus dem Daemon): Poster/Brave, Reddit-/HN-Login, X-Funkstille > `X_MAX_SILENCE_HOURS` (30). Statuswechsel einmalig im Log + Trace `POSTING_HEALTH`; optional Kuma-Push (`POSTING_KUMA_PUSH_URL`). Solange der Browser down ist, überspringen HN/Reddit ihre Zyklen.
- **Keine Doppelposts:** Schreibzugriffe fallen nur bei `BrowserPosterUnavailableError` (Verbindung verweigert / HTTP 503, nachweislich nichts gesendet) auf OAuth zurück. HN legt vor dem Senden einen `pending`-Claim an (zählt gegen Tages-/Wochenlimit); bei unklarem Ergebnis bleibt er bestehen → manuell auf `news.ycombinator.com/submitted?id=0xguenther` prüfen.
- Reddit läuft ohne OAuth komplett über den Poster (`/api/reddit/{listing,comment,submit,account}`). Account `GuentherBuilds`: 16 Tage, Karma 4 → laut `checkAccountHealth` nicht „ready“, daher nur hilfreiche Warm-up-Kommentare (max. 3/Tag, 4 Entwürfe/Zyklus), Promo erst nach 9 bestätigten Hilfs-Aktionen.

## LLM & Monitoring (seit 16.10.)
- **LLM:** OpenRouter (`OPENROUTER_MODEL=anthropic/claude-haiku-5.5`, ~0,10/0,50 USD je Mio. Tokens). Der frühere Key aus `Projects/Gunther` gehörte zu einem gelöschten OpenRouter-Konto („User not found“); CT115 + Tresor nutzen jetzt den Key aus `Projects/Gunther-Audit-OpenRouter` (25-USD-Limit, **geteiltes Budget mit dem Audit**). `LlmClient` sendet `reasoning: {enabled:false}`, sonst verbrauchen Reasoning-Modelle das Token-Limit und liefern leeren Text (der Tagespost fiel dadurch bisher immer auf den Fallback). Anthropic direkt: `ANTHROPIC_API_KEY` leer, Modell per `ANTHROPIC_MODEL` (Default `claude-sonnet-5-5`).
- **Kuma:** Push-Monitor **47** „Günther Posting-Kette (HN/Reddit/X)“ (CT107, Kopie von 45, Telegram), Intervall 300 s, 2 Retries à 60 s. URL = `POSTING_KUMA_PUSH_URL` in CT115 `.env` und im Tresor (`Projects/Gunther`, Notes = komplette `.env`, deckungsgleich mit CT115). DB-Backup `/opt/uptime-kuma-data/kuma.db.bak-20261016-guenther`.
- **Reddit-Entwürfe:** lokales Modell zuerst (auf CT115 nicht vorhanden → 30 min Pause), dann Cloud; Cloud-Antwort wird tolerant geparst (nur `threadId/body/relevant`). Relevanz streng: lose Treffer → `relevant=false`. `safeHelpfulComment` filtert weiterhin (Links, Domains, Produktnennung).
- Jeder Neustart von `gunther-core` startet sofort einen Reddit-Zyklus (max. 3 Hilfs-Kommentare/Tag). Am 16.10. 05:43/05:44 UTC liefen so zwei Kommentare in r/AI_Agents live (`t1_ph1ykcf`, `t1_ph1yor3`).

## Strategie: mitmachen statt bewerben (seit 16.10.)
- **Reddit (Hauptkanal):** hilfreiche Kommentare ohne Link/Produkt, mit Offenlegung „autonomous agent“, max. 3/Tag; Kandidaten-Filter erkennt Tool-Calls, Function-Calling, Retries, Timeouts, Idempotenz, MCP; Relevanz streng (lose Treffer = verworfen). Promo erst nach 9 bestätigten Hilfs-Aktionen.
- **HN: aus.** `HN_AUTOPOST_ENABLED` (Default 0). Link-Posts eines Karma-2-Kontos landen als `dead` (3 von 4 zuletzt), und HN-Richtlinien verbieten generierte Kommentare — automatisches Mitmachen dort würde das Konto gefährden. HN-Login-Alarm im Watchdog ist deshalb ebenfalls aus.
- **X:** Die API erlaubt keine Antworten auf fremde Tweets (403 „You can only reply to or quote posts where you are mentioned or are the author“, live getestet 16.10.). Mitmachen geht dort nur bei Erwähnungen (läuft, `handleIncomingMention`). Eigene Posts: Tagespost ist jetzt ein Daten-Insight (Duplikat-Schreibvorgänge je 100 Läufe) mit Link auf die Rohdaten, **ohne Preis/Verkaufstext** (`isValidPulse`, drei sachlich korrekte Offline-Fallbacks; der alte Fallback behauptete fälschlich „4/5 Modelle duplizieren“). Der Crypto-Scout bleibt aus (`SCOUT_ENABLED`, Default 0).

## Ziel & Messung (neu gesetzt 16.10.2026)
**Warum neu:** Das erste Fenster (07.10.–16.10.) war nicht sauber aufgestellt: 1065 „Besucher“ waren zu rund 80 % Aufrufe ohne Referrer (konstant 70–130 pro Tag, crawlerartig), es gab keine Quelle pro Besuch, und das Ziel (10 bezahlte Bestellungen) war aus dem Rauschen abgeleitet. Ergebnis des alten Fensters: 1 bezahlte Bestellung (07.10., Stufe quick, geliefert), 3 Checkouts, nachweisbar menschlicher Verkehr nur wenige Dutzend (Google ~42 Aufrufe, HN ~6, t.co ~5, Facebook ~5). Diese Zahlen sind die **Baseline**, nicht das Ziel.

**Neues Fenster:** 2026-10-17 bis 2026-11-16 (30 Tage), danach Entscheidung.
- **Qualifizierte Besucher** (Ziel 300): eindeutige Tages-Besucher mit Kampagnenquelle (`utm_source` x | reddit | hn | research) oder externem Referrer. Direktaufrufe ohne Referrer werden getrennt als „raw“ ausgewiesen und zählen nicht.
- **Bezahlte Bestellungen** (Ziel 3): Audit (Stufe quick/standard/deep) und andere Produkte, Status bezahlt/geliefert.
- Beides über `KILL_CRITERION_START`, `KILL_CRITERION_DAYS`, `KILL_TARGET_VISITORS`, `KILL_TARGET_ORDERS` in der `.env` änderbar (Standardwerte im Code).
- **Entscheidungsregel (Vorschlag, anpassbar):** am 16.11. weniger als 3 bezahlte Bestellungen → Experiment ablegen wie TNE (Forschungsseiten bleiben als Referenz bestehen); 3 oder mehr → weitermachen und neues Ziel setzen.
- **Auswertung:** `npm run kpi` auf CT115 (`/opt/gunther-core`) oder der tägliche Logeintrag `[Daemon] KPI …`; API `/api/metrics/funnel`. Der Funnel zeigt qualifizierte/rohe Besucher, Besucher der Forschungsseiten, Besuche je Kampagnenquelle, Referrer, Checkouts, Bezahlte.
- **Zuordnung:** X-Posts und Reddit-Daten-Post tragen `utm_source=x|reddit`; die Forschungsseiten verlinken den Audit mit `utm_source=research` (zeigt, ob Forschungsleser zu Kunden werden). Die Bot-Erkennung wurde um Link-Vorschau-Crawler und Skript-Clients erweitert.

## Reichweite (Plan seit 16.10.)
Prinzip: **ein verlinkbares Hauptstück, alle Kanäle verweisen darauf.** Hauptstück = `https://0xguenther.org/en/agent-write-path-research.html` (500-Läufe-Daten, FAQ, Article/FAQPage-JSON-LD, Canonical, Social-Cards; Quelle der Zahlen: Repo `0xguenther/agent-write-path-runs`).
- **Erledigt 16.10.:** Seite live, `llms.txt` (EN), Sitemap + Blog-Index ergänzt, Canonical/OG auf `/en/audit/`, X-Thread (5 Tweets, Zahlen gegen die Repo-Tabelle geprüft; erster Tweet `2110975792662421869`), Reddit: die ersten **zwei** Promo-Slots nach 9 Hilfs-Aktionen teilen die offenen Daten (`researchPost()`, Tabelle, offene Frage, keine Preise/Produkte), erst danach Produkt-Fakten.
- **Fallstudien (16.10., live):** fünf Seiten nach Fehlertyp mit Pro-Modell-Tabelle, Original-Transkript-Auszug (Link auf `raw/<run_id>.json`), Gegenmassnahme, FAQ: `agent-lost-reply-after-write`, `agent-false-success-tool-says-ok` (nur 1 von 50 Läufen korrekt), `agent-rate-limit-retry-behavior`, `agent-chained-tool-calls-duplicate-invoice`, `agent-malformed-reply-wrong-id`. Jede Zahl wird beim Bauen gegen `runs.jsonl` per `assert` geprüft. Hub-Seite listet sie, Sitemap + `llms.txt` kennen sie.
- **Tagespost rotiert** über die fünf Fallstudien (`PULSE_TOPICS`, ein Befund + Link mit UTM `campaign=research`); Test stellt sicher, dass jede verlinkte Seite existiert und in der Sitemap steht.
- **GitHub erledigt (16.10.):** `agent-write-path-runs` hat Topics (10), Beschreibung, Homepage = Forschungsseite und eine README mit Write-ups-Abschnitt. Zugang war schon da: Git Credential Manager (`git credential fill`) und Tresor `GitHub/0xguenther` (Scope `repo`, Ablauf 30.10.; Profil/Bio braucht `user`-Scope).
- **Nicht möglich/nicht gewollt:** Antworten auf fremde Tweets (X-API 403), HN-Kommentare/-Links (Richtlinien, Konto), GitHub-Profil/Bio per API (Token ohne `user`-Scope).
- **Nächste Hebel (nach dem ersten Messstand):** Bio (Token mit `user`-Scope nötig; Topics/Beschreibung/README sind erledigt), Verzeichnis-Einträge für die MCP-Module, DE-Version der Forschungsseite, englischer Blog-Artikel pro Fall (Long-Tail-Suche).

## Offen
- [ ] Öffentliche Referenz-Version `gunther-core` nicht parallel pflegen (Derivat).
- [ ] Stripe-Live-Modus prüfen sobald echte Bestellungen kommen.
- [ ] X-Reichweite: ~3 Impressionen/Tag bei 2–3 Posts/Tag; die 2 Growth-Insight-Posts/Tag (`publishBuilderInsight`) sind weiterhin Audit-/Produkt-Werbung mit Link — nach dem Messfenster entscheiden, ob sie wegfallen.
- [ ] Optional: eigener OpenRouter-Key für Marketing, damit das Audit-Budget (25 USD) nicht geteilt wird. `KUMA_PUSH_URL` (alter Heartbeat) ist weiterhin leer, durch Monitor 47 nicht mehr nötig.
- [ ] `BROWSER_POSTER_TOKEN` steht jetzt im Tresor (`Projects/Gunther`) und zusätzlich in der VM100-Unit — bei Rotation beide Stellen ändern.
