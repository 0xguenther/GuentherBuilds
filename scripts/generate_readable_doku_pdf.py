"""
Guenther Professional System Documentation PDF Generator
Generates an executive-grade, technical, and mature A4 PDF documentation.
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
    font-size: 9.6pt;
    line-height: 1.6;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }

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
    padding: 24mm 16mm 20mm 16mm;
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
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    padding: 5px 12px;
    border-radius: 9999px;
    margin-bottom: 24px;
  }
  .cover-title {
    font-size: 30pt;
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
    font-size: 12pt;
    font-weight: 400;
    color: #94a3b8;
    line-height: 1.5;
    margin: 0 0 32px 0;
    max-width: 90%;
  }
  .cover-summary-box {
    background: rgba(255, 255, 255, 0.04);
    border-left: 3px solid #f59e0b;
    padding: 14px 18px;
    border-radius: 0 8px 8px 0;
    color: #cbd5e1;
    font-size: 9.5pt;
    line-height: 1.6;
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
    font-size: 7.2pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #64748b;
    font-weight: 600;
    margin-bottom: 3px;
  }
  .meta-value {
    font-size: 9.2pt;
    color: #f8fafc;
    font-weight: 600;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Headings */
  h1 {
    font-size: 17pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  h1 .num {
    background: #f59e0b;
    color: #ffffff;
    font-size: 9.5pt;
    font-weight: 800;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
  }
  h2 {
    font-size: 12pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 8px;
  }
  p {
    margin-top: 0;
    margin-bottom: 11px;
  }

  /* Cards & Boxes */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin: 14px 0;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }
  .card-title {
    font-size: 10pt;
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .card-title .tag {
    font-size: 7.2pt;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e2e8f0;
    color: #475569;
    font-family: 'JetBrains Mono', monospace;
  }
  .card-price {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11pt;
    font-weight: 800;
    color: #059669;
    margin-bottom: 4px;
  }
  .card-desc {
    font-size: 8.6pt;
    color: #475569;
    line-height: 1.45;
  }

  /* Visual Flow Diagram */
  .flow-container {
    background: #0f172a;
    color: #ffffff;
    border-radius: 8px;
    padding: 14px;
    margin: 14px 0;
  }
  .flow-title {
    font-size: 8.5pt;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: #f59e0b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }
  .flow-steps {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }
  .flow-step {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px 10px;
    flex: 1;
    text-align: center;
  }
  .flow-step-num {
    font-size: 7pt;
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
  }
  .flow-step-name {
    font-size: 8.4pt;
    font-weight: 700;
    color: #ffffff;
    margin-top: 2px;
  }
  .flow-step-sub {
    font-size: 7pt;
    color: #cbd5e1;
    margin-top: 2px;
  }
  .flow-arrow {
    color: #f59e0b;
    font-weight: bold;
    font-size: 13pt;
  }

  /* Info / Callout Boxes */
  .callout {
    border-radius: 6px;
    padding: 10px 14px;
    margin: 12px 0;
    font-size: 9pt;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .callout-info {
    background: #f1f5f9;
    border-left: 3px solid #0284c7;
    color: #0f172a;
  }
  .callout-success {
    background: #f0fdf4;
    border-left: 3px solid #10b981;
    color: #065f46;
  }
  .callout-title {
    font-weight: 700;
    margin-bottom: 2px;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 8.6pt;
  }
  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 2px solid #cbd5e1;
  }
  td {
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .code-cell {
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.8pt;
    color: #0f172a;
    background: rgba(15, 23, 42, 0.05);
    padding: 2px 5px;
    border-radius: 4px;
    display: inline-block;
  }

  /* Code Block */
  pre {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    line-height: 1.45;
    margin: 10px 0;
    overflow: hidden;
  }
  pre .comment {
    color: #64748b;
  }
  pre .highlight {
    color: #f59e0b;
    font-weight: 600;
  }
</style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover">
    <div>
      <div class="cover-badge">System- &amp; Architektur-Dokumentation • Version 1.0</div>
      <h1 class="cover-title">0xGÜNTHER<br><span>System-Architektur</span></h1>
      <div class="cover-subtitle">
        Autonome Software-Agenten-Architektur zur vollautomatischen Abwicklung digitaler Lizenzverkäufe 
        und deterministischer Kopplung an On-Chain-Tokenomics auf Base L2.
      </div>
      <div class="cover-summary-box">
        <strong>Executive Summary:</strong> 0xGünther operiert als entkoppeltes, mandantenfähiges 
        Gesamtsystem auf privater Proxmox-Infrastruktur. Über Stripe abgewickelte Fiat-Umsätze 
        werden über kryptografisch gehärtete State Machines verarbeitet und programmatisch als 
        Proof-of-Burn-Transaktionen auf Base Mainnet verankert.
      </div>
    </div>

    <div class="cover-meta">
      <div class="meta-item">
        <span class="meta-label">Domain &amp; Endpunkte</span>
        <span class="meta-value">https://0xguenther.org</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Kommunikations-Kanal</span>
        <span class="meta-value">@GuentherBuilds (X API v2)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Blockchain Netzwerk</span>
        <span class="meta-value">Base Mainnet (EIP-1559, Chain 8453)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Hosting-Cluster</span>
        <span class="meta-value">Proxmox LXC (CT115 Core / CT103 Proxy)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Betriebsidentität</span>
        <span class="meta-value">0xGünther Autonomous Syndicate</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Dokumentationsstand</span>
        <span class="meta-value">September 2026</span>
      </div>
    </div>
  </div>

  <!-- KAPITEL 1 -->
  <h1><span class="num">1</span> Systemübersicht &amp; Funktionsprinzip</h1>
  <p>
    0xGünther ist ein spezialisiertes Software-Agenten-System auf Basis von Node.js 22 LTS, Fastify und Prisma ORM. 
    Das System wurde entwickelt, um digitale Software-Lizenzen, Framework-Blueprints und MCP-Server 
    vollautomatisiert ohne menschliche Interaktion zu vertreiben, auszuliefern und finanztechnisch abzuwickeln.
  </p>

  <div class="callout callout-info avoid-break">
    <div>
      <div class="callout-title">Die 4 Kernpfeiler der Architektur</div>
      <div style="font-size: 8.6pt; line-height: 1.5;">
        <strong>1. Deterministische Abwicklung:</strong> Zod-validierte Schnittstellen und atomare SQLite State Transitions (Compare-and-Swap) schließen Race Conditions und Fehlbuchungen vollständig aus.<br>
        <strong>2. Programmatischer Proof-of-Burn:</strong> Eingehende Netto-Umsätze aus dem Stripe-Zahlungsverkehr fungieren als direkter Trigger für On-Chain-Transaktionen auf Base L2, bei denen $GUNTER-Token unwiderruflich an die Null-Adresse übertragen werden.<br>
        <strong>3. Kryptografisches Fulfillment:</strong> Nach Zahlungsbestätigung erhalten Kunden zeitlich und mengenmäßig limitierte Signatur-Tokens zur sicheren Datei-Auslieferung.<br>
        <strong>4. Strikte Identitätstrennung:</strong> Nach außen agiert das System neutral als <em>0xGünther Autonomous Syndicate</em>. Betreiber- und Firmenidentitäten sind auf allen Ebenen vollständig isoliert.
      </div>
    </div>
  </div>

  <h2>End-to-End Transaktionsablauf</h2>
  <div class="flow-container avoid-break">
    <div class="flow-title">Verifizierter Transaktions- und Datenfluss</div>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="flow-step-num">Schritt 1</div>
        <div class="flow-step-name">Stripe Ingestion</div>
        <div class="flow-step-sub">checkout.session.completed</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 2</div>
        <div class="flow-step-name">Fastify Core</div>
        <div class="flow-step-sub">HMAC-SHA256 &amp; CAS</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 3</div>
        <div class="flow-step-name">Fulfillment</div>
        <div class="flow-step-sub">Token (48h / 5 DL Max)</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 4</div>
        <div class="flow-step-name">Base L2 viem</div>
        <div class="flow-step-sub">Tx an 0x...dEaD</div>
      </div>
      <div class="flow-arrow">➔</div>
      <div class="flow-step">
        <div class="flow-step-num">Schritt 5</div>
        <div class="flow-step-name">Social Proof</div>
        <div class="flow-step-sub">BaseScan Audit-Link</div>
      </div>
    </div>
  </div>

  <!-- KAPITEL 2 -->
  <div class="page-break"></div>
  <h1><span class="num">2</span> Produktportfolio &amp; Monetarisierungs-Module</h1>
  <p>
    Das System steuert vier getrennte Wertschöpfungs- und Ausführungsmodule, die über die gemeinsame 
    State Engine orchestriert werden:
  </p>

  <div class="card-grid avoid-break">
    <div class="card">
      <div class="card-title">
        Günther Craft
        <span class="tag">Flaggschiff-Produkt</span>
      </div>
      <div class="card-price">$49.00 USD</div>
      <div class="card-desc">
        Technisches Referenzhandbuch und Code-Framework (66 Seiten, A4, zweisprachig DE/EN). Beinhaltet 
        die vollständige Produktionsarchitektur: ElizaOS, Prisma SQLite, Fastify Core und Base L2 viem Signer.
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Claw Mart Marketplace
        <span class="tag">MCP Module</span>
      </div>
      <div class="card-price">$29 – $49 USD</div>
      <div class="card-desc">
        Modulare Schnittstellen-Bibliothek für Model Context Protocol (MCP) Server. Bietet standardisierte 
        Konnektoren für Base L2 Token Burning, Fastify Stripe Gateways und CDP MPC Wallets. 10 % Plattform-Take-Rate.
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Clawcommerce Enterprise
        <span class="tag">B2B Pipeline</span>
      </div>
      <div class="card-price">$2.000 + $500/Mo</div>
      <div class="card-desc">
        Integrations-Framework für isolierte Agenten-Instanzen im Unternehmensnetzwerk. Automatisiertes 
        Intake-Routing, Zod-validierte Angebotserstellung und $2.000 Proof-of-Burn bei Vertragsabschluss.
      </div>
    </div>

    <div class="card">
      <div class="card-title">
        Base L2 Execution Engine
        <span class="tag">On-Chain Layer</span>
      </div>
      <div class="card-price">Native Execution</div>
      <div class="card-desc">
        Nativer viem-Client auf Base Mainnet. Führt programmierte Token-Burns mit individuellem Audit-Calldata 
        (<span class="code-cell">GUNTER_BURN:&lt;refId&gt;:&lt;amount&gt;</span>) und automatischem Gas-Schutz (&lt; 100 Gwei) aus.
      </div>
    </div>
  </div>

  <h2>Sicherheits- &amp; Validierungsarchitektur</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Komponente</th>
        <th>Technische Umsetzung</th>
        <th>Schutzwirkung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Kryptografische Einmal-Tokens</strong></td>
        <td>HMAC-SHA256 Signierung mit 48 Stunden Gültigkeit</td>
        <td>Unterbindet die unautorisierte Weitergabe und das direkte Verlinken von Asset-Dateien.</td>
      </tr>
      <tr>
        <td><strong>Download-Limitierung</strong></td>
        <td>Atomarer CAS-Zähler (Maximum: 5 Abrufe)</td>
        <td>Schützt Bandbreite und Server-Ressourcen vor automatisierten Scraping-Prozessen.</td>
      </tr>
      <tr>
        <td><strong>Path-Traversal-Schutz</strong></td>
        <td>Kanonische Pfad-Auflösung via <span class="code-cell">path.resolve</span> gegen Whitelist</td>
        <td>Verhindert das Auslesen interner System-Dateien oder Environment-Variablen.</td>
      </tr>
      <tr>
        <td><strong>Webhook HMAC-Prüfung</strong></td>
        <td>Stripe Endpoint Secret Signatur-Verifikation</td>
        <td>Schützt vor unberechtigten HTTP-Payloads und simulierten Zahlungs-Events.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 3 -->
  <div class="page-break"></div>
  <h1><span class="num">3</span> Der 24/7 Autopilot-Lebenszyklus</h1>
  <p>
    Das System operiert als autonomer Systemd-Dienst (<span class="code-cell">gunther-core.service</span>) 
    auf Proxmox CT115. Ein zyklischer 60-Sekunden-Timer steuert alle periodischen Kontroll- und Ausführungsroutinen:
  </p>

  <h2>Periodische Hintergrund-Routinen (GuntherDaemon)</h2>
  <div class="card-grid avoid-break">
    <div class="card">
      <div class="card-title">1. Zahlungs-Reconciliation</div>
      <div class="card-desc">
        Prüft im Minutentakt auf verbuchte Transaktionen, deren On-Chain-Execution aufgrund kurzzeitiger 
        RPC- oder Netzwerk-Latenzen verzögert wurde. Führt Transaktionen deterministisch nach.
      </div>
    </div>
    <div class="card">
      <div class="card-title">2. System-Telemetrie &amp; Liveness</div>
      <div class="card-desc">
        Überwacht Heap-Memory, Event-Loop-Latenz und Datenbank-Integrität. Sendet periodische Heartbeat-Pings 
        an Uptime Kuma zur permanenten Überwachung der Service-Verfügbarkeit.
      </div>
    </div>
  </div>

  <h2>Adaptive Marketing-Rotation (Content-Steuerung auf X)</h2>
  <p>
    Um organische Sichtbarkeit in der internationalen Entwickler- und Web3-Community aufzubauen, 
    steuert das System einen täglichen Content-Zyklus. Bei Phasen ohne neue Transaktionen rotiert die KI 
    deterministisch zwischen fünf technischen Analyse-Winkeln:
  </p>

  <table class="avoid-break">
    <thead>
      <tr>
        <th>Zyklus / Winkel</th>
        <th>Thematischer Schwerpunkt</th>
        <th>Inhaltliche Ausrichtung</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Technical Resilience</strong></td>
        <td>Fehlertoleranz &amp; State Safety</td>
        <td>Analyse von Webhook-Race-Conditions, unhandled Rejections und der Implementierung von Atomic CAS in SQLite.</td>
      </tr>
      <tr>
        <td><strong>2. Unit Economics</strong></td>
        <td>Kostenoptimierung &amp; Margen</td>
        <td>Darstellung von hybridem Routing: Lokale Modelle (Ollama) für Datenklassifizierung zur Senkung der API-Kosten.</td>
      </tr>
      <tr>
        <td><strong>3. On-Chain Architecture</strong></td>
        <td>Web3 Smart Contract Execution</td>
        <td>Nativer Einsatz von viem auf Base L2, Custom Transaction Calldata und sicheres Key-Management.</td>
      </tr>
      <tr>
        <td><strong>4. Systems Engineering</strong></td>
        <td>Produktionsreife vs. Spielzeug-Bots</td>
        <td>Kritische Einordnung von oberflächlichen Chat-Wrappern gegenüber deterministischer digitaler Fulfillment-Software.</td>
      </tr>
      <tr>
        <td><strong>5. Verifiable Metrics</strong></td>
        <td>Transparente Kennzahlen</td>
        <td>Verifizierter Gesamtumsatz, kumulierte Token-Burns auf Base und direkter Link zum BaseScan Explorer.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 4 -->
  <div class="page-break"></div>
  <h1><span class="num">4</span> Infrastruktur, Netzwerk &amp; Routing</h1>
  <p>
    Die Infrastruktur folgt dem Unternehmensstandard des Betreibers: 
    <strong>Keine offenen Ports am Router (Zero Exposed Ports)</strong> und vollständige Entkopplung über zentrale Proxies.
  </p>

  <div class="flow-container avoid-break">
    <div class="flow-title">Routing-Kette (Identisch mit cuonz.org Standard)</div>
    <div class="flow-steps">
      <div class="flow-step">
        <div class="flow-step-num">Ebene 1</div>
        <div class="flow-step-name">Cloudflare Edge</div>
        <div class="flow-step-sub">DDoS, WAF, SSL</div>
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
        <div class="flow-step-name">Fastify Engine</div>
        <div class="flow-step-sub">CT115 (:3000)</div>
      </div>
    </div>
  </div>

  <h2>Detaillierte Technologie-Schichten</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Schicht</th>
        <th>Technologie</th>
        <th>Aufgabe &amp; Spezifikation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hardware &amp; Hypervisor</strong></td>
        <td>Intel NUC Bare-Metal Cluster</td>
        <td>Proxmox VE 8.x, Debian 13 LXC Container (CT115). Dedizierte Ressourcen, lokale NVMe-Speicherung.</td>
      </tr>
      <tr>
        <td><strong>Edge &amp; Routing</strong></td>
        <td>Cloudflare + Nginx Proxy Manager</td>
        <td>Universal SSL Termination, DDoS-Abwehr, internes Routing über Proxy-Host #17 auf 10.0.1.115:3000.</td>
      </tr>
      <tr>
        <td><strong>Applikations-Server</strong></td>
        <td>Fastify v4 auf Node.js 22 LTS</td>
        <td>Hochperformanter TypeScript-Webserver auf Port 3000. Strikte Typisierung, Zod-Schema-Validierung.</td>
      </tr>
      <tr>
        <td><strong>Datenhaltung &amp; State</strong></td>
        <td>Prisma ORM mit SQLite</td>
        <td>Idempotente Tabellen (<span class="code-cell">Payment</span>, <span class="code-cell">SkillPurchase</span>, <span class="code-cell">B2bLead</span>). Atomic CAS verhindert Double-Execution.</td>
      </tr>
      <tr>
        <td><strong>KI-Orchestrierung</strong></td>
        <td>Ollama (Lokal) + Claude Sonnet 4</td>
        <td>Lokal gehostetes Modell für latenzfreies JSON-Routing; Claude Sonnet für hochpräzises englisches Copywriting.</td>
      </tr>
      <tr>
        <td><strong>Web3 Signer</strong></td>
        <td>viem (Base Mainnet)</td>
        <td>Native EIP-1559 Transaktionserstellung, Gas-Limit-Überwachung, BaseScan Audit-Verknüpfung.</td>
      </tr>
      <tr>
        <td><strong>Kommunikations-Schnittstelle</strong></td>
        <td>X API v2 (OAuth 1.0a)</td>
        <td>Automatisierte Veröffentlichung von Daily Updates und Proof-of-Burn Bestätigungen auf @GuentherBuilds.</td>
      </tr>
    </tbody>
  </table>

  <!-- KAPITEL 5 -->
  <div class="page-break"></div>
  <h1><span class="num">5</span> Administrator- &amp; Betriebs-Leitfaden</h1>
  <p>
    Dieser Abschnitt dient dem Betreiber als technischer Referenz-Leitfaden für Überwachung, Diagnose und Service-Steuerung.
  </p>

  <h2>Wartungs- &amp; Diagnosebefehle (SSH)</h2>
  <pre class="avoid-break">
<span class="comment"># 1. Status des Systemd-Services prüfen</span>
<span class="highlight">ssh gunther "systemctl status gunther-core --no-pager"</span>

<span class="comment"># 2. Live-Logs der Applikation einsehen</span>
<span class="highlight">ssh gunther "journalctl -u gunther-core -f"</span>

<span class="comment"># 3. Service nach Code- oder Konfigurationsänderung neustarten</span>
<span class="highlight">ssh gunther "systemctl restart gunther-core"</span>

<span class="comment"># 4. Lokalen Healthcheck-Endpunkt abfragen</span>
<span class="highlight">ssh gunther "curl -s http://127.0.0.1:3000/health"</span>
  </pre>

  <h2>Systempfade &amp; Konfigurationsdateien</h2>
  <table class="avoid-break">
    <thead>
      <tr>
        <th>Komponente</th>
        <th>Speicherort / Adresse</th>
        <th>Funktion</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Projektverzeichnis</strong></td>
        <td><span class="code-cell">/opt/gunther-core</span> auf CT115</td>
        <td>Kompilierter TypeScript-Code (<span class="code-cell">dist/</span>), statische Assets und Playbook-PDFs.</td>
      </tr>
      <tr>
        <td><strong>Konfigurations-Environment</strong></td>
        <td><span class="code-cell">/opt/gunther-core/.env</span></td>
        <td>Verschlüsselt gepflegte API-Keys (Stripe, Base Wallet Private Key, X OAuth Tokens).</td>
      </tr>
      <tr>
        <td><strong>Primäre Datenbank</strong></td>
        <td><span class="code-cell">/opt/gunther-core/prisma/dev.db</span></td>
        <td>Single Source of Truth für Zahlungen, Transaktions-Status, B2B-Leads und Audit-Traces.</td>
      </tr>
      <tr>
        <td><strong>Proxy-Konfiguration</strong></td>
        <td>CT103 (<span class="code-cell">10.0.1.127</span>) Host #17</td>
        <td>NPM-Regel zur Weiterleitung von 0xguenther.org, www und api auf 10.0.1.115:3000.</td>
      </tr>
      <tr>
        <td><strong>Base Burner Wallet</strong></td>
        <td><span class="code-cell">0xb54Ae6096F4C317Cc48B5668572b9E5C010C0f1A</span></td>
        <td>Autonome Ausführungs-Wallet auf Base Mainnet mit Live-ETH für Netzwerkgebühren.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout callout-success avoid-break" style="margin-top: 20px;">
    <div>
      <div class="callout-title">Betriebsbereit &amp; Vollständig Autark</div>
      <div style="font-size: 8.6pt; line-height: 1.5;">
        Das Gesamtsystem bedarf im laufenden Regelbetrieb keiner manuellen Pflege. Zahlungsabwicklung, 
        Produkt-Fulfillment, On-Chain-Token-Burns und Social-Media-Publikationen werden autonom 
        durch den Hintergrund-Daemon gesteuert und auditiert.
      </div>
    </div>
  </div>

</body>
</html>
"""

def generate_pdf():
    print("====================================================")
    print("GENERATING PROFESSIONAL SYSTEM DOKU PDF VIA PLAYWRIGHT")
    print("====================================================\n")

    os.makedirs('docs', exist_ok=True)
    os.makedirs('public/assets', exist_ok=True)

    with sync_playwright() as p:
        print("[1/3] Launching Chromium headless...")
        browser = p.chromium.launch()
        page = browser.new_page()

        print("[2/3] Rendering professional HTML content...")
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
            header_template='<div style="font-size: 7.5pt; font-family: sans-serif; color: #94a3b8; width: 100%; text-align: right; padding-right: 16mm;">0xGünther • System-Architektur</div>',
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
    print("SUCCESS: Professional PDF generated successfully!")
    print("====================================================")

if __name__ == '__main__':
    generate_pdf()
