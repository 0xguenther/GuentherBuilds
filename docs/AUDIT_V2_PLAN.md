# Audit v2: den Agenten des Kunden prüfen

Stand: 2026-10-07. Bestellungen sind pausiert (`AUDIT_ORDERS_ENABLED` nicht gesetzt => POST /api/audit/orders gibt 503).

## Problem v1

- Die Bestellung liefert nur Tool-Namen; geprüft wird nur `validateTools`.
- Der Lauf nutzt immer `SYSTEM_PROMPT` + `TOOLS` aus `/opt/canary-experiment/src/agent.mjs`, Route R5 und die Fälle C01-C10 (Rechnung/Mail/Ticket/Bestellung).
- Deshalb bekommt jeder Kunde denselben Bericht. Quick = 1 Lauf pro Fall: 95-%-Intervall zu breit (60-98 %).
- Der Bericht ist die Vorlage aus dem Experiment (Routen, Canary, Phasen) und enthält keine Empfehlungen.

## Was sich wiederverwenden lässt

- `mock.mjs`: Fehlerarten pro Tool und Aufruf-Nummer (`timeout_lost`, `http429`, ...), Zustand pro Schreib-Tool, Prüfung über `expect`-Zählungen.
- `agent.mjs/runCase`: Tool-Loop, Budget, Preise.
- `metrics-v2` / `report-v2`: Wilson-Intervall, HTML-Bericht.

## v2 Konfigurations-Audit (Quick/Standard)

1. Bestellformular: Modell (Auswahl aus den unterstützten Routen), System-Prompt (max. 8k Zeichen), Tool-Definitionen als JSON-Schema. Jedes Tool wird als `read` oder `write` markiert (wenn nichts angegeben ist, anhand des Namens erraten).
2. Konfiguration gespeichert in `AuditOrder.configJson`, gleich wie bisher. Zod-Schema mit Grössenlimits.
3. Runner (`run-customer.mjs`): `runCase` bekommt `systemPrompt`, `tools`, `route` aus der Bestellung statt der Konstanten.
4. Generischer Mock: Zustand pro Schreib-Tool und gültige Antworten aus dem Tool-Schema, mit denselben Fehlerarten wie heute.
5. Fall-Generator: Schreib-Tools x {timeout_lost, http429, malformed, duplicate_request}, dazu Lese-Tool-Ausfall. Die Aufgabe für den Lauf kommt aus einer Vorlage mit dem Tool-Namen und Beispiel-Argumenten aus dem Schema.
6. Läufe: Quick 3, Standard 5, Deep 10 pro Fall. Zum Vergleich ein Lauf mit Referenzmodell + Kunden-Prompt (zeigt: Modell- oder Prompt-Problem).
7. Bericht neu: nur der Agent des Kunden; pro Fehlerfall Ergebnis, Auszug aus dem Ablauf, Fehlerklasse und eine konkrete Empfehlung (Prompt-Ergänzung, Idempotenzschlüssel, Retry-Politik). Kein Canary-/Routen-Vokabular.
8. Landingpage + AGB: Ablauf genau so beschreiben (simulierte Tools mit Fehlereinspielung, Kunden-Prompt + Modell).

## v3 Endpunkt-Audit (Deep/Fix)

- Der Kunde lässt seinen echten Agenten gegen unseren Mock-MCP-Server laufen (Token pro Bestellung, zeitlich begrenzt).
- Damit werden auch eigener Retry-Code, Idempotenz und Timeouts geprüft. Bewertung über den Mock-Zustand, wie in v2.

## Freigabe

- Erst wieder `AUDIT_ORDERS_ENABLED=1`, wenn v2 mit 2 verschiedenen Testkonfigurationen zwei sichtbar verschiedene Berichte liefert und Carlo die Berichte freigegeben hat.
