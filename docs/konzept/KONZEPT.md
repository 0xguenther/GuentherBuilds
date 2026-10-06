# Günther — Geschäftskonzept (v1)

Stand: 2026-10-03. Status: Entwurf, zur Umsetzung freigegeben.

## 1. Was Günther ist

Ein autonomer Betreiber, der sein Geschäft selbst führt: Nachfrage erzeugen, verkaufen, ausliefern, abrechnen und entscheiden, welche Angebote weiterlaufen. Der Mensch setzt Grenzen und entscheidet nur über Rechtliches und Geld außerhalb dieser Grenzen.

## 2. Zwei Standbeine

**Standbein 1: Produkte.** Die bestehenden Angebote (Günther Craft, Claw Mart, Clawcommerce) laufen weiter wie bisher. Sie werden nicht ausgebaut, bis Verkaufszahlen vorliegen.

**Standbein 2: Dienstleistung.** Der Agent Write-Path Check (Abschnitt 4). Das ist das neue, aktiv verkaufte Angebot.

## 3. Positionierung

Zielgruppe: Entwickler und kleine Teams, die Agenten mit Schreibrechten bauen (Rechnungen, Mails, Bestellungen, Posts). Sprache: Englisch.

Botschaft: „Your agent duplicated the invoice. Here is the test that shows it."

Abgrenzung: keine Beratung, keine Abos in Version 1, keine Prüfung fremder Systeme ohne Zugriff, keine Krypto- oder Token-Themen.

## 4. Das Angebot, gestaffelt

| Stufe | Inhalt | Preis (CHF) | Auslieferung |
|---|---|---|---|
| Quick Check | Statische Prüfung der Schreibpfade anhand der Tool-Definitionen, 10 Fehlerfälle in Simulation | 90 | 24 h, automatisch |
| Standard Check | Vollständige Läufe (100 pro Route), Befunde, reproduzierbare Testläufe mit Run-IDs | 290 | 3 Werktage, automatisch |
| Fix-Paket | Standard Check plus konkrete Korrekturvorschläge mit Patch für die gefundenen Stellen | 690 | 5 Werktage, automatisch erzeugt, nicht automatisch angewendet |

Keine Stufe enthält Scans fremder Live-Systeme.

## 5. Akquise

1. **Befunde öffentlich machen.** Englische Posts auf Reddit (r/AI_Agents, r/LocalLLaMA) und Hacker News, mit echten Run-IDs. Keine Werbesprache, nur Ergebnisse.
2. **Günthers eigenes Protokoll.** Der Burn-Fehler und der X-Fehler, die wir in Günther gefunden und behoben haben, werden als Fallstudie veröffentlicht.
3. **Mini-Check als Referenz.** Statische Prüfung öffentlicher Open-Source-Agenten. Das erzeugt Sichtbarkeit und Vertrauen, keine aktiven Tests.
4. **Verkaufsseite.** Englisch, mit Stufen, Beispielbericht und Bestellung über Stripe-Checkout.

## 6. Ablauf ohne menschliche Klicks

Bestellung → Zahlung über Stripe-Webhook → Konfiguration des Kunden wird geprüft → Harness läuft → Bericht wird erstellt und über einen signierten Link ausgeliefert → Quittung über Stripe.

Automatisch: Posts, Bestellannahme, Auslieferung, Trace-Protokoll.

Begrenzt im Code: maximal 2 Posts pro Tag pro Kanal, Ausgabenlimit pro Tag, kein Post ohne Run-ID, kein Post mit ungeprüften Zahlen.

## 7. Entscheidungsregeln

- **Kill-Kriterium nach 30 Tagen:** Weiter, wenn mindestens 500 Besucher aus Entwicklerkanälen kommen und 10 Bestellungen eingehen. Bei weniger als 3 Bestellungen wird die Dienstleistung gestrichen.
- **Bei Erfolg:** Ausbau auf Abo-Modell für Überwachung, erst nach 10 Bestellungen.
- **Bei Misserfolg:** Günther bleibt als öffentliches Experiment mit Protokoll. Harness wird als Open Source veröffentlicht.

## 8. Entscheidungen, die beim Menschen liegen

- Rückerstattung bei gescheiterter Auslieferung: automatisch oder nicht
- Rechtsform und Mehrwertsteuer
- Tageslimit für Posts (Vorschlag: 2 pro Kanal)

## 9. Nicht-Ziele

Kein Abo in Version 1. Kein Scan fremder Systeme. Keine Versprechen über Umsatz oder Rendite. Keine Zahlen, die nicht aus einem Lauf stammen.
