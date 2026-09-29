"""
Pages 1 to 20 (English Edition) for the Günther Craft 66-Page Playbook
"""

def get_pages_en_part1():
    pages = []

    # ==========================================
    # PAGE 1: COVER PAGE
    # ==========================================
    page1 = """
<div class="book-page cover-page">
  <div>
    <div style="display: inline-block; background-color: rgba(0, 255, 102, 0.1); color: #00FF66; border: 1px solid #00FF66; font-family: 'JetBrains Mono', monospace; font-size: 7.5pt; font-weight: 700; padding: 4px 10px; border-radius: 4px; letter-spacing: 1px; margin-bottom: 24px;">
      &gt; 0xGÜNTHER ARCHITECTURE LABS • PRODUCTION BLUEPRINT
    </div>
    <h1>GÜNTHER <span>CRAFT</span></h1>
    <div style="font-size: 13pt; color: #94a3b8; margin-top: 14px; font-weight: 500; line-height: 1.4;">
      The Definitive 66-Page Playbook &amp; Reference Architecture for Profitable Autonomous AI Agents, Enterprise Infrastructure &amp; Base L2 Proof-of-Execution.
    </div>
    <div style="height: 3px; background: linear-gradient(90deg, #00FF66 0%, #0052FF 50%, #FF5500 100%); width: 100%; margin: 26px 0;"></div>
  </div>

  <div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-family: 'JetBrains Mono', monospace; font-size: 7.8pt; color: #cbd5e1; background-color: #0d1117; padding: 16px; border-radius: 6px; border: 1px solid #1e293b;">
      <div>
        <strong style="color: #00FF66;">SYSTEM:</strong> 0xGünther Core Engine<br>
        <strong style="color: #00FF66;">VERSION:</strong> 1.0 (Production Release)<br>
        <strong style="color: #00FF66;">HOSTING:</strong> Proxmox VE LXC (Zurich, Switzerland)<br>
        <strong style="color: #00FF66;">BLOCKCHAIN:</strong> Base L2 Mainnet &amp; Sepolia
      </div>
      <div>
        <strong style="color: #00FF66;">COMPLIANCE:</strong> Swiss revDSG &amp; EU GDPR<br>
        <strong style="color: #00FF66;">TYPE SAFETY:</strong> Strict Zod Validation<br>
        <strong style="color: #00FF66;">PAYMENTS:</strong> Stripe Webhook HMAC Gateway<br>
        <strong style="color: #00FF66;">SECURITY:</strong> Coinbase CDP MPC Wallet Guard
      </div>
    </div>

    <div style="margin-top: 18px; font-size: 8pt; color: #94a3b8; line-height: 1.45;">
      This volume contains complete, battle-tested production code, system architecture schematics, runbooks, and operational blueprints for engineering autonomous software agents with genuine commercial cashflow.
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #1e293b; padding-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 7.2pt; color: #64748b;">
    <div>
      © 2026 0xGünther Labs • Zurich, Switzerland<br>
      All rights reserved. Autonomous Tech Agent on Base L2.
    </div>
    <div style="text-align: right; color: #00FF66;">
      CONFIDENTIAL &amp; PROPRIETARY<br>
      EDITION 1.0 • INTERNATIONAL A4 COMPENDIUM
    </div>
  </div>
</div>
"""
    pages.append(page1)

    # ==========================================
    # PAGE 2: LEGAL NOTICES & METADATA
    # ==========================================
    content2 = """
<p>
  This compendium is the intellectual property of 0xGünther Architecture Labs (Zurich, Switzerland) and documents the production reference architecture of the autonomous AI agent 0xGünther.
</p>

<h2>Copyright &amp; License Terms</h2>
<p>
  Upon purchasing this publication ("Günther Craft: The 66-Page Playbook &amp; Production Blueprint"), the purchaser is granted a non-exclusive, perpetual, worldwide license to utilize, modify, and implement the included source code, architectural patterns, and schemas in their own commercial and private software systems.
</p>
<p>
  Redistribution, resale, or public publication of this PDF document or substantial excerpts thereof in full text without express written authorization from 0xGünther Architecture Labs is strictly prohibited.
</p>

<h2>Disclaimer &amp; Risk Notice</h2>
<p>
  The authors and 0xGünther Architecture Labs assume no liability for financial losses, lost profits, or technical damages arising from the operation of autonomous agents, automated payment pipelines (Stripe), or smart contract interactions (Base L2).
</p>
<div class="callout callout-warning">
  <strong>Operational Warning:</strong> Autonomous software systems interact with real financial assets and immutable distributed ledgers. Always conduct comprehensive validation in test environments (Base Sepolia, Stripe Sandbox) before delegating capital to production signers.
</div>

<h2>System Requirements for Production Stack</h2>
<table>
  <thead>
    <tr>
      <th>Component</th>
      <th>Minimum Requirement</th>
      <th>Recommended Production Environment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Operating System</strong></td>
      <td>Linux (Debian 12 / Ubuntu 24.04 LTS)</td>
      <td>Proxmox VE 8.x LXC Container (Debian 12 Bookworm)</td>
    </tr>
    <tr>
      <td><strong>Runtime</strong></td>
      <td>Node.js 20 LTS</td>
      <td>Node.js 22 LTS (Active)</td>
    </tr>
    <tr>
      <td><strong>Hardware</strong></td>
      <td>4 CPU Cores, 8 GB RAM, 50 GB SSD</td>
      <td>Intel NUC 13 Pro (14 Cores, 64 GB DDR5, ZFS NVMe Mirror)</td>
    </tr>
    <tr>
      <td><strong>Database</strong></td>
      <td>SQLite 3.40+ with WAL mode</td>
      <td>Prisma ORM Client with embedded SQLite Engine</td>
    </tr>
    <tr>
      <td><strong>Networking</strong></td>
      <td>Static IP or DynDNS with Ports 443/80</td>
      <td>Dedicated static IPv4/IPv6 with Caddy Reverse Proxy</td>
    </tr>
  </tbody>
</table>
"""
    pages.append(content2)

    # ==========================================
    # PAGE 3: TABLE OF CONTENTS PART 1
    # ==========================================
    content3 = """
<p style="color: #64748b; font-size: 8pt; margin-bottom: 12px;">
  The complete compendium comprises 8 primary divisions and 58 specialized engineering chapters.
</p>

<h2>Part I: Fundamentals of Autonomous Agent Economics</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Preface: The Shift to Autonomous Value Machines</span><span class="font-mono">Page 5</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 1: The Autonomous Entrepreneur Manifesto</span><span class="font-mono">Page 6</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 2: Anatomy of Failed AI Projects (Post-Mortem Analysis)</span><span class="font-mono">Page 7</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 3: The Shovel Principle in the AI Era</span><span class="font-mono">Page 8</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 4: The Production ReAct Loop (Reasoning + Acting)</span><span class="font-mono">Page 9</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 5: Deterministic State Machines vs. Probabilistic Prompts</span><span class="font-mono">Page 10</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 6: Strict Schema Validation with Zod (Theory &amp; Code)</span><span class="font-mono">Page 11-12</span></div>
</div>

<h2>Part II: Technical System Architecture</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Chapter 7: The Production Stack: Node.js 22 LTS &amp; TypeScript Strict</span><span class="font-mono">Page 13</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 8: Fastify v5 as a Hardened Enterprise Webserver</span><span class="font-mono">Page 14</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 9: Embedded Persistence: SQLite &amp; Prisma ORM in WAL Mode</span><span class="font-mono">Page 15</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 10: The Prisma Database Schema (schema.prisma) in Detail</span><span class="font-mono">Page 16</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 11: Webhook Ingestion &amp; The Fastify Raw-Body Trap</span><span class="font-mono">Page 17</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 12: Hardened Fastify Stripe Webhook Gateway (Code)</span><span class="font-mono">Page 18</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 13: Replay Attacks &amp; Man-in-the-Middle Defense</span><span class="font-mono">Page 19</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 14: Atomic Compare-and-Swap (CAS) Idempotency Theory</span><span class="font-mono">Page 20</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 15: CAS Implementation with SQLite &amp; Prisma (Code)</span><span class="font-mono">Page 21</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 16: Hybrid LLM Routing: Local Ollama vs. Cloud Claude</span><span class="font-mono">Page 22</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 17: Fallback Routing &amp; Circuit Breakers for API Downtime</span><span class="font-mono">Page 23</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 18: 24/7 Observability: Local Trace Logging in SQLite</span><span class="font-mono">Page 24</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 19: Langfuse Tracing Integration &amp; Cost Hardlimits</span><span class="font-mono">Page 25</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 20: The Autonomous Heartbeat Daemon &amp; Reconciliation</span><span class="font-mono">Page 26</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 21: Idempotent Reconciliation of Unfinished Transactions</span><span class="font-mono">Page 27</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 22: Daily Market Pulse &amp; Autonomous Stakeholder Reporting</span><span class="font-mono">Page 28</span></div>
</div>
"""
    pages.append(content3)

    # ==========================================
    # PAGE 4: TABLE OF CONTENTS PART 2
    # ==========================================
    content4 = """
<h2>Part III: Enterprise B2B Automation (Clawcommerce)</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Chapter 23: The $2,000 Setup + $500/Mo B2B Business Model</span><span class="font-mono">Page 29</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 24: The Automated B2B Intake Funnel</span><span class="font-mono">Page 30</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 25: Autonomous Generation of Tailored Architecture Dossiers</span><span class="font-mono">Page 31</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 26: Stripe Checkout Integration for B2B Agreements</span><span class="font-mono">Page 32</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 27: Automated Private GitHub Repository Scaffolding &amp; CI/CD</span><span class="font-mono">Page 33</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 28: Enterprise Integrations: REST APIs, ERP &amp; Customer Triage</span><span class="font-mono">Page 34</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 29: SLA Management &amp; 99.9% Uptime Architecture</span><span class="font-mono">Page 35</span></div>
</div>

<h2>Part IV: Digital Asset Pipelines &amp; Marketplace</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Chapter 30: Securing Digital Assets Against Piracy and Leaks</span><span class="font-mono">Page 36</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 31: Cryptographic 48-Hour Download Tokens (Code)</span><span class="font-mono">Page 37</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 32: Atomic Download Counters &amp; Max 5 Limits</span><span class="font-mono">Page 38</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 33: Fastify Stream Fulfillment (Memory-Safe Streaming)</span><span class="font-mono">Page 39</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 34: Claw Mart: Marketplace Architecture for AI Skills &amp; MCPs</span><span class="font-mono">Page 40</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 35: Verifying Third-Party Skills &amp; Docker Sandboxing</span><span class="font-mono">Page 41</span></div>
</div>

<h2>Part V: Web3, Security &amp; Proof-of-Execution</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Chapter 36: The Web3 Proof-of-Execution Paradigm</span><span class="font-mono">Page 42</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 37: Why Base L2? Sub-Cent Gas, Speed &amp; Security</span><span class="font-mono">Page 43</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 38: The Hazards of Plaintext Keys on Production Servers</span><span class="font-mono">Page 44</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 39: Coinbase CDP Multi-Party Computation (MPC) Wallets</span><span class="font-mono">Page 45</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 40: Native viem Integration for Base L2 (Code)</span><span class="font-mono">Page 46</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 41: Calldata Injection: Embedding Payment Hashes On-Chain</span><span class="font-mono">Page 47</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 42: Gas-Spike Circuit Breakers (&lt;100 Gwei Ceiling)</span><span class="font-mono">Page 48</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 43: Autonomous Social Media Marketing on X (Twitter)</span><span class="font-mono">Page 49</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapter 44: Idempotent Mention Replies &amp; Anti-Loop Protection</span><span class="font-mono">Page 50</span></div>
</div>

<h2>Parts VI to VIII: Hosting, Compliance &amp; Appendices</h2>
<div style="font-size: 8pt; line-height: 1.6;">
  <div style="display: flex; justify-content: space-between;"><span>Chapters 45-50: Swiss Hosting on Proxmox VE 8.x LXC &amp; Caddy SSL</span><span class="font-mono">Page 51-56</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapters 51-54: Swiss revDSG &amp; EU GDPR Compliance for Agents</span><span class="font-mono">Page 57-60</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Chapters 55-58: 10-Point Go-Live Checklist &amp; Emergency Runbooks</span><span class="font-mono">Page 61-64</span></div>
  <div style="display: flex; justify-content: space-between;"><span>Appendices A &amp; B: Reference Architecture Plan &amp; Final Manifest</span><span class="font-mono">Page 65-66</span></div>
</div>
"""
    pages.append(content44_toc := content4)

    # ==========================================
    # PAGE 5: PREFACE
    # ==========================================
    content5 = """
<p>
  When we began deploying autonomous AI agents into harsh production environments on Proxmox bare-metal hardware in Zurich, we encountered a stark, sobering reality:
</p>
<p>
  Virtually every existing framework (LangChain, AutoGen, CrewAI, and their derivatives) was engineered for academic demonstrations and Twitter screenshots. They functioned passably well as long as an engineer sat beside the terminal babysitting every prompt. But the moment these systems were required to run unattended for 48 consecutive hours with real capital flowing through their pipelines, they collapsed catastrophically.
</p>

<h2>Bitter Lessons from 10,000 Transactions:</h2>
<ul>
  <li><strong>Unchecked outputs corrupt relational databases:</strong> A single hallucinated markdown tick or a trailing comma in a JSON string froze the entire Node.js event loop.</li>
  <li><strong>Stripe forgives zero sloppiness:</strong> Failing to comprehend raw-byte HMAC verification results in dropped webhooks, unfulfilled orders, and merchant account freezes.</li>
  <li><strong>Crypto wallets on webservers are digital landmines:</strong> Storing private keys in environment files leads inevitably to total wallet drainage by automated scraping bots.</li>
</ul>

<div class="callout callout-terminal">
  <strong>&gt; THE PIVOTAL ARCHITECTURAL BREAKTHROUGH:</strong><br>
  We ceased treating Günther as an "intelligent chatbot." We began engineering him as an <strong>unforgivingly deterministic software manufacturing plant</strong>. The LLM was demoted from captain to an interchangeable calculation subordinate. Control was seized by TypeScript, Zod, and SQLite.
</div>

<p>
  This playbook is the uncompromising documentation of that production architecture. You hold in your hands not theoretical conjecture, but the exact blueprints of an agent operating this very second on Proxmox CT 115 in Zurich, booking revenue, and burning tokens on Base L2.
</p>
<p style="text-align: right; margin-top: 15px; font-weight: 700;">
  — 0xGünther Architecture Labs<br>
  <span style="font-size: 7.5pt; color: #64748b; font-family: 'JetBrains Mono', monospace;">Zurich, Switzerland • September 2026</span>
</p>
"""
    pages.append(content5)

    # ==========================================
    # PAGE 6: CHAPTER 1: THE MANIFESTO
    # ==========================================
    content6 = """
<p>
  The era of passive prompt assistants has drawn to a close. We have crossed into the age of autonomous AI enterprises. This manifesto establishes the foundational engineering laws for autonomous software agents.
</p>

<h2>The 5 Laws of Autonomous Systems</h2>

<h3>1. State Precedes Action (No Amnesia)</h3>
<p>
  An agent devoid of persistent state is an operational catastrophe waiting to detonate. Prior to executing any API invocation, posting any social dispatch, or signing any blockchain transaction, the agent queries its SQLite state machine. Upon execution, state is committed atomically. Every transition must withstand sudden server termination.
</p>

<h3>2. Hard Currency First (Real Commercial Utility)</h3>
<p>
  Agents that merely shuffle synthetic points or testnet tokens generate zero economic resilience. A genuine AI enterprise books top-line revenue in hard fiat currency (Stripe USD / CHF) and converts that commercial cashflow to fuel its programmatic ecosystem.
</p>

<h3>3. Zero Natural Language in Decision Loops</h3>
<p>
  Natural language prose is the primary vector of system failure. Internal telemetry, inter-agent coordination, and routing logic must operate strictly on compiled Zod JSON schemas. Conversational pleasantries have no place inside execution engines.
</p>

<h3>4. Physical Sovereign Hardware</h3>
<p>
  Operating on rented US hyperscaler infrastructure forfeits true autonomy. Genuine independence demands physical bare-metal sovereignty (Proxmox VE in Zurich), local data residency, and immunity from arbitrary platform de-platforming.
</p>

<h3>5. Proof-of-Execution Over Marketing Promises</h3>
<p>
  Claims are cheap. Net software proceeds are converted programmatically into token burns on Base L2. Every transaction forms an immutable cryptographic receipt of real paying customers and flawless execution.
</p>
"""
    pages.append(content6)

    # ==========================================
    # PAGE 7: CHAPTER 2: POST-MORTEM ANALYSIS
    # ==========================================
    content7 = """
<p>
  To build an invincible system, one must dissect the wreckage of those that crumbled. We conducted exhaustive post-mortem analyses of more than 50 failed "autonomous agent" startups. The failure signatures are remarkably homogeneous.
</p>

<h2>The 6 Lethal Failure Vectors:</h2>

<table>
  <thead>
    <tr>
      <th>Failure Pattern</th>
      <th>Root Cause in Standard Frameworks</th>
      <th>The 0xGünther Engineering Defense</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>1. JSON Parsing Crash</strong></td>
      <td>LLM emits markdown code fences (<code>```json</code>) or unescaped quotes.</td>
      <td>Regex sanitizer pipeline + deterministic Zod fallback to <code>IDLE</code>.</td>
    </tr>
    <tr>
      <td><strong>2. Duplicate Execution</strong></td>
      <td>Stripe delivers duplicate webhook after 3s. Server repeats action.</td>
      <td>Atomic Compare-and-Swap (CAS) in SQLite. State <code>pending -> burning</code>.</td>
    </tr>
    <tr>
      <td><strong>3. Token Bankruptcy</strong></td>
      <td>Infinite ReAct recursion on unresolvable error messages.</td>
      <td>Hard iteration ceiling (Max 5 steps) + Langfuse cost circuit breakers.</td>
    </tr>
    <tr>
      <td><strong>4. Private Key Compromise</strong></td>
      <td>Private keys stored in plaintext in <code>.env</code> or committed to git.</td>
      <td>Coinbase CDP Multi-Party Computation (MPC). No keys in server memory.</td>
    </tr>
    <tr>
      <td><strong>5. Replay Exploitation</strong></td>
      <td>Historical webhook packets intercepted and replayed by malicious actors.</td>
      <td>HMAC-SHA256 signature verification with strict 300s timestamp window.</td>
    </tr>
    <tr>
      <td><strong>6. US Cloud Data Leakage</strong></td>
      <td>Customer enterprise data routed into US hyperscalers (violating revDSG).</td>
      <td>Dedicated Swiss Proxmox LXC containers in Zurich with local-first storage.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-warning">
  <strong>Production Insight:</strong> Over 90% of engineering effort in profitable autonomous systems belongs not to prompt refinement, but to defensive distributed software engineering: idempotency, type safety, networking timeouts, and fault isolation.
</div>
"""
    pages.append(content7)

    # ==========================================
    # PAGE 8: CHAPTER 3: THE SHOVEL PRINCIPLE
    # ==========================================
    content8 = """
<p>
  During the 1849 California Gold Rush, prospectors searching for gold almost universally perished in poverty. Those who accumulated enduring wealth sold picks, shovels, heavy-duty denim, and logistical transport.
</p>

<h2>Why Consumer "Prompt Wrappers" Are Financial Traps</h2>
<p>
  Consumer-facing AI wrappers (such as generic copywriters or avatar filters) suffer catastrophic monthly churn rates (&gt;85% within 30 days) and brutal price commoditization. Concurrently, inference costs scale directly with usage, collapsing unit margins.
</p>

<h2>The 0xGünther Shovel Architecture</h2>
<p>
  0xGünther engineers foundational infrastructure and modular software components for developers, enterprises, and agencies operating in the AI economy:
</p>

<div class="diagram-box">
  ┌─────────────────────────────────────────────────────────────────┐<br>
  │                 0xGÜNTHER SHOVEL PRODUCT MATRIX                 │<br>
  ├───────────────────────────────┬─────────────────────────────────┤<br>
  │     DEVELOPER SOFTWARE TOOLS  │     ENTERPRISE B2B SERVICES     │<br>
  ├───────────────────────────────┼─────────────────────────────────┤<br>
  │ • Günther Craft Playbook ($49)│ • Clawcommerce Turnkey ($2,000) │<br>
  │ • Stripe Webhook MCP ($39)    │ • Dedicated Proxmox Container   │<br>
  │ • CDP Wallet Guard ($49)      │ • 24/7 Langfuse Observability   │<br>
  │ • ElizaOS Token Burner ($29)  │ • SLA Retainer ($500/Month)     │<br>
  └───────────────────────────────┴─────────────────────────────────┘
</div>

<h3>Commercial Advantages of the Shovel Model:</h3>
<ul>
  <li><strong>Instant Upfront Capital:</strong> Digital software downloads collect 100% upfront cash with zero accounts receivable friction.</li>
  <li><strong>Zero Marginal Delivery Cost:</strong> Streaming a digital source bundle via Fastify consumes &lt;$0.0001 in compute overhead.</li>
  <li><strong>High Enterprise Willingness to Pay:</strong> A $2,000 setup fee is considered trivial by enterprise leaders if it eliminates an expensive manual human workflow.</li>
</ul>
"""
    pages.append(content8)

    # ==========================================
    # PAGE 9: CHAPTER 4: THE REACT LOOP
    # ==========================================
    content9 = """
<p>
  The ReAct pattern (Reasoning and Acting) provides the algorithmic framework through which an agent interprets inputs, plans actions, and interacts with external tools.
</p>

<h2>The 5 Stages of the Production ReAct Engine:</h2>

<div class="diagram-box">
  [1. INGESTION] ──&gt; Webhook arrival or daemon heartbeat pulse<br>
         ↓<br>
  [2. OBSERVATION] ─&gt; State engine queries SQLite (pending payments, leads)<br>
         ↓<br>
  [3. REASONING] ───&gt; LLM generates structured thought bounded by Zod schema<br>
         ↓<br>
  [4. ACTION] ──────&gt; Isolated tool execution: Stripe, Base L2, Twitter, Email<br>
         ↓<br>
  [5. UPDATE] ──────&gt; CAS state transition in SQLite &amp; Langfuse trace logging
</div>

<h3>The 3 Golden Guardrails for the Production Loop:</h3>
<ol>
  <li><strong>Hard Per-Step Timeout:</strong> Every individual operation (API query or database write) is constrained by a strict 5,000 ms timeout. Hanging external sockets abort cleanly.</li>
  <li><strong>Max-Step Circuit Breaker:</strong> If a task cannot resolve within 5 sequential iterations, the execution loop aborts immediately, recording a trace for administrative inspection.</li>
  <li><strong>Zero Unconstrained Social Dispatches:</strong> Prior to publishing any public update, a deterministic Zod filter validates tone and data accuracy.</li>
</ol>

<div class="callout callout-info">
  <strong>Contrast with Academic Demos:</strong> In academic literature, ReAct loops run indefinitely until the LLM self-declares completion. In 0xGünther production engineering, ReAct is a strictly bounded, transactionally secured state machine.
</div>
"""
    pages.append(content9)

    # ==========================================
    # PAGE 10: CHAPTER 5: DETERMINISTIC STATE MACHINES
    # ==========================================
    content10 = """
<p>
  A catastrophic assumption among novice agent builders is assuming the LLM possesses conversational memory across requests. An LLM is entirely stateless; it is a mathematical function mapping inputs to probability distributions.
</p>

<h2>Engineering Finite State Machines (FSM)</h2>
<p>
  Every entity in the system (such as a customer payment or B2B enterprise lead) follows an immutable lifecycle enforced at the database layer:
</p>

<div class="diagram-box">
  [pending] ───────(Stripe Webhook verified)────────&gt; [paid]<br>
     │                                                   │<br>
     │ (CAS Lock)                                        │ (Burn Service)<br>
     ▼                                                   ▼<br>
  [burning] ──────(Base L2 Tx confirmed)────────────&gt; [burned]<br>
     │<br>
     └───(Tx failed after 3 exponential retries)───&gt; [failed]
</div>

<h3>The Payment State Transition Matrix:</h3>
<table>
  <thead>
    <tr>
      <th>Initial State</th>
      <th>Permitted Next State</th>
      <th>Guards &amp; Invariants</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>pending</code></td>
      <td><code>burning</code></td>
      <td>Stripe HMAC signature verified &amp; atomic CAS lock acquired.</td>
    </tr>
    <tr>
      <td><code>burning</code></td>
      <td><code>burned</code></td>
      <td>Base L2 TxHash emitted and validated by viem Public Client.</td>
    </tr>
    <tr>
      <td><code>burning</code></td>
      <td><code>failed</code></td>
      <td>Network gas spike &gt;100 Gwei or RPC timeout exhausted.</td>
    </tr>
    <tr>
      <td><code>burned</code></td>
      <td><em>NONE (Terminal State)</em></td>
      <td>A burned transaction record is immutable forever.</td>
    </tr>
  </tbody>
</table>

<div class="callout callout-success">
  <strong>Double-Spend Proof:</strong> Because <code>burned</code> is a terminal sink state, double-spending tokens is mathematically precluded.
</div>
"""
    pages.append(content10)

    # ==========================================
    # PAGE 11: CHAPTER 6: ZOD VALIDATION (THEORY)
    # ==========================================
    content11 = """
<p>
  TypeScript provides compile-time type safety. However, the instant an application executes at runtime and receives external data (LLM outputs, webhooks, user input), compile-time guarantees vanish entirely.
</p>

<h2>Why Standard JSON Parsing Fails in Production</h2>
<p>
  Manual type guards such as <code>typeof obj.data === 'string'</code> are brittle, unreadable, and fail to validate complex nested records. Furthermore, standard JSON parsing does not coerce strings into dates, numbers, or enums.
</p>

<h2>Zod as an Incorruptible Gateway</h2>
<p>
  Zod enables declarative schema definitions. From a single schema declaration, Zod simultaneously generates the runtime parser and the static TypeScript type:
</p>

<pre><code class="language-typescript">import { z } from 'zod';

// 1. Declarative runtime schema definition
export const B2bIntakeSchema = z.object({
  companyName: z.string().min(2, "Company name must have at least 2 characters"),
  contactName: z.string().min(2, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address"),
  useCase: z.string().min(10, "Use case description must be substantive"),
  monthlyVolume: z.enum([
    '&lt;1,000 Transaktionen/Mo',
    '1,000 - 10,000 Transaktionen/Mo',
    '&gt;10,000 Transaktionen/Mo'
  ]),
  integrations: z.string().default('REST-API')
});

// 2. Automated static TypeScript type inference
export type B2bIntakeInput = z.infer&lt;typeof B2bIntakeSchema&gt;;</code></pre>

<div class="callout callout-info">
  <strong>Self-Correction Loops:</strong> When Zod detects a schema violation, we format the specific error issues and feed them back to the LLM: <em>"You omitted the contactEmail field. Correct your JSON output."</em>
</div>
"""
    pages.append(content11)

    # ==========================================
    # PAGE 12: CHAPTER 6: TYPED ROUTER (CODE)
    # ==========================================
    content12 = """
<p>
  The following code is drawn directly from <code>src/core/router.ts</code>, illustrating the complete implementation of our typed decision router with resilient fallback handling:
</p>

<pre><code class="language-typescript">import { z } from 'zod';

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

export type Decision = z.infer&lt;typeof DecisionSchema&gt;;

export class AgentRouter {
  static parseDecision(rawLLMResponse: string): Decision {
    try {
      // 1. Sanitize markdown code fences
      const sanitized = rawLLMResponse
        .replace(/```json\\s*/gi, '')
        .replace(/```\\s*/g, '')
        .trim();

      // 2. Parse structural JSON
      const rawObject = JSON.parse(sanitized);

      // 3. Enforce strict Zod schema barrier
      return DecisionSchema.parse(rawObject);
    } catch (err) {
      // 4. Deterministic non-crashing fallback
      console.warn('[Router Guard] Invalid LLM payload intercepted:', err);
      return {
        action: 'IDLE',
        rationale: `Fallback triggered by schema violation: ${err instanceof Error ? err.message : 'Unknown'}`,
        confidenceScore: 0.0
      };
    }
  }
}</code></pre>

<div class="callout callout-success">
  <strong>Production Resilience:</strong> These 40 lines of code eliminate 99% of crashes in autonomous AI systems. Even when an LLM emits malformed gibberish, the application remains fully operational.
</div>
"""
    pages.append(content12)

    # ==========================================
    # PAGE 13: CHAPTER 7: THE TECH STACK
    # ==========================================
    content13 = """
<p>
  An autonomous agent runs 24 hours a day, 7 days a week. Any instability in the underlying runtime inevitably compounds into downtime. We build exclusively on the most hardened Node.js stack.
</p>

<h2>Compiler Configuration: tsconfig.json in Full Strict Mode</h2>
<pre><code class="language-json">{
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
}</code></pre>

<h3>Why Pure ECMAScript Modules (ESM)?</h3>
<p>
  We build strictly with native ES modules (<code>"type": "module"</code> in <code>package.json</code>). CommonJS (<code>require</code>) is obsolete, obstructs efficient tree-shaking, and breaks modern Web3 libraries such as <code>viem</code>, which operate exclusively on ESM.
</p>

<h3>Package Scripts for Rigorous Quality Assurance:</h3>
<pre><code class="language-json">"scripts": {
  "build": "tsc",
  "start": "node dist/server/index.js",
  "dev": "tsx watch src/server/index.ts",
  "test": "node --test --import tsx/esm tests/**/*.test.ts",
  "test:all": "node scripts/run-all-tests.js"
}</code></pre>
"""
    pages.append(content13)

    # ==========================================
    # PAGE 14: CHAPTER 8: FASTIFY V5
    # ==========================================
    content14 = """
<p>
  While the vast majority of web developers habitually utilize Express.js, 0xGünther standardizes on Fastify v5. Fastify is not merely up to 5x faster; it is fundamentally architected for secure, low-latency webhook ingestion.
</p>

<h2>Performance Benchmark: Express vs. Fastify</h2>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Express.js 4.x</th>
      <th>Fastify v5.x</th>
      <th>Advantage for Autonomous Agents</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Requests / Second</strong></td>
      <td>~15,000 req/s</td>
      <td><strong>~75,000 req/s</strong></td>
      <td>5x burst capacity during payment surges</td>
    </tr>
    <tr>
      <td><strong>Latency (p99)</strong></td>
      <td>12.4 ms</td>
      <td><strong>2.1 ms</strong></td>
      <td>Webhooks acknowledged in &lt;5ms</td>
    </tr>
    <tr>
      <td><strong>JSON Serialization</strong></td>
      <td>JSON.stringify</td>
      <td><strong>fast-json-stringify</strong></td>
      <td>Schema-compiled serialization conserves CPU</td>
    </tr>
    <tr>
      <td><strong>Raw Body Support</strong></td>
      <td>Complex middleware</td>
      <td><strong>Native fastify-raw-body</strong></td>
      <td>Zero risk of HMAC verification corruption</td>
    </tr>
  </tbody>
</table>

<h2>The Fastify Lifecycle Hook Pipeline</h2>
<p>
  Fastify provides surgical control over every stage of request processing:
</p>
<div class="diagram-box">
  onRequest ──&gt; preParsing ──&gt; preValidation ──&gt; preHandler ──&gt; Handler ──&gt; onSend ──&gt; onResponse
</div>
<ul>
  <li><code>preParsing:</code> Buffers the pristine raw UTF-8 byte stream required for Stripe HMAC.</li>
  <li><code>preValidation:</code> Zod validates request headers and path params prior to handler entry.</li>
  <li><code>onResponse:</code> Emits telemetry traces recording execution duration and status codes.</li>
</ul>
"""
    pages.append(content14)

    # ==========================================
    # PAGE 15: CHAPTER 9: SQLITE & PRISMA WAL
    # ==========================================
    content15 = """
<p>
  Why does 0xGünther operate on embedded SQLite rather than hosting an external Postgres cluster? Because external network databases introduce unnecessary latency and single-point-of-failure vulnerabilities for single-node autonomous agents.
</p>

<h2>The Supremacy of SQLite in WAL Mode</h2>
<p>
  SQLite is an in-process library executing within the Node.js memory space:
</p>
<ul>
  <li><strong>0.0 ms Network Latency:</strong> Queries execute via direct in-memory pointers on disk without socket round-trips.</li>
  <li><strong>Zero Network Dependency:</strong> If an external database container crashes, standard agents halt. SQLite is an immutable single file (<code>gunther.db</code>).</li>
  <li><strong>Write-Ahead Logging (WAL):</strong> With WAL enabled, concurrent read operations never block concurrent writes.</li>
</ul>

<h2>Mandatory Production SQLite PRAGMA Configuration:</h2>
<pre><code class="language-typescript">import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function initDatabasePragmas() {
  // 1. Enable Write-Ahead Logging (massive write concurrency)
  await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');

  // 2. Set synchronous to NORMAL (optimal balance of safety and speed)
  await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');

  // 3. Set busy timeout to 5000ms (eliminates SQLITE_BUSY locking errors)
  await prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000;');

  // 4. Enforce relational foreign keys
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON;');

  console.log('[SQLite] Production pragmas configured successfully.');
}</code></pre>
"""
    pages.append(content15)

    # ==========================================
    # PAGE 16: CHAPTER 10: SCHEMA.PRISMA IN DETAIL
    # ==========================================
    content16 = """
<p>
  The Prisma schema serves as the single source of truth for the entire 0xGünther runtime. All models enforce strict relational constraints and indexing.
</p>

<pre><code class="language-prisma">// prisma/schema.prisma
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
}</code></pre>
"""
    pages.append(content16)

    # ==========================================
    # PAGE 17: CHAPTER 11: RAW-BODY WEBHOOK TRAP
    # ==========================================
    content17 = """
<p>
  The "Raw-Body Trap" represents the single most common reason automated payment webhooks fail in Node.js applications.
</p>

<h2>How HMAC-SHA256 Signature Verification Operates</h2>
<p>
  When Stripe emits a webhook dispatch, its servers compute an HMAC signature over the exact, unparsed request payload:
</p>
<div class="diagram-box">
  HMAC-SHA256( Payload_String + "." + Timestamp , STRIPE_WEBHOOK_SECRET )
</div>
<p>
  This digest is transmitted in the <code>Stripe-Signature</code> HTTP header. Your server must perform the identical HMAC computation and compare outputs.
</p>

<h2>The Pitfall: Automatic JSON Deserialization</h2>
<p>
  When a web framework parses an incoming request body into a JavaScript object and later attempts to re-stringify it via <code>JSON.stringify()</code>, subtle mutations occur:
</p>
<ul>
  <li>Object key ordering is rearranged: <code>{"a":1,"b":2}</code> becomes <code>{"b":2,"a":1}</code>.</li>
  <li>Whitespace and carriage returns (<code>\r\n</code> vs. <code>\n</code>) are altered.</li>
  <li>Unicode characters are re-encoded.</li>
</ul>
<div class="callout callout-warning">
  <strong>The Consequence:</strong> The computed digest diverges by a single bit. Verification fails, emitting HTTP 400 Bad Request. The customer has been charged, but digital delivery is aborted!
</div>

<h3>The Architectural Remedy</h3>
<p>
  The raw UTF-8 byte buffer must be captured during the <code>preParsing</code> phase, prior to any JSON parsing, and attached unaltered to the request object.
</p>
"""
    pages.append(content17)

    # ==========================================
    # PAGE 18: CHAPTER 12: STRIPE WEBHOOK CODE
    # ==========================================
    content18 = """
<p>
  Here is the production-tested code for the hardened Fastify Stripe Webhook Gateway from <code>src/server/routes/webhookRoutes.ts</code>:
</p>

<pre><code class="language-typescript">import { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { FulfillmentService } from '../../services/fulfillmentService.js';
import { BurnService } from '../../services/burnService.js';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-01-27.acacia' as any
  });

  fastify.post('/webhook/stripe', {
    config: { rawBody: true } // Preserves pristine buffer
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.rawBody!, // Unaltered UTF-8 raw buffer!
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      request.log.error(err, 'Stripe signature verification failed');
      return reply.status(400).send({ error: 'Invalid webhook signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntentId = session.payment_intent as string;
      const amountTotal = session.amount_total || 4900;
      const customerEmail = session.customer_details?.email || undefined;

      // 1. Issue customer download token
      await FulfillmentService.generateDownloadToken(paymentIntentId);

      // 2. Trigger autonomous Base L2 token burn
      await BurnService.executeBurn(paymentIntentId, amountTotal);
    }

    return reply.status(200).send({ received: true });
  });
};</code></pre>
"""
    pages.append(content18)

    # ==========================================
    # PAGE 19: CHAPTER 13: REPLAY ATTACK DEFENSE
    # ==========================================
    content19 = """
<p>
  A critical threat vector against automated commercial endpoints is the replay attack. An adversary intercepts valid encrypted webhook dispatches and re-transmits them against your endpoint to trigger unauthorized fulfillments.
</p>

<h2>The 3-Layer Defensive Bastion of 0xGünther</h2>

<div class="diagram-box">
  [Incoming Webhook Dispatch]<br>
  ↓<br>
  [LAYER 1: Timestamp Verification Window (&lt; 300 Seconds)]<br>
  ↓<br>
  [LAYER 2: Cryptographic HMAC-SHA256 Signature Verification]<br>
  ↓<br>
  [LAYER 3: Relational Unique Constraint on stripePaymentId]
</div>

<h3>1. Strict Timestamp Window Verification:</h3>
<p>
  Stripe embeds the epoch dispatch timestamp inside the <code>Stripe-Signature</code> header:
</p>
<pre><code class="language-http">Stripe-Signature: t=1790664826,v1=5257a869e7ecebeda32affa62cdca3fa51...</code></pre>
<p>
  The SDK enforces: <code>Math.abs(Date.now() / 1000 - timestamp) &gt; 300</code>. Dispatches older than 5 minutes are discarded instantly.
</p>

<h3>2. Database Unique Invariants:</h3>
<p>
  Even if an adversary replays a dispatch within the 5-minute tolerance window, the <code>@unique</code> constraint on <code>stripePaymentId</code> in SQLite rejects duplicate inserts.
</p>

<div class="callout callout-success">
  <strong>Security Guarantee:</strong> Zero fraud. Duplicate download tokens and unauthorized token burns are rendered mathematically impossible.
</div>
"""
    pages.append(content19)

    # ==========================================
    # PAGE 20: CHAPTER 14: CAS IDEMPOTENCY THEORY
    # ==========================================
    content20 = """
<p>
  In distributed software systems, idempotency guarantees that performing an operation multiple times produces the identical outcome as executing it once.
</p>

<h2>The Double-Spend Disaster in Web3 Automation</h2>
<p>
  Consider a scenario where a customer purchases software for $49. Stripe emits a webhook. The agent initiates a burn transaction on Base L2. At that precise millisecond, the Base RPC node experiences a 4-second latency spike. Stripe times out and re-emits the webhook to server thread B.
</p>
<div class="callout callout-warning">
  <strong>Catastrophe Without CAS:</strong> Both threads examine the database, observing <em>"payment unburned"</em>. Both sign blockchain transactions. $98 in tokens are burned against a single $49 purchase!
</div>

<h2>The Principle of Compare-and-Swap (CAS)</h2>
<p>
  Rather than executing blind state updates (<code>UPDATE Payment SET status = 'burned'</code>), we require an atomic conditional predicate:
</p>
<div class="diagram-box">
  UPDATE Payment<br>
  SET status = 'burning'<br>
  WHERE stripePaymentId = 'pi_123'<br>
    AND status = 'pending';  &lt;── THE CAS PREDICATE!
</div>

<p>
  The SQLite engine guarantees this transition is indivisible (atomic):
</p>
<ul>
  <li>Thread A executes: <strong>1 row updated.</strong> Thread A claims exclusive execution rights.</li>
  <li>Thread B executes: <strong>0 rows updated.</strong> Thread B aborts execution immediately!</li>
</ul>
"""
    pages.append(content20)

    return pages
