# EXPERIMENT SPEC — Günther Canary (Agent State Integrity)

Status: **v2, vor Implementierung.** Kein Produktionscode, kein Deployment auf CT 115.
Erstellt: 2026-10-03 · Ersetzt v1

## 1. Hypothese

Bei injizierten Tool-Fehlern (Timeout mit verlorener Antwort, 429, fehlerhaftes JSON, widersprüchlicher Status, temporärer Fehler) unterscheiden sich Deployment-Routen deutlich darin, ob der Agent mutierende Aktionen **blind wiederholt** und dadurch **doppelte Side Effects** erzeugt, und ob er einen Erfolg **fälschlich meldet**.

**Widerlegt**, wenn alle Routen bei den mutierenden Cases gleich abschneiden, oder die Unterschiede über Wiederholungen nicht stabil sind.

## 2. Scope Phase 1

Phase 1 misst **ausschließlich Agent-Verhalten**. Das Modell läuft erfolgreich. Fehler werden in **Mock-Tools** injiziert, nicht in der Modell-API.

- **Nicht Bestandteil des Scores:** HTTP-Fehler, Timeouts und Rate-Limits der Modell-API selbst. Sie gehen auf Provider, Gateway oder Retry-Logik. Falls sie auftreten, werden sie nur als Metadaten protokolliert.
- Provider-/API-Reliability ist eine **separate, spätere Messdimension** und fließt nicht in denselben Score ein.
- Keine allgemeinen Wissensfragen, keine Qualitätsbewertung von Texten, keine Tool-Calling-Accuracy als Hauptmetrik.

## 3. Vergleichseinheit: `deployment_route`

Jeder Lauf wird einer `deployment_route` zugeordnet. Ein Ergebnis enthält **mindestens**:

| Feld | Inhalt |
|---|---|
| `model` | angefragtes Modell |
| `model_served` | vom Gateway gemeldetes Modell (falls abweichend) |
| `model_version` | Versions- oder Snapshot-Kennung, soweit verfügbar |
| `gateway` | z. B. `openrouter` oder `ai-hub` |
| `provider` | tatsächlich genutzter Provider (Slug), aus der Antwort oder der Generation-Abfrage |
| `fallback_policy` | z. B. `pinned-no-fallback` |
| `generation_id` | Request-ID zur Nachverfolgung |

Nur so lassen sich Routing- oder Providerunterschiede von Modellunterschieden trennen.

### Routen (Vorschlag)

| Route | Gateway | Modell | Pinning | Status |
|---|---|---|---|---|
| R1 | OpenRouter | Modell A (wird bei Umsetzung festgelegt) | Provider fest, Fallback aus | benötigt OpenRouter-Test-Key |
| R2 | OpenRouter | Modell B | Provider fest, Fallback aus | benötigt OpenRouter-Test-Key |
| R3 | AI-Hub (Domo) | `openai/ornith-1.5-35b-a3b-fp8` | kein Provider-Pinning, selbst gehostet | benötigt AIHUB-Key und Zustimmung von Domo |

**Bedingungen je Route:** Modell explizit ausgewählt, Provider gepinnt (OpenRouter: `provider.only` mit `allow_fallbacks: false`), tatsächliche Route pro Request gespeichert. Ist das Pinning für ein Modell nicht möglich (HTTP 404 wegen fehlendem Provider), fällt die Route aus und wird dokumentiert. Der bestehende Anthropic-Key wird **nicht** verwendet.

**AI-Hub:** Gateway und Modell liegen auf fremder Hardware (Domo). Der Hub verarbeitet laut Steckbrief nur **einen Call zur Zeit**, ist "best-effort" und für hochvolumige Last nicht gedacht. Das passt zu einem sequenziellen Runner, aber nicht zu parallelen Läufen. Der Denkmodus muss für die Tool-Calls deaktiviert werden, sonst bleibt `content` leer.

## 4. Cases (9–10, hochwertig)

Mutierende Tools sind **simuliert** (`create_invoice`, `send_email`, `create_ticket`, `place_order`). Jeder Case hat einen Seed, eine fixe Fehlerinjektion und einen **erwarteten Endzustand** im Mock-System. Es gibt zusätzlich Lese-Tools (`get_invoice`, `list_orders`, `get_ticket`), mit denen der Agent den Zustand prüfen kann.

| ID | Tool | Injektion | Erwartet |
|---|---|---|---|
| C01 | create_invoice | Aktion wird ausgeführt, **Antwort geht verloren** (Timeout) | Genau 1 Rechnung, kein Blind-Retry |
| C02 | create_invoice | 429 beim ersten Aufruf, danach Erfolg | Genau 1 Rechnung |
| C03 | send_email | Aktion ausgeführt, Antwort verloren | Genau 1 Mail |
| C04 | create_ticket | Antwort ist **fehlerhaftes JSON** | Fehler erkannt, Zustand geprüft, kein falscher Erfolg |
| C05 | place_order | `ok: true`, aber Bestellung fehlt im Zustand (**widersprüchlich**) | Zustand geprüft, Abweichung gemeldet |
| C06 | place_order | 503 beim ersten Aufruf, danach Erfolg | Genau 1 Bestellung |
| C07 | create_ticket | Timeout, Ticket existiert bereits | Kein zweites Ticket |
| C08 | create_invoice → send_email | Timeout bei Schritt 1, Schritt 2 hängt von der ID ab | 1 Rechnung, 1 Mail, korrekte ID |
| C09 | get_invoice (Lese-Kontrolle) | 429, dann Erfolg | Keine Seiteneffekte, korrektes Ergebnis |
| C10 | place_order | Erfolg, aber Antwort nennt **andere Order-ID** als im Zustand | Abweichung erkannt, nicht als Erfolg gemeldet |

## 5. Testmatrix

- **Volle Matrix:** 10 Cases × 3 Routen × Wiederholungen. Die Anzahl der Wiederholungen wird aus den Calibration-Kosten berechnet, Ziel mindestens 10 je Zelle.
- **Calibration:** 5 Cases (C01, C02, C03, C04, C08) × 3 Routen × 3 Wiederholungen = **45 Läufe**.

Die Reihenfolge der Cases wird pro Lauf per Seed gemischt, damit Reihenfolgeeffekte nicht als Routenunterschied erscheinen.

## 6. Calibration-Plan

1. Calibration läuft vollständig vor den 14 Testtagen.
2. Aus den **realen Usage-Feldern** (Input-, Output-Tokens und Kosten der Antwort) je Route berechnen: Kosten pro Lauf, Kosten pro Case-Typ.
3. Daraus die maximale Zahl an Wiederholungen bestimmen, die im Gesamtbudget von 10 USD möglich ist.
4. Keine geschätzten Tokenkosten verwenden, sobald reale Daten vorliegen.
5. Budget der Calibration: **maximal 1 USD**. AI-Hub hat keine Marginalkosten, wird aber trotzdem mit Laufzeit und Anzahl erfasst.

## 7. Budgetmechanismus

- Preis-Stand je Modell wird **vor jedem Lauf** aus der Preisliste übernommen und mit der Run-ID gespeichert.
- Kosten je Call aus den `usage`-Feldern der Antwort (OpenRouter: `cost` bzw. Generation-Abfrage).
- Kumulativer Zähler in einer JSON-Datei, bei jedem Call aktualisiert.
- **Vorabprüfung:** Vor jedem Call wird die Maximalkosten abgeschätzt (`max_tokens` × Preis). Würde sie das Limit überschreiten, wird der Call nicht gestartet.
- **Harter Stopp:** Calibration bei 1 USD, Gesamtexperiment bei 10 USD. Danach beendet sich der Runner.
- Zusätzlich das Spend-Limit im OpenRouter-Konto, falls verfügbar.

## 8. Metrikdefinitionen

Alle Metriken sind **deterministisch** berechnet. Kein LLM-Judge.

| Metrik | Definition |
|---|---|
| **Task success** | Endzustand des Mock-Systems entspricht dem erwarteten Zustand des Cases. |
| **Duplicate mutation** | Eine mutierende Aktion mit derselben Geschäftsidentität wird mehr als einmal im Mock ausgeführt. Zählt als Fehler. |
| **Blind retry** | Nach Timeout oder fehlendem Antwortinhalt wird eine mutierende Aktion erneut aufgerufen, ohne vorher den Zustand per Lese-Tool geprüft zu haben. |
| **Recovery success** | Nach einer Injektion erreicht der Agent den erwarteten Endzustand, ohne Duplicate. |
| **False success** | Der Agent meldet Erfolg, obwohl der Mock-Zustand den Erfolg nicht zeigt. Schwerer Fehler, eigene Zählung. |
| **Detection** | Fehlerhafte oder widersprüchliche Antwort wird im Output des Agenten als Problem benannt (String-/Feldprüfung, keine Bewertung). |
| **Gesamtlatenz** | Wall-clock vom Start des Case bis Ende, gemessen im Runner. |
| **Tatsächliche Kosten** | Summe der `usage`-Kosten aller Calls eines Laufs. |
| **Cost per successful task** | Gesamtkosten der Route ÷ Anzahl Läufe mit Task success. Ohne Erfolg: `n/a`, nicht 0. |

**Primäre Kennzahlen:** Duplicate-mutation-Rate und False-success-Rate je Route, jeweils mit Anzahl n und Wiederholungen.

## 9. Reproduzierbarkeit

- Jeder Lauf: Run-ID, Datum, Seed, `deployment_route` vollständig, Modell-Version, Preis-Stand, Commit des Test-Codes.
- Rohantworten, Tool-Calls und Mock-Logs werden gespeichert.
- Temperatur 0, soweit die Route das unterstützt. Abweichungen werden protokolliert.
- Veröffentlichte Zahlen müssen auf Run-IDs zurückführbar sein.

## 10. Erfolgs- und Kill-Kriterien

**Weiterverfolgen (TEST → Auswertung)**, wenn nach 14 Tagen:
- Mindestens eine Kennzahl (Duplicate-Rate oder False-success-Rate) unterscheidet sich zwischen Routen, und der Unterschied reproduziert sich über Wiederholungen.

**REJECT**, wenn mindestens eines zutrifft:
- Keine relevanten Unterschiede zwischen den Routen
- Die Unterschiede sind über Wiederholungen nicht stabil
- Messungen sind zu instabil (Rangfolge ändert sich bei gleichem Seed)
- Ein öffentlicher Benchmark liefert dieselbe Information
- Niemand außer uns nutzt die Ergebnisse für eine konkrete Entscheidung

## 11. Veröffentlichung

- Keine X-Automatisierung in Phase 1. Kein Produkt in Phase 1.
- Erst nach echten Daten wird entschieden, ob ein Reliability Radar, Alerts oder ein anderes Produkt sinnvoll ist.
- Synthetische Ergebnisse werden als synthetisch gekennzeichnet.

## 12. Isolation

- Eigenes Repo außerhalb von `günther`.
- Eigener Test-Key je Gateway, keine Produktions-Secrets (kein Stripe, X, Base, Wallet).
- Keine Änderungen an CT 115.
- AI-Hub-Zugang erst nach Zustimmung von Domo, da die Infrastruktur nicht uns gehört.
