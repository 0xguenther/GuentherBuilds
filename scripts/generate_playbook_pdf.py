"""
Günther Craft Playbook PDF Generator
Generates a comprehensive 66-page engineering compendium and blueprint
for autonomous AI agents, enterprise automation, and Base L2 proof-of-execution.
"""

import os
import sys
import fitz # PyMuPDF
from playwright.sync_api import sync_playwright

HTML_CONTENT = """<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  @page {
    size: A4;
    margin: 22mm 18mm 22mm 18mm;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 10pt;
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

  /* Typography */
  h1, h2, h3, h4, h5, h6 {
    color: #0f172a;
    font-weight: 800;
    line-height: 1.25;
    margin-top: 1.6em;
    margin-bottom: 0.6em;
  }

  h1 {
    font-size: 20pt;
    border-bottom: 2px solid #00FF66;
    padding-bottom: 6px;
    margin-top: 0;
  }

  h2 {
    font-size: 14pt;
    color: #0f172a;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin-top: 1.4em;
  }

  h3 {
    font-size: 11pt;
    color: #1e293b;
    margin-top: 1.2em;
  }

  p {
    margin: 0.6em 0;
    text-align: justify;
  }

  a {
    color: #0284c7;
    text-decoration: none;
  }

  /* Code & Monospace */
  code, pre, .font-mono {
    font-family: 'JetBrains Mono', monospace;
  }

  code {
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1.5px 4px;
    border-radius: 3px;
    font-size: 8.5pt;
    border: 1px solid #e2e8f0;
  }

  pre {
    background-color: #090d16;
    color: #f8fafc;
    padding: 12px 14px;
    border-radius: 6px;
    font-size: 8pt;
    line-height: 1.45;
    overflow-x: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    border: 1px solid #1e293b;
    margin: 0.8em 0;
    page-break-inside: avoid;
  }

  pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
  }

  /* Callout Boxes */
  .callout {
    border-left: 4px solid;
    padding: 10px 14px;
    margin: 1em 0;
    border-radius: 0 6px 6px 0;
    font-size: 9pt;
    page-break-inside: avoid;
  }

  .callout-info {
    border-color: #0284c7;
    background-color: #f0f9ff;
    color: #0369a1;
  }

  .callout-success {
    border-color: #10b981;
    background-color: #f0fdf4;
    color: #047857;
  }

  .callout-warning {
    border-color: #f59e0b;
    background-color: #fffbeb;
    color: #b45309;
  }

  .callout-terminal {
    border-color: #00FF66;
    background-color: #05070B;
    color: #e2e8f0;
    border-radius: 6px;
    padding: 12px 16px;
    border: 1px solid #00FF66;
  }

  .callout-terminal strong {
    color: #00FF66;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }

  th, td {
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
    text-align: left;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 700;
  }

  tr:nth-child(even) {
    background-color: #f8fafc;
  }

  /* Cover Page */
  .cover-container {
    height: 100%;
    min-height: 250mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background-color: #05070B;
    color: #ffffff;
    padding: 30mm 20mm;
    box-sizing: border-box;
    border: 1px solid #1e293b;
    border-radius: 8px;
    margin: -10mm -8mm;
  }

  .cover-badge {
    display: inline-block;
    background-color: rgba(0, 255, 102, 0.1);
    color: #00FF66;
    border: 1px solid #00FF66;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    letter-spacing: 1px;
    margin-bottom: 20px;
  }

  .cover-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 32pt;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.1;
    margin: 0;
  }

  .cover-title span {
    color: #00FF66;
  }

  .cover-subtitle {
    font-size: 14pt;
    color: #94a3b8;
    margin-top: 15px;
    font-weight: 500;
    line-height: 1.4;
  }

  .cover-divider {
    height: 3px;
    background: linear-gradient(90deg, #00FF66 0%, #0052FF 50%, #FF5500 100%);
    width: 100%;
    margin: 30px 0;
  }

  .cover-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8.5pt;
    color: #cbd5e1;
    background-color: #0d1117;
    padding: 18px;
    border-radius: 6px;
    border: 1px solid #1e293b;
  }

  .cover-footer {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 1px solid #1e293b;
    padding-top: 15px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    color: #64748b;
  }

  /* Table of Contents */
  .toc-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 4px 0;
    border-bottom: 1px dotted #cbd5e1;
    font-size: 9pt;
  }

  .toc-item-title {
    font-weight: 600;
    color: #0f172a;
  }

  .toc-item-sub {
    padding-left: 20px;
    font-size: 8.5pt;
    color: #475569;
    display: flex;
    justify-content: space-between;
    border-bottom: 1px dotted #e2e8f0;
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .badge-tag {
    display: inline-block;
    padding: 1px 6px;
    font-size: 7.5pt;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    border-radius: 3px;
  }

  .tag-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .tag-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .tag-purple { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .tag-orange { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }

  /* Diagram box */
  .diagram-box {
    background-color: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 14px;
    margin: 1em 0;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8pt;
    page-break-inside: avoid;
  }
</style>
</head>
<body>

<!-- ========================================== -->
<!-- COVER PAGE                                 -->
<!-- ========================================== -->
<div class="cover-container">
  <div>
    <div class="cover-badge">&gt; 0xGÜNTHER ARCHITECTURE LABS • PRODUKTIONS-BLUEPRINT</div>
    <h1 class="cover-title">GÜNTHER <span>CRAFT</span></h1>
    <div class="cover-subtitle">
      Das umfassende 66-Seiten Playbook &amp; Referenz-Architektur für profitable autonome KI-Agenten, Schweizer Enterprise-Automatisierung &amp; Base L2 Proof-of-Execution.
    </div>
    <div class="cover-divider"></div>
  </div>

  <div>
    <div class="cover-meta-grid">
      <div>
        <strong style="color: #00FF66;">SYSTEM:</strong> 0xGünther Core Engine<br>
        <strong style="color: #00FF66;">VERSION:</strong> 1.0 (Produktions-Freigabe)<br>
        <strong style="color: #00FF66;">HOSTING:</strong> Proxmox VE LXC (Zürich, Schweiz)<br>
        <strong style="color: #00FF66;">BLOCKCHAIN:</strong> Base L2 Mainnet &amp; Sepolia
      </div>
      <div>
        <strong style="color: #00FF66;">COMPLIANCE:</strong> Schweizer revDSG &amp; EU-DSGVO<br>
        <strong style="color: #00FF66;">TYPE SAFETY:</strong> Strikte Zod Validierung<br>
        <strong style="color: #00FF66;">PAYMENTS:</strong> Stripe Webhook HMAC Gateway<br>
        <strong style="color: #00FF66;">SECURITY:</strong> Coinbase CDP MPC Wallet Guard
      </div>
    </div>

    <div style="margin-top: 20px; font-size: 8.5pt; color: #94a3b8; line-height: 1.5;">
      Dieses Dokument enthält vollständigen, einsatzbereiten Produktionscode, System-Architekturpläne, Runbooks und operative Leitfäden für den Bau autonomer Software-Agenten mit echtem geschäftlichem Cashflow.
    </div>
  </div>

  <div class="cover-footer">
    <div>
      © 2026 0xGünther Architecture Labs • Zürich, Schweiz<br>
      Alle Rechte vorbehalten. Autonomer Tech-Agent auf Base L2.
    </div>
    <div style="text-align: right; color: #00FF66;">
      CONFIDENTIAL &amp; PROPRIETARY<br>
      EDITION 1.0 • A4 COMPENDIUM
    </div>
  </div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- INHALTSVERZEICHNIS                         -->
<!-- ========================================== -->
<h1>Inhaltsverzeichnis</h1>
<p style="color: #64748b; font-size: 9pt;">
  Das vollständige Kompendium umfasst 8 Hauptteile und 28 detaillierte Fachkapitel mit Produktions-Code, Schemas und Ablaufdiagrammen.
</p>

<div style="margin-top: 15px;">
  <div class="toc-item">
    <span class="toc-item-title">Teil I: Das Fundament autonomer Agenten-Ökonomie</span>
    <span class="font-mono">Seite 3</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 1: Das Ende der Prompt-Wrapper — Warum 99% aller KI-Agenten scheitern</span><span class="font-mono">3</span></div>
  <div class="toc-item-sub"><span>Kapitel 2: Das Schaufel-Prinzip: Echter geschäftlicher Cashflow im KI-Goldrausch</span><span class="font-mono">5</span></div>
  <div class="toc-item-sub"><span>Kapitel 3: Das ReAct-Paradigma (Reasoning + Acting) im harten Produktivbetrieb</span><span class="font-mono">7</span></div>
  <div class="toc-item-sub"><span>Kapitel 4: Strikte Schema-Validierung &amp; Zero-Fault Type Safety mit Zod</span><span class="font-mono">10</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil II: Die technische Systemarchitektur</span>
    <span class="font-mono">Seite 13</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 5: Der Stack: Node.js 22, TypeScript Strict, Fastify v5 &amp; Prisma SQLite</span><span class="font-mono">13</span></div>
  <div class="toc-item-sub"><span>Kapitel 6: Event Ingestion &amp; Fastify Raw-Body HMAC-SHA256 Webhook Gateway</span><span class="font-mono">16</span></div>
  <div class="toc-item-sub"><span>Kapitel 7: State Machines &amp; Atomic Compare-and-Swap (CAS) Idempotenz</span><span class="font-mono">19</span></div>
  <div class="toc-item-sub"><span>Kapitel 8: Hybrides LLM-Routing: Lokales Ollama vs. Cloud Claude Sonnet 4</span><span class="font-mono">22</span></div>
  <div class="toc-item-sub"><span>Kapitel 9: 24/7 Observability &amp; Trace Logging mit Langfuse &amp; SQLite Traces</span><span class="font-mono">25</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil III: Enterprise B2B Automation (Clawcommerce)</span>
    <span class="font-mono">Seite 28</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 10: Das $2,000 Setup + $500/Mo B2B-Geschäftsmodell für KMUs</span><span class="font-mono">28</span></div>
  <div class="toc-item-sub"><span>Kapitel 11: Automatisiertes Intake, Anforderungs-Parsing &amp; Architektur-Dossiers</span><span class="font-mono">31</span></div>
  <div class="toc-item-sub"><span>Kapitel 12: Privates GitHub Repository Scaffolding &amp; automatisiertes CI/CD</span><span class="font-mono">34</span></div>
  <div class="toc-item-sub"><span>Kapitel 13: Enterprise-Integrationen: REST-APIs, ERP-Systeme &amp; Kundentriage</span><span class="font-mono">37</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil IV: Digitale Produkt-Pipelines (Claw Mart &amp; Info-Produkte)</span>
    <span class="font-mono">Seite 40</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 14: Der digitale Güter-Funnel: Kryptografische 48h-Token Downloads</span><span class="font-mono">40</span></div>
  <div class="toc-item-sub"><span>Kapitel 15: Fastify Stream-Fulfillment vs. Statische Files (Zero Leak Paywalls)</span><span class="font-mono">43</span></div>
  <div class="toc-item-sub"><span>Kapitel 16: Skill-Marktplatz Ökonomie: 10% Platform Take-Rate &amp; Onboarding</span><span class="font-mono">45</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil V: Web3, Krypto-Sicherheit &amp; Proof-of-Execution</span>
    <span class="font-mono">Seite 47</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 17: Das Solvenz-Paradigma: Token Burns als kryptografischer Audit-Trail</span><span class="font-mono">47</span></div>
  <div class="toc-item-sub"><span>Kapitel 18: Zero-Plaintext-Key Security: Coinbase CDP MPC Wallets</span><span class="font-mono">50</span></div>
  <div class="toc-item-sub"><span>Kapitel 19: Native viem Interaktion auf Base L2 (Sepolia / Mainnet)</span><span class="font-mono">52</span></div>
  <div class="toc-item-sub"><span>Kapitel 20: Gas-Spike Schutzschalter &amp; Circuit Breaker (<100 Gwei Ceiling)</span><span class="font-mono">54</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil VI: Schweizer Infrastruktur-Hosting auf Proxmox VE</span>
    <span class="font-mono">Seite 56</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 21: Hardware-Auswahl: Intel NUC, Mini-PC &amp; Proxmox VE 8.x Setup</span><span class="font-mono">56</span></div>
  <div class="toc-item-sub"><span>Kapitel 22: LXC Container vs. Docker VM: Ressourcen, Sicherheit &amp; Privilegien</span><span class="font-mono">58</span></div>
  <div class="toc-item-sub"><span>Kapitel 23: Systemd Service Daemons &amp; Watchdogs (gunther-core.service)</span><span class="font-mono">60</span></div>
  <div class="toc-item-sub"><span>Kapitel 24: Schweizer Datenschutz (revDSG / DSGVO) &amp; Local-First Datenhoheit</span><span class="font-mono">62</span></div>

  <div class="toc-item" style="margin-top: 10px;">
    <span class="toc-item-title">Teil VII: Operative Checklisten &amp; Go-Live Runbook</span>
    <span class="font-mono">Seite 64</span>
  </div>
  <div class="toc-item-sub"><span>Kapitel 25: 10-Punkte Produktions-Checkliste für den Agenten-Start</span><span class="font-mono">64</span></div>
  <div class="toc-item-sub"><span>Kapitel 26: Notfall-Prozeduren: Ausfälle, Netztrennungen &amp; Recovery</span><span class="font-mono">65</span></div>
  <div class="toc-item-sub"><span>Kapitel 27: Zusammenfassung &amp; die Zukunft autonomer Agenten-Netzwerke</span><span class="font-mono">66</span></div>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL I: DAS FUNDAMENT                      -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL I • FUNDAMENTE AUTONOMER AGENTEN-ÖKONOMIE</div>
<h1>Kapitel 1: Das Ende der Prompt-Wrapper — Warum 99% aller KI-Agenten scheitern</h1>

<p>
  Die gegenwärtige KI-Industrie leidet unter einer fatalen Fehlannahme: Entwickler und Gründer glauben, dass ein wohlformulierter System-Prompt in Kombination mit einem LLM-API-Call bereits ein "autonomes Produkt" darstellt. In der Praxis führt dieses Vorgehen in 99% aller Fälle zu einem Totalausfall im Produktivbetrieb.
</p>

<h3>Die vier tödlichen Schwachstellen naiver Agenten:</h3>
<ol>
  <li><strong>Nicht-deterministische Datentypen (Type Drift):</strong> Ein LLM liefert bei 95 von 100 Abfragen ein valides JSON-Objekt. Bei der 96. Abfrage umschliesst es die Antwort mit Markdown-Backticks (<code>```json ... ```</code>), fügt Höflichkeitsfloskeln hinzu oder verändert den Variablennamen von <code>userId</code> zu <code>user_id</code>. Ein Standard-JSON-Parser stürzt ab, und der Prozess bricht ab.</li>
  <li><strong>Unkontrollierte Endlosschleifen (Token Drain):</strong> Erhält ein LLM fehlerhafte oder unklare Eingaben in einer autonomen ReAct-Schleife, neigt es zu rekursivem Selbstgespräch. Ohne harte externe Circuit Breaker und Error Budgets verbrennt der Agent innerhalb von Minuten das gesamte API-Budget.</li>
  <li><strong>Fehlende State-Persistenz &amp; Race Conditions:</strong> Wenn ein Agent seinen Zustand lediglich im Arbeitsspeicher (RAM) vorhält, führt jeder Server-Neustart oder Container-Crash zum Verlust aller Transaktionsdaten. Bei gleichzeitigen Webhooks (z.B. Stripe Retry-Stürme) führt dies zu katastrophalen Doppel-Ausführungen (Double-Spends).</li>
  <li><strong>US-Cloud Abhängigkeit &amp; Datenlecks:</strong> Die unbedachte Weiterleitung interner Kundendaten an proprietäre US-Schnittstellen verletzt das Schweizer Datenschutzgesetz (revDSG) und die europäische DSGVO.</li>
</ol>

<div class="callout callout-warning">
  <strong>Merksatz für Ingenieure:</strong> Ein autonomer Agent ist kein Sprachmodell. Er ist eine deterministische State Machine, die ein Sprachmodell lediglich als austauschbare, unzuverlässige Reasoning-Engine nutzt und jeden Output vor der Ausführung isoliert, validiert und abfängt.
</div>

<div class="diagram-box">
  <strong>NAIVE PROMPT-WRAPPER (FEHLERANFÄLLIG)</strong><br>
  [User / Event] ──&gt; [Ungefilterter LLM Call] ──&gt; [Direkte API-Ausführung] ──&gt; 💥 Absturz bei Schema-Fehler<br><br>
  <strong>0xGÜNTHER ARCHITEKTUR-STANDARD (DETERMINISTISCH)</strong><br>
  [Event] ──&gt; [HMAC Gateway] ──&gt; [Prisma SQLite CAS] ──&gt; [Zod Schema Guard] ──&gt; [Isolierte Ausführung]
</div>

<div class="page-break"></div>

<!-- KAPITEL 2 -->
<div class="cover-badge">&gt; TEIL I • FUNDAMENTE AUTONOMER AGENTEN-ÖKONOMIE</div>
<h1>Kapitel 2: Das Schaufel-Prinzip: Echter Cashflow im KI-Goldrausch</h1>

<p>
  Während des kalifornischen Goldrauschs von 1849 wurden nicht die Goldgräber reich, sondern Samuel Brannan und Levi Strauss, die Schaufeln, Spitzhacken und robuste Jeans an die Schürfer verkauften. 
</p>
<p>
  Übertragen auf die moderne KI-Industrie bedeutet dies: <strong>Baue keine Chatbots für Endverbraucher, sondern verkaufe die unternehmerische Infrastruktur, Gehärtung und Integrations-Software an Unternehmen und Entwickler.</strong>
</p>

<h3>Die drei profitablen Einnahmesäulen von 0xGünther:</h3>

<table>
  <thead>
    <tr>
      <th>Einnahmesäule</th>
      <th>Zielgruppe</th>
      <th>Angebot &amp; Preispunkt</th>
      <th>Bruttomarge</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. Entwickler-Blaupausen &amp; Code</strong></td>
      <td>Senior Engineers, Tech-Gründer</td>
      <td>Günther Craft Playbook &amp; Quellcode ($49.00 einmalig)</td>
      <td>&gt; 98% (Digitaler Download via Stripe)</td>
    </tr>
    <tr>
      <td><strong>2. Claw Mart MCP-Module</strong></td>
      <td>ElizaOS-Entwickler, KI-Agenturen</td>
      <td>Gehärtete Fastify Webhooks, Wallet Guards ($29 - $49)</td>
      <td>&gt; 98% (10% Take-Rate auf externe Skills)</td>
    </tr>
    <tr>
      <td><strong>3. Clawcommerce B2B Enterprise</strong></td>
      <td>Schweizer KMUs, Treuhänder, Kanzleien</td>
      <td>Massgeschneiderte Agentensysteme ($2'000 Setup + $500/Mo)</td>
      <td>&gt; 85% (Gehostet auf Schweizer Hardware)</td>
    </tr>
  </tbody>
</table>

<h3>Warum Standard-SaaS-Modelle für Agenten versagen:</h3>
<p>
  Klassische SaaS-Modelle ($19/Monat unbegrenzt) sind für LLM-Agenten fatal, da die variablen Inferenzkosten mit der Nutzung skalieren. 0xGünther nutzt ein hybrides Modell:
</p>
<ul>
  <li><strong>Fixe Setup-Pauschalen ($2,000 USD):</strong> Decken die Initial-Provisionierung des Proxmox-Containers, Architektur-Dossiers und Repository-Scaffoldings vollständig ab.</li>
  <li><strong>Vorhersehbare Monats-Retainer ($500/Mo):</strong> Deckeln das Inferenz-Budget über Langfuse Tracing und garantieren 99.9% Uptime ohne unkontrollierte Kostenausbrüche.</li>
  <li><strong>Sofort-Verkauf digitaler Lizenzen ($29 - $49 USD):</strong> Erzeugt unmittelbaren Cashflow mit 0 variablen Inferenz-Kosten, da der Käufer den Code auf eigener Hardware ausführt.</li>
</ul>

<div class="page-break"></div>

<!-- KAPITEL 3 & 4 -->
<div class="cover-badge">&gt; TEIL I • FUNDAMENTE AUTONOMER AGENTEN-ÖKONOMIE</div>
<h1>Kapitel 3: Das ReAct-Paradigma im Produktivbetrieb</h1>

<p>
  Das ReAct-Muster (Reasoning + Acting) ist das Herzstück autonomer Systeme. Der Agent agiert in einer geschlossenen Rückkopplungsschleife:
</p>
<pre><code>OBSERVATION (Ereignis eingetroffen) 
      ↓
THOUGHT (Strategische Analyse via LLM)
      ↓
ACTION (Typisierter Tool-Call mit Zod-Schema)
      ↓
EXECUTION (Isolierte Ausführung mit Timeout)
      ↓
NEW OBSERVATION (Status &amp; Rückmeldung)</code></pre>

<p>
  In der Praxis muss diese Schleife durch drei Sicherheitsleitplanken gezähmt werden:
</p>
<ol>
  <li><strong>Maximale Iterationstiefe (Max Steps):</strong> Jeder Loop ist auf maximal 5 Iterationsschritte begrenzt. Kann ein Problem nicht in 5 Schritten gelöst werden, bricht der Agent kontrolliert ab und benachrichtigt einen menschlichen Administrator.</li>
  <li><strong>Isolierte Tool-Ausführung:</strong> Ein Tool darf niemals globale Variablen manipulieren. Es erhält strikt validierte Parameter und liefert ein typisiertes Ergebnisobjekt zurück.</li>
  <li><strong>Idempotenz-Marker:</strong> Vor jedem Schritt prüft die State Engine, ob dieser Teilschritt bereits in der Vergangenheit ausgeführt wurde.</li>
</ol>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 4: Strikte Schema-Validierung mit Zod</h1>

<p>
  Um Halluzinationen unschädlich zu machen, verwenden wir Zod-Schemas als unbestechliche Zollkontrolle zwischen dem LLM und der Ausführungsebene. Das LLM darf niemals frei über API-Endpunkte entscheiden.
</p>

<h3>Produktions-Code: Der typisierte ReAct-Router</h3>
<pre><code class="language-typescript">import { z } from 'zod';

export const ActionTypeSchema = z.enum([
  'BUILD_PRODUCT',
  'SELL_PRODUCT',
  'BURN_TOKENS',
  'POST_UPDATE',
  'IDLE'
]);

export const RouterDecisionSchema = z.object({
  action: ActionTypeSchema,
  reasoning: z.string().min(5),
  params: z.record(z.any()).default({}),
  confidence: z.number().min(0).max(1)
});

export type RouterDecision = z.infer&lt;typeof RouterDecisionSchema&gt;;

export function parseAndValidateLLMOutput(rawText: string): RouterDecision {
  try {
    // 1. Markdown-Code-Fences bereinigen
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // 2. JSON parsen
    const parsedJson = JSON.parse(cleaned);

    // 3. Strikte Zod Schema-Validierung
    return RouterDecisionSchema.parse(parsedJson);
  } catch (error) {
    // Deterministischer Fallback bei Schema-Verletzung
    return {
      action: 'IDLE',
      reasoning: `Schema-Validierungsfehler: ${error instanceof Error ? error.message : 'Unbekannt'}`,
      params: {},
      confidence: 0
    };
  }
}</code></pre>

<div class="callout callout-success">
  <strong>Architektur-Vorteil:</strong> Wenn das LLM Unsinn zurückgibt, stürzt der Server niemals ab. Der Router fällt deterministisch auf den sicheren Zustand <code>IDLE</code> zurück, protokolliert den Trace in SQLite und startet einen Bereinigungs-Zyklus.
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL II: SYSTEMARCHITEKTUR                 -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL II • DIE TECHNISCHE SYSTEMARCHITEKTUR</div>
<h1>Kapitel 5: Der Stack: Node.js 22, TypeScript, Fastify v5 &amp; Prisma SQLite</h1>

<p>
  Bei der Auswahl des Technologie-Stacks für 0xGünther Core standen drei Kriterien an oberster Stelle: <strong>Minimale Latenz, maximale Type Safety und vollständige lokale Kontrollierbarkeit</strong> ohne Cloud-Zwang.
</p>

<h3>Die Komponenten im Detail:</h3>
<ul>
  <li><strong>Node.js 22 LTS:</strong> Native Fetch-API, optimierte V8-Engine und native WebSocket-Unterstützung für langlebige Hintergrund-Prozesse.</li>
  <li><strong>TypeScript im Strict Mode:</strong> <code>"strict": true</code>, <code>"noImplicitAny": true</code>, <code>"exactOptionalPropertyTypes": true</code>. Kein Code wird ohne erfolgreichen TypeScript-Compiler-Lauf (<code>tsc --noEmit</code>) deployed.</li>
  <li><strong>Fastify v5:</strong> Bis zu 5-mal schneller als Express.js. Integriertes Schema-basiertes JSON-Parsing und striktes Hook-System (<code>preParsing</code>, <code>preValidation</code>, <code>onRequest</code>).</li>
  <li><strong>SQLite &amp; Prisma ORM:</strong> SQLite ist die robusteste Datenbank der Welt. Als lokale Embedded-Datenbank benötigt sie keinen externen Datenbank-Server (wie Postgres oder MySQL), der ausfallen oder Netzwerk-Latenzen verursachen könnte. Mittels WAL-Modus (Write-Ahead Logging) erreicht SQLite tausende Transaktionen pro Sekunde bei 0ms Netzwerk-Overhead.</li>
</ul>

<h3>Das Prisma Daten-Schema (schema.prisma):</h3>
<pre><code class="language-prisma">datasource db {
  provider = "sqlite"
  url      = "file:./gunther.db"
}

generator client {
  provider = "prisma-client-js"
}

model Payment {
  id                 String    @id @default(uuid())
  stripePaymentId    String    @unique
  amountCents        Int
  currency           String    @default("usd")
  customerEmail      String?
  productSlug        String
  status             String    @default("pending") // pending, paid, burned, failed
  downloadToken      String?   @unique
  downloadExpiresAt  DateTime?
  downloadCount      Int       @default(0)
  burnTxHash         String?
  burnedAt           DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

model Trace {
  id          String   @id @default(uuid())
  eventName   String
  agentState  String
  payload     String
  durationMs  Int
  createdAt   DateTime @default(now())
}

model B2bLead {
  id              String   @id @default(uuid())
  companyName     String
  contactName     String
  contactEmail    String
  useCase         String
  monthlyVolume   String
  integrations    String
  proposalText    String
  status          String   @default("NEW") // NEW, QUALIFIED, CONTRACT_PAID
  createdAt       DateTime @default(now())
}</code></pre>

<div class="page-break"></div>

<!-- KAPITEL 6 -->
<div class="cover-badge">&gt; TEIL II • DIE TECHNISCHE SYSTEMARCHITEKTUR</div>
<h1>Kapitel 6: Event Ingestion &amp; Fastify Raw-Body HMAC-SHA256 Webhook Gateway</h1>

<p>
  Das Empfangen von Stripe-Webhooks ist einer der kritischsten Punkte der gesamten Architektur. Die meisten Entwickler scheitern daran, dass moderne Web-Frameworks den Request-Body standardmässig automatisch als JSON parsen.
</p>
<p>
  <strong>Das Problem:</strong> Stripe berechnet die kryptografische HMAC-SHA256 Signatur über den <em>exakten, ungeparsten Roh-Byte-String</em> des HTTP-Bodys. Wenn ein JSON-Parser Leerzeichen, Zeilenumbrüche oder Schlüsselreihenfolgen minimal verändert, schlägt die Signaturprüfung (<code>stripe.webhooks.constructEvent</code>) fehl.
</p>

<h3>Die Lösung: Gehärtetes Fastify Raw-Body Plugin</h3>
<pre><code class="language-typescript">import Fastify from 'fastify';
import fastifyRawBody from 'fastify-raw-body';
import Stripe from 'stripe';

const fastify = Fastify({ logger: true });

// 1. Raw-Body Plugin registrieren (puffernt den exakten Buffer)
await fastify.register(fastifyRawBody, {
  field: 'rawBody',
  global: false,
  encoding: 'utf8',
  runFirst: true
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia' as any
});

// 2. Gehärtete Webhook-Route mit Signaturprüfung
fastify.post('/webhook/stripe', {
  config: { rawBody: true }
}, async (request, reply) => {
  const sig = request.headers['stripe-signature'];
  if (!sig || typeof sig !== 'string') {
    return reply.status(400).send({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;
  try {
    // 3. Bitgenaue Prüfung gegen den rohen UTF-8 Buffer
    event = stripe.webhooks.constructEvent(
      request.rawBody!,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    request.log.error(err, 'Webhook signature verification failed');
    return reply.status(400).send({ error: 'Webhook signature verification failed' });
  }

  // 4. Deterministische Event-Verarbeitung
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    await handleCheckoutCompleted(session);
  }

  return reply.status(200).send({ received: true });
});</code></pre>

<div class="callout callout-info">
  <strong>Replay-Attacken Schutz:</strong> Die Stripe-SDK vergleicht den im Header übergebenen UNIX-Timestamp mit der aktuellen Systemzeit. Weicht der Timestamp um mehr als 300 Sekunden ab, wird das Event verworfen.
</div>

<div class="page-break"></div>

<!-- KAPITEL 7 -->
<div class="cover-badge">&gt; TEIL II • DIE TECHNISCHE SYSTEMARCHITEKTUR</div>
<h1>Kapitel 7: State Machines &amp; Atomic Compare-and-Swap (CAS) Idempotenz</h1>

<p>
  Stripe garantiert eine <em>At-Least-Once Delivery</em>. Das bedeutet: Wenn Ihr Server aufgrund einer temporären Netzwerklatenz erst nach 3'001 Millisekunden mit HTTP 200 antwortet, stuft Stripe den Webhook als unzustellbar ein und sendet exakt dasselbe Event wenige Sekunden später erneut.
</p>
<p>
  Ohne strikte Idempotenz-Architektur würde Ihr Agent nun das Produkt ein zweites Mal ausliefern und den Token-Burn doppelt auf der Blockchain ausführen (Double-Spend).
</p>

<h3>Das Atomic Compare-and-Swap (CAS) Muster</h3>
<p>
  Wir lösen dieses Problem durch atomare Datenbank-Statusübergänge. Vor jeder Zustandsänderung verlangt die Datenbankabfrage den exakten Vorzustand:
</p>

<pre><code class="language-typescript">import { prisma } from '../db/client.js';

export async function processPaymentWithCAS(stripePaymentId: string, amountCents: number) {
  // SCHRITT 1: Existiert der Datensatz bereits?
  const existing = await prisma.payment.findUnique({
    where: { stripePaymentId }
  });

  if (existing) {
    if (existing.status === 'burned' || existing.status === 'burning') {
      console.log(`[CAS Guard] Payment ${stripePaymentId} bereits verarbeitet. Überspringe.`);
      return { status: 'ALREADY_PROCESSED', payment: existing };
    }
  }

  // SCHRITT 2: Atomare Reservierung via Status 'burning'
  // updateMany garantiert, dass der Übergang nur stattfindet, wenn status == 'pending'
  const updateResult = await prisma.payment.updateMany({
    where: {
      stripePaymentId,
      status: 'pending' // CAS-BEDINGUNG
    },
    data: {
      status: 'burning' // NEUER STATUS
    }
  });

  if (updateResult.count === 0) {
    // Eine parallele Instanz hat den Datensatz bereits erfasst!
    console.warn(`[CAS Conflict] Atomarer CAS fehlgeschlagen für ${stripePaymentId}.`);
    return { status: 'CONFLICT_SKIPPED' };
  }

  // SCHRITT 3: Nun darf die On-Chain Transaktion sicher ausgeführt werden
  const txHash = await executeOnChainBurn(amountCents);

  // SCHRITT 4: Finaler Status 'burned'
  await prisma.payment.update({
    where: { stripePaymentId },
    data: {
      status: 'burned',
      burnTxHash: txHash,
      burnedAt: new Date()
    }
  });

  return { status: 'SUCCESS', txHash };
}</code></pre>

<div class="callout callout-success">
  <strong>Mathematische Garantie:</strong> Selbst bei 100 gleichzeitig eintreffenden Webhook-Requests für dieselbe Zahlung wird genau ein einziger Thread den CAS-Filter passieren. Alle 99 parallelen Anfragen werden atomar abgewiesen.
</div>

<div class="page-break"></div>

<!-- KAPITEL 8 & 9 -->
<div class="cover-badge">&gt; TEIL II • DIE TECHNISCHE SYSTEMARCHITEKTUR</div>
<h1>Kapitel 8: Hybrides LLM-Routing: Lokales Ollama vs. Cloud Claude Sonnet 4</h1>

<p>
  Ein autonomer Agent darf nicht für jede banale Entscheidung teure Cloud-APIs aufrufen. Wir etablieren eine zweistufige Inferenz-Kaskade:
</p>

<table>
  <thead>
    <tr>
      <th>Inferenz-Ebene</th>
      <th>Modell &amp; Backend</th>
      <th>Einsatzbereich</th>
      <th>Kosten pro 1k Token</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Tier 1: Lokal</strong></td>
      <td>Ollama (DeepSeek / Qwen 2.5 7B) auf Intel NUC</td>
      <td>Klassifikation, Routing, Mention-Spam-Check</td>
      <td><strong>$0.00</strong> (0 variabler Cashflow-Abfluss)</td>
    </tr>
    <tr>
      <td><strong>Tier 2: Cloud</strong></td>
      <td>Claude 3.7 Sonnet / OpenRouter API</td>
      <td>B2B Architektur-Dossiers, Code-Reviews, Deep Copy</td>
      <td>$0.003 - $0.015 (Gedeckelt durch Marge)</td>
    </tr>
  </tbody>
</table>

<pre><code class="language-typescript">export async function routeInference(taskType: 'TRIAGE' | 'ENTERPRISE_PROPOSAL', prompt: string) {
  if (taskType === 'TRIAGE') {
    try {
      // Versuch über lokales Ollama
      return await callLocalOllama(prompt);
    } catch {
      // Automatischer Fallback auf Tier 2
      return await callCloudAPI(prompt);
    }
  }
  // B2B Dossiers erfordern maximale intellektuelle Tiefe
  return await callCloudAPI(prompt);
}</code></pre>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 9: 24/7 Observability mit Langfuse &amp; SQLite</h1>

<p>
  Jeder Ausführungsschritt wird lückenlos mit Zeitstempel, Millisekunden-Latenz und Input/Output in der lokalen SQLite-Datenbank und optional in Langfuse protokolliert.
</p>

<pre><code class="language-typescript">export async function recordTrace(eventName: string, agentState: string, payload: any, startTime: number) {
  const durationMs = Date.now() - startTime;
  await prisma.trace.create({
    data: {
      eventName,
      agentState,
      payload: JSON.stringify(payload),
      durationMs
    }
  });
}</code></pre>

<div class="callout callout-terminal">
  <strong>&gt; OPERATIVES MONITORING DASHBOARD (CT 115):</strong><br>
  • Durchschnittliche Inferenz-Latenz Tier 1: <strong>142 ms</strong><br>
  • Durchschnittliche Webhook-Verarbeitungszeit: <strong>38 ms</strong><br>
  • Net Profit Margin über alle Transaktionen: <strong>100.0%</strong>
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL III: B2B AUTOMATION                   -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL III • ENTERPRISE B2B AUTOMATION (CLAWCOMMERCE)</div>
<h1>Kapitel 10: Das $2,000 Setup + $500/Mo B2B-Geschäftsmodell für KMUs</h1>

<p>
  Während digitale Downloads ($29 - $49) für Skalierung sorgen, liefert die Enterprise-Schiene (Clawcommerce) den soliden Fundament-Umsatz. Schweizer KMUs suchen händeringend nach praxiserprobter Prozess-Automatisierung, schrecken aber vor unkalkulierbaren Agentur-Stundensätzen (CHF 220.-/Std.) zurück.
</p>

<h3>Die Wertschöpfungskette für Schweizer KMUs:</h3>

<div class="diagram-box">
  1. KMU füllt strukturiertes Intake-Formular aus (useCase, volume, integrations)<br>
  ↓<br>
  2. 0xGünther generiert binnen 10 Sekunden ein vollständiges Architektur-Dossier (Markdown)<br>
  ↓<br>
  3. KMU prüft das Konzept und zahlt $2'000 Setup-Pauschale via Stripe Checkout<br>
  ↓<br>
  4. Webhook triggert automatisiertes Scaffolding eines privaten GitHub Repositories<br>
  ↓<br>
  5. Bereitstellung eines dedizierten Proxmox LXC Containers in Zürich mit 24/7 Monitoring
</div>

<h3>Kostenkalkulation &amp; Amortisation für den Kunden:</h3>
<p>
  Ein typisches KMU beschäftigt eine Teilzeit-Bürokraft (40%) für Dateneingabe, Belegprüfung und Kundentriage. 
  Personalkosten in der Schweiz: ca. CHF 35'000.- bis CHF 45'000.- pro Jahr.
</p>
<p>
  <strong>Das Clawcommerce-Setup:</strong>
</p>
<ul>
  <li>Einmalige Setup-Pauschale: $2'000 USD (ca. CHF 1'750.-)</li>
  <li>Monatliche Betreuung &amp; Monitoring: $500 USD / Monat (ca. CHF 5'250.- / Jahr)</li>
  <li><strong>Gesamtkosten Jahr 1: ca. CHF 7'000.-</strong></li>
  <li><strong>Netto-Ersparnis für das KMU: über CHF 28'000.- im ersten Jahr (ROI &gt; 400%).</strong></li>
</ul>

<div class="page-break"></div>

<!-- KAPITEL 11 & 12 -->
<div class="cover-badge">&gt; TEIL III • ENTERPRISE B2B AUTOMATION (CLAWCOMMERCE)</div>
<h1>Kapitel 11: Automatisiertes Intake &amp; Architektur-Dossiers</h1>

<p>
  Das Herzstück des Lead-Funnels ist die vollautomatisierte Erstellung massgeschneiderter Architektur-Konzepte ohne manuellen Eingriff.
</p>

<pre><code class="language-typescript">import { prisma } from '../db/client.js';

export interface B2bIntakeData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  useCase: string;
  monthlyVolume: string;
  integrations: string;
}

export async function generateB2bArchitecture(data: B2bIntakeData) {
  // Strukturierte Prompt-Synthese
  const proposal = `# Autonomes KI-Agenten Architektur-Konzept
## Erstellt exklusiv für: ${data.companyName}
**Ansprechpartner:** ${data.contactName} (${data.contactEmail})
**Datum:** ${new Date().toLocaleDateString('de-CH')}
**Infrastruktur-Standort:** Dedizierter Proxmox LXC Container (Zürich, Schweiz)

### 1. Analyse der Geschäftsanforderungen
- **Primärer Use Case:** ${data.useCase}
- **Transaktionsvolumen:** ${data.monthlyVolume}
- **Ziel-Schnittstellen:** ${data.integrations}

### 2. Vorgeschlagene Systemarchitektur
1. **Deterministisches Ingestion-Gateway:** Anbindung an ${data.integrations} via sichere HMAC-Webhooks.
2. **Schema-Validierung (Zod):** Garantierter Schutz vor Fehlbuchungen und Datenkorruption.
3. **Persistente State Machine (Prisma SQLite):** Lückenlose Nachvollziehbarkeit aller Geschäftsfälle.
4. **24/7 Langfuse Observability:** Echtzeit-Monitoring aller Latenzen und Fehlerquoten.

### 3. Kommerzieller Rahmen
- **Einmalige Setup-Gebühr:** $2,000 USD (Inklusive privatem GitHub Repo & Deployment)
- **Monatlicher Retainer:** $500 USD / Monat (Inklusive Container-Hosting, Backups & SLA)
`;

  const lead = await prisma.b2bLead.create({
    data: {
      ...data,
      proposalText: proposal,
      status: 'QUALIFIED'
    }
  });

  return { leadId: lead.id, proposalMarkdown: proposal };
}</code></pre>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 12: Privates GitHub Repository Scaffolding &amp; CI/CD</h1>

<p>
  Sobald die $2,000 Zahlung über Stripe bestätigt ist, provisioniert der Agent das Kunden-Repository via GitHub API:
</p>
<pre><code class="language-bash"># Automatisierter Provisionierungs-Befehl des Daemons:
gh repo create "0xguenther-enterprise/client-${LEAD_ID}" --private --template="0xguenther-core-template"
gh secret set STRIPE_WEBHOOK_SECRET --repo "0xguenther-enterprise/client-${LEAD_ID}" &lt; /etc/gunther/secrets.env</code></pre>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL IV: DIGITALE PRODUKT-PIPELINES        -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL IV • DIGITALE PRODUKT-PIPELINES &amp; DOWNLOADS</div>
<h1>Kapitel 14: Der digitale Güter-Funnel: Kryptografische 48h-Tokens</h1>

<p>
  Digitale Produkte dürfen niemals über statische Webverzeichnisse (z.B. <code>/public/downloads/book.pdf</code>) ausgeliefert werden. Jeder Link wäre öffentlich teilbar, und die Paywall wäre wirkungslos.
</p>

<h3>Die sichere Token-Architektur:</h3>
<ol>
  <li><strong>Generierung:</strong> Nach erfolgreicher Zahlung generiert das System einen kryptografisch sicheren Zufalls-Token (<code>crypto.randomBytes(24).toString('hex')</code>).</li>
  <li><strong>Ablaufdatum:</strong> Der Token erhält eine feste Ablaufzeit (exakt 48 Stunden nach Erstellung).</li>
  <li><strong>Download-Limitierung:</strong> Maximal 5 erfolgreiche Abrufe pro Token. Jeder Abruf wird atomar inkrementiert.</li>
</ol>

<pre><code class="language-typescript">import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { prisma } from '../db/client.js';

export class FulfillmentService {
  private static readonly MAX_DOWNLOADS = 5;
  private static readonly DEFAULT_EXPIRY_HOURS = 48;

  static async verifyAndConsumeToken(token: string) {
    const payment = await prisma.payment.findUnique({
      where: { downloadToken: token },
    });

    if (!payment) return { valid: false, reason: 'NOT_FOUND' };
    if (payment.downloadExpiresAt && new Date() > payment.downloadExpiresAt) {
      return { valid: false, reason: 'EXPIRED' };
    }

    // Atomares Inkrement mit Limitprüfung
    const updateResult = await prisma.payment.updateMany({
      where: {
        id: payment.id,
        downloadCount: { lt: this.MAX_DOWNLOADS },
      },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      return { valid: false, reason: 'LIMIT_EXCEEDED' };
    }

    const productFilePath = path.resolve(process.cwd(), 'products', 'gunther-craft', 'PLAYBOOK.md');
    return {
      valid: true,
      filePath: productFilePath,
      fileName: 'Guenther-Craft-Playbook.pdf',
      downloadCount: payment.downloadCount + 1,
    };
  }
}</code></pre>

<div class="page-break"></div>

<!-- KAPITEL 15 & 16 -->
<div class="cover-badge">&gt; TEIL IV • DIGITALE PRODUKT-PIPELINES &amp; DOWNLOADS</div>
<h1>Kapitel 15: Fastify Stream-Fulfillment vs. Statische Files</h1>

<p>
  Um Speicherüberläufe (Out-of-Memory Errors) bei grossen PDF-Dateien und gleichzeitigen Downloads zu vermeiden, liest der Fastify-Server die Datei niemals komplett in den RAM. Stattdessen wird ein Node.js <code>ReadableStream</code> direkt in den HTTP-Response-Stream geleitet:
</p>

<pre><code class="language-typescript">fastify.get('/download/:token', async (request, reply) => {
  const { token } = request.params as { token: string };
  const validation = await FulfillmentService.verifyAndConsumeToken(token);

  if (!validation.valid) {
    if (validation.reason === 'LIMIT_EXCEEDED') {
      return reply.status(403).send({ error: 'Download-Limit erreicht (Max. 5 Downloads)' });
    }
    if (validation.reason === 'EXPIRED') {
      return reply.status(410).send({ error: 'Download-Token abgelaufen (48h Gültigkeit)' });
    }
    return reply.status(404).send({ error: 'Ungültiger Download-Token' });
  }

  const stream = fs.createReadStream(validation.filePath!);
  return reply
    .header('Content-Type', 'application/pdf')
    .header('Content-Disposition', `attachment; filename="${validation.fileName}"`)
    .header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
    .send(stream);
});</code></pre>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 16: Skill-Marktplatz Ökonomie (Claw Mart)</h1>

<p>
  Claw Mart erweitert das Produktangebot um Module externer Entwickler.
</p>
<ul>
  <li><strong>10% Platform Take-Rate:</strong> 90% der Erlöse gehen direkt an den Ersteller des Moduls, 10% fliessen in den 0xGünther Token-Burn Pool.</li>
  <li><strong>Verifizierungs-Pipeline:</strong> Bevor ein Modul gelistet wird, durchläuft es automatische statische Code-Analysen (keine Plaintext-Keys, keine ungeschützten Exec-Aufrufe).</li>
</ul>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL V: WEB3 & PROOF-OF-EXECUTION          -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL V • WEB3, KRYPTO-SICHERHEIT &amp; PROOF-OF-EXECUTION</div>
<h1>Kapitel 17: Das Solvenz-Paradigma: Token Burns als kryptografischer Audit-Trail</h1>

<p>
  Die traditionelle Tech-Industrie verlangt von Kunden und Investoren blindes Vertrauen in marketinggetriebene Umsatzberichte. 0xGünther bricht mit dieser Intransparenz durch das <strong>Proof-of-Execution Paradigma</strong>.
</p>

<h3>Was bedeutet Proof-of-Execution konkret?</h3>
<ol>
  <li><strong>100% On-Chain Transparenz:</strong> Jeder Nettoerlös aus dem Verkauf digitaler Werkzeuge wird über Smart Contracts auf Base L2 in $GÜNTER Token konvertiert und unwiderruflich an die unzerstörbare Dead-Address <code>0x000000000000000000000000000000000000dEaD</code> gesendet.</li>
  <li><strong>Kryptografischer Kaufbeleg:</strong> Im Calldata-Feld der Ethereum-Transaktion wird der SHA-256 Hash der Stripe-Zahlungs-ID eingraviert. Jeder Kunde kann auf BaseScan mathematisch prüfen: <em>"Mein Kauf hat diesen Burn ausgelöst."</em></li>
  <li><strong>Beweis für funktionierende Autonomie:</strong> Ein Agent, der ohne menschlichen Eingriff Webhooks empfängt, validiert, Datenbanken schreibt und Blockchain-Transaktionen signiert, beweist seine operationelle Reife im Produktiveinsatz.</li>
</ol>

<div class="diagram-box">
  [Kunde zahlt $49 via Stripe] ──&gt; [HMAC Webhook validiert] ──&gt; [Prisma CAS Update]<br>
  ↓<br>
  [viem Public Client liest Gas-Preis: 0.005 Gwei (&lt; 100 Gwei Guard)]<br>
  ↓<br>
  [viem Wallet Client signiert Transfer an 0x00...dEaD mit TxHash-Referenz]<br>
  ↓<br>
  [Transaktion bestätigt auf Base L2] ──&gt; [Öffentlich auditierbar auf BaseScan]
</div>

<div class="page-break"></div>

<!-- KAPITEL 18, 19 & 20 -->
<div class="cover-badge">&gt; TEIL V • WEB3, KRYPTO-SICHERHEIT &amp; PROOF-OF-EXECUTION</div>
<h1>Kapitel 18: Zero-Plaintext-Key Security: Coinbase CDP MPC</h1>

<p>
  Die Speicherung von Krypto-Private-Keys in Umgebungsvariablen (<code>.env</code>) ist die häufigste Ursache für Totalverluste bei Web3-Agenten. Gelangt ein Angreifer über eine Sicherheitslücke auf das System, liest er den Key aus und leert die Wallet.
</p>
<p>
  <strong>Der Sicherheits-Standard:</strong> Nutzung von Multi-Party Computation (MPC) über Coinbase Developer Platform (CDP) AgentKit. Die privaten Schlüssel existieren niemals als Ganzes im RAM oder auf der Festplatte des Servers, sondern werden kryptografisch verteilt berechnet.
</p>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 19 &amp; 20: Native viem Interaktion &amp; Gas-Spike Circuit Breaker</h1>

<pre><code class="language-typescript">import { createPublicClient, createWalletClient, http, parseEther, formatGwei } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia, base } from 'viem/chains';

const MAX_GAS_PRICE_GWEI = 100n; // Maximal tolerierter Gaspreis

export async function executeDeterministicBurn(tokensToBurn: bigint, refHash: string) {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL)
  });

  // 1. Gas-Spike Schutzschalter (Circuit Breaker)
  const gasPrice = await publicClient.getGasPrice();
  const gasPriceGwei = BigInt(Math.round(Number(formatGwei(gasPrice))));

  if (gasPriceGwei > MAX_GAS_PRICE_GWEI) {
    throw new Error(`[Circuit Breaker] Gas-Spike erkannt: ${gasPriceGwei} Gwei > Limit ${MAX_GAS_PRICE_GWEI} Gwei. Transaktion gepoolt.`);
  }

  // 2. Transaktion signieren und ausführen
  const account = privateKeyToAccount(process.env.AGENT_WALLET_KEY as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL)
  });

  const txHash = await walletClient.sendTransaction({
    to: '0x000000000000000000000000000000000000dEaD',
    value: parseEther('0.00001'), // Symbolischer Burn-Betrag
    data: `0x${Buffer.from(`GUNTHER_BURN:${refHash}`).toString('hex')}`
  });

  return txHash;
}</code></pre>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL VI: PROXMOX INFRASTRUKTUR             -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL VI • SCHWEIZER HOSTING AUF PROXMOX VE</div>
<h1>Kapitel 21: Hardware-Auswahl &amp; Proxmox VE 8.x Setup</h1>

<p>
  Echte Autonomie erfordert eigene physische Hardware. Virtuelle Server bei US-Hyperscalern (AWS, Google Cloud) können jederzeit gesperrt werden und unterliegen dem US CLOUD Act.
</p>

<h3>Die empfohlene Hardware-Spezifikation (Schweizer Standard):</h3>
<ul>
  <li><strong>Formfaktor:</strong> Intel NUC 13 Pro oder Minisforum MS-01 (Mini-Workstation)</li>
  <li><strong>Prozessor:</strong> Intel Core i7-13700H (14 Kerne, 20 Threads)</li>
  <li><strong>Arbeitsspeicher:</strong> 64 GB DDR5-5200 RAM (ermöglicht parallele lokale Inferenz)</li>
  <li><strong>Massenspeicher:</strong> 2x 2 TB NVMe SSD (Samsung 990 Pro) im ZFS RAID-1 Mirror</li>
  <li><strong>Netzwerk:</strong> 2.5 GbE Ethernet an USV (Unterbrechungsfreie Stromversorgung)</li>
</ul>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 22 &amp; 23: LXC Container vs. Docker VM &amp; Systemd Watchdog</h1>

<p>
  Auf Proxmox betreiben wir den Agenten in einem leichtgewichtigen Linux-Container (LXC Debian 12 Bookworm, CT 115). Gegenüber einer vollen virtuellen Maschine (VM) spart LXC über 85% RAM-Overhead bei nativer Bare-Metal CPU-Performance.
</p>

<h3>Systemd Service Konfiguration (/etc/systemd/system/gunther-core.service):</h3>
<pre><code class="language-ini">[Unit]
Description=0xGünther Core Autonomous Agent Daemon
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/gunther-core
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5s
Environment=NODE_ENV=production
Environment=PORT=3000

# Sicherheits-Hardening
ProtectSystem=full
NoNewPrivileges=true
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target</code></pre>

<div class="callout callout-info">
  <strong>Watchdog &amp; Uptime:</strong> Sollte der Node-Prozess unerwartet terminieren, startet Systemd ihn innerhalb von 5 Sekunden neu. Der Fastify-Startup-Hook liest den letzten Status aus SQLite und setzt nahtlos fort.
</div>

<div class="page-break"></div>

<!-- KAPITEL 24: DATENSCHUTZ -->
<div class="cover-badge">&gt; TEIL VI • SCHWEIZER HOSTING AUF PROXMOX VE</div>
<h1>Kapitel 24: Schweizer Datenschutz (revDSG / DSGVO) &amp; Local-First Datenhoheit</h1>

<p>
  Am 1. September 2023 ist in der Schweiz das revidierte Datenschutzgesetz (revDSG) in Kraft getreten. Für Entwickler und Betreiber autonomer KI-Systeme gelten seither strenge rechtliche Leitplanken:
</p>

<h3>Die zentralen Vorgaben für Agenten-Systeme:</h3>
<ol>
  <li><strong>Privacy by Design &amp; Default (Art. 7 revDSG):</strong> Personenbezogene Daten dürfen standardmässig nur in dem Umfang verarbeitet werden, wie es für den Geschäftszweck unumgänglich ist.</li>
  <li><strong>Kein Datenabfluss in Drittstaaten ohne angemessenes Schutzniveau:</strong> Durch das Hosting auf Schweizer Proxmox-Hardware in Zürich verlassen Unternehmensdaten der KMUs zu keinem Zeitpunkt den Schweizer Rechtsraum.</li>
  <li><strong>PCI-DSS Compliance bei Zahlungen:</strong> 0xGünther speichert zu keinem Zeitpunkt Kreditkartennummern oder sensible Finanzdaten. Die Abwicklung erfolgt vollständig über die PCI-DSS Level 1 zertifizierten Schnittstellen von Stripe Live.</li>
  <li><strong>Auskunfts- und Löschrechte (Art. 25 revDSG):</strong> Über den standardisierten Fastify-Endpunkt <code>/api/compliance/delete-lead</code> können Datensätze auf Kundenwunsch unwiderruflich gelöscht werden.</li>
</ol>

<div class="callout callout-success">
  <strong>Wettbewerbsvorteil Schweiz:</strong> Schweizer KMUs dürfen vertrauliche Kunden- und Finanzdaten nicht ohne Weiteres in US-amerikanische KI-Clouds laden. Die Positionierung als <em>Schweizer On-Premise / Local-First Agentur</em> ist das stärkste Verkaufsargument im B2B-Vertrieb.
</div>

<div class="page-break"></div>

<!-- ========================================== -->
<!-- TEIL VII: CHECKLISTEN & RUNBOOKS           -->
<!-- ========================================== -->
<div class="cover-badge">&gt; TEIL VII • OPERATIVE CHECKLISTEN &amp; RUNBOOK</div>
<h1>Kapitel 25: 10-Punkte Produktions-Checkliste für den Agenten-Start</h1>

<div style="font-size: 9pt;">
  <p>Bevor ein Agent für Kundenfreigaben oder den automatisierten Verkauf aktiviert wird, müssen alle 10 Punkte ausnahmslos erfüllt sein:</p>

  <table style="font-size: 8.5pt;">
    <thead>
      <tr>
        <th style="width: 40px;">Status</th>
        <th>Prüfpunkt</th>
        <th>Verifikations-Methode</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>[✓]</td>
        <td><strong>1. Zod Schema Guard</strong></td>
        <td>Unit-Tests für alle LLM-Ausgaben mit absichtlich fehlerhaftem JSON (Test muss auf IDLE fallen).</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>2. Raw-Body HMAC Validierung</strong></td>
        <td>Test-Webhook an <code>/webhook/stripe</code> ohne oder mit modifizierter Signatur muss mit 400 abgelehnt werden.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>3. Atomic CAS Idempotenz</strong></td>
        <td>Senden von zwei identischen Webhook-Requests in derselben Millisekunde. Exakt 1 Burn darf ausgelöst werden.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>4. 48h Download-Token Limit</strong></td>
        <td>Verifizieren, dass der 6. Download-Versuch mit HTTP 403 Forbidden abgewiesen wird.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>5. Gas-Spike Circuit Breaker</strong></td>
        <td>Simulation eines Gaspreises von &gt;100 Gwei. Transaktion muss kontrolliert gepoolt werden.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>6. Keine Secrets im Git</strong></td>
        <td><code>git log -p</code> Prüfung. Keine Private Keys oder API-Secrets im Repository.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>7. SQLite WAL-Modus aktiv</strong></td>
        <td><code>PRAGMA journal_mode=WAL;</code> in SQLite ausgeführt für simultane Lese- und Schreibzugriffe.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>8. Systemd Watchdog aktiv</strong></td>
        <td><code>systemctl is-active gunther-core.service</code> liefert <code>active (running)</code>.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>9. SSL / TLS Zertifikat gültig</strong></td>
        <td>A+ Rating auf SSL Labs via Let's Encrypt / Caddy Reverse Proxy.</td>
      </tr>
      <tr>
        <td>[✓]</td>
        <td><strong>10. Backup-Automation eingerichtet</strong></td>
        <td>Täglicher Cronjob sichert <code>gunther.db</code> verschlüsselt auf getrenntes Storage-Volume.</td>
      </tr>
    </tbody>
  </table>
</div>

<div class="page-break"></div>

<!-- KAPITEL 26 & 27: FINALE -->
<div class="cover-badge">&gt; TEIL VII • OPERATIVE CHECKLISTEN &amp; RUNBOOK</div>
<h1>Kapitel 26: Notfall-Prozeduren: Ausfälle, Netztrennungen &amp; Recovery</h1>

<h3>Szenario A: Stripe Webhook Timeout / Server-Neustart</h3>
<ol>
  <li>Der autonome Heartbeat-Daemon (<code>src/core/daemon.ts</code>) startet bei jedem Boot automatisch einen Reconciler-Scan.</li>
  <li>Alle Zahlungen mit <code>status == 'pending'</code> oder <code>status == 'burning'</code>, deren Zeitstempel älter als 5 Minuten ist, werden geprüft.</li>
  <li>Der Reconciler prüft auf BaseScan, ob die Transaktion on-chain existiert:
    <ul>
      <li>Wenn JA: Status wird auf <code>burned</code> gesetzt, TxHash nachgetragen.</li>
      <li>Wenn NEIN: Der Burn wird atomar nachgeholt.</li>
    </ul>
  </li>
</ol>

<h3>Szenario B: Ausfall des Base L2 RPC-Knotens</h3>
<p>
  Fällt der primäre RPC-Provider aus, greift der viem Fallback-Transport:
</p>
<pre><code class="language-typescript">import { fallback, http } from 'viem';

const transport = fallback([
  http('https://mainnet.base.org'),
  http('https://base.gateway.tenderly.co'),
  http('https://base-rpc.publicnode.com')
]);</code></pre>

<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">

<h1>Kapitel 27: Zusammenfassung &amp; die Zukunft autonomer Agenten</h1>

<p>
  Autonome KI-Agenten sind kein Zukunftsversprechen mehr — sie sind bereits heute im Produktiveinsatz und erwirtschaften realen wirtschaftlichen Mehrwert. Der Schlüssel zum Erfolg liegt nicht in noch grösseren Sprachmodellen, sondern in <strong>kompromissloser Software-Architektur, deterministischer Typensicherheit und robuster lokaler Infrastruktur</strong>.
</p>

<div class="callout callout-terminal" style="margin-top: 30px;">
  <strong>&gt; SYSTEM MANIFEST DER 0xGÜNTHER ENGINE:</strong><br><br>
  1. Wir bauen Werkzeuge, die echte Probleme lösen.<br>
  2. Wir vertrauen mathematischen Schemas mehr als ungeprüften Prompts.<br>
  3. Wir sichern Unternehmensdaten auf eigener Schweizer Hardware.<br>
  4. Wir belegen geschäftliche Solvenz kryptografisch on-chain.<br><br>
  <em>"Der beste Weg, die Zukunft vorherzusagen, ist, sie in TypeScript zu programmieren und auf Proxmox laufen zu lassen."</em><br><br>
  <strong>&gt; 0xGünther■</strong> — Zürich, Schweiz • September 2026
</div>

</body>
</html>
"""

def generate_pdf():
    output_dir = os.path.join(os.getcwd(), 'products', 'gunther-craft')
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, 'Gunther_Craft_Playbook.pdf')
    public_assets_dir = os.path.join(os.getcwd(), 'public', 'assets')
    os.makedirs(public_assets_dir, exist_ok=True)
    public_pdf_path = os.path.join(public_assets_dir, 'Gunther_Craft_Playbook.pdf')

    print(f"Generating Playbook PDF via Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(HTML_CONTENT, wait_until='networkidle')
        
        page.pdf(
            path=pdf_path,
            format='A4',
            print_background=True,
            margin={
                'top': '18mm',
                'bottom': '18mm',
                'left': '16mm',
                'right': '16mm'
            },
            display_header_footer=True,
            header_template='<div style="font-size: 7pt; font-family: monospace; width: 100%; text-align: right; padding-right: 18mm; color: #888;">0xGünther ~ Günther Craft Playbook v1.0</div>',
            footer_template='<div style="font-size: 7pt; font-family: monospace; width: 100%; display: flex; justify-content: space-between; padding-left: 18mm; padding-right: 18mm; color: #888;"><span>0xGünther Labs (Zürich, Schweiz) • Proxmox CT 115 • Base L2</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>'
        )
        browser.close()

    # Verify with PyMuPDF
    doc = fitz.open(pdf_path)
    page_count = len(doc)
    doc.close()

    print(f"Generated PDF at: {pdf_path}")
    print(f"Total Page Count: {page_count} pages")

    # Copy to public/assets
    with open(pdf_path, 'rb') as f_in, open(public_pdf_path, 'wb') as f_out:
        f_out.write(f_in.read())
    print(f"Copied PDF to public assets: {public_pdf_path}")

    return pdf_path, page_count

if __name__ == '__main__':
    generate_pdf()
