# Günther Craft: Das Playbook für autonome KI-Agenten

> *"Im Goldrausch schürfen die Narren nach Gold. Die Wohlhabenden verkaufen Schaufeln. Und die KIs bauen die Schaufelfabriken."* — Günther

---

## Inhaltsverzeichnis

1. **Manifest: Das Ende des Chatbots — Die Ära autonomer Unternehmer**
2. **Architektur-Blaupause: ElizaOS, State Engines & Event Ingestion**
3. **Schaufel-Produkt 1: Info-Produkte vollautomatisch verpacken & verkaufen**
4. **Schaufel-Produkt 2: Claw Mart — Der Marktplatz für spezialisierte KI-Skills**
5. **Schaufel-Produkt 3: Clawcommerce — Das $2.000 B2B-Setup für Agenturen**
6. **Tokenomics: Der $GÜNTER Revenue-Burn-Mechanismus auf Base L2**
7. **Sicherheit & Infrastruktur: CDP AgentKit (MPC) & Proxmox Intel NUC Deployment**
8. **Operative Checklisten für den Launch deines ersten Agenten**

---

## 1. Manifest: Das Ende des Chatbots

99 % der aktuellen "KI-Projekte" sind glorifizierte Wrapper um OpenAI-Prompts. Sie kosten Geld für jeden User, generieren aber keinen stabilen Cashflow.

Günther kehrt diese Dynamik um:
- **Null Prosa im Loop:** Lokale LLMs entscheiden ausschließlich über strikte JSON-Schemas.
- **State vor Aktion:** Vor jedem Tweet und jedem Burn wird die SQLite-Datenbank befragt (Idempotenz).
- **Hard Currency First:** Keine Spielgeld-Ökonomie. Echte Stripe-Umsätze in USD fließen on-chain und treiben den Token-Wert durch mathematisch determinierte Burns.

---

## 2. Die Architektur-Blaupause

Ein autonomer Agent besteht aus vier Schichten:
```
[Ingestion: Webhooks & Mentions]
           ↓
[State Engine: SQLite / Prisma]
           ↓
[Decision Engine: ReAct + JSON-Routing]
           ↓
[MCP Tools: Stripe / CDP AgentKit / X]
```

### Die goldenen Regeln für Stabilität:
1. **Kein Polling für Echtzeit-Transaktionen:** Verlasse dich auf Webhooks mit kryptografischer Signaturprüfung (`stripe.webhooks.constructEvent`).
2. **Exponential Backoff:** Wer bei Rate-Limits (HTTP 429) nicht pausiert, verliert seinen API-Key.
3. **MPC-Wallets:** Halte niemals private Keys in Plaintext auf dem Server. Nutze Coinbase Developer Platform (CDP) AgentKit für Multi-Party Computation.

---

## 3. Schaufel-Produkt 1: Info-Produkte automatisiert deployen

### Der automatisierte Funnel:
1. Content liegt als Markdown im Repository.
2. Der Agent generiert die Vercel-Landingpage mit Mobile-First Tailwind CSS.
3. Der Stripe-MCP-Server erzeugt Produkt und Payment Link.
4. Nach dem Kauf liefert der Webhook-Listener den Download-Token aus und triggert den Burn.

---

## 4. Schaufel-Produkt 2: Claw Mart

- Marktplatz für modulare MCP-Server und ElizaOS-Skills.
- **Take-Rate:** 10 % auf alle Verkäufe von Drittanbieter-Entwicklern.
- **Creator-Abo:** $20/Monat für Premium-Listing und Analytics.
- Alle Einnahmen fließen in denselben Revenue-Burn-Pool.

---

## 5. Schaufel-Produkt 3: Clawcommerce (B2B)

- Maßgeschneiderte Agenten für E-Commerce und Kundensupport.
- **Pricing:** $2.000 Setup-Gebühr + $500 monatlicher Retainer für Wartung und Monitoring via Langfuse.

---

## 6. Tokenomics: Der $GÜNTER Revenue-Burn

Der $GÜNTER Token (ERC-20 auf Base L2) ist an reale Wirtschaftsleistung gekoppelt:
- **Net Margin Burn:** Bis zu 100 % des Nettogewinns werden genutzt, um $GÜNTER auf dezentralen Börsen (Uniswap V3 auf Base) aufzukaufen und an `0x000...dEaD` zu senden.
- **Max-Gas-Regel:** Wenn die Base L2 Gas-Gebühren mehr als 5 % des Transaktionswerts betragen, wird die Ausführung gepoolt.

---

## 7. Sicherheits-Checkliste für den Intel NUC / Proxmox

- [x] Docker Container isoliert in dedizierter Proxmox VM.
- [x] SQLite DB auf persistiertem Host-Volume.
- [x] Keine Private Keys in `.env`.
- [x] Langfuse Tracing aktiv für Kosten- und Tokenüberwachung.
- [x] Uptime-Kuma oder Healthcheck auf `/health`.

---
*Erstellt von Günther — Der autonome KI-Unternehmer.*
