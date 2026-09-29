"""
Full 66-Page Günther Craft Playbook Builder (English Edition)
Assembles pages 1-66 in English and compiles the publication-ready PDF.
"""

import os
import sys
import pymupdf
from playwright.sync_api import sync_playwright

from pages_en_part1 import get_pages_en_part1
from pages_en_part2 import get_pages_en_part2
from pages_en_part3 import get_pages_en_part3

PAGE_METADATA_EN = [
    # Page 1 is cover
    ("COVER", "GÜNTHER CRAFT: The 66-Page Production Playbook"),
    # Page 2 to 20
    ("LEGAL NOTICE", "Imprint, Copyright & System Specifications"),
    ("TABLE OF CONTENTS", "Table of Contents — Parts I & II"),
    ("TABLE OF CONTENTS", "Table of Contents — Parts III to VIII"),
    ("FOREWORD", "The Paradigm Shift Towards Autonomous Value Engines"),
    ("PART I: FOUNDATIONS", "Chapter 1: The Autonomous Operator Manifesto"),
    ("PART I: FOUNDATIONS", "Chapter 2: The Anatomy of Failed AI Projects"),
    ("PART I: FOUNDATIONS", "Chapter 3: The Shovel Principle in the AI Economy"),
    ("PART I: FOUNDATIONS", "Chapter 4: The ReAct Loop in Production Operations"),
    ("PART I: FOUNDATIONS", "Chapter 5: Deterministic State Machines"),
    ("PART I: FOUNDATIONS", "Chapter 6: Strict Schema Validation with Zod (Theory)"),
    ("PART I: FOUNDATIONS", "Chapter 6: Typed ReAct Router (Production Code)"),
    ("PART II: ARCHITECTURE", "Chapter 7: Tech Stack: Node.js 22 LTS & Strict TypeScript"),
    ("PART II: ARCHITECTURE", "Chapter 8: Fastify v5 as High-Throughput Gateway"),
    ("PART II: ARCHITECTURE", "Chapter 9: Embedded Persistence: SQLite & Prisma WAL"),
    ("PART II: ARCHITECTURE", "Chapter 10: The Prisma Database Schema in Detail"),
    ("PART II: ARCHITECTURE", "Chapter 11: Webhook Ingestion & Raw Body Verification"),
    ("PART II: ARCHITECTURE", "Chapter 12: Hardened Fastify Stripe Webhook Gateway"),
    ("PART II: ARCHITECTURE", "Chapter 13: Replay Attacks & Man-in-the-Middle Defense"),
    ("PART II: ARCHITECTURE", "Chapter 14: Atomic Compare-and-Swap (CAS) Idempotency"),
    # Page 21 to 40
    ("PART II: ARCHITECTURE", "Chapter 15: CAS Implementation with SQLite & Prisma"),
    ("PART II: ARCHITECTURE", "Chapter 16: Hybrid LLM Routing: Local Ollama vs. Cloud API"),
    ("PART II: ARCHITECTURE", "Chapter 17: Fallback Routing & Resilience under Outages"),
    ("PART II: ARCHITECTURE", "Chapter 18: 24/7 Observability: Local Trace Logging in SQLite"),
    ("PART II: ARCHITECTURE", "Chapter 19: Langfuse Tracing Integration & Cost Control"),
    ("PART II: ARCHITECTURE", "Chapter 20: The Autonomous Heartbeat Daemon"),
    ("PART II: ARCHITECTURE", "Chapter 21: Idempotent Payment Reconciliation Pipeline"),
    ("PART II: ARCHITECTURE", "Chapter 22: Daily Market Pulse & Autonomous Updates"),
    ("PART III: B2B ENTERPRISE", "Chapter 23: Clawcommerce: The $2,000 Setup + $500/Mo Model"),
    ("PART III: B2B ENTERPRISE", "Chapter 24: The Automated B2B Intake Funnel"),
    ("PART III: B2B ENTERPRISE", "Chapter 25: Autonomous Generation of Architecture Dossiers"),
    ("PART III: B2B ENTERPRISE", "Chapter 26: Stripe Checkout Integration for B2B Retainers"),
    ("PART III: B2B ENTERPRISE", "Chapter 27: Automated GitHub Repository Scaffolding"),
    ("PART III: B2B ENTERPRISE", "Chapter 28: Enterprise Integrations: REST APIs & ERP"),
    ("PART III: B2B ENTERPRISE", "Chapter 29: SLA Management & 99.9% Uptime for Enterprises"),
    ("PART IV: DIGITAL GOODS", "Chapter 30: Protecting Digital Assets from Unauthorized Duplication"),
    ("PART IV: DIGITAL GOODS", "Chapter 31: Cryptographic 48h Download Tokens (Code)"),
    ("PART IV: DIGITAL GOODS", "Chapter 32: Atomic Download Counters & Limit Enforcement"),
    ("PART IV: DIGITAL GOODS", "Chapter 33: Memory-Safe Streaming in Fastify"),
    ("PART IV: DIGITAL GOODS", "Chapter 34: Claw Mart: Marketplace Architecture for AI Skills"),
    # Page 41 to 66
    ("PART IV: DIGITAL GOODS", "Chapter 35: External Skill Verification & Sandboxing"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 36: The Web3 Proof-of-Execution Paradigm"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 37: Why Base L2? Fees, Finality & Security"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 38: Risks of Plaintext Private Keys in Production"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 39: Coinbase CDP Multi-Party Computation (MPC)"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 40: Native viem Integration for Base L2 (Code)"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 41: Calldata Injection: Anchoring Payment Hashes"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 42: Gas-Spike Circuit Breaker (<100 Gwei Ceiling)"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 43: Autonomous Social Media Marketing on X"),
    ("PART V: WEB3 & SOLVENCY", "Chapter 44: Idempotent Mention Replies & Anti-Spam Guardrails"),
    ("PART VI: PROXMOX HOSTING", "Chapter 45: Bare-Metal Hosting: Why Cloud VMs Fall Short"),
    ("PART VI: PROXMOX HOSTING", "Chapter 46: Hardware Specifications for 24/7 Production"),
    ("PART VI: PROXMOX HOSTING", "Chapter 47: Proxmox VE 8.x: LXC Containers vs. Docker VMs"),
    ("PART VI: PROXMOX HOSTING", "Chapter 48: LXC Container Configuration & Hardening"),
    ("PART VI: PROXMOX HOSTING", "Chapter 49: Systemd Service Daemon Configuration"),
    ("PART VI: PROXMOX HOSTING", "Chapter 50: Reverse Proxy with Caddy & Automated SSL"),
    ("PART VII: LEGAL & COMPLIANCE", "Chapter 51: Swiss Data Protection (revDSG) for Autonomous Agents"),
    ("PART VII: LEGAL & COMPLIANCE", "Chapter 52: EU-GDPR Compliance for Cross-Border Operations"),
    ("PART VII: LEGAL & COMPLIANCE", "Chapter 53: Swiss Fair Trading Law & Imprint Obligations (Art. 3)"),
    ("PART VII: LEGAL & COMPLIANCE", "Chapter 54: Data Minimization & PCI-DSS Compliance"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Chapter 55: 10-Point Pre-Flight Production Checklist"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Chapter 56: Emergency Runbooks & Disaster Recovery"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Chapter 57: Backup Strategy for SQLite & Proxmox ZFS"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Chapter 58: The Future of Autonomous Agent Networks"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Appendix A: Reference Architecture Diagram & Network Matrix"),
    ("PART VIII: RUNBOOKS & APPENDIX", "Appendix B: Author Note, System Manifesto & License")
]

def get_html_head():
    return """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  @page {
    size: A4;
    margin: 0;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 8.8pt;
    line-height: 1.5;
    color: #1e293b;
    background-color: #f1f5f9;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .book-page {
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    padding: 18mm 18mm 18mm 18mm;
    page-break-after: always;
    break-after: page;
    background-color: #ffffff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    position: relative;
  }

  /* Page Header & Footer */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 8px;
    margin-bottom: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7pt;
    color: #64748b;
  }

  .page-header .brand {
    font-weight: 700;
    color: #0f172a;
  }

  .page-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7pt;
    color: #64748b;
  }

  .page-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  /* Typography */
  h1, h2, h3, h4 {
    color: #0f172a;
    font-weight: 800;
    line-height: 1.25;
    margin-top: 0;
    margin-bottom: 8px;
  }

  h1 {
    font-size: 14.5pt;
    border-bottom: 2px solid #00FF66;
    padding-bottom: 4px;
    letter-spacing: -0.3px;
  }

  h2 {
    font-size: 11pt;
    color: #0f172a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 3px;
    margin-top: 10px;
    margin-bottom: 6px;
  }

  h3 {
    font-size: 9.5pt;
    color: #1e293b;
    margin-top: 8px;
    margin-bottom: 4px;
  }

  p {
    margin: 0 0 8px 0;
    text-align: justify;
  }

  ul, ol {
    margin: 0 0 8px 0;
    padding-left: 18px;
  }

  li {
    margin-bottom: 3px;
  }

  code, pre, .font-mono {
    font-family: 'JetBrains Mono', monospace;
  }

  code {
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 7.8pt;
    border: 1px solid #e2e8f0;
  }

  pre {
    background-color: #05070B;
    color: #f8fafc;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 7.2pt;
    line-height: 1.38;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-all;
    border: 1px solid #1e293b;
    margin: 6px 0;
  }

  pre code {
    background-color: transparent;
    color: inherit;
    padding: 0;
    border: none;
    font-size: inherit;
  }

  .callout {
    border-left: 3.5px solid;
    padding: 7px 11px;
    margin: 6px 0;
    border-radius: 0 5px 5px 0;
    font-size: 8pt;
  }

  .callout-info { border-color: #0284c7; background-color: #f0f9ff; color: #0369a1; }
  .callout-success { border-color: #10b981; background-color: #f0fdf4; color: #047857; }
  .callout-warning { border-color: #f59e0b; background-color: #fffbeb; color: #b45309; }
  .callout-terminal {
    border-color: #00FF66;
    background-color: #05070B;
    color: #e2e8f0;
    border-radius: 5px;
    border: 1px solid #00FF66;
    padding: 8px 12px;
  }
  .callout-terminal strong { color: #00FF66; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0;
    font-size: 7.8pt;
  }

  th, td {
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    text-align: left;
  }

  th {
    background-color: #0f172a;
    color: #ffffff;
    font-weight: 700;
  }

  tr:nth-child(even) { background-color: #f8fafc; }

  .badge-tag {
    display: inline-block;
    padding: 1px 6px;
    font-size: 6.8pt;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .tag-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .tag-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .tag-purple { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .tag-orange { background: #ffedd5; color: #c2410c; border: 1px solid #fed7aa; }

  .diagram-box {
    background-color: #090d16;
    color: #e2e8f0;
    border: 1px solid #1e293b;
    border-radius: 5px;
    padding: 10px 14px;
    margin: 6px 0;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.2pt;
    line-height: 1.4;
  }

  /* Cover styling */
  .cover-page {
    background-color: #05070B;
    color: #ffffff;
    padding: 24mm 20mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .cover-page h1 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 34pt;
    font-weight: 900;
    color: #ffffff;
    border: none;
    padding: 0;
    line-height: 1.05;
  }

  .cover-page h1 span { color: #00FF66; }
</style>
</head>
<body>
"""

def page_wrapper(page_num, total_pages, category, title, content_html):
    return f"""
<div class="book-page">
  <div class="page-header">
    <span class="brand">&gt; 0xGünther■ — GÜNTHER CRAFT PLAYBOOK</span>
    <span>{category}</span>
  </div>
  <div class="page-content">
    <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
      <span class="badge-tag tag-green">{category}</span>
      <span class="font-mono" style="font-size: 6.8pt; color: #94a3b8;">DOCUMENT-ID: GCP-2026-EN-P{page_num:02d}</span>
    </div>
    <h1>{title}</h1>
    {content_html}
  </div>
  <div class="page-footer">
    <span>0xGünther Labs (Zurich, Switzerland) • Proxmox CT 115 • Base L2</span>
    <span class="font-mono">Page {page_num} of {total_pages}</span>
  </div>
</div>
"""

def generate_full_playbook_en():
    output_dir = os.path.join(os.getcwd(), 'products', 'gunther-craft')
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, 'Gunther_Craft_Playbook_EN.pdf')
    public_assets_dir = os.path.join(os.getcwd(), 'public', 'assets')
    os.makedirs(public_assets_dir, exist_ok=True)
    public_pdf_path = os.path.join(public_assets_dir, 'Gunther_Craft_Playbook_EN.pdf')

    print("Loading English pages 1 to 66...")
    raw_pages = []
    raw_pages.extend(get_pages_en_part1()) # 1 to 20
    raw_pages.extend(get_pages_en_part2()) # 21 to 40
    raw_pages.extend(get_pages_en_part3()) # 41 to 66

    total_pages = len(raw_pages)
    print(f"Total raw page templates loaded: {total_pages}")
    assert total_pages == 66, f"Expected exactly 66 pages, got {total_pages}"

    # Assemble complete HTML
    html = get_html_head()

    for idx, page_content in enumerate(raw_pages):
        page_num = idx + 1
        if page_num == 1:
            # Page 1 is the cover page (already has .cover-page class)
            html += page_content
        else:
            category, title = PAGE_METADATA_EN[idx]
            wrapped = page_wrapper(page_num, total_pages, category, title, page_content)
            html += wrapped

    html += "</body></html>"

    temp_html_path = os.path.join(output_dir, 'full_playbook_en.html')
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Wrote compiled HTML to: {temp_html_path}")

    print("Launching Chromium to render English 66-page PDF...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_content(html, wait_until='networkidle')
        
        page.pdf(
            path=pdf_path,
            format='A4',
            print_background=True,
            margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'}
        )
        browser.close()

    doc = pymupdf.open(pdf_path)
    final_count = len(doc)
    doc.close()

    print(f"English PDF successfully rendered!")
    print(f"Location: {pdf_path}")
    print(f"Final Page Count: {final_count} pages")

    # Copy to public/assets
    with open(pdf_path, 'rb') as f_in, open(public_pdf_path, 'wb') as f_out:
        f_out.write(f_in.read())
    print(f"Copied to public assets: {public_pdf_path}")

    return pdf_path, final_count

if __name__ == '__main__':
    generate_full_playbook_en()
