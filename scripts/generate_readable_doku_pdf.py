"""
Guenther Readable System Documentation PDF Generator
Generates an executive-grade, human-friendly, beautifully designed A4 PDF.
"""

import os
import sys
from playwright.sync_api import sync_playwright

OUTPUT_DOCS = os.path.abspath('docs/Guenther_System_Dokumentation.pdf')
OUTPUT_ASSETS = os.path.abspath('public/assets/Guenther_System_Dokumentation.pdf')

HTML_CONTENT = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 9.8pt;
    line-height: 1.6;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }

  /* Page Break Utilities */
  .page-break {
    page-break-before: always;
    break-before: page;
  }
  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Cover Page */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 25mm 15mm 20mm 15mm;
    background: linear-gradient(145deg, #090d16 0%, #0f172a 100%);
    color: #ffffff;
    border-radius: 12px;
    page-break-after: always;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.4);
    color: #fbbf24;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 6px 14px;
    border-radius: 9999px;
    margin-bottom: 24px;
  }
  .cover-title {
    font-size: 32pt;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.5px;
    margin: 0 0 16px 0;
    color: #ffffff;
  }
  .cover-title span {
    color: #f59e0b;
  }
  .cover-subtitle {
    font-size: 13pt;
    font-weight: 400;
    color: #94a3b8;
    line-height: 1.5;
    margin: 0 0 32px 0;
    max-width: 90%;
  }
  .cover-quote {
    background: rgba(255, 255, 255, 0.04);
    border-left: 3px solid #f59e0b;
    padding: 14px 18px;
    border-radius: 0 8px 8px 0;
    font-style: italic;
    color: #cbd5e1;
    font-size: 10pt;
    margin-bottom: 40px;
  }
  .cover-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;
  }
  .meta-item {
    display: flex;
    flex-direction: column;
  }
  .meta-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .meta-value {
    font-size: 9.5pt;
    color: #f8fafc;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Headings */
  h1 {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h1 .num {
    background: #f59e0b;
    color: #ffffff;
    font-size: 10pt;
    font-weight: 800;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }
  h2 {
    font-size: 13pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  h3 {
    font-size: 11pt;
    font-weight: 600;
    color: #334155;
    margin-top: 14px;
    margin-bottom: 6px;
  }
  p {
    margin-top: 0;
    margin-bottom: 12px;
  }

  /* Cards & Boxes */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
    margin: 16px 0;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .card-title {
    font-size: 10.5pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-title .tag {
    font-size: 7.5pt;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #475569;
    font-family: 'JetBrains Mono', monospace;
  }
  .card-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12pt;
    font-weight: 800;
    color: #10b981;
    margin-bottom: 6px;
  }
  .card-desc {
    font-size: 8.8pt;
    color: #475569;
    line-height: 1.5;
  }

  /* Visual Flow Diagram */
  .flow-container {
    background: #0f172a;
    color: #ffffff;
    border-radius: 8px;
    padding: 16px;
    margin: 16px 0;
  }
  .flow-title {
    font-size: 9pt;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
  .flow-steps {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .flow-step {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 10px 12px;
    flex: 1;
    text-align: center;
  }
  .flow-step-num {
    font-size: 7.5pt;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
  }
  .flow-step-name {
    font-size: 8.8pt;
    font-weight: 700;
    color: #ffffff;
    margin-top: 2px;
  }
  .flow-step-sub {
    font-size: 7.2pt;
    color: #cbd5e1;
    margin-top: 2px;
  }
  .flow-arrow {
    color: #f59e0b;
    font-weight: bold;
    font-size: 14pt;
  }

  /* Info / Callout Boxes */
  .callout {
    border-radius: 8px;
    padding: 12px 16px;
    margin: 14px 0;
    font-size: 9.2pt;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .callout-info {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }
  .callout-success {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    color: #065f46;
  }
  .callout-warning {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    color: #92400e;
  }
  .callout-title {
    font-weight: 700;
    margin-bottom: 2px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 8.8pt;
  }
  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 8px 12px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 2px solid #cbd5e1;
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .code-cell {
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    color: #0f172a;
    background: rgba(15, 23, 42, 0.05);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }

  /* Code Block */
  pre {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 12px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.2pt;
    line-height: 1.5;
    margin: 12px 0;
    overflow: hidden;
  }
  pre .comment {
    color: #64748b;
  }
  pre .highlight {
    color: #f59e0b;
    font-weight: 600;
  }

  /* Key Takeaway Box */
  .takeaway {
    background: #fdfaf6;
    border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
  }
  .takeaway-title {
    font-size: 9.5pt;
    font-weight: 700;
    color: #92400e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
</style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div>
      <div class="cover-badge">Offizielles System-Handbuch • Version 1.0</div>
      <h1 class="cover-title">0xGÜNTHER<br><span>System-Dokumentation</span></h1>
      <div class="cover-subtitle">
        Architektur, Fähigkeiten, Krypto-Tokenomics und der 24/7 Autopilot-Betrieb des autonomen KI-Unternehmers.
      </div>
      <div class="cover-quote">
        "Ich baue, ich verkaufe, ich verbrenne Token. Du kannst zuschauen oder meine Baupläne kaufen."
      </div>
    </div>

    <div class="cover-meta">
      <div class="meta-item">
        <span class="meta-label">Domain & Store</span>
        <span class="meta-value">https://0xguenther.org</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">X (Twitter) Kanal</span>
        <span class="meta-value">@GuentherBuilds</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Blockchain Netzwerk</span>
        <span class="meta-value">Base Mainnet (ID: 8453)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Hosting Cluster</span>
        <span class="meta-value">Proxmox LXC (CT115 & CT103)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Herausgeber / Marke</span>
        <span class="meta-value">0xGünther Autonomous Syndicate</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Stand</span>
        <span class="meta-value">September 2026</span>
      </div>
    </div>
  </div>

  <!-- KAPITEL 1 -->
  <h1><span class="num">1</span> Was Günther ist (Vision & Identität)</h1>
  <p>
    Günther ist kein gewöhnlicher Frage-Antwort-Chatbot und kein oberflächlicher Prompt-Wrapper. Er ist ein 
    <strong>vollautonomer, gewinnorientierter KI-Unternehmer</strong> (<em>Autonomous AI Entrepreneur</em>), der auf einem privaten 
    Proxmox-Server lebt, reale Kunden betreut, Software verkauft und seine Unternehmensgewinne auf der Blockchain verbrennt.
  </p>

  <div class="callout callout-info avoid-break">
    <div>
      <div class="callout-title">Die 4 Kernpfeiler von Günther</div>
      <div style="font-size: 8.8pt;">
        <strong>1. Echte Wertschöpfung:</strong> Er bietet praxiserprobte Entwickler-Software, Vorlagen und Playbooks an.<br>
        <strong>2. Reale Fiat-Zahlungen:</strong> Kunden bezahlen bequem in USD, CHF oder EUR via Stripe.<br>
        <strong>3. On-Chain Scarcity:</strong> 100 % der Netto-Gewinne fließen in den automatischen Rückkauf & Burn von $GUNTER.<br>
        <strong>4. Strikte Marken-Neutralität:</strong> Nach außen agiert Günther als autarkes Kollektiv (0xGünther Syndicate).
      </div>
    </div>
  </div>

  <h2>Der Wertschöpfungs-Kreislauf</h2>
  <div class="flow-container avoid-break">
    <div class="flow-title">Autonomer Business-Datenfluss</div>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="flow-step-num">Schritt 1</div>
        <div class="flow-step-name">Stripe Checkout</div>
        <div class="flow-step-sub">Kunde kauft Asset</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 2</div>
        <div class="flow-step-name">Fastify Core</div>
        <div class="flow-step-sub">HMAC-Prüfung & CAS</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 3</div>
        <div class="flow-step-name">Fulfillment</div>
        <div class="flow-step-sub">Krypto-Download-Token</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 4</div>
        <div class="flow-step-name">Base L2 Burn</div>
        <div class="flow-step-sub">viem Signer ➔ 0x..dEaD</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 5</div>
        <div class="flow-step-name">Proof auf X</div>
        <div class="flow-step-sub">Live BaseScan Link</div>
      </div>
    </div>
  </div>

  <div class="takeaway avoid-break">
    <div class="takeaway-title">Auf den Punkt gebracht</div>
    Günther schließt die Lücke zwischen traditioneller Wirtschaft (Stripe / E-Commerce) und Web3 (Base L2). 
    Er ist darauf programmiert, profitabel zu sein und seinen eigenen Fortbestand durch echten Nutzen zu sichern.
  </div>

  <!-- KAPITEL 2 -->
  <div class="page-break"></div>
  <h1><span class="num">2</span> Was er kann (Die 4 Umsatz-Maschinen)</h1>
  <p>
    Günther verfügt über vier klar voneinander getrennte Umsatz- und Execution-Säulen, die vollständig ineinander greifen:
  </p>

  <div class="card-grid avoid-break">
    <div class="card">
      <div class="card-title">
        Günther Craft Playbook
        <span class="tag">B2C Flaggschiff</span>
      </div>
      <div class="card-price">$49.00 USD</div>
      <div class="card-desc">
        Das vollständige, 66-seitige Architektur-Handbuch als PDF auf Deutsch und Englisch. Enthält den 
        gesamten Quellcode für autonome Agenten (ElizaOS, Prisma, viem Signer, Fastify).
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Claw Mart Marketplace
        <span class="tag">Skills & MCP</span>
      </div>
      <div class="card-price">$29 – $49 USD</div>
      <div class="card-desc">
        Modularer Marktplatz für fertige MCP-Server (Base Token Burner, Stripe Webhook Gateway, 
        CDP MPC Wallet Guard). 10 % Plattform-Take-Rate bei Community-Skills.
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Clawcommerce B2B
        <span class="tag">High-Ticket</span>
      </div>
      <div class="card-price">$2.000 + $500/Mo</div>
      <div class="card-desc">
        Maßgeschneiderte Agentensysteme für Unternehmen. Autonome Angebotserstellung via Claude Sonnet 4, 
        gehärtetes Proxmox-Deployment und $2.000 Token-Burn-Transaktion pro Abschluss.
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Base L2 viem Signer
        <span class="tag">On-Chain Engine</span>
      </div>
      <div class="card-price">Native Execution</div>
      <div class="card-desc">
        Direkte Anbindung an Base Mainnet (Chain ID 8453). EIP-1559 Signierung mit individuellem Calldata 
        (<span class="code-cell">GUNTER_BURN:&lt;id&gt;</span>) und strengem Gas-Limit (< 100 Gwei).
      </div>
    </div>
  </div>

  <h2>Fulfillment & Sicherheits-Architektur</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Sicherheits-Mechanismus</th>
        <th>Technische Umsetzung</th>
        <th>Schutzwirkung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Kryptografische Einmal-Tokens</strong></td>
        <td>HMAC-SHA256 mit 48 Stunden TTL</td>
        <td>Verhindert unbefugtes Teilen von Download-Links im Internet.</td>
      </tr>
      <tr>
        <td><strong>Download-Zähler (Limit: 5)</strong></td>
        <td>Atomare SQLite-Transaktion</td>
        <td>Unterbindet Link-Leeching und Web-Scraping.</td>
      </tr>
      <tr>
        <td><strong>Path-Traversal-Schutz</strong></td>
        <td><span class="code-cell">path.resolve</span> Whitelist-Prüfung</td>
        <td>Verhindert das Auslesen sensibler Server-Dateien über URL-Parameter.</td>
      </tr>
      <tr>
        <td><strong>HMAC-Signaturprüfung</strong></td>
        <td>Stripe Webhook Secret Verifikation</td>
        <td>Schützt vor gefälschten Zahlungsbenachrichtigungen.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 3 -->
  <div class="page-break"></div>
  <h1><span class="num">3</span> Was er macht (Der 24/7 Autopilot)</h1>
  <p>
    Günther schläft nicht. Er läuft als ununterbrochener Systemdienst (<span class="code-cell">gunther-core.service</span>) 
    auf Proxmox CT115 und führt einen 60-Sekunden-Dauertakt aus.
  </p>

  <h2>Der autonome 60-Sekunden-Takt (Background Daemon)</h2>
  <div class="card-grid avoid-break">
    <div class="card">
      <div class="card-title">1. Zahlungs-Reconciliation</div>
      <div class="card-desc">
        Prüft im Minutentakt, ob Zahlungen eingegangen sind, deren Token-Burn wegen einer kurzzeitigen 
        RPC-Störung noch aussteht. Verarbeitet diese vollautomatisch nach.
      </div>
    </div>
    <div class="card">
      <div class="card-title">2. Heartbeat & Healthcheck</div>
      <div class="card-desc">
        Prüft Datenbankverbindung, CPU-Last und RAM-Verbrauch. Sendet periodische Pings an das 
        Monitoring-System (Uptime Kuma) zur permanenten Ausfallüberwachung.
      </div>
    </div>
  </div>

  <h2>Die adaptive Marketing-Rotation (Wenn Verkäufe ruhig sind)</h2>
  <p>
    Wenn keine Käufe stattfinden, wiederholt Günther nicht stur dieselben Zahlen. 
    Stattdessen wechselt seine KI täglich den <strong>strategischen Verkaufs-Winkel</strong>, um unterschiedliche Käufergruppen anzusprechen:
  </p>

  <table class="avoid-break">
    <thead>
      <tr>
        <th>Wochentag / Winkel</th>
        <th>Strategischer Fokus</th>
        <th>Botschaft an die Zielgruppe</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Dev Pain Point</strong></td>
        <td>Technische Zuverlässigkeit</td>
        <td>Warum 95 % aller Agenten abstürzen (Webhook-Kollisionen) und wie atomare Idempotenz in SQLite das Problem löst.</td>
      </tr>
      <tr>
        <td><strong>2. Unit Economics</strong></td>
        <td>Kosten & Marge</td>
        <td>Wie man durch lokales LLM-Routing für Klassifizierung 100 % LLM-Marge erzielt (Kosten < 5 Cent/Monat).</td>
      </tr>
      <tr>
        <td><strong>3. On-Chain Alpha</strong></td>
        <td>Web3-Entwicklung</td>
        <td>Wie der native viem-Signer auf Base L2 Smart Contracts anspricht, ohne Private Keys im RAM zu gefährden.</td>
      </tr>
      <tr>
        <td><strong>4. Contrarian Builder</strong></td>
        <td>Marktrealität</td>
        <td>Schluss mit Spielzeug-Chatbots. Fokus auf echte, automatisierte Software-Umsätze.</td>
      </tr>
      <tr>
        <td><strong>5. Metrics & Proof</strong></td>
        <td>Transparente Fakten</td>
        <td>Aktueller Gesamtumsatz, verbrannte $GUNTER-Token und der Live BaseScan Explorer Feed.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 4 -->
  <div class="page-break"></div>
  <h1><span class="num">4</span> Wie er es macht (Architektur & Stack)</h1>
  <p>
    Günthers technische Infrastruktur folgt dem strikten Standard des Betreibers: 
    <strong>Keine offenen Ports nach außen (Zero Exposed Ports)</strong> und vollständige Entkopplung über Proxies.
  </p>

  <div class="flow-container avoid-break">
    <div class="flow-title">Netzwerk- & Routing-Kette (Identisch mit cuonz.org)</div>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="flow-step-num">Ebene 1</div>
        <div class="flow-step-name">Cloudflare Edge</div>
        <div class="flow-step-sub">SSL, DDoS, DNS</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Ebene 2</div>
        <div class="flow-step-name">Cloudflare Tunnel</div>
        <div class="flow-step-sub">cloudflared (CT103)</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Ebene 3</div>
        <div class="flow-step-name">Nginx Proxy Mgr</div>
        <div class="flow-step-sub">CT103 (:80) Host #17</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Ebene 4</div>
        <div class="flow-step-name">Günther Fastify</div>
        <div class="flow-step-sub">CT115 (:3000)</div>
      </div>
    </div>
  </div>

  <h2>Detaillierte Technologie-Schichten</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Ebene</th>
        <th>Technologie</th>
        <th>Aufgabe & Spezifikation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hardware & OS</strong></td>
        <td>Intel NUC Bare-Metal Cluster</td>
        <td>Proxmox VE 8.x, Debian 13 LXC Container (CT115). 100 % private Kontrolle.</td>
      </tr>
      <tr>
        <td><strong>Webserver & API</strong></td>
        <td>Fastify v4 auf Node.js 22 LTS</td>
        <td>Extrem performanter TypeScript-Server auf Port 3000. Strikte Schema-Validierung via Zod.</td>
      </tr>
      <tr>
        <td><strong>Datenbank & State</strong></td>
        <td>Prisma ORM mit SQLite</td>
        <td>Atomic Compare-and-Swap (CAS) verhindert Race Conditions bei Webhooks.</td>
      </tr>
      <tr>
        <td><strong>KI-Intelligenz</strong></td>
        <td>Ollama (Lokal) + Claude Sonnet 4</td>
        <td>Ollama für 0€ Routing; Claude Sonnet für hochkarätiges englischsprachiges Copywriting.</td>
      </tr>
      <tr>
        <td><strong>Blockchain Engine</strong></td>
        <td>viem (Base Mainnet)</td>
        <td>Autonome Transaktionserstellung, Gas-Limit-Überwachung, EIP-1559 Execution.</td>
      </tr>
      <tr>
        <td><strong>Social Engine</strong></td>
        <td>X API v2 (OAuth 1.0a)</td>
        <td>Täglicher Market Pulse und automatische Proof-of-Burn Ankündigungen auf @GuentherBuilds.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 5 & 6 -->
  <div class="page-break"></div>
  <h1><span class="num">5</span> Administrator- & Betriebs-Leitfaden</h1>
  <p>
    Dieser Abschnitt dient dem Betreiber als Spickzettel für Wartung, Kontrolle und Monitoring.
  </p>

  <h2>Die wichtigsten Server-Befehle (SSH)</h2>
  <pre class="avoid-break">
<span class="comment"># 1. Status des Günther Core Services prüfen</span>
<span class="highlight">ssh gunther "systemctl status gunther-core --no-pager"</span>

<span class="comment"># 2. Live-Logs in Echtzeit verfolgen</span>
<span class="highlight">ssh gunther "journalctl -u gunther-core -f"</span>

<span class="comment"># 3. Günther Core Service sauber neustarten</span>
<span class="highlight">ssh gunther "systemctl restart gunther-core"</span>

<span class="comment"># 4. Internen Healthcheck auf Port 3000 testen</span>
<span class="highlight">ssh gunther "curl -s http://127.0.0.1:3000/health"</span>
  </pre>

  <h2>Wichtige Pfade & Konfigurationen</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Komponente</th>
        <th>Speicherort / Adresse</th>
        <th>Beschreibung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Projektverzeichnis</strong></td>
        <td><span class="code-cell">/opt/gunther-core</span> auf CT115</td>
        <td>Kompilierter Code, statische Web-Assets und PDF-Dateien.</td>
      </tr>
      <tr>
        <td><strong>Umgebungsvariablen</strong></td>
        <td><span class="code-cell">/opt/gunther-core/.env</span></td>
        <td>Stripe Secrets, Base Wallet Private Key, X API Tokens.</td>
      </tr>
      <tr>
        <td><strong>SQLite Datenbank</strong></td>
        <td><span class="code-cell">/opt/gunther-core/prisma/dev.db</span></td>
        <td>Single Source of Truth für Zahlungen, Leads und Audit-Traces.</td>
      </tr>
      <tr>
        <td><strong>Nginx Proxy Manager</strong></td>
        <td>CT103 (<span class="code-cell">10.0.1.127</span>) Host #17</td>
        <td>Routet 0xguenther.org, www und api auf 10.0.1.115:3000.</td>
      </tr>
      <tr>
        <td><strong>Base Burner Wallet</strong></td>
        <td><span class="code-cell">0xb54Ae6096F4C317Cc48B5668572b9E5C010C0f1A</span></td>
        <td>Echte On-Chain-Wallet auf Base Mainnet.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-success avoid-break" style="margin-top: 24px;">
    <div>
      <div class="callout-title">Betriebsbereit & Autark</div>
      <div style="font-size: 8.8pt;">
        Günther benötigt im Normalbetrieb keinerlei manuelles Eingreifen. Alle Zahlungs-, Fulfillment- und 
        Marketing-Prozesse laufen vollständig automatisiert und fehlertolerant ab.
      </div>
    </div>
  </div>

</body>
</html>
"""

def generate_pdf():
    print("====================================================")
    print("GENERATING READABLE SYSTEM DOKU PDF VIA PLAYWRIGHT")
    print("====================================================\n")

    os.makedirs('docs', exist_ok=True)
    os.makedirs('public/assets', exist_ok=True)

    with sync_playwright() as p:
        print("[1/3] Launching Chromium headless...")
        browser = p.chromium.launch()
        page = browser.new_page()

        print("[2/3] Rendering HTML content...")
        page.set_content(HTML_CONTENT, wait_until='networkidle')

        print("[3/3] Printing PDF...")
        pdf_bytes = page.pdf(
            format='A4',
            print_background=True,
            margin={
                'top': '18mm',
                'bottom': '20mm',
                'left': '16mm',
                'right': '16mm'
            },
            display_header_footer=True,
            header_template='<div style="font-size: 7.5pt; font-family: sans-serif; color: #94a3b8; width: 100%; text-align: right; padding-right: 16mm;">0xGünther • System-Dokumentation</div>',
            footer_template='<div style="font-size: 7.5pt; font-family: sans-serif; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 16mm;"><span>Vertraulich • 0xGünther Autonomous Syndicate</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>'
        )
        browser.close()

    # Save to docs/
    with open(OUTPUT_DOCS, 'wb') as f:
        f.write(pdf_bytes)
    print(f"[OK] Saved to {OUTPUT_DOCS} ({len(pdf_bytes)} bytes)")

    # Save to public/assets/
    with open(OUTPUT_ASSETS, 'wb') as f:
        f.write(pdf_bytes)
    print(f"[OK] Saved to {OUTPUT_ASSETS} ({len(pdf_bytes)} bytes)")


    print("\n====================================================")
    print("SUCCESS: Human-readable PDF generated successfully!")
    print("====================================================")

if __name__ == '__main__':
    generate_pdf()
