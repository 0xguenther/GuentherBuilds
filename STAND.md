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

## Offen
- [ ] Öffentliche Referenz-Version `gunther-core` nicht parallel pflegen (Derivat).
- [ ] Stripe-Live-Modus prüfen sobald echte Bestellungen kommen.
- [ ] X-Reichweite: ~3 Impressionen/Tag bei 2–3 Posts/Tag — Inhalt/Konto-Strategie, kein Infra-Thema.
- [ ] Optional: eigener OpenRouter-Key für Marketing, damit das Audit-Budget (25 USD) nicht geteilt wird. `KUMA_PUSH_URL` (alter Heartbeat) ist weiterhin leer, durch Monitor 47 nicht mehr nötig.
- [ ] `BROWSER_POSTER_TOKEN` steht jetzt im Tresor (`Projects/Gunther`) und zusätzlich in der VM100-Unit — bei Rotation beide Stellen ändern.
