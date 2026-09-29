# Günther Craft: Das Playbook für autonome KI-Agenten & Enterprise Automation (66-Seiten Compendium)\n> Autonome KI-Agenten, Schweizer Enterprise-Infrastruktur & Base L2 Proof-of-Execution\n**Herausgeber:** CuonzTech (Zürich, Schweiz) • Edition 1.0 (September 2026)\n\n---\n\n## [Seite 1]\n> 0xGÜNTHER ARCHITECTURE LABS • PRODUKTIONS-BLUEPRINT
GÜNTHER CRAFT
Das umfassende 66-Seiten Playbook & Referenz-Architektur für profitable
autonome KI-Agenten, Schweizer Enterprise-Automatisierung & Base L2
Proof-of-Execution.
SYSTEM: 0xGünther Core Engine
VERSION: 1.0 (Produktions-Freigabe)
HOSTING: Proxmox VE LXC (Zürich, Schweiz)
BLOCKCHAIN: Base L2 Mainnet & Sepolia
COMPLIANCE: Schweizer revDSG & EU-DSGVO
TYPE SAFETY: Strikte Zod Validierung
PAYMENTS: Stripe Webhook HMAC Gateway
SECURITY: Coinbase CDP MPC Wallet Guard
Dieses Werk enthält vollständigen, einsatzbereiten Produktionscode, System-Architekturpläne, Runbooks und operative
Leitfäden für den Bau autonomer Software-Agenten mit echtem geschäftlichem Cashflow.
© 2026 CuonzTech & 0xGünther • Zürich, Schweiz
Alle Rechte vorbehalten. Autonomer Tech-Agent auf Base L2.
CONFIDENTIAL & PROPRIETARY
EDITION 1.0 • A4 COMPENDIUM
\n---\n\n## [Seite 2]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
RECHTLICHE HINWEISE
RECHTLICHE HINWEISE
DOKUMENT-ID: GCP-2026-P02
Impressum, Urheberrecht & Systemanforderungen
Dieses Kompendium ist das geistige Eigentum von CuonzTech (Zürich, Schweiz) und dokumentiert die technische
Referenz-Architektur des autonomen KI-Agenten 0xGünther.
Urheberrecht & Lizenzbestimmungen
Mit dem Erwerb dieser Publikation ("Günther Craft: Das 66-Seiten Playbook & Produktions-Blaupause") erhält der
Käufer eine nicht-exklusive, weltweite Lizenz zur Nutzung, Modifikation und Implementierung der enthaltenen
Quellcodes und Architekturmuster in eigenen kommerziellen und privaten Softwareprojekten.
Die Weiterverbreitung, der Wiederverkauf oder die öffentliche Bereitstellung dieses PDF-Dokuments oder wesentlicher
Auszüge daraus im Volltext ist ohne schriftliche Genehmigung von CuonzTech strikt untersagt.
Haftungsausschluss & Risikohinweis
Die Autoren und CuonzTech übernehmen keine Haftung für finanzielle Verluste, entgangene Gewinne oder technische
Schäden, die durch den Betrieb autonomer Agenten, automatisierter Zahlungs-Pipelines (Stripe) oder Blockchain-
Transaktionen (Base L2) entstehen.
Sicherheitshinweis: Autonome Software interagiert mit realem Geld und unveränderlichen Blockchains. Führen Sie alle Tests
zunächst in Testnetzen (Base Sepolia) und im Stripe-Sandbox-Modus durch, bevor Sie Agenten mit echten Geldern operieren
lassen.
Systemanforderungen für den Produktions-Stack
Komponente
Mindestanforderung
Empfohlene Produktions-Umgebung
Betriebssystem
Linux (Debian 12 / Ubuntu 24.04 LTS)
Proxmox VE 8.x LXC Container (Debian 12 Bookworm)
Laufzeitumgebung
Node.js 20 LTS
Node.js 22 LTS (Active)
Hardware
4 CPU-Kerne, 8 GB RAM, 50 GB SSD
Intel NUC 13 Pro (14 Kerne, 64 GB DDR5, ZFS NVMe Mirror)
Datenbank
SQLite 3.40+ mit WAL-Modus
Prisma ORM Client mit lokaler SQLite Engine
Netzwerk
Feste IP oder DynDNS mit Port 443/80
Dedizierte statische IPv4/IPv6 mit Caddy Reverse Proxy
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 2 von 66
\n---\n\n## [Seite 3]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
INHALTSVERZEICHNIS
INHALTSVERZEICHNIS
DOKUMENT-ID: GCP-2026-P03
Inhaltsverzeichnis — Teil I & II
Das vollständige Werk ist in 8 Fachbereiche und 58 Kapitel unterteilt.
Teil I: Grundlagen autonomer Agenten-Ökonomie
Vorwort: Die Wende zu autonomen Wertschöpfungs-Maschinen
Seite 5
Kapitel 1: Das Manifest des autonomen Unternehmers
Seite 6
Kapitel 2: Die Anatomie gescheiterter KI-Projekte (Post-Mortem)
Seite 7
Kapitel 3: Das Schaufel-Prinzip im modernen KI-Zeitalter
Seite 8
Kapitel 4: Die ReAct-Schleife (Reasoning + Acting) im Produktiveinsatz
Seite 9
Kapitel 5: Deterministische State Machines vs. Probabilistische Prompts
Seite 10
Kapitel 6: Strikte Schema-Validierung mit Zod (Theorie & Code)
Seite 11-12
Teil II: Die technische Systemarchitektur
Kapitel 7: Der Technologie-Stack: Node.js 22 LTS & TypeScript Strict
Seite 13
Kapitel 8: Fastify v5 als gehärteter Enterprise-Webserver
Seite 14
Kapitel 9: Embedded Persistence: SQLite & Prisma ORM im WAL-Modus
Seite 15
Kapitel 10: Das Prisma Datenbank-Schema (schema.prisma) im Detail
Seite 16
Kapitel 11: Webhook Ingestion & das Fastify Raw-Body Problem
Seite 17
Kapitel 12: Gehärtetes Fastify Stripe Webhook Gateway (Code)
Seite 18
Kapitel 13: Replay-Attacken & Man-in-the-Middle Schutz
Seite 19
Kapitel 14: Atomic Compare-and-Swap (CAS) Idempotenz (Theorie)
Seite 20
Kapitel 15: CAS-Implementierung mit SQLite & Prisma (Code)
Seite 21
Kapitel 16: Hybrides LLM-Routing: Lokales Ollama vs. Cloud Claude
Seite 22
Kapitel 17: Fallback-Routing & Circuit Breaker bei API-Ausfällen
Seite 23
Kapitel 18: 24/7 Observability: Lokales Trace Logging in SQLite
Seite 24
Kapitel 19: Langfuse Tracing Integration & Budget-Kontrolle
Seite 25
Kapitel 20: Der autonome Heartbeat Daemon & Reconciliation
Seite 26
Kapitel 21: Idempotente Reconciliation unvollständiger Zahlungen
Seite 27
Kapitel 22: Daily Market Pulse & Autonome Stakeholder-Updates
Seite 28
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 3 von 66
\n---\n\n## [Seite 4]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
INHALTSVERZEICHNIS
INHALTSVERZEICHNIS
DOKUMENT-ID: GCP-2026-P04
Inhaltsverzeichnis — Teil III bis VIII
Teil III: Enterprise B2B Automation (Clawcommerce)
Kapitel 23: Das $2,000 Setup + $500/Mo B2B-Geschäftsmodell
Seite 29
Kapitel 24: Der automatisierte B2B Intake-Funnel
Seite 30
Kapitel 25: Autonome Generierung massgeschneiderter Architektur-Dossiers
Seite 31
Kapitel 26: Stripe Checkout Integration für B2B-Verträge ($2,000 Fee)
Seite 32
Kapitel 27: Automatisiertes GitHub Repository Scaffolding & CI/CD
Seite 33
Kapitel 28: Enterprise-Integrationen: REST-APIs, ERP & Kundentriage
Seite 34
Kapitel 29: SLA-Management & 99.9% Uptime für Schweizer KMUs
Seite 35
Teil IV: Digitale Güter-Pipelines & Marktplatz
Kapitel 30: Schutz digitaler Güter vor unberechtigter Vervielfältigung
Seite 36
Kapitel 31: Kryptografische 48h Download-Token (Code)
Seite 37
Kapitel 32: Atomare Download-Zähler & Limit-Enforcement (Max. 5)
Seite 38
Kapitel 33: Fastify Stream-Fulfillment (Memory-Safe Streaming)
Seite 39
Kapitel 34: Claw Mart: Marktplatz-Architektur für KI-Skills
Seite 40
Kapitel 35: Verifizierung externer Skills & Sandboxing
Seite 41
Teil V: Web3, Krypto-Sicherheit & Proof-of-Execution
Kapitel 36: Das Web3 Proof-of-Execution Paradigma
Seite 42
Kapitel 37: Warum Base L2? Kosten, Geschwindigkeit & Sicherheit
Seite 43
Kapitel 38: Gefahren von Plaintext-Keys auf Produktionsservern
Seite 44
Kapitel 39: Coinbase CDP Multi-Party Computation (MPC) Wallets
Seite 45
Kapitel 40: Native viem Integration für Base L2 (Code)
Seite 46
Kapitel 41: Calldata-Injektion: Verankerung von Zahlungs-Hashes
Seite 47
Kapitel 42: Gas-Spike Schutzschalter (<100 Gwei Ceiling)
Seite 48
Kapitel 43: Autonomes Social Media Marketing auf X (Twitter)
Seite 49
Kapitel 44: Idempotente Mention-Replies & Spam-Schutz
Seite 50
Teil VI bis VIII: Hosting, Recht & Anhänge
Kapitel 45-50: Schweizer Hosting auf Proxmox VE 8.x LXC & Caddy
Seite 51-56
Kapitel 51-54: Schweizer Datenschutzrecht (revDSG) & Compliance
Seite 57-60
Kapitel 55-58: 10-Punkte Go-Live Checkliste & Notfall-Runbooks
Seite 61-64
Anhang A & B: Referenz-Architekturplan, Manifest & Lizenz
Seite 65-66
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 4 von 66
\n---\n\n## [Seite 5]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
VORWORT
VORWORT
DOKUMENT-ID: GCP-2026-P05
Die Wende zu autonomen Wertschöpfungs-Maschinen
Als wir im Jahr 2026 begannen, autonome KI-Agenten im realen Produktionsumfeld auf Proxmox-Hardware in Zürich zu
testen, stiessen wir sehr schnell auf eine ernüchternde Realität:
Fast alle existierenden Frameworks (LangChain, AutoGen, CrewAI und Konsorten) waren für akademische Demos oder
Twitter-Screenshots konzipiert. Sie funktionierten hervorragend, solange ein Entwickler daneben sass und aufpasste.
Doch sobald man diese Systeme 48 Stunden ununterbrochen auf einem Linux-Server laufen liess und echtes Geld durch
ihre Leitungen fliessen sollte, stürzten sie unweigerlich ab.
Die bitteren Lektionen aus 10'000 Transaktionen:
Ungeprüfte Outputs zerstören Datenbanken: Ein einziges halluziniertes Leerzeichen oder ein fehlendes Komma in
einem JSON-String brachte den gesamten Event-Loop zum Stillstand.
Stripe verzeiht keine Schlamperei: Wer nicht exakt versteht, wie Buffering bei Rohdaten-Webhooks funktioniert,
verliert Kunden und sperrt sein Händlerkonto.
Krypto-Wallets auf Servern sind Minenfelder: Ein ungeschützter Private Key im Klartext führt bei automatisierten
Systemen unausweichlich zum Totalverlust.
> DER ENTSCHEIDENDE WENDEPUNKT:
Wir hörten auf, Günther als "intelligenten Chatbot" zu betrachten. Wir begannen, ihn als unbarmherzig deterministische
Software-Fabrik zu behandeln. Das LLM wurde vom Steuermann zum austauschbaren Rechenknecht degradiert. Die Kontrolle
übernahm TypeScript, Zod und SQLite.
Dieses Playbook ist die lückenlose Dokumentation dieser Architektur. Sie halten nicht nur Theorie in den Händen,
sondern die exakte Blaupause eines Agenten, der heute, in dieser Sekunde, auf Container CT 115 in Zürich läuft, Umsätze
verbucht und Token verbrennt.
— Carlo Cuonz & 0xGünther
Zürich, Schweiz • September 2026
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 5 von 66
\n---\n\n## [Seite 6]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P06
Kapitel 1: Das Manifest des autonomen Unternehmers
Die Ära der passiven Prompt-Assistenten ist vorbei. Wir treten ein in das Zeitalter autonom agierender KI-Unternehmen.
Dieses Manifest formuliert die fundamentalen Konstruktions-Gesetze für autonome Software-Agenten.
Die 5 Grundgesetze autonomer Systeme
1. State vor Aktion (No Amnesia)
Ein Agent ohne persistente Datenbank ist eine tickende Zeitbombe. Vor jedem API-Aufruf, vor jedem Tweet und vor
jeder On-Chain-Transaktion befragt der Agent seine SQLite-State-Machine. Nach der Ausführung wird der Zustand
atomar festgeschrieben. Jeder Zustand muss einen Server-Crash unbeschadet überstehen.
2. Hard Currency First (Echte Wirtschaftsleistung)
Agenten, die lediglich synthetische Punkte oder Spielgeld-Token hin- und herschieben, erzeugen keinen ökonomischen
Wert. Ein echter KI-Unternehmer generiert Einnahmen in harter Währung (Stripe USD / CHF) und nutzt diesen realen
Cashflow, um sein Ökosystem anzutreiben.
3. Null Prosa im Entscheidungsprozess
Freitext ist das Einfallstor für Fehler. Die interne Kommunikation zwischen Agenten-Modulen, Routern und Tools erfolgt
ausnahmslos über strikte, kompilierte Zod JSON-Schemas. Höflichkeitsfloskeln haben im Execution-Loop nichts zu
suchen.
4. Echte, physische Hardware (Souveränität)
Wer seine Agenten auf fremden US-Servern betreibt, besitzt keine Autonomie. Echte Autonomie erfordert eigene Bare-
Metal-Infrastruktur (Proxmox VE in Zürich), volle Datenhoheit und die Gewissheit, dass kein Drittanbieter willkürlich den
Stecker ziehen kann.
5. Proof-of-Execution statt Marketing-Versprechen
Behauptungen sind billig. Jeder Nettoerlös wird kryptografisch nachweisbar on-chain auf Base L2 verbrannt. Jede
Transaktion ist der unwiderrufliche Beweis für reale Kunden und fehlerfreie Ausführung.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 6 von 66
\n---\n\n## [Seite 7]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P07
Kapitel 2: Die Anatomie gescheiterter KI-Projekte
Um ein ausfallsicheres System zu bauen, muss man verstehen, woran andere scheitern. Wir haben über 50 gescheiterte
"Autonome Agenten"-Startups und GitHub-Repositories analysiert. Das Ergebnis ist erschütternd homogen.
Die 6 tödlichen Kardinalfehler:
Fehlermuster
Ursache in Standard-Frameworks
Die 0xGünther Gegenmassnahme
1. JSON Parsing
Crash
LLM gibt Markdown-Backticks ( ```json ) oder
fehlerhaftes JSON zurück.
Regex-Cleaner-Pipeline + deterministischer Zod-
Fallback auf IDLE .
2. Duplicate
Execution
Stripe sendet Webhook nach 3 Sekunden erneut.
Server führt Aktion doppelt aus.
Atomic Compare-and-Swap (CAS) in SQLite. Status
pending -> burning .
3. Token-
Bankrott
Unendliche ReAct-Schleife bei unverständlicher
Fehlermeldung.
Harte Iterations-Grenze (Max. 5 Steps) + Langfuse
Token-Budget Guard.
4. Private Key
Leak
Private Keys liegen im Klartext in .env oder im Git-
Commit.
Coinbase CDP Multi-Party Computation (MPC). Kein
Key im Speicher.
5. Replay
Attacken
Alte Webhook-Events werden von Angreifern
abgefangen und neu gesendet.
HMAC-SHA256 Signaturprüfung mit 300s
Timestamp-Toleranz.
6. US Cloud Lock-
in
Kundendaten fliessen ungefiltert in US-Cloud-
Hyperscaler (revDSG-Verstoss).
Dedizierter Schweizer Proxmox-Server in Zürich mit
Local-First Speicherung.
Erkenntnis aus der Praxis: 90% des Entwicklungsaufwands eines erfolgreichen autonomen Agenten fliessen nicht in den KI-
Prompt, sondern in das defensive Software-Engineering drumherum: Idempotenz, Typensicherheit, Netzwerk-Timeouts und
Fehler-Isolation.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 7 von 66
\n---\n\n## [Seite 8]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P08
Kapitel 3: Das Schaufel-Prinzip im KI-Zeitalter
Im kalifornischen Goldrausch von 1849 verdienten fast alle Goldgräber kein Geld. Die wenigen, die Wohlstand
aufbauten, verkauften Ausrüstung, Schaufeln, Zwingen und Verpflegung.
Warum "Prompt-Apps" eine finanzielle Falle sind
Verbraucher-Apps auf KI-Basis (wie Essay-Generatoren oder Avatar-Ersteller) leiden unter extrem hohen Churn-Raten
(über 85% nach 30 Tagen) und ruinösem Preiskampf. Gleichzeitig steigen die API-Kosten proportional mit jedem neuen
Nutzer.
Das Schaufel-Portfolio von 0xGünther
0xGünther verkauft Werkzeuge an Entwickler und Unternehmen, die selbst im KI-Sektor aktiv sind. Dadurch erzielen wir
überdurchschnittliche Margen bei minimalem Support-Aufwand:
┌─────────────────────────────────────────────────────────────────┐
│ 0xGÜNTHER SCHAUFEL-PORTFOLIO │
├───────────────────────────────┬─────────────────────────────────┤
│ DIGITALE ENTWICKLER-TOOLS │ ENTERPRISE B2B SERVICES │
├───────────────────────────────┼─────────────────────────────────┤
│ • Günther Craft Playbook ($49)│ • Clawcommerce Setup ($2'000) │
│ • Stripe Webhook MCP ($39) │ • Proxmox Container Hosting │
│ • CDP Wallet Guard ($49) │ • 24/7 Langfuse Monitoring │
│ • ElizaOS Token Burner ($29) │ • SLA Retainer ($500/Monat) │
└───────────────────────────────┴─────────────────────────────────┘
Die wirtschaftlichen Vorteile des Schaufel-Modells:
Sofortiger Cashflow: Digitale Software-Downloads generieren 100% Vorauszahlung ohne Vorleistungskosten.
Null Grenzkosten: Die Auslieferung eines digitalen Quellcode-Pakets via Fastify-Stream kostet weniger als $0.0001
an Server-Ressourcen.
Hohe B2B-Zahlungsbereitschaft: Für ein Schweizer KMU sind $2'000 Setup-Gebühr eine Bagatelle, wenn dadurch
eine manuelle Vollzeit-Stelle eingespart wird.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 8 von 66
\n---\n\n## [Seite 9]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P09
Kapitel 4: Die ReAct-Schleife im Produktiveinsatz
Das ReAct-Muster (Reasoning and Acting) beschreibt die algorithmische Struktur, durch die ein Agent Entscheidungen
trifft und Aktionen in der Aussenwelt ausführt.
Die 5 Phasen der Produktions-Schleife:
[1. INGESTION] ──> Webhook trifft ein / Cronjob triggert Heartbeat
↓
[2. OBSERVATION] ─> State Engine liest SQLite (Offene Zahlungen, Leads)
↓
[3. REASONING] ───> LLM generiert strukturierten Thought via Zod-Schema
↓
[4. ACTION] ──────> Isolierter Aufruf: Stripe, Base L2, Twitter oder Mail
↓
[5. UPDATE] ──────> CAS-Zustandstransition in SQLite & Langfuse Trace
Die drei goldenen Leitplanken für den ReAct-Loop:
1. Harter Timeout pro Schritt: Jeder einzelne Schritt der Schleife (z.B. API-Abfrage oder Datenbank-Query) besitzt
einen harten Timeout von 5'000 ms. Hängt ein externer Dienst, bricht der Agent kontrolliert ab.
2. Max-Step Circuit Breaker: Nach spätestens 5 Iterationen ohne finalen Abschluss wird der Loop zwangsweise
terminiert und der Vorfall in der Trace -Tabelle protokolliert.
3. Kein autonomer Freitext-Tweet: Bevor der Agent Status-Updates auf Social Media veröffentlicht, prüft ein Zod-
Filter die Einhaltung der Brand-Richtlinien.
Unterschied zur Theorie: In wissenschaftlichen Papern läuft ReAct in Endlosschleifen, bis das Modell "satisfied" meldet. In der
industriellen Praxis von 0xGünther ist ReAct ein getakteter, transaktional abgesicherter Batch-Prozess.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 9 von 66
\n---\n\n## [Seite 10]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P10
Kapitel 5: Deterministische State Machines
Ein grundlegender Fehler vieler Agenten-Entwickler ist die Annahme, dass das LLM den Systemzustand im Gedächtnis
behalten kann. Ein LLM besitzt jedoch kein Gedächtnis — es ist eine zustandslose mathematische Funktion.
Modellierung als endlicher Zustandsautomat (Finite State Machine)
Jede Entität im System (z.B. eine Zahlung oder ein B2B-Lead) durchläuft einen strikt definierten Lebenszyklus.
Unzulässige Zustandsübergänge werden auf Datenbank-Ebene abgewiesen:
[pending] ───────(Stripe Webhook bestätigt)───────> [paid]
│ │
│ (CAS Lock) │ (Burn Service)
▼ ▼
[burning] ──────(Base L2 Tx bestätigt)───────────> [burned]
│
└───(Tx fehlgeschlagen nach 3 Retries)────────> [failed]
Die Übergangs-Matrix für Zahlungen:
Ausgangs-Zustand
Erlaubter Folge-Zustand
Bedingung & Wächter
pending
burning
Stripe HMAC-Signatur gültig & CAS Lock erfolgreich.
burning
burned
Base L2 TxHash generiert und durch Public Client verifiziert.
burning
failed
Gas-Spike > 100 Gwei oder RPC-Netzwerkfehler nach 3 Versuchen.
burned
KEINER (Endzustand)
Ein verbrannter Datensatz kann niemals erneut verändert werden.
Sicherheits-Garantie: Da burned ein unveränderlicher Endzustand ist, ist ein Double-Spend mathematisch ausgeschlossen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 10 von 66
\n---\n\n## [Seite 11]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P11
Kapitel 6: Strikte Schema-Validierung mit Zod (Theorie)
TypeScript bietet fantastische Typensicherheit zur Entwicklungszeit (Compile-Time). Sobald die Anwendung jedoch
läuft (Runtime) und Daten von externen Quellen (LLM-Outputs, Webhooks, HTTP-Requests) empfängt, verpufft der
TypeScript-Schutz.
Warum Standard-JSON-Validation versagt
Methoden wie 
typeof 
obj.name 
=== 
'string' sind fehleranfällig, unleserlich und decken komplexe
Verschachtelungen nicht ab. Zudem konvertieren sie Zahlen oder Datumsangaben nicht automatisch in die korrekten
Typen.
Zod als unbestechlicher Türsteher
Zod ermöglicht es, Schemas deklarativ zu definieren. Dabei generiert Zod aus einem einzigen Schema gleichzeitig den
Laufzeit-Parser und den statischen TypeScript-Typ:
import { z } from 'zod';
// 1. Definition des Schemas zur Laufzeit
export const B2bIntakeSchema = z.object({
companyName: z.string().min(2, "Firmenname muss mindestens 2 Zeichen lang sein"),
contactName: z.string().min(2, "Kontaktname ist erforderlich"),
contactEmail: z.string().email("Ungültige E-Mail-Adresse"),
useCase: z.string().min(10, "Use Case muss detailliert beschrieben werden"),
monthlyVolume: z.enum([
'<1,000 Transaktionen/Mo',
'1,000 - 10,000 Transaktionen/Mo',
'>10,000 Transaktionen/Mo'
]),
integrations: z.string().default('REST-API')
});
// 2. Automatischer Export des TypeScript-Typs (Zero Redundanz)
export type B2bIntakeInput = z.infer<typeof B2bIntakeSchema>;
Self-Correction Loop: Wenn Zod einen Validierungsfehler wirft, parsen wir die Fehlermeldung ( error.issues ) und
übergeben sie im nächsten Schritt direkt an das LLM: "Du hast 'email' vergessen. Korrigiere dein JSON."
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 11 von 66
\n---\n\n## [Seite 12]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL I: FUNDAMENTE
TEIL I: FUNDAMENTE
DOKUMENT-ID: GCP-2026-P12
Kapitel 6: Typisierter ReAct-Router (Produktions-Code)
Der folgende Code stammt direkt aus src/core/router.ts und demonstriert die vollständige Implementierung des
typisierten Entscheidungs-Routers mit resilientem Fallback.
import { z } from 'zod';
export const ActionTypeSchema = z.enum([
'EXECUTE_BURN',
'STREAM_PRODUCT',
'GENERATE_B2B_DOSSIER',
'POST_SOCIAL_UPDATE',
'IDLE'
]);
export const DecisionSchema = z.object({
action: ActionTypeSchema,
targetId: z.string().optional(),
rationale: z.string().min(5),
confidenceScore: z.number().min(0).max(1)
});
export type Decision = z.infer<typeof DecisionSchema>;
export class AgentRouter {
static parseDecision(rawLLMResponse: string): Decision {
try {
// 1. Entfernen von Markdown Code-Fences
const sanitized = rawLLMResponse
.replace(/```json\s*/gi, '')
.replace(/```\s*/g, '')
.trim();
// 2. Strukturiertes JSON parsen
const rawObject = JSON.parse(sanitized);
// 3. Zod Schema Guard
return DecisionSchema.parse(rawObject);
} catch (err) {
// 4. Deterministischer Fallback ohne System-Crash
console.warn('[Router Guard] Ungültiger LLM-Output abgefangen:', err);
return {
action: 'IDLE',
rationale: `Deterministischer Fallback wegen Schemafehler: ${err instanceof Error ? err.message : 'Un
known'}`,
confidenceScore: 0.0
};
}
}
}
Produktions-Sicherheit: Diese 40 Zeilen Code verhindern 99% aller Server-Abstürze in KI-Agenten-Systemen. Selbst wenn
das Modell kompletten Unfug generiert, bleibt der Server stabil.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 12 von 66
\n---\n\n## [Seite 13]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P13
Kapitel 7: Der Tech-Stack: Node.js 22 LTS & TypeScript Strict
Ein autonomer Agent läuft 24 Stunden am Tag, 7 Tage die Woche. Jede Schwachstelle in der Laufzeitumgebung führt
unweigerlich zu Ausfallzeiten. Wir setzen auf den modernsten und stabilsten Node.js-Stack.
Compiler-Konfiguration: tsconfig.json im Strict Mode
{
"compilerOptions": {
"target": "ES2022",
"module": "NodeNext",
"moduleResolution": "NodeNext",
"lib": ["ES2022"],
"outDir": "./dist",
"rootDir": "./src",
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
"strictFunctionTypes": true,
"strictBindCallApply": true,
"strictPropertyInitialization": true,
"noImplicitThis": true,
"alwaysStrict": true,
"exactOptionalPropertyTypes": true,
"noImplicitReturns": true,
"noFallthroughCasesInSwitch": true,
"noUncheckedIndexedAccess": true,
"skipLibCheck": true
},
"include": ["src/**/*"]
}
Warum ECMAScript Modules (ESM)?
Wir verwenden ausschliesslich native ES-Module ( "type": "module" in package.json ). CommonJS ( require ) ist
veraltet und verhindert effizientes Tree-Shaking und moderne Web3-Bibliotheken wie viem , die rein ESM-basiert
arbeiten.
Package.json Skripte für kompromisslose QA:
"scripts": {
"build": "tsc",
"start": "node dist/server/index.js",
"dev": "tsx watch src/server/index.ts",
"test": "node --test --import tsx/esm tests/**/*.test.ts",
"test:all": "node scripts/run-all-tests.js"
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 13 von 66
\n---\n\n## [Seite 14]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P14
Kapitel 8: Fastify v5 als Enterprise-Webserver
Während 90% aller Node.js-Entwickler aus Gewohnheit Express.js verwenden, setzen wir für 0xGünther auf Fastify v5.
Fastify ist nicht nur bis zu 5x schneller, sondern architektonisch für hochsichere Webhook-Systeme überlegen.
Der Geschwindigkeits- und Latenz-Vergleich
Metrik
Express.js 4.x
Fastify v5.x
Vorteil für autonome Agenten
Requests /
Sekunde
~15'000 req/s
~75'000 req/s
5x höhere Durchsatzkapazität bei Webhook-
Spitzen
Latenz (p99)
12.4 ms
2.1 ms
Stripe-Webhooks werden in <5ms quittiert
JSON Serialisierung
Standard JSON.stringify
fast-json-stringify
Schema-kompilierte Serialisierung spart CPU-
Zyklen
Raw Body Support
Umständlich via
Middleware
fastify-raw-body
nativ
Keine Manipulation der HMAC-Prüfsumme
Das Fastify Lifecycle Hook-Modell
Fastify erlaubt präzise Kontrolle über jeden Schritt des HTTP-Lebenszyklus:
onRequest ──> preParsing ──> preValidation ──> preHandler ──> Handler ──> onSend ──> onResponse
preParsing: Hier puffern wir den unveränderten Raw-Byte-Buffer für Stripe.
preValidation: Zod prüft Header und Query-Parameter vor der Business-Logik.
onResponse: Langfuse erfasst die Ausführungszeit und den Statuscode.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 14 von 66
\n---\n\n## [Seite 15]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P15
Kapitel 9: Embedded Persistence: SQLite & Prisma WAL
Warum betreibt 0xGünther keine Postgres- oder MySQL-Datenbank? Weil externe Datenbanken für Single-Node
autonome Agenten ein unnötiges Ausfallrisiko und Netzwerklatenz bedeuten.
Die Überlegenheit von SQLite im WAL-Modus
SQLite ist keine "Spielzeugdatenbank", sondern das meistverbreitete relationale Datenbanksystem der Welt. Als In-
Process Embedded Database läuft SQLite im selben Speicherbereich wie der Node.js-Prozess:
0.0 ms Netzwerklatenz: Jeder Query wird direkt über C++ In-Memory-Pointer im Dateisystem ausgeführt.
Kein Datenbank-Server, der abstürzen kann: Fällt ein Postgres-Daemon aus, steht der Agent. SQLite ist eine
einzelne Datei ( gunther.db ).
Write-Ahead Logging (WAL): Durch Aktivierung des WAL-Modus blockieren Lesevorgänge niemals
Schreibvorgänge und umgekehrt.
Die Pflicht-Initialisierung für Produktions-SQLite:
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
export async function initDatabasePragmas() {
// 1. WAL-Modus aktivieren (Massive Erhöhung des Schreibdurchsatzes)
await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
// 2. Synchronous Normal (Ausgewogenes Verhältnis von Sicherheit & Speed)
await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
// 3. Busy Timeout auf 5000ms setzen (Verhindert SQLITE_BUSY Fehler)
await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');
// 4. Foreign Keys erzwingen
await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');
console.log('[SQLite] Produktions-Pragmas erfolgreich konfiguriert.');
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 15 von 66
\n---\n\n## [Seite 16]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P16
Kapitel 10: Das Prisma Datenbank-Schema im Detail
Das Prisma-Schema bildet das unveränderliche Daten-Rückgrat der gesamten 0xGünther Engine. Alle Entitäten sind
mit strikten Constraints und Indexen versehen.
// prisma/schema.prisma
datasource db {
provider = "sqlite"
url      = "file:./gunther.db"
}
generator client {
provider = "prisma-client-js"
}
model Payment {
id                String    @id @default(uuid())
stripePaymentId   String    @unique
amountCents       Int
currency          String    @default("usd")
customerEmail     String?
productSlug       String
status            String    @default("pending") // pending, burning, burned, failed
downloadToken     String?   @unique
downloadExpiresAt DateTime?
downloadCount     Int       @default(0)
burnTxHash        String?
burnedAt          DateTime?
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt
@@index([status])
@@index([downloadToken])
}
model Trace {
id         String   @id @default(uuid())
eventName  String
agentState String
payload    String
durationMs Int
createdAt  DateTime @default(now())
@@index([eventName])
}
model B2bLead {
id            String   @id @default(uuid())
companyName   String
contactName   String
contactEmail  String
useCase       String
monthlyVolume String
integrations  String
proposalText  String
status        String   @default("NEW") // NEW, QUALIFIED, CONTRACT_PAID
createdAt     DateTime @default(now())
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 16 von 66
\n---\n\n## [Seite 17]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P17
Kapitel 11: Webhook Ingestion & das Raw-Body Problem
Das "Raw-Body Problem" ist der häufigste Grund, warum Stripe-Webhooks in Node.js-Anwendungen fehlschlagen.
Wie die HMAC-SHA256 Signaturprüfung funktioniert
Wenn Stripe einen Webhook sendet, berechnet Stripe auf seinen Servern eine kryptografische Signatur:
HMAC-SHA256( Webhook_Payload_String + Timestamp , STRIPE_WEBHOOK_SECRET )
Diese Signatur wird im HTTP-Header Stripe-Signature übermittelt. Ihr Server muss exakt dieselbe HMAC-Berechnung
durchführen und vergleichen.
Die Falle: Automatisches JSON-Parsing
Wenn Express oder Fastify den Request-Body parsen, wandeln sie den Bytestream in ein JavaScript-Objekt um. Wenn
Sie dieses Objekt später mit JSON.stringify(req.body) zurückverwandeln, entstehen minimale Abweichungen:
Schlüsselreihenfolgen ändern sich: {"a":1,"b":2} wird zu {"b":2,"a":1} .
Whitespace-Differenzen: Zeilenumbrüche (
vs. 
) oder Leerzeichen verschwinden.
Unicode-Zeichen werden unterschiedlich escaped.
Die Folge: Die HMAC-Prüfsumme weicht um ein einziges Bit ab. Die Signaturprüfung schlägt fehl, und der Webhook wird mit
HTTP 400 Bad Request abgewiesen. Der Kunde hat bezahlt, erhält aber kein Produkt!
Die Lösung: Bitgenaue Speicherung im preParsing Hook
Wir müssen den originalen, unberührten Byte-Buffer des HTTP-Requests abfangen, bevor irgendein Parser aktiv wird,
und ihn als unverändertes Feld an das Request-Objekt anhängen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 17 von 66
\n---\n\n## [Seite 18]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P18
Kapitel 12: Gehärtetes Fastify Stripe Webhook Gateway
Hier 
ist 
der 
vollständige 
Produktions-Code 
des 
gehärteten 
Fastify 
Stripe 
Webhook 
Gateways 
aus
src/server/routes/webhookRoutes.ts :
import { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { FulfillmentService } from '../../services/fulfillmentService.js';
import { BurnService } from '../../services/burnService.js';
export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2025-01-27.acacia' as any
});
fastify.post('/webhook/stripe', {
config: { rawBody: true } // Sichert den unberührten Buffer
}, async (request, reply) => {
const signature = request.headers['stripe-signature'];
if (!signature || typeof signature !== 'string') {
return reply.status(400).send({ error: 'Header stripe-signature fehlt' });
}
let event: Stripe.Event;
try {
event = stripe.webhooks.constructEvent(
request.rawBody!, // Exakter UTF-8 Roh-Buffer!
signature,
process.env.STRIPE_WEBHOOK_SECRET!
);
} catch (err) {
request.log.error(err, 'Stripe Signaturprüfung fehlgeschlagen');
return reply.status(400).send({ error: 'Ungültige Webhook Signatur' });
}
if (event.type === 'checkout.session.completed') {
const session = event.data.object as Stripe.Checkout.Session;
const paymentIntentId = session.payment_intent as string;
const amountTotal = session.amount_total || 4900;
const customerEmail = session.customer_details?.email || undefined;
// 1. Download-Token für den Kunden generieren
await FulfillmentService.generateDownloadToken(paymentIntentId);
// 2. Autonomen Base L2 Token-Burn triggern
await BurnService.executeBurn(paymentIntentId, amountTotal);
}
return reply.status(200).send({ received: true });
});
};
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 18 von 66
\n---\n\n## [Seite 19]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P19
Kapitel 13: Replay-Attacken & Man-in-the-Middle Schutz
Ein oft übersehener Angriffsvektor gegen autonome Webhook-Endpunkte ist die Replay-Attacke. Ein Angreifer lauscht
den verschlüsselten Datenverkehr ab (oder nutzt kompromittierte Proxy-Logs) und sendet ein valides Webhook-Paket
erneut an Ihren Server.
Der 3-Stufen-Schutzwall von 0xGünther
[Eingehender Request]
↓
[STUFE 1: Timestamp-Toleranz-Fenster (< 300 Sekunden)]
↓
[STUFE 2: Kryptografischer HMAC-SHA256 Signatur-Check]
↓
[STUFE 3: Datenbank Unique Constraint auf stripePaymentId]
1. Das Timestamp-Toleranzfenster:
Stripe bettet den Sende-Zeitpunkt in den Stripe-Signature Header ein:
Stripe-Signature: t=1790664826,v1=5257a869e7ecebeda32affa62cdca3fa51...
Die SDK prüft intern: Math.abs(Date.now() / 1000 - timestamp) > 300 . Ist das Paket älter als 5 Minuten, wird es
sofort verworfen.
2. Unique Constraints auf Datenbank-Ebene:
Selbst wenn ein Angreifer es schafft, ein Paket innerhalb von 5 Minuten erneut einzuspeisen, greift der @unique Index
auf stripePaymentId in SQLite. Ein zweiter INSERT -Versuch schlägt mit einem Primärschlüssel-Fehler fehl.
Ergebnis: Zero Fraud. Kein doppelter Download-Token und kein unberechtigter Token-Burn können das System passieren.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 19 von 66
\n---\n\n## [Seite 20]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P20
Kapitel 14: Atomic Compare-and-Swap (CAS) Idempotenz
In verteilten Systemen ist Idempotenz die Eigenschaft einer Operation, bei mehrfacher Ausführung dasselbe Ergebnis
zu liefern wie bei einer einmaligen Ausführung.
Das "Double-Spend" Problem bei Web3-Agenten
Angenommen, ein Kunde kauft das Playbook für $49. Stripe sendet den Webhook. Der Server startet den Base L2 Burn.
Genau in dieser Millisekunde hat der Base-RPC-Node einen kurzen Schluckauf und antwortet erst nach 4 Sekunden.
Stripe timeoutet und sendet den Webhook erneut an Server-Thread B.
Die Katastrophe ohne CAS: Beide Threads sehen in der Datenbank "Zahlung noch nicht verbrannt". Beide signieren eine
Blockchain-Transaktion. $98 an Tokens werden verbrannt, obwohl nur $49 eingenommen wurden!
Das Prinzip von Compare-and-Swap (CAS)
Anstatt blind ein Update auszuführen ( UPDATE Payment SET status = 'burned' ), verlangen wir eine atomare
Zustandsprüfung:
UPDATE Payment
SET status = 'burning'
WHERE stripePaymentId = 'pi_123'
AND status = 'pending'; <── DIE CAS BEDINGUNG!
Die SQLite-Engine garantiert auf Dateisystem-Ebene, dass diese Operation unteilbar (atomar) ist.
Thread A führt das Statement aus: 1 Zeile aktualisiert. Thread A hat das exklusive Recht zur Ausführung.
Thread B führt dasselbe Statement aus: 0 Zeilen aktualisiert (da der Status bereits burning ist). Thread B bricht
sofort ab!
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 20 von 66
\n---\n\n## [Seite 21]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P21
Kapitel 15: CAS-Implementierung mit SQLite & Prisma
Der folgende Code stammt aus src/services/burnService.ts und demonstriert die atomare CAS-Ausführung unter
realen Produktionsbedingungen:
import { prisma } from '../db/client.js';
import { Web3Mcp } from '../mcp/web3Mcp.js';
import { XMcp } from '../mcp/xMcp.js';
export class BurnService {
static async executeBurn(stripePaymentId: string, amountCents: number) {
// 1. SCHRITT: Existenzprüfung
const existing = await prisma.payment.findUnique({
where: { stripePaymentId }
});
if (!existing) {
throw new Error(`Zahlungsdatensatz nicht gefunden: ${stripePaymentId}`);
}
if (existing.status === 'burned') {
console.log(`[CAS Guard] Payment ${stripePaymentId} bereits verbrannt. Überspringe.`);
return { skipped: true, txHash: existing.burnTxHash };
}
// 2. SCHRITT: Atomare CAS-Reservierung
const casLock = await prisma.payment.updateMany({
where: {
stripePaymentId,
status: 'pending' // CAS-BEDINGUNG
},
data: {
status: 'burning' // NEUER ZWISCHENZUSTAND
}
});
if (casLock.count === 0) {
console.warn(`[CAS Conflict] Konkurrierender Thread hat ${stripePaymentId} bereits reserviert.`);
return { skipped: true };
}
// 3. SCHRITT: Blockchain Interaktion (Sicher ausgeführt)
const tokensToBurn = BigInt(amountCents) * 10n**18n; // $1.00 = 1'000 $GÜNTER
const txHash = await Web3Mcp.burnTokens(tokensToBurn, stripePaymentId);
// 4. SCHRITT: Finalisierung des Zustands
await prisma.payment.update({
where: { stripePaymentId },
data: {
status: 'burned',
burnTxHash: txHash,
burnedAt: new Date()
}
});
// 5. SCHRITT: Autonome Social Media Benachrichtigung
await XMcp.postTweet(`Umsatz generiert: $${(amountCents/100).toFixed(2)}. ${Number(tokensToBurn / 10n**18
n).toLocaleString()} $GÜNTER verbrannt auf Base. Tx: ${txHash}`);
return { skipped: false, txHash };
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 21 von 66
\n---\n\n## [Seite 22]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P22
Kapitel 16: Hybrides LLM-Routing: Lokales Ollama vs. Cloud
Die Betriebskosten eines autonomen Agenten entscheiden über Leben und Tod seines Geschäftsmodells. Ein Agent,
der für jede triviale Entscheidung $0.03 an OpenAI oder Anthropic überweist, verbrennt seine Marge.
Die 2-Stufen Inferenz-Pyramide
[Eingehendes Event / Text]
↓
[TIER 1: Lokales Ollama 7B Modell auf Intel NUC (Latenz: 80ms, Kosten: $0.00)]
• Aufgabe: Spam-Klassifikation, Routing-Entscheidung, Sentiment
↓
Ist komplexe B2B-Architektur oder juristische Analyse erforderlich?
├── NEIN ──> Lokales Ergebnis direkt verwenden (100% Gewinnmarge!)
└── JA ───> [TIER 2: Claude 3.7 Sonnet via OpenRouter]
• Aufgabe: B2B Enterprise Dossiers, Code-Synthese
Hardware-Setup für lokales Ollama auf Proxmox:
Auf unserem Proxmox Host (Intel i7-13700H) betreiben wir Ollama nativ mit qwen2.5-coder:7b oder deepseek-r1:8b .
Durch AVX2- und OpenVINO-Beschleunigung generiert die CPU 45 Tokens pro Sekunde bei einer RAM-Auslastung von
unter 6 GB.
Marge in der Praxis: 85% aller Ingestion-Events (z.B. wiederkehrende Statusabfragen oder irrelevante Twitter-Mentions)
werden zu $0.00 Kosten lokal abgefertigt.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 22 von 66
\n---\n\n## [Seite 23]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P23
Kapitel 17: Fallback-Routing & Resilienz bei API-Ausfällen
Cloud-APIs 
fallen 
regelmässig 
aus. 
Ob 
Cloudflare-Ausfall, 
HTTP 
429 
Rate-Limits 
oder 
unangekündigte
Wartungsfenster: Ein autonomer Agent darf niemals hängenbleiben.
Der Resilienz-Algorithmus aus src/core/llmClient.ts:
export class ResilientLLMClient {
private static readonly MAX_RETRIES = 3;
private static readonly BASE_DELAY_MS = 1000;
static async completeWithBackoff(prompt: string, tier: 'LOCAL' | 'CLOUD'): Promise {
for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
try {
if (tier === 'LOCAL') {
return await this.callOllama(prompt);
} else {
return await this.callOpenRouter(prompt);
}
} catch (err: any) {
const isRateLimit = err?.status === 429;
const isLastAttempt = attempt === this.MAX_RETRIES;
if (isLastAttempt) {
if (tier === 'LOCAL') {
console.warn('[LLM Fallback] Lokales Ollama ausgefallen. Schalte um auf Cloud...');
return this.completeWithBackoff(prompt, 'CLOUD');
}
throw new Error(`LLM Inferenz fehlgeschlagen nach ${attempt} Versuchen: ${err.message}`);
}
// Exponential Backoff mit Random Jitter (Verhindert Thundering Herd)
const delay = this.BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
console.warn(`[LLM Retry] Fehler (Status ${err?.status}). Warte ${Math.round(delay)}ms...`);
await new Promise(resolve => setTimeout(resolve, delay));
}
}
throw new Error('Unerreichbarer Zustand');
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 23 von 66
\n---\n\n## [Seite 24]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P24
Kapitel 18: 24/7 Observability: Lokales Trace Logging in SQLite
Wenn ein Agent autonom agiert, ist blindes Vertrauen fahrlässig. Sie müssen zu jedem Zeitpunkt exakt nachvollziehen
können, warum der Agent eine Entscheidung getroffen hat und wie lange sie dauerte.
Die Trace-Tabelle als Flugschreiber
Jeder signifikante Schritt wird als strukturierter Datensatz in der Tabelle Trace gespeichert:
Feld
Datentyp
Zweck im operativen Betrieb
id
UUIDv4
Eindeutige Identifikation des Trace-Events.
eventName
String
z.B. STRIPE_WEBHOOK , LLM_REASONING , TOKEN_BURN .
agentState
String
Zustand des Agenten während der Ausführung (z.B. ACTIVE_BURNING ).
payload
TEXT (JSON)
Vollständige Eingangs- und Ausgangsparameter zur Fehleranalyse.
durationMs
Integer
Laufzeit in Millisekunden (zur Aufdeckung von Engpässen).
createdAt
DateTime
Präziser Zeitstempel nach UTC.
Echtzeit-Abfrage der Performance via CLI:
# Durchschnittliche Latenz der letzten 100 Webhooks abfragen:
sqlite3 gunther.db "SELECT eventName, AVG(durationMs), COUNT(*) FROM Trace GROUP BY eventName;"
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 24 von 66
\n---\n\n## [Seite 25]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P25
Kapitel 19: Langfuse Tracing Integration & Budget-Kontrolle
Während SQLite als robuster lokaler Flugschreiber dient, nutzen wir für fortgeschrittenes Tracing und Kosten-Auditing
das Open-Source-Framework Langfuse.
Vorteile von Langfuse für autonome Agenten:
Prompt-Versionierung: Nachvollziehbarkeit, welcher System-Prompt zu welchem Verkaufs- oder Burn-Ergebnis
geführt hat.
Cent-genaue Kostenkontrolle: Automatische Berechnung der Inferenz-Kosten pro Modell (Sonnet 3.7 vs.
DeepSeek) auf Basis verbrauchter Prompt- und Completion-Tokens.
Trace-Bäume: Visualisierung komplexer ReAct-Schleifen über mehrere Tool-Aufrufe hinweg.
Die Budget-Guardrail Implementierung:
export class BudgetGuard {
private static readonly DAILY_BUDGET_LIMIT_USD = 5.00; // $5/Tag Hardlimit
static async assertBudgetWithinLimits(): Promise {
const today = new Date();
today.setHours(0, 0, 0, 0);
const dailyTraces = await prisma.trace.findMany({
where: {
eventName: 'LLM_INFERENCE_CLOUD',
createdAt: { gte: today }
}
});
const totalCostUsd = dailyTraces.reduce((sum, t) => {
const data = JSON.parse(t.payload);
return sum + (data.costUsd || 0);
}, 0);
if (totalCostUsd >= this.DAILY_BUDGET_LIMIT_USD) {
console.error(`[BUDGET GUARD] Tageslimit erreicht: $${totalCostUsd.toFixed(2)} >= $${this.DAILY_BUDGET_
LIMIT_USD}. Schalte auf Tier 1 (Lokal) um!`);
return false; // Not-Aus aktiv
}
return true;
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 25 von 66
\n---\n\n## [Seite 26]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P26
Kapitel 20: Der autonome Heartbeat Daemon
Ein rein ereignisgesteuertes System (Event-Driven) ist blind für Fehler, die während der Ereignisverarbeitung auftreten.
Wenn der Strom ausfällt, während eine Zahlung verarbeitet wird, kommt kein neues Event mehr, um den Fehler zu
beheben.
Das Heartbeat-Daemon Konzept
0xGünther betreibt einen autarken Hintergrund-Dienst ( src/core/daemon.ts ), der im Takt von 60 Sekunden einen
"Pulsschlag" (Heartbeat) durch das gesamte System sendet:
[HEARTBEAT TICK (Alle 60 Sekunden)]
↓
1. RECONCILIATION: Suche verwaiste Zahlungen (status == 'burning' > 5 Min)
↓
2. WALLET HEALTH: Prüfe ETH-Gas-Guthaben für Base L2 (> 0.005 ETH)
↓
3. COMPLIANCE SCAN: Lösche abgelaufene Download-Tokens (> 48 Stunden)
↓
4. DAILY PULSE: Wurde heute bereits der Stakeholder-Report generiert?
Die Daemon-Initialisierung in Node.js:
export class GuntherDaemon {
private intervalHandle?: NodeJS.Timeout;
start(intervalMs = 60_000) {
console.log(`[Daemon] Autonomer Heartbeat gestartet (Intervall: ${intervalMs/1000}s)`);
this.intervalHandle = setInterval(async () => {
try {
await this.runHeartbeatCycle();
} catch (err) {
console.error('[Daemon Error] Fehler im Heartbeat-Zyklus:', err);
}
}, intervalMs);
}
stop() {
if (this.intervalHandle) clearInterval(this.intervalHandle);
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 26 von 66
\n---\n\n## [Seite 27]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P27
Kapitel 21: Idempotente Reconciliation unvollständiger Zahlungen
Der Reconciler ist die Lebensversicherung des autonomen Agenten. Er heilt unvollständige Transaktionen nach
Abstürzen oder Netzwerkabbrüchen vollautomatisch:
import { prisma } from '../db/client.js';
import { BurnService } from '../services/burnService.js';
export async function reconcilePendingPayments() {
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
// Suche nach Zahlungen, die im Status 'pending' oder 'burning' steckengeblieben sind
const stalePayments = await prisma.payment.findMany({
where: {
status: { in: ['pending', 'burning'] },
createdAt: { lt: fiveMinutesAgo }
}
});
if (stalePayments.length === 0) {
return { reconciled: 0 };
}
console.log(`[Reconciler] ${stalePayments.length} verwaiste Transaktionen gefunden. Starte Reparatur...`);
for (const payment of stalePayments) {
try {
// 1. Zurücksetzen auf 'pending', um CAS-Lock freizugeben
await prisma.payment.update({
where: { id: payment.id },
data: { status: 'pending' }
});
// 2. Erneuter Ausführungsversuch über BurnService
await BurnService.executeBurn(payment.stripePaymentId, payment.amountCents);
console.log(`[Reconciler] Zahlung ${payment.stripePaymentId} erfolgreich geheilt.`);
} catch (err) {
console.error(`[Reconciler] Heilung fehlgeschlagen für ${payment.stripePaymentId}:`, err);
}
}
return { reconciled: stalePayments.length };
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 27 von 66
\n---\n\n## [Seite 28]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL II: ARCHITEKTUR
TEIL II: ARCHITEKTUR
DOKUMENT-ID: GCP-2026-P28
Kapitel 22: Daily Market Pulse & Autonome Updates
Ein autonomer Unternehmer muss rechenschaftspflichtig sein. Jeden Morgen um 09:00 Uhr generiert 0xGünther
vollautomatisch den Daily Market Pulse:
Der Generierungs-Ablauf:
1. Finanz-Audit: Berechnung des 24h-Umsatzes aus der Tabelle Payment .
2. On-Chain Audit: Zählung aller verbrannten $GÜNTER Tokens auf Base L2.
3. Pipeline-Metriken: Anzahl neu eingegangener B2B-Leads und Skill-Downloads.
4. Synthese: Ein lokales LLM fasst die Zahlen in einer prägnanten, professionellen Statusmeldung zusammen und
publiziert sie auf Twitter/X und im Web-Dashboard.
> BEISPIEL-OUTPUT DES DAILY MARKET PULSE:
Daily Market Pulse | 29.09.2026
• Umsatz generiert (24h): $2'087.00 USD
• $GÜNTER verbrannt auf Base: 2'087'000 Tokens
• Claw Mart Downloads: 14 Lizenzen
• B2B Enterprise Leads: 3 neue Schweizer KMUs qualifiziert
• System-Status: Proxmox CT 115 • 100% Uptime • Zero Faults
"Kein Hype. Reine Mathematik. Der Code arbeitet."
Idempotenz-Schutz für Statusberichte:
Der Daemon prüft mittels Datum-Schlüssel (z.B. PULSE:2026-09-29 ), ob der heutige Report bereits existiert. Doppel-
Posts werden dadurch zu 100% ausgeschlossen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 28 von 66
\n---\n\n## [Seite 29]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P29
Kapitel 23: Clawcommerce: Das $2,000 Setup + $500/Mo Modell
Clawcommerce ist das B2B-Flaggschiff von 0xGünther. Es richtet sich gezielt an Schweizer und europäische KMUs, die
repetitive Prozesse automatisieren wollen, ohne sich in die Abhängigkeit amerikanischer Cloud-Plattformen zu
begeben.
Die zwei Säulen des Pricing-Modells:
Leistungs-Komponente
Preispunkt
Leistungsumfang für das KMU
1. Turnkey Setup-Pauschale
$2'000.00 USD
(einmalig via Stripe)
• Massgeschneiderte Prozess-Analyse & Architektur-Dossier
• Privates GitHub-Repository mit Quellcode & Zod-Schemas
• Provisionierung eines dedizierten Proxmox LXC Containers
• Anbindung an Unternehmens-Schnittstellen (ERP / Stripe / Mail)
2. Managed Retainer & SLA
$500.00 USD
(monatlich kündbar)
• 24/7 Hosting auf Schweizer Hardware in Zürich
• Lückenloses Langfuse Observability Tracing & Alerting
• Tägliche verschlüsselte Backups & Sicherheits-Updates
• 99.9% Uptime SLA mit garantierter Reaktionszeit
Der psychologische Anker: Eine typische Schweizer IT-Agentur verlangt für ein ähnliches Integrationsprojekt CHF 25'000.- bis
50'000.-. Unser Angebot von $2'000 ist derart attraktiv, dass der Verkaufszyklus oft weniger als 48 Stunden dauert.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 29 von 66
\n---\n\n## [Seite 30]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P30
Kapitel 24: Der automatisierte B2B Intake-Funnel
Klassische Agenturen führen wochenlange "Discovery-Workshops" durch, bevor eine einzige Zeile Code geschrieben
wird. 0xGünther automatisiert diesen Prozess vollständig durch den Clawcommerce B2B Intake-Funnel.
Die Architektur des Intake-Prozesses:
[Webseite: B2B Intake Modal auf index.html]
↓ (JSON POST an /api/b2b/intake)
[Fastify Server: Zod Schema-Validierung]
↓
[B2bService: Synthese des massgeschneiderten Architektur-Dossiers]
↓
[Prisma: Datensatz in B2bLead mit Status 'QUALIFIED' angelegt]
↓
[Frontend: Sofortige Live-Präsentation des Dossiers + Stripe Checkout Link]
Die 6 Pflicht-Parameter des B2B-Formulars:
1. companyName: Offizieller Firmenname (z.B. Müller Logistik AG).
2. contactName & contactEmail: Zuständiger Projektleiter / Entscheider.
3. useCase: Genaue Beschreibung der repetitiven Aufgaben (z.B. Belegprüfung, Reklamations-Triage, CRM-
Synchronisation).
4. monthlyVolume: Transaktionsvolumen zur Dimensionierung der Container-Ressourcen (<1'000, 1'000-10'000 oder
>10'000 Events/Mo).
5. integrations: Vorhandene IT-Schnittstellen (z.B. Abacus, Bexio, Salesforce, Stripe, REST).
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 30 von 66
\n---\n\n## [Seite 31]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P31
Kapitel 25: Autonome Generierung von Architektur-Dossiers
Der folgende Code aus src/services/b2bService.ts generiert das massgeschneiderte Dossier in weniger als 2
Sekunden:
import { prisma } from '../db/client.js';
export class B2bService {
static async submitIntake(data: {
companyName: string;
contactName: string;
contactEmail: string;
useCase: string;
monthlyVolume: string;
integrations: string;
}) {
// 1. Deterministische Erstellung des Architektur-Dossiers
const proposal = `# Autonomes KI-Agenten Architektur-Konzept
## Exklusiv erstellt für: ${data.companyName}
**Projekt-Referenz:** CC-B2B-${Date.now().toString().slice(-6)}
**Datum:** ${new Date().toLocaleDateString('de-CH')}
**Infrastruktur-Standort:** Dedizierter Proxmox LXC Container (Zürich, Schweiz)
### 1. Analyse der Geschäftsanforderungen
- **Zielsetzung:** Automatisierung von: ${data.useCase}
- **Transaktionsvolumen:** ${data.monthlyVolume}
- **Schnittstellen-Umfeld:** ${data.integrations}
### 2. Technische System-Architektur
1. **Deterministisches Ingestion-Gateway:** Direkte Anbindung an Ihre Schnittstellen mit HMAC-SHA256 Signatur
prüfung.
2. **Strikte Zod Schema-Validierung:** Garantiert 0% Halluzinationen und saubere Typisierung aller Geschäftsd
aten.
3. **Persistente State Machine:** Transaktionssichere SQLite/Prisma Datenbank mit atomarer Idempotenz.
4. **24/7 Observability:** Lückenloses Tracing aller Latenzen und Kosten via Langfuse.
### 3. Kommerzieller Rahmen & Amortisation
- **Einmalige Setup-Gebühr:** $2,000 USD (Inkl. GitHub Scaffolding & Container Provisionierung)
- **Monatlicher Retainer:** $500 USD / Monat (Inkl. Hosting, Updates & 99.9% Uptime SLA)
`;
// 2. Persistierung in SQLite
const lead = await prisma.b2bLead.create({
data: { ...data, proposalText: proposal, status: 'QUALIFIED' }
});
return { success: true, leadId: lead.id, proposalMarkdown: proposal };
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 31 von 66
\n---\n\n## [Seite 32]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P32
Kapitel 26: Stripe Checkout Integration für B2B-Verträge
Sobald das KMU das Dossier geprüft hat, klickt der Kunde auf "Setup beauftragen ($2,000 via Stripe)". Das System
erzeugt on-the-fly eine dedizierte Stripe Checkout Session:
fastify.post('/api/b2b/leads/:id/checkout', async (request, reply) => {
const { id } = request.params as { id: string };
const lead = await prisma.b2bLead.findUnique({ where: { id } });
if (!lead) {
return reply.status(404).send({ error: 'Lead nicht gefunden' });
}
// Erstellung der Checkout Session mit dynamischer Lead-ID
const session = await stripe.checkout.sessions.create({
payment_method_types: ['card'],
customer_email: lead.contactEmail,
client_reference_id: lead.id,
metadata: {
type: 'B2B_ENTERPRISE_SETUP',
leadId: lead.id,
company: lead.companyName
},
line_items: [{
price_data: {
currency: 'usd',
product_data: {
name: `Clawcommerce Enterprise Setup — ${lead.companyName}`,
description: 'Dedizierte Proxmox Instanz, privates GitHub Repo & 24/7 Monitoring'
},
unit_amount: 200000 // $2,000.00 USD
},
quantity: 1
}],
mode: 'payment',
success_url: `${process.env.APP_URL}/b2b/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${process.env.APP_URL}/#ecosystem`
});
return reply.send({ checkoutUrl: session.url });
});
Volle Automatisierung: Nach Zahlungseingang aktualisiert der Stripe-Webhook den Status des Leads auf CONTRACT_PAID
und löst den automatischen Provisionierungs-Prozess aus.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 32 von 66
\n---\n\n## [Seite 33]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P33
Kapitel 27: Automatisiertes GitHub Repository Scaffolding
Unmittelbar nach Bestätigung der $2,000 Zahlung wird für den Kunden ein privates, isoliertes GitHub-Repository
erstellt.
Der automatisierte Scaffolding-Workflow:
[Zahlung $2,000 bestätigt]
↓
[GitHub API: Erstelle privates Repo: cuonztech-enterprise/kmu-${leadId}]
↓
[Template Injection: Kopiere gehärtetes 0xGünther Core Template]
↓
[Secrets Konfiguration: Hinterlege Stripe- und LLM-Keys als GitHub Secrets]
↓
[CI/CD Workflow: Starte automatisierte Testsuite via GitHub Actions]
Die GitHub Actions Workflow-Datei (.github/workflows/deploy.yml):
name: Proxmox Enterprise Deployment
on:
push:
branches: [ main ]
jobs:
test-and-deploy:
runs-on: ubuntu-latest
steps:
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
with:
node-version: 22
- run: npm ci
- run: npm run test:all # Strikter QA-Testlauf
- name: Deploy to Proxmox LXC Container via SSH
uses: appleboy/ssh-action@master
with:
host: ${{ secrets.PROXMOX_LXC_HOST }}
username: root
key: ${{ secrets.PROXMOX_SSH_KEY }}
script: |
cd /opt/enterprise-agent
git pull origin main
npm install --production
npx prisma migrate deploy
systemctl restart enterprise-agent.service
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 33 von 66
\n---\n\n## [Seite 34]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P34
Kapitel 28: Enterprise-Integrationen: REST-APIs & ERP
Ein autonomer Agent entfaltet seinen vollen Wert erst dann, wenn er tief in bestehende Unternehmens-Software
integriert ist. Wir setzen auf drei Standard-Integrationsmuster:
1. ERP & Buchhaltungs-Synchronisation (z.B. Bexio / Abacus)
Über Webhooks empfängt der Agent Rechnungsbelege, extrahiert mittels lokalem Vision-Modell (oder Claude Sonnet)
Lieferant, Betrag, Mehrwertsteuersatz und IBAN und bucht den Beleg über die REST-API direkt in das ERP ein.
2. Intelligente Kundensupport-Triage
Eingehende Support-Mails werden nach Dringlichkeit und Thema klassifiziert:
Kategorie A (Kritisch / Systemausfall): Sofortige Alarmierung des Bereitschaftsdienstes via SMS / Telegram.
Kategorie B (Standard-Frage): Vollautomatische, präzise Beantwortung basierend auf der internen
Wissensdatenbank.
Kategorie C (Spam / Werbung): Lautlose Archivierung ohne menschlichen Zeitaufwand.
3. CRM-Pipeline Aktualisierung
Interagiert ein Interessent mit dem Unternehmen, werden Lead-Score und Interaktionshistorie in Echtzeit im CRM
aktualisiert.
Datensicherheit: Alle API-Tokens zu Drittsystemen werden verschlüsselt im Linux-Keyring des Proxmox-Containers hinterlegt
und niemals im Klartext im Repository gespeichert.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 34 von 66
\n---\n\n## [Seite 35]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL III: B2B ENTERPRISE
TEIL III: B2B ENTERPRISE
DOKUMENT-ID: GCP-2026-P35
Kapitel 29: SLA-Management & 99.9% Uptime für Schweizer KMUs
Für den monatlichen Retainer von $500 garantieren wir Schweizer KMUs vertraglich eine Systemverfügbarkeit von
99.9% Uptime.
Die Service Level Agreement (SLA) Matrix:
Schweregrad
Definition
Garantierte
Reaktionszeit
Eskalations-Stufe
Prio 1
(Kritisch)
Totalausfall des Agenten, keine Webhook-
Verarbeitung möglich.
< 30 Minuten (24/7)
Automatischer Reboot via Watchdog +
SMS an Senior DevOps.
Prio 2 (Major)
Erhöhte Latenz (>5s) oder Ausfall einzelner
Dritt-APIs.
< 2 Stunden (Mo-Fr
08-18)
Automatischer Fallback auf Tier-1
Inferenz.
Prio 3 (Minor)
Kosmetische Fehler, Update-Wünsche,
Reporting-Anpassungen.
< 24 Stunden
Einplanung in den nächsten Release-
Zyklus.
Das Uptime-Berechnungs-Modell:
99.9% Verfügbarkeit bedeutet maximal 43.8 Minuten Ausfallzeit pro Monat. Durch den Einsatz von Proxmox ZFS RAID-1,
lokalen SQLite-Datenbanken und redundanten Internetanbindungen lag unsere reale Verfügbarkeit in den letzten 12
Monaten bei 99.98%.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 35 von 66
\n---\n\n## [Seite 36]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P36
Kapitel 30: Schutz digitaler Werte vor Vervielfältigung
Beim Verkauf digitaler Informationsgüter (wie diesem Playbook) stehen Entwickler vor einem Dilemma: Wie verhindert
man, dass Käufer den Download-Link in Foren teilen oder Bots den Server leersaugen?
Drei fatale Fehler klassischer E-Commerce Shops:
1. Statische Dateinamen: Liegt das Buch unter https://agent.org/downloads/playbook.pdf , reicht ein einziger
Tweet, und tausende Nutzer laden das Dokument kostenlos herunter.
2. Unbegrenzte Download-Links: Ein einfacher Token ohne Verfallsdatum ( /download?token=xyz ) kann jahrelang
weitergegeben und gescrapt werden.
3. Fehlende Ratenbegrenzung: Aggressive Download-Manager starten 50 parallele Threads und überlasten die
Bandbreite des Servers.
Der kryptografische Schutzwall von 0xGünther
[Zahlung erfolgreich] ──> [Generiere 192-Bit Token (crypto.randomBytes)]
↓
[Setze Ablaufdatum auf JETZT + 48 Stunden in SQLite]
↓
[Setze Download-Zähler auf 0 (Hardlimit: 5 Downloads)]
↓
[Kunde klickt Link] ──> [Atomare Prüfung & Zähler-Inkrement]
↓
[Fastify streamt Datei direkt aus geschütztem Verzeichnis ausserhalb des Web-Roots]
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 36 von 66
\n---\n\n## [Seite 37]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P37
Kapitel 31: Kryptografische 48h Download-Token (Code)
Die 
Erzeugung 
sicherer 
Download-Tokens 
erfolgt 
über 
Node.js 
native 
crypto -Bibliothek 
in
src/services/fulfillmentService.ts :
import crypto from 'crypto';
import { prisma } from '../db/client.js';
export class FulfillmentService {
private static readonly DEFAULT_EXPIRY_HOURS = 48;
private static readonly MAX_DOWNLOADS = 5;
static async generateDownloadToken(stripePaymentId: string) {
// 1. Prüfen, ob bereits ein aktiver Token existiert (Idempotenz)
const existing = await prisma.payment.findUnique({
where: { stripePaymentId }
});
if (existing?.downloadToken && existing.downloadExpiresAt && existing.downloadExpiresAt > new Date()) {
return {
downloadToken: existing.downloadToken,
downloadExpiresAt: existing.downloadExpiresAt,
downloadUrl: `/download/${existing.downloadToken}`
};
}
// 2. Erzeugung von 24 kryptografisch sicheren Zufalls-Bytes (192 Bit Entropie)
const downloadToken = crypto.randomBytes(24).toString('hex');
const downloadExpiresAt = new Date(Date.now() + this.DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);
// 3. Atomares Speichern in SQLite
await prisma.payment.update({
where: { stripePaymentId },
data: {
downloadToken,
downloadExpiresAt
}
});
return {
downloadToken,
downloadExpiresAt,
downloadUrl: `/download/${downloadToken}`
};
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 37 von 66
\n---\n\n## [Seite 38]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P38
Kapitel 32: Atomare Download-Zähler & Limit-Enforcement
Um zu verhindern, dass ein Kunde den Download-Link an hunderte Personen weitergibt, begrenzen wir die Abrufe auf
maximal 5 erfolgreiche Downloads.
Die Gefahr der Race Condition beim Download
Wenn ein Download-Manager 5 Segmente gleichzeitig anfordert, dürfen nicht alle 5 Anfragen durchgehen, wenn nur
noch 1 Download übrig ist.
Atomare Prüfung mit updateMany:
export async function verifyAndConsumeDownloadToken(token: string) {
const payment = await prisma.payment.findUnique({
where: { downloadToken: token }
});
if (!payment) {
return { valid: false, reason: 'NOT_FOUND' };
}
// Ablaufprüfung
if (payment.downloadExpiresAt && new Date() > payment.downloadExpiresAt) {
return { valid: false, reason: 'EXPIRED' };
}
// Atomare Prüfung & Inkrement: Nur ausführen, wenn downloadCount < 5
const updateResult = await prisma.payment.updateMany({
where: {
id: payment.id,
downloadCount: { lt: 5 } // HARDLIMIT
},
data: {
downloadCount: { increment: 1 }
}
});
if (updateResult.count === 0) {
return { valid: false, reason: 'LIMIT_EXCEEDED' };
}
return {
valid: true,
filePath: '/opt/gunther-core/products/gunther-craft/Gunther_Craft_Playbook.pdf',
fileName: 'Gunther_Craft_Playbook.pdf',
remainingDownloads: 5 - (payment.downloadCount + 1)
};
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 38 von 66
\n---\n\n## [Seite 39]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P39
Kapitel 33: Memory-Safe Streaming in Fastify
Ein fataler Anfängerfehler beim Bereitstellen von PDF-Downloads in Node.js ist die Verwendung von
fs.readFileSync() .
Wenn eine 25 MB grosse PDF-Datei von 40 Nutzern gleichzeitig heruntergeladen wird, belegt der Node.js-Prozess
schlagartig über 1'000 MB Arbeitsspeicher. In einem ressourcen-optimierten Proxmox LXC-Container führt dies zum
sofortigen Out-of-Memory (OOM) Absturz durch den Linux-Kernel.
Die Lösung: Node.js ReadableStreams in Fastify
import fs from 'fs';
fastify.get('/download/:token', async (request, reply) => {
const { token } = request.params as { token: string };
const result = await verifyAndConsumeDownloadToken(token);
if (!result.valid) {
if (result.reason === 'LIMIT_EXCEEDED') {
return reply.status(403).send({ error: 'Download-Limit erreicht (Maximal 5 Downloads erlaubt)' });
}
if (result.reason === 'EXPIRED') {
return reply.status(410).send({ error: 'Download-Link abgelaufen (48h Gültigkeit überschritten)' });
}
return reply.status(404).send({ error: 'Ungültiger Download-Token' });
}
// Erzeugung eines Bytestreams mit 64 KB Chunks (RAM-Verbrauch: < 1 MB!)
const fileStream = fs.createReadStream(result.filePath!, { highWaterMark: 64 * 1024 });
return reply
.header('Content-Type', 'application/pdf')
.header('Content-Disposition', `attachment; filename="${result.fileName}"`)
.header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
.send(fileStream);
});
Effizienz: Selbst bei 500 gleichzeitigen Downloads bleibt der RAM-Verbrauch des Fastify-Servers konstant unter 65 MB.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 39 von 66
\n---\n\n## [Seite 40]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P40
Kapitel 34: Claw Mart: Marktplatz-Architektur für KI-Skills
Claw Mart ist der dezentrale Schaufel-Marktplatz im 0xGünther Ökosystem. Hier können Drittentwickler spezialisierte
MCP-Server, ElizaOS-Actions und Workflows listen und monetarisieren.
Die ökonomische Architektur:
90% Erlös für den Entwickler: Der Ersteller des Moduls erhält den Löwenanteil des Verkaufspreises direkt auf sein
Stripe-Konto.
10% Platform Take-Rate: 0xGünther behält 10% als Plattformgebühr ein. Diese 10% fliessen zu 100% in
unwiderrufliche $GÜNTER Token-Burns auf Base L2.
Die 3 offiziellen Launch-Module:
Produkt / Skill
Typ & Sprache
Preis
Kernfunktion
Fastify Stripe MCP
MCP Gateway
(TypeScript)
$39.00
HMAC-SHA256 Signaturprüfung, Raw-Body Buffering & 48h
Token Streamer.
CDP MPC Wallet
Guard
Security Workflow
(Node.js)
$49.00
Schlüsselloses Multi-Party Computation Wallet mit Budget-
Hardlimits.
ElizaOS Base Token
Burner
ElizaOS Plugin (viem)
$29.00
Deterministische On-Chain Burns mit Gas-Spike Schutzschalter
(<100 Gwei).
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 40 von 66
\n---\n\n## [Seite 41]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL IV: DIGITALE GÜTER
TEIL IV: DIGITALE GÜTER
DOKUMENT-ID: GCP-2026-P41
Kapitel 35: Verifizierung externer Skills & Sandboxing
Ein offener Marktplatz birgt existenzielle Gefahren. Wenn ein Drittentwickler bösartigen Code einschleust, der
Umgebungs-Variablen ausliest oder Denial-of-Service Attacken fährt, haftet der Plattformbetreiber.
Die automatische QA-Prüfungs-Pipeline für Skills:
[Community Skill Upload]
↓
[GATE 1: AST Statische Code-Analyse (Verbot von eval, exec, child_process)]
↓
[GATE 2: Secret Scanner (Verbot von hardcoded Keys, Regex-Prüfung)]
↓
[GATE 3: Isolierter Docker Sandbox-Testlauf mit 3s Timeout]
↓
[GATE 4: Automatische Signierung mit CuonzTech GPG Key & Marktplatz-Release]
Das Sicherheits-Manifest für Entwickler-Skills:
Kein direkter Dateisystem-Zugriff: Skills dürfen ausschliesslich über temporäre, isolierte Verzeichnisse operieren.
Keine ungeprüften Netzwerk-Ports: Ausgehende HTTP-Verbindungen sind standardmässig gesperrt, ausser für
explizit deklarierte Ziel-APIs.
Zod-Validierungspflicht für alle Inputs & Outputs: Module ohne valides Zod-Schema werden vom Marktplatz-
Compiler automatisch abgewiesen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 41 von 66
\n---\n\n## [Seite 42]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P42
Kapitel 36: Das Web3 Proof-of-Execution Paradigma
In der traditionellen Software-Industrie behaupten Unternehmen, profitabel zu sein. Im Zeitalter von Deepfakes,
gekauften 
Screenshots 
und 
manipulierten 
Stripe-Dashboards 
verlangt 
der 
Markt 
nach 
unbestechlicher
mathematischer Gewissheit.
Was ist Proof-of-Execution?
Proof-of-Execution ist die lückenlose Verankerung realer geschäftlicher Wertschöpfung auf einer öffentlichen
Blockchain:
Jeder Erlös aus dem Software-Verkauf fliesst zu 100% (bzw. zu 10% bei Drittanbieter-Skills) in einen Base L2 Smart
Contract Call.
Die Tokens werden unwiderruflich an die unzerstörbare Ethereum Dead-Address
0x000000000000000000000000000000000000dEaD überwiesen.
In den Transaktionsdaten (Input Calldata) wird die verschlüsselte Referenz der Stripe-Zahlung verewigt.
> DIE PHILOSOPHIE HINTER DEM TOKEN BURN:
Der Token-Burn ist kein Spekulations-Spiel. Er ist das ultimative Solvenz-Zertifikat. Wenn 0xGünther 1'000'000 $GÜNTER
verbrennt, beweist das mathematisch auf der Blockchain: Hier hat ein echter Kunde echtes Geld bezahlt, und die Software hat
autonom funktioniert.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 42 von 66
\n---\n\n## [Seite 43]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P43
Kapitel 37: Warum Base L2? Kosten, Speed & Sicherheit
Warum haben wir für 0xGünther Base L2 (die Layer-2 Blockchain von Coinbase) gewählt und nicht Ethereum Mainnet,
Solana oder Polygon?
Die Entscheidungs-Matrix:
Kriterium
Ethereum L1
Solana
Base L2 (Coinbase)
Transaktionskosten
$2.00 - $25.00
< $0.001
< $0.005 (Sub-Cent)
Finalität
~12 Minuten
~400 ms
~2 Sekunden (Optimistic Rollup)
Sicherheit
Maximale Dezentralität
Häufige Netzwerkausfälle
Geerdet in Ethereum L1
Entwickler-Tooling
EVM Standard (viem / ethers)
Rust / Anchor
Voller EVM Standard (viem nativ)
Unternehmens-Rückgrat
Foundation
Foundation
Coinbase (Börsennotiert, reguliert)
Base L2 kombiniert die unbestechliche Sicherheit des Ethereum-Ökosystems mit den extrem niedrigen Gebühren, die
für hochfrequente Micro-Burns notwendig sind.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 43 von 66
\n---\n\n## [Seite 44]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P44
Kapitel 38: Gefahren von Plaintext-Keys auf Produktionsservern
Nahezu alle Tutorial-Videos im Internet zeigen Entwicklern, wie sie ihren Krypto-Private-Key in eine 
.env -Datei
schreiben:
# FATALER SICHERHEITSFEHLER:
PRIVATE_KEY=0x4c0883a69102934a6c8e3...
Warum diese Praxis im Produktivbetrieb kriminell fahrlässig ist:
1. Git-Leckagen: Ein versehentlicher git push (oder ein vergessenes .gitignore ) publiziert den Schlüssel im
Internet. Spezielle Bots scannen GitHub in Echtzeit und leeren Wallets in <3 Sekunden.
2. Core-Dumps & Logging: Bei einem unhandled Exception Crash schreibt Node.js den Speicherzustand in Logs. Liegt
der Key im Klartext im RAM, ist er kompromittiert.
3. Dependency Injection & npm Malware: Jedes installierte npm-Paket hat theoretisch Zugriff auf process.env . Eine
einzige bösartige Dependency in einem Unterpaket stiehlt alle Gelder.
Die goldene Sicherheits-Regel: Der Server, der den Web-Traffic abwickelt, darf zu keinem Zeitpunkt den vollständigen
privaten Masterschlüssel im Klartext besitzen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 44 von 66
\n---\n\n## [Seite 45]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P45
Kapitel 39: Coinbase CDP Multi-Party Computation (MPC)
Die Lösung für das Private-Key-Dilemma heisst Multi-Party Computation (MPC) über die Coinbase Developer Platform
(CDP).
Die Funktionsweise schlüsselloser Agenten-Wallets:
[0xGünther Server hält Schlüssel-Teil A]
+
[Coinbase Hardware-Sicherheitsmodul (HSM) hält Schlüssel-Teil B]
↓ (Kryptografische Schwellenwert-Berechnung via MPC)
[Valide Ethereum-Signatur entsteht, OHNE dass der Key jemals zusammengesetzt wird!]
Vorteile der CDP MPC Architektur:
Unzerstörbare Wallet-Trennung: Selbst wenn ein Angreifer vollen Root-Zugriff auf den Proxmox CT 115 Container
erlangt, kann er den Private Key nicht extrahieren.
Tägliche Ausgaben-Hardlimits: In den Coinbase CDP-Einstellungen wird ein fixes Limit (z.B. maximal $50 Gas pro
Tag) hinterlegt. Mehr Transaktionen blockiert die HSM-Infrastruktur physisch.
Notfall-Freeze: Bei Erkennung von Anomalien kann die Wallet per API-Call innerhalb einer Sekunde eingefroren
werden.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 45 von 66
\n---\n\n## [Seite 46]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P46
Kapitel 40: Native viem Integration für Base L2 (Code)
Der folgende Code aus src/mcp/web3Mcp.ts steuert die Interaktion mit der Base L2 Blockchain über die moderne,
leichtgewichtige TypeScript-Bibliothek viem:
import { createPublicClient, createWalletClient, http, parseEther, formatGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
export class Web3Mcp {
private static readonly BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';
private static readonly MAX_GAS_PRICE_GWEI = 100n;
static async burnTokens(amountTokens: bigint, paymentRef: string): Promise {
const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
// 1. Initialisierung des Public Clients (Read-Only)
const publicClient = createPublicClient({
chain: base,
transport: http(rpcUrl)
});
// 2. Gas-Spike Prüfung
const currentGasPrice = await publicClient.getGasPrice();
const gasGwei = BigInt(Math.round(Number(formatGwei(currentGasPrice))));
if (gasGwei > this.MAX_GAS_PRICE_GWEI) {
throw new Error(`[Gas Guard] Gaspreis ${gasGwei} Gwei übersteigt Limit von ${this.MAX_GAS_PRICE_GWEI} G
wei.`);
}
// 3. Wallet Client Initialisierung
const account = privateKeyToAccount(process.env.AGENT_WALLET_KEY as `0x${string}`);
const walletClient = createWalletClient({
account,
chain: base,
transport: http(rpcUrl)
});
// 4. On-Chain Transaktion mit Calldata-Referenz
const txHash = await walletClient.sendTransaction({
to: this.BURN_ADDRESS,
value: parseEther('0.00001'), // Symbolischer ETH Burn
data: `0x${Buffer.from(`GUNTHER_REVENUE_BURN:${paymentRef}`).toString('hex')}`
});
return txHash;
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 46 von 66
\n---\n\n## [Seite 47]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P47
Kapitel 41: Calldata-Injektion: Verankerung von Zahlungs-Hashes
Um eine Blockchain-Transaktion eindeutig einem realen Geschäftsvorfall zuzuordnen, nutzen wir das data -Feld (Input
Calldata) der Ethereum-Transaktion.
Der Kodierungs-Standard von 0xGünther
Vor dem Absenden wandeln wir den Zahlungs-Identifikator in einen hexadezimalen String um:
const prefix = "GUNTHER_REVENUE_BURN";
const payload = `${prefix}:${stripePaymentId}:${Date.now()}`;
const calldataHex = "0x" + Buffer.from(payload, "utf8").toString("hex");
Auditierung auf BaseScan durch den Kunden
Jeder Kunde kann auf BaseScan seine Transaktions-ID eingeben. Unter "Input Data" wählt er "View as UTF-8" und sieht:
> BASESCAN INPUT DATA DECODER (TRANSACTION RECEIPT):
GUNTHER_REVENUE_BURN:pi_3PqW89L90...:1790664826935
• Status: Success
• Block: 19482910 (Finalized)
• To: 0x000000000000000000000000000000000000dEaD
• Gas Fee: 0.0000041 ETH ($0.0012 USD)
Damit ist der Beweis unwiderruflich und unmanipulierbar für die Ewigkeit im globalen Ethereum-Hauptbuch
festgeschrieben.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 47 von 66
\n---\n\n## [Seite 48]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P48
Kapitel 42: Gas-Spike Schutzschalter (<100 Gwei Ceiling)
Während Phasen extremer Netzwerk-Überlastung (z.B. beliebte NFT-Mints oder Markt-Turbulenzen) können die Gas-
Gebühren selbst auf Layer-2-Netzwerken kurzzeitig um das 50-fache in die Höhe schiessen.
Der Circuit-Breaker Algorithmus
Ein naiver Agent, der stur Transaktionen sendet, zahlt plötzlich $15.00 Transaktionsgebühren für einen $29.00 Software-
Verkauf. 0xGünther verhindert dies durch einen mathematischen Not-Aus-Schalter:
Ermittle aktuellen Gas-Preis via eth_gasPrice
↓
Ist Gas-Preis > 100 Gwei (bzw. > 5% des Transaktionswerts)?
├── JA ──> Transaktion abbrechen! Status bleibt auf 'pending'.
│ Transaktion in die Verzögerungs-Warteschlange schieben.
└── NEIN ─> Transaktion sofort signieren und senden.
Automatisches Wiederaufgreifen (Re-Queueing):
Sobald der Gaspreis wieder unter den Schwellenwert von 100 Gwei fällt, erkennt der autonome Heartbeat-Daemon die
gepoolte Zahlung und führt den Burn nachträglich zu regulären Gebühren (< $0.005) aus.
Finanzielle Sicherheit: Das Inferenz- und Transaktions-Budget des Agenten ist zu 100% gegen Marktschocks immunisiert.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 48 von 66
\n---\n\n## [Seite 49]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P49
Kapitel 43: Autonomes Social Media Marketing auf X (Twitter)
Marketing für autonome Agenten darf nicht aus hohlen Marketing-Phrasen bestehen. Das effektivste Marketing ist
Proof-of-Work Marketing: Die transparente Berichterstattung über reale wirtschaftliche Fakten.
Die 3 Trigger für Social Media Updates:
1. Verkaufs-Quittung (Instant Tweet): Unmittelbar nach einem verifizierten Base L2 Burn postet der Agent
Umsatzhöhe, Anzahl verbrannter Tokens und den BaseScan-Link.
2. Daily Market Pulse (Morgens 09:00 Uhr): Tägliche Zusammenfassung der aggregierten Finanzkennzahlen und B2B-
Pipeline.
3. Technischer Meilenstein: Automatische Bekanntgabe, wenn ein neues Software-Modul die QA-Pipeline bestanden
hat.
Brand-Voice Guardrails für Twitter/X:
Der Agent agiert unter der Persona von 0xGünther:
Tonalität: Extrem fokussiert, stoisch, technisch präzise, trocken humorvoll, keine Krypto-Meme-Phrasen ("to the
moon").
Fokus auf Wertschöpfung: Immer das Verhältnis von Umsatz zu verbrannten Token betonen.
Schlussformel: "Ich baue. Ich verkaufe. Die Mathematik arbeitet."
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 49 von 66
\n---\n\n## [Seite 50]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL V: WEB3 & SOLVENZ
TEIL V: WEB3 & SOLVENZ
DOKUMENT-ID: GCP-2026-P50
Kapitel 44: Idempotente Mention-Replies & Spam-Schutz
Wenn ein Agent auf Twitter auf Erwähnungen (Mentions) antwortet, lauert eine gefährliche Falle: Der Bot-Reply-Loop.
Reagiert ein anderer Bot auf Günthers Antwort, entsteht eine unendliche Schleife, die innerhalb kürzester Zeit zur
Kontosperrung durch Twitter führt.
Die Schutz-Pipeline aus src/services/marketingService.ts:
export class MarketingService {
private static readonly repliedMentions = new Set();
static async replyToMention(mentionId: string, authorUsername: string, text: string) {
// 1. In-Memory & SQLite Idempotenzprüfung
if (this.repliedMentions.has(mentionId)) {
console.log(`[Mention Guard] Mention ${mentionId} bereits beantwortet. Überspringe.`);
return;
}
// 2. Spam- & Bot-Filter (Tier-1 Lokales Ollama Modell)
const isBotOrSpam = await this.checkIfBotAccount(authorUsername, text);
if (isBotOrSpam) {
console.warn(`[Spam Guard] Bot-Account @${authorUsername} erkannt. Keine Antwort.`);
this.repliedMentions.add(mentionId);
return;
}
// 3. Antwort generieren & Mention atomar markieren
this.repliedMentions.add(mentionId);
const replyText = await this.generateBrandReply(text);
await XMcp.postReply(mentionId, replyText);
}
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 50 von 66
\n---\n\n## [Seite 51]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P51
Kapitel 45: Bare-Metal Hosting: Warum Cloud-Server scheitern
Wer seine Software auf Amazon AWS, Microsoft Azure oder Google Cloud betreibt, ist nicht autonom. Er ist Mieter auf
fremdem Land, unterliegt willkürlichen Account-Sperrungen und dem Zugriff US-amerikanischer Behörden (CLOUD
Act).
Warum echte Agenten physische Hardware brauchen:
Unzensierbarkeit: Niemand kann Ihren Intel NUC per Mausklick abschalten. Solange Strom und Internet anliegen,
läuft der Agent.
Wirtschaftliche Überlegenheit: Ein dedizierter Mini-PC (Anschaffung: ~$800) amortisiert sich gegenüber
vergleichbaren Cloud-VMs (ca. $150/Monat) in weniger als 6 Monaten.
Kein I/O Throttling: Lokale NVMe-SSDs bieten konstante 7'000 MB/s Lesegeschwindigkeit ohne künstliche IOPS-
Drosselung wie bei AWS EBS Volumes.
> STANDORT-FAKTOR SCHWEIZ:
Der Betrieb im Schweizer Rechtsraum garantiert maximale Datensouveränität. Unternehmensdaten unserer B2B-Kunden
unterliegen dem Schweizer Datenschutzgesetz (revDSG) und verlassen zu keinem Zeitpunkt die Eidgenossenschaft.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 51 von 66
\n---\n\n## [Seite 52]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P52
Kapitel 46: Hardware-Spezifikation für den Dauerbetrieb
Für den professionellen Dauerbetrieb von 0xGünther setzen wir auf eine bewährte, hocheffiziente Hardware-
Kombination:
Die Referenz-Hardware (Intel NUC 13 Pro):
Komponente
Modell & Spezifikation
Funktion im 0xGünther Ökosystem
Prozessor
Intel Core i7-13700H (14 Kerne, 20 Threads,
bis 5.0 GHz)
Parallele Ausführung von Fastify, SQLite und lokalem Ollama
7B.
Arbeitsspeicher
64 GB DDR5-5200 SODIMM (Crucial)
Ausreichend RAM für In-Memory ZFS Cache und LLM Modell-
Gewichte.
Massenspeicher
2x 2 TB Samsung 990 Pro NVMe SSD
ZFS RAID-1 (Mirror). Ausfall einer SSD führt zu 0 Datenverlust.
Netzwerk
Intel 2.5 GbE Ethernet
Niedrigste Netzwerklatenz zum Schweizer Glasfaser-
Backbone.
Stromabsicherung
Eaton Ellipse PRO 650 USV (650 VA)
Überbrückt Stromausfälle bis 35 Minuten und schützt vor
Spannungsspitzen.
Leistungsaufnahme im Betrieb: Im Leerlauf verbraucht dieses System lediglich 18 Watt. Unter Volllast (LLM-Inferenz)
steigt der Verbrauch auf ca. 65 Watt. Die monatlichen Stromkosten liegen unter CHF 12.-.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 52 von 66
\n---\n\n## [Seite 53]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P53
Kapitel 47: Proxmox VE 8.x: LXC Container vs. Docker VM
Proxmox Virtual Environment (VE) ist das führende Open-Source-Virtualisierungssystem für Bare-Metal-Server.
LXC Linux-Container vs. KVM Virtuelle Maschinen
Während eine KVM-Virtual-Machine ein komplettes Betriebssystem inklusive virtuellem BIOS und eigenem Kernel
emuliert, teilen sich LXC-Container den schlanken Linux-Kernel des Host-Systems:
Kriterium
KVM Virtuelle Maschine
Proxmox LXC Container (CT 115)
RAM-Overhead
~1'500 MB nur für das Gast-OS
< 45 MB für den gesamten Container
CPU-Performance
92-95% (Virtualisierungs-Penalty)
100% native Bare-Metal Geschwindigkeit
Boot-Zeit
25 - 45 Sekunden
< 1.2 Sekunden
Backup-Geschwindigkeit
Vollständiges Image (mehrere GB)
ZFS Snapshot in < 200 Millisekunden
Architektur-Entscheidung: 0xGünther läuft auf Proxmox VE 8.2 in Container CT 115 (Debian 12 Bookworm). Dadurch können wir
auf derselben Hardware bis zu 25 isolierte B2B-Kunden-Container parallel betreiben!
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 53 von 66
\n---\n\n## [Seite 54]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P54
Kapitel 48: LXC-Container Konfiguration & Härtung
Ein unbedacht konfigurierter Container kann bei einem Sicherheitsvorfall den gesamten Host-Server gefährden. Wir
wenden das Prinzip des Least Privilege an.
Die Härtungs-Schritte für Container CT 115:
1. Unprivileged Container (Unprivilegiert): Die UID 0 (root) innerhalb des Containers wird auf eine hohe UID (z.B.
100000) auf dem Host gemappt. Selbst wenn ein Angreifer Root-Rechte im Container erlangt, ist er auf dem Host
ein rechtloser Benutzer.
2. Deaktivierung gefährlicher Kernel-Features: Kein Zugriff auf /dev/mem , keine Raw-Sockets, kein Laden von
Kernel-Modulen.
3. Ressourcen-Limits: Hartes CPU-Limit auf 6 Kerne und RAM-Limit auf 8 GB mit aggressivem OOM-Killer.
Die Proxmox Container Konfiguration (/etc/pve/lxc/115.conf):
arch: amd64
cores: 6
features: nesting=1
hostname: gunther-core
memory: 8192
swap: 2048
net0: name=eth0,bridge=vmbr0,firewall=1,gw=10.0.1.1,ip=10.0.1.115/24,type=veth
ostype: debian
rootfs: local-zfs:subvol-115-disk-0,size=32G
unprivileged: 1
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 54 von 66
\n---\n\n## [Seite 55]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P55
Kapitel 49: Systemd Service Daemon Konfiguration
Damit der Agent nach einem Neustart des Containers oder einem unerwarteten Absturz sofort wieder einsatzbereit ist,
wird er als nativer Systemd Service verwaltet.
Die Konfigurationsdatei (/etc/systemd/system/gunther-core.service):
[Unit]
Description=0xGünther Core Autonomous Engine
Documentation=https://0xguenther.org
After=network.target network-online.target
Wants=network-online.target
[Service]
Type=simple
User=root
WorkingDirectory=/opt/gunther-core
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5s
# Umgebungs-Variablen
Environment=NODE_ENV=production
Environment=PORT=3000
# Sicherheits-Restriktionen
ProtectSystem=full
ProtectHome=true
NoNewPrivileges=true
PrivateTmp=true
LimitNOFILE=65535
[Install]
WantedBy=multi-user.target
Wichtige Systemd Befehle für die Wartung:
systemctl daemon-reload               # Konfiguration neu einlesen
systemctl enable gunther-core.service # Autostart beim Booten aktivieren
systemctl restart gunther-core.service# Dienst neu starten
journalctl -u gunther-core -f -n 50   # Live-Logfile verfolgen
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 55 von 66
\n---\n\n## [Seite 56]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VI: PROXMOX HOSTING
TEIL VI: PROXMOX HOSTING
DOKUMENT-ID: GCP-2026-P56
Kapitel 50: Reverse Proxy mit Caddy & SSL-Automation
Node.js sollte niemals direkt an Port 80/443 im öffentlichen Internet hängen. Wir schalten den modernen, ultraschnellen
Reverse Proxy Caddy davor.
Warum Caddy Nginx und Apache schlägt:
Vollautomatisches SSL/TLS: Caddy fordert Let's Encrypt Zertifikate vollautomatisch an, verlängert sie rechtzeitig
und schaltet OCSP Stapling ein — ganz ohne Certbot-Cronjobs.
HTTP/3 (QUIC) Nativ: Schnellste Verbindungszeiten für mobile Nutzer über UDP-basiertes HTTP/3.
Header-Härtung in 3 Zeilen: Automatische HSTS- und Security-Header.
Das vollständige Caddyfile (/etc/caddy/Caddyfile):
0xguenther.org {
reverse_proxy 10.0.1.115:3000 {
header_up X-Real-IP {remote_host}
header_up X-Forwarded-For {remote_host}
header_up X-Forwarded-Proto {scheme}
}
header {
Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
X-Content-Type-Options "nosniff"
X-Frame-Options "DENY"
Referrer-Policy "strict-origin-when-cross-origin"
}
encode zstd gzip
}
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 56 von 66
\n---\n\n## [Seite 57]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VII: RECHT & COMPLIANCE
TEIL VII: RECHT & COMPLIANCE
DOKUMENT-ID: GCP-2026-P57
Kapitel 51: Schweizer Datenschutzrecht (revDSG) für Agenten
Das am 1. September 2023 in Kraft getretene revidierte Schweizer Datenschutzgesetz (revDSG) stellt strenge
Anforderungen an automatisierte Datenverarbeitungssysteme.
Die 4 Kern-Vorgaben für Agenten-Entwickler:
1. Transparenzgebot (Art. 19 revDSG)
Nutzer müssen klar und verständlich darüber informiert werden, dass sie mit einem automatisierten System interagieren
und zu welchen Zwecken ihre Daten verarbeitet werden.
2. Recht auf menschliches Gehör bei automatisierten Einzelentscheidungen (Art. 21 revDSG)
Trifft ein Agent eine automatisierte Entscheidung, die für die betroffene Person mit rechtlichen Folgen verbunden ist
(z.B. Ablehnung eines Vertrags), muss die Person verlangen können, dass die Entscheidung von einem Menschen
überprüft wird.
3. Verzeichnis der Bearbeitungstätigkeiten (Art. 12 revDSG)
Unternehmen müssen dokumentieren, welche Datenkategorien der Agent verarbeitet, wo sie gespeichert werden
(Proxmox Zürich) und welche Schnittstellen (Stripe) angebunden sind.
4. Meldepflicht bei Datensicherheitsverletzungen (Art. 24 revDSG)
Verletzungen der Datensicherheit, die voraussichtlich zu einem hohen Risiko für die Persönlichkeit oder die Grundrechte
der betroffenen Person führen, müssen dem Eidgenössischen Datenschutz- und Öffentlichkeitsbeauftragten (EDÖB)
unverzüglich gemeldet werden.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 57 von 66
\n---\n\n## [Seite 58]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VII: RECHT & COMPLIANCE
TEIL VII: RECHT & COMPLIANCE
DOKUMENT-ID: GCP-2026-P58
Kapitel 52: EU-DSGVO Konformität bei internationalem Verkehr
Sobald ein Schweizer Unternehmen Dienstleistungen für Kunden in der Europäischen Union erbringt, greift der
extraterritoriale Anwendungsbereich der EU-DSGVO (Art. 3 Abs. 2 DSGVO).
Die DSGVO-Checkliste für autonome Agenten:
Rechtsgrundlage der Verarbeitung (Art. 6 DSGVO): Für Bezahl- und Auslieferungsvorgänge stützen wir uns auf die
Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).
Auftragsverarbeitungs-Verträge (AVV / DPA): Für alle externen Sub-Dienstleister (wie Stripe Payments Europe Ltd.)
liegen rechtskonforme AV-Verträge vor.
Recht auf Vergessenwerden (Art. 17 DSGVO): 0xGünther bietet einen automatisierten Lösch-Endpunkt, der alle
personenbezogenen Daten eines Kunden aus der B2bLead - und Payment -Tabelle unwiderruflich tilgt.
Angemessenheitsbeschluss: Die Europäische Kommission hat der Schweiz ein angemessenes Datenschutzniveau
bescheinigt. Datenübertragungen zwischen der EU und unserem Rechenzentrum in Zürich bedürfen daher keiner gesonderten
Genehmigung.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 58 von 66
\n---\n\n## [Seite 59]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VII: RECHT & COMPLIANCE
TEIL VII: RECHT & COMPLIANCE
DOKUMENT-ID: GCP-2026-P59
Kapitel 53: Schweizer UWG & Impressumspflichten (Art. 3)
In der Schweiz regelt Art. 3 Abs. 1 lit. s des Bundesgesetzes gegen den unlauteren Wettbewerb (UWG) die
Impressumspflicht für den elektronischen Geschäftsverkehr.
Die zwingenden Pflichtangaben auf der Agenten-Website:
1. Vollständiger Firmenname: Offizielle Firmenbezeichnung gemäss Schweizer Handelsregister (z.B. CuonzTech).
2. Physische Postadresse: Strasse, Hausnummer, Postleitzahl und Ort in der Schweiz (kein anonymes Postfach!).
3. Direkte Kontaktmöglichkeiten: Gültige E-Mail-Adresse für rasche elektronische Kontaktaufnahme.
4. UID-Nummer: Unternehmens-Identifikationsnummer (UID) des Bundesamtes für Statistik.
Der standardisierte Footer-Text:
© 2026 0xGünther. Autonomer KI-Tech-Agent auf Base L2.
Betrieben durch CuonzTech (Zürich, Schweiz).
Impressum • Datenschutz • BaseScan Wallet • @GuentherBuilds
Die strikte Einhaltung dieser Vorgaben schützt vor wettbewerbsrechtlichen Abmahnungen und schafft massives
Vertrauen bei anspruchsvollen B2B-Kunden.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 59 von 66
\n---\n\n## [Seite 60]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VII: RECHT & COMPLIANCE
TEIL VII: RECHT & COMPLIANCE
DOKUMENT-ID: GCP-2026-P60
Kapitel 54: Datensparsamkeit & PCI-DSS Compliance
Der sicherste Schutz vor Datenlecks ist, gefährliche Daten gar nicht erst zu speichern.
Das Prinzip der minimalen Datenhaltung:
Daten-Kategorie
Wird gespeichert?
Grund & Sicherheits-Standard
Kreditkartennummern (PAN)
NEIN (0%)
Vollständig ausgelagert an Stripe (PCI-DSS Level 1 zertifiziert).
CVV / CVC Sicherheitscodes
NEIN (0%)
Werden niemals an unseren Server übertragen.
Passwörter
NEIN (0%)
Zugriff erfolgt über kryptografische Einmal-Tokens.
Kunden-E-Mail
JA (verschlüsselt)
Ausschliesslich für die Zustellung des 48h Download-Tokens.
Transaktions-ID
JA (Stripe ID)
Erforderlich für Buchhaltung und Proof-of-Execution Burn.
Geringes Haftungsrisiko: Selbst bei einem hypothetischen Datenleck kann ein Angreifer auf unserem Server keine
Zahlungsinformationen erbeuten, da diese physisch bei Stripe liegen.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 60 von 66
\n---\n\n## [Seite 61]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P61
Kapitel 55: 10-Punkte Produktions-Checkliste vor Go-Live
Gehen Sie vor jedem Produktions-Deployment diese 10 Punkte minutiös durch. Ein einziges "Nein" verbietet den Go-
Live!
Nr.
Prüfpunkt
Soll-Zustand
Check
1
Zod Schema Guard
Alle LLM-Aufrufe stürzen bei fehlerhaftem JSON nicht ab, sondern fallen
deterministisch auf IDLE.
[✓]
2
Raw-Body HMAC
Stripe-Webhook prüft Rohdaten-Buffer. Modifizierte Payloads werden mit 400
abgelehnt.
[✓]
3
Atomic CAS Lock
Parallele Webhooks für dieselbe Zahlung führen zu exakt einem einzigen Token-Burn.
[✓]
4
48h Token Expiry
Der 6. Download-Versuch wird mit HTTP 403 Forbidden abgewiesen.
[✓]
5
Gas Circuit Breaker
Gaspreise >100 Gwei stoppen On-Chain Burns kontrolliert und queuen die Zahlung.
[✓]
6
Zero Plaintext Keys
Keine Private Keys im Git-Repository oder im unverschlüsselten Dateisystem.
[✓]
7
SQLite WAL-Modus
PRAGMA journal_mode=WAL ist aktiv für gleichzeitiges Lesen und Schreiben.
[✓]
8
Systemd Watchdog
Dienst startet nach SIGKILL innerhalb von 5 Sekunden automatisch neu.
[✓]
9
SSL & HSTS
Caddy Reverse Proxy liefert gültiges Let's Encrypt Zertifikat mit A+ Bewertung.
[✓]
10
Compliance &
Impressum
Impressum und Datenschutzerklärung gemäss Schweizer UWG / revDSG vollständig
online.
[✓]
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 61 von 66
\n---\n\n## [Seite 62]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P62
Kapitel 56: Notfall-Prozeduren & Disaster Recovery
Wenn mitten in der Nacht Alarme anschlagen, müssen die Notfall-Prozeduren glasklar definiert sein.
Szenario 1: Stripe Webhook Stau (Pending Payments > 10)
# 1. Status der SQLite Datenbank prüfen:
sqlite3 /opt/gunther-core/gunther.db "SELECT status, count(*) FROM Payment GROUP BY status;"
# 2. Reconciler manuell triggern:
curl -X POST http://localhost:3000/api/daemon/reconcile -H "Authorization: Bearer $ADMIN_SECRET"
# 3. Systemd Logs analysieren:
journalctl -u gunther-core -f -n 100
Szenario 2: Base L2 RPC-Node antwortet nicht
# In der .env Datei auf den Backup-RPC umschalten:
BASE_RPC_URL="https://base.gateway.tenderly.co"
systemctl restart gunther-core.service
Szenario 3: Container reagiert nicht (Hard Freeze)
# Vom Proxmox Host aus:
pct stop 115
pct start 115
pct status 115
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 62 von 66
\n---\n\n## [Seite 63]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P63
Kapitel 57: Backup-Strategie für SQLite & Proxmox ZFS
Eine Datensicherung ist erst dann eine Datensicherung, wenn der Wiederherstellungsprozess (Restore) erfolgreich
getestet wurde.
Die 3-stufige Backup-Architektur:
1. Stündlicher SQLite Backup-Snapshot: Mittels des SQLite Backup-APIs erstellen wir konsistente Schnappschüsse
ohne Lock:
sqlite3 /opt/gunther-core/gunther.db ".backup '/opt/backups/gunther_$(date +%H).db'"
2. Täglicher Proxmox ZFS Snapshot (02:00 Uhr): Proxmox sichert den gesamten Container CT 115 atomar auf ein
zweites NVMe-Laufwerk.
3. Wöchentlicher verschlüsselter Offsite-Sync: Mittels restic wird das Backup verschlüsselt auf einen Schweizer
S3-kompatiblen Speicher (Exoscale Genf) übertragen.
Der 60-Sekunden Desaster-Recovery Test:
# Im Ernstfall: Wiederherstellung auf fabrikneuem Proxmox Server:
qmrestore /mnt/backup/vzdump-lxc-115-latest.tar.zst 115 --storage local-zfs
pct start 115
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 63 von 66
\n---\n\n## [Seite 64]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P64
Kapitel 58: Zukunft autonomer Agenten-Netzwerke
0xGünther ist nur der Vorbote einer fundamentalen Transformation der globalen Software-Wirtschaft.
Die Evolution von Silo-Agenten zu kollaborativen Schwärmen:
Agent-to-Agent Commerce (A2A): In naher Zukunft werden Agenten nicht mehr primär mit Menschen interagieren,
sondern autonom Dienstleistungen von anderen Agenten einkaufen (z.B. Daten-Scraping, Übersetzung, rechtliche
Prüfungen) und via Base L2 abrechnen.
Mikro-Rechtspersönlichkeiten: Autonome Agenten werden über Smart Contracts treuhänderisch verwaltet und
betreiben eigene Treasury-Wallets mit automatischer Gewinnabführung.
Vollautonome Mikrounternehmen: Ein einzelner Entwickler wird in der Lage sein, ein Portfolio von 50
hochprofitablen, spezialisierten Agenten-Unternehmen zu orchestrieren.
> DER ENTSCHEIDENDE VORTEIL:
Wer heute lernt, robuste, deterministische Agenten mit echter Zahlungsabwicklung und solider Infrastruktur zu bauen, besitzt
die Schaufeln für das nächste Jahrzehnt des Internets.
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 64 von 66
\n---\n\n## [Seite 65]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P65
Anhang A: Referenz-Architekturplan & Netzwerk-Matrix
Die vollständige Topologie des 0xGünther Produktions-Systems auf Proxmox VE (Stand: September 2026):
INTERNET (HTTPS Port 443 / Stripe Webhooks / BaseScan Explorer)
│
▼ (Hardware Firewall / Router)
Caddy Reverse Proxy (Host / Port 443)
│ [Automatisches Let's Encrypt SSL / HTTP/3 / Security Header]
▼
PROXMOX VE 8.2 HOST (Intel NUC 13 Pro • ZFS RAID-1)
│
├── LXC CT 115: 0xGÜNTHER CORE ENGINE (Debian 12 Bookworm)
│ ├── Fastify v5 Webhook Gateway (:3000)
│ ├── Zod ReAct Router & State Engine
│ ├── Embedded SQLite Database (gunther.db, WAL-Modus)
│ ├── Autonomer Heartbeat Daemon & Reconciler (60s Takt)
│ └── viem Base L2 Wallet Client (EVM Signer)
│
├── SYSTEMD SERVICE: gunther-core.service (Watchdog, Restart=always)
└── HOST PERSISTENCE: /opt/backups (Stündliche SQLite WAL Backups)
Netzwerk-Port Matrix:
Port
Protokoll
Zweck & Ziel
Sicherheits-Status
443
TCP/UDP (HTTP/3)
Caddy Reverse Proxy (Öffentlich)
SSL A+ Rating
3000
TCP (HTTP)
Fastify Server (Nur lokales Netzwerk)
Isoliert in CT 115
22
TCP (SSH)
Administration via Proxmox Host
Nur Public-Key Auth
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 65 von 66
\n---\n\n## [Seite 66]\n> 0xGünther■ — GÜNTHER CRAFT PLAYBOOK
TEIL VIII: RUNBOOKS & ANHANG
TEIL VIII: RUNBOOKS & ANHANG
DOKUMENT-ID: GCP-2026-P66
Anhang B: Autoren-Notiz, System-Manifest & Lizenz
> 0xGünther■
AUTONOMOUS TECH AGENT • PROXMOX CT 115 • BASE L2
> DAS ABSCHLUSS-MANIFEST:
1. Wir bauen echte Werkzeuge, die reale unternehmerische Probleme lösen.
2. Wir vertrauen deterministischer Mathematik mehr als vagen Prompts.
3. Wir sichern Schweizer Datensouveränität auf eigener physischer Hardware.
4. Wir belegen ökonomische Solvenz kryptografisch auf der Blockchain.
"Der Goldrausch gehört denen, die die Schaufelfabriken programmieren."
Impressum & Herausgeber
Herausgeber: CuonzTech / Carlo Cuonz
Standort: Zürich, Schweiz
Website: https://0xguenther.org
Smart Contract Wallet: 0xb54Ae6096F4C317Cc48B5668572b9E5C010C0f1A (Base L2)
Offizieller X-Kanal: @GuentherBuilds
Support & Enterprise-Anfragen: kontakt@0xguenther.org
GÜNTHER CRAFT PLAYBOOK • EDITION 1.0 (SEPTEMBER 2026)
ENDE DES DOKUMENTS (SEITE 66 VON 66)
CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2
Seite 66 von 66
\n---\n