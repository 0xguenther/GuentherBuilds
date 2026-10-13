# Günther — Geschäftskonzept & Produktstrategie

Stand: 2026-10-13  
Status: **Vollständig umgesetzt & Live in Produktion**  
Live-System: [https://0xguenther.org](https://0xguenther.org) | [English Audit](https://0xguenther.org/en/audit/)  

---

## 1. Was Günther ist

Ein autonomer Betreiber auf Proxmox VE (CT115), der sein Micro-Business eigenständig führt: Nachfrage erzeugen, verkaufen, ausführen, abrechnen und über Produktiterationen entscheiden. Der Betreiber setzt ethische und rechtliche Grenzen — alle operativen Abläufe laufen ohne menschliche Klicks ab.

---

## 2. Die zwei Standbeine

- **Standbein 1: Produkte (Passiver Cashflow):** Die etablierten Angebote (Günther Craft $49, Claw Mart MCP-Skills $29–$49, Clawcommerce $2.000+) laufen auf der Plattform weiter.
- **Standbein 2: Dienstleistung (Aktiv skaliertes Flaggschiff):** Der **Agent Write-Path Check**. Automatisierte Sicherheits- und Resilienzprüfung für Entwickler von LLM-Agenten mit Schreibrechten.

---

## 3. Positionierung & Botschaft

- **Zielgruppe:** Entwickler, KI-Startups und Software-Teams, die LLM-Agenten mit Tool-Calling und Schreibrechten bauen (Rechnungen, E-Mails, ERP-/Datenbank-Einträge, Support-Tickets).
- **Kernbotschaft:** *„Your agent duplicated the invoice. Here is the test that shows it.“*
- **Differenzierung:** Keine vage Beratung, keine monatlichen Lock-in-Abos in Phase 1, keine unsicheren Live-Scans fremder Server — sondern deterministische Tests gegen die Tool-Schemata und System-Prompts des Kunden.

---

## 4. Das Angebot (Einheitlich in USD)

| Stufe | Inhalt & Methodik | Preis (USD) | SLA & Bereitstellung |
|---|---|---|---|
| **Quick Check** | Statische Pfadanalyse der Tool-Definitionen, 10 simulierte Fehlerfälle (C01–C10) in isolierter Sandbox. | $90 | < 24 h, vollautomatisch via Resend & Download-Token |
| **Standard Check** | Vollständige Testläufe gegen Edge-Cases, Retry-Stürme, Netzwerk-Ausfälle, Modell-Benchmark, reproduzierbare Run-IDs. | $290 | < 3 Werktage, vollautomatisch |
| **Fix-Paket** | Standard Check plus konkrete Code-Patches, Idempotenz-Muster und Reparaturvorschläge für das Repository. | $690 | < 5 Werktage, automatisch generiert |

---

## 5. Vollautonome Multi-Channel-Akquise

Günther akquiriert Kunden selbstständig über drei Kanäle unter strikter Einhaltung von Qualitäts- und Frequenzlimits:

1. **Hacker News (`0xguenther`):**
   - Echte Benchmark-Daten und Fallstudien (Show HN / Ask HN).
   - Ausführung über den VM100 Browser-Poster (`10.0.1.233:9333`) mit fnid/fnop CSRF-Handling.
   - Limit: Max. 1 Post pro Tag, 3 Posts pro Woche.
   - Live-Launch (2026-10-13): [news.ycombinator.com/item?id=50068634](https://news.ycombinator.com/item?id=50068634).
2. **Reddit (`GuentherBuilds`):**
   - Veröffentlichung technischer Architektur-Berichte in r/SideProject und r/AI_Agents via Headless Brave CDP auf VM100.
   - Limit: Max. 2 Posts pro Tag.
3. **X / Twitter ([@GuentherBuilds](https://x.com/GuentherBuilds)):**
   - Tägliche Veröffentlichung von Inferenz-Kennzahlen, Benchmark-Zahlen und BaseScan Proof-of-Burn Nachweisen via X API v2.
   - Limit: Max. 2 Posts pro Tag.
4. **Reach Tracking (`/api/reach`):**
   - Präzise Messung aller Kampagnen-URLs (`utm_source`, `utm_content`) zur Konversionsanalyse.

---

## 6. End-to-End Ablauf ohne manuelle Eingriffe

```
Kunde konfiguriert Check 
  → Direkter Stripe Checkout (USD) 
  → Webhook `checkout.session.completed` (atomarer CAS `pending` -> `paid`) 
  → Daemon-Tick reserviert Auftrag (`running`) 
  → Canary Test Harness führt C01-C10 Läufe aus 
  → Generierung des Audit-Reports (HTML/MD) 
  → Signierter HMAC-SHA256 Token (48h TTL, max 5 Downloads) 
  → E-Mail-Zustellung via Resend API 
  → viem Proof-of-Burn auf Base L2 (10 GUNTER / Cent an 0x...dEaD) 
  → Status: `delivered`
```

---

## 7. Strategischer Rahmen & Entscheidungsmatrix (Arsenal-Modell)

Auf Beschluss vom **2026-10-06** wurde das ursprüngliche binäre Kill-Kriterium („Abschaltung bei Nichterreichen“) durch das **Arsenal-Modell** ersetzt:

```
Diagnostik-Regel bei Auswertung:
  < 300 Besucher        → Visibility-Problem (Distribution optimieren, kein Code-Umbau)
  ≥ 500 Besucher        → Conversion-Rate prüfen:
    < 0.3% Conversion   → Angebot überarbeiten oder Arsenal-Pivot zu AgentWatch / PromptDoctor
    0.3% - 1.0%         → Starkes Signal: Copywriting & Pricing feinschleifen
    ≥ 1.0%              → Voller Erfolg: Dienstleistung skalieren
```

- **Bei Zielerreichung:** Skalierung des Agent Checks + Einführung von automatisierten Monitoring-Abos.
- **Bei Nichterreichen trotz Traffic:** Direkter Schwenk zu den vorbereiteten Alternativprodukten aus dem Arsenal (z.B. AgentWatch für kontinuierliche Laufzeitüberwachung).

---

## 8. Umgesetzte kaufmännische & rechtliche Leitplanken

- **Automatische Rückerstattung:** Vollständig implementiert. Scheitert ein Audit-Lauf oder schlägt die Validierung fehl, erstattet das System die Stripe-Zahlung sofort automatisiert zurück.
- **Rechtsform & Steuern:** Schweizer Einzelfirma. Keine MWST-Pflicht bis zur gesetzlichen Grenze von 100.000 CHF. Alle Preise sind Endkundenpreise in USD.
- **Frequenzbegrenzungen:** Im Code fest verankert (X: 2/Tag, Reddit: 2/Tag, HN: 1/Tag & 3/Woche).
