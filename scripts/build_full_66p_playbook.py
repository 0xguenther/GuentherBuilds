"""
Full 66-Page Günther Craft Playbook Builder
Assembles pages 1-66 and compiles the publication-ready PDF.
"""

import os
import sys
import pymupdf
from playwright.sync_api import sync_playwright

from pages_part1 import get_pages_part1
from pages_part2 import get_pages_part2
from pages_part3 import get_pages_part3

PAGE_METADATA = [
    # Page 1 is cover
    ("COVER", "GÜNTHER CRAFT: Das 66-Seiten Playbook"),
    # Page 2 to 20
    ("RECHTLICHE HINWEISE", "Impressum, Urheberrecht & Systemanforderungen"),
    ("INHALTSVERZEICHNIS", "Inhaltsverzeichnis — Teil I & II"),
    ("INHALTSVERZEICHNIS", "Inhaltsverzeichnis — Teil III bis VIII"),
    ("VORWORT", "Die Wende zu autonomen Wertschöpfungs-Maschinen"),
    ("TEIL I: FUNDAMENTE", "Kapitel 1: Das Manifest des autonomen Unternehmers"),
    ("TEIL I: FUNDAMENTE", "Kapitel 2: Die Anatomie gescheiterter KI-Projekte"),
    ("TEIL I: FUNDAMENTE", "Kapitel 3: Das Schaufel-Prinzip im KI-Zeitalter"),
    ("TEIL I: FUNDAMENTE", "Kapitel 4: Die ReAct-Schleife im Produktiveinsatz"),
    ("TEIL I: FUNDAMENTE", "Kapitel 5: Deterministische State Machines"),
    ("TEIL I: FUNDAMENTE", "Kapitel 6: Strikte Schema-Validierung mit Zod (Theorie)"),
    ("TEIL I: FUNDAMENTE", "Kapitel 6: Typisierter ReAct-Router (Produktions-Code)"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 7: Der Tech-Stack: Node.js 22 LTS & TypeScript Strict"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 8: Fastify v5 als Enterprise-Webserver"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 9: Embedded Persistence: SQLite & Prisma WAL"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 10: Das Prisma Datenbank-Schema im Detail"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 11: Webhook Ingestion & das Raw-Body Problem"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 12: Gehärtetes Fastify Stripe Webhook Gateway"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 13: Replay-Attacken & Man-in-the-Middle Schutz"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 14: Atomic Compare-and-Swap (CAS) Idempotenz"),
    # Page 21 to 40
    ("TEIL II: ARCHITEKTUR", "Kapitel 15: CAS-Implementierung mit SQLite & Prisma"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 16: Hybrides LLM-Routing: Lokales Ollama vs. Cloud"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 17: Fallback-Routing & Resilienz bei API-Ausfällen"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 18: 24/7 Observability: Lokales Trace Logging in SQLite"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 19: Langfuse Tracing Integration & Budget-Kontrolle"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 20: Der autonome Heartbeat Daemon"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 21: Idempotente Reconciliation unvollständiger Zahlungen"),
    ("TEIL II: ARCHITEKTUR", "Kapitel 22: Daily Market Pulse & Autonome Updates"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 23: Clawcommerce: Das $2,000 Setup + $500/Mo Modell"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 24: Der automatisierte B2B Intake-Funnel"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 25: Autonome Generierung von Architektur-Dossiers"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 26: Stripe Checkout Integration für B2B-Verträge"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 27: Automatisiertes GitHub Repository Scaffolding"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 28: Enterprise-Integrationen: REST-APIs & ERP"),
    ("TEIL III: B2B ENTERPRISE", "Kapitel 29: SLA-Management & 99.9% Uptime für Schweizer KMUs"),
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 30: Schutz digitaler Werte vor Vervielfältigung"),
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 31: Kryptografische 48h Download-Token (Code)"),
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 32: Atomare Download-Zähler & Limit-Enforcement"),
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 33: Memory-Safe Streaming in Fastify"),
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 34: Claw Mart: Marktplatz-Architektur für KI-Skills"),
    # Page 41 to 66
    ("TEIL IV: DIGITALE GÜTER", "Kapitel 35: Verifizierung externer Skills & Sandboxing"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 36: Das Web3 Proof-of-Execution Paradigma"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 37: Warum Base L2? Kosten, Speed & Sicherheit"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 38: Gefahren von Plaintext-Keys auf Produktionsservern"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 39: Coinbase CDP Multi-Party Computation (MPC)"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 40: Native viem Integration für Base L2 (Code)"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 41: Calldata-Injektion: Verankerung von Zahlungs-Hashes"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 42: Gas-Spike Schutzschalter (<100 Gwei Ceiling)"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 43: Autonomes Social Media Marketing auf X (Twitter)"),
    ("TEIL V: WEB3 & SOLVENZ", "Kapitel 44: Idempotente Mention-Replies & Spam-Schutz"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 45: Bare-Metal Hosting: Warum Cloud-Server scheitern"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 46: Hardware-Spezifikation für den Dauerbetrieb"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 47: Proxmox VE 8.x: LXC Container vs. Docker VM"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 48: LXC-Container Konfiguration & Härtung"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 49: Systemd Service Daemon Konfiguration"),
    ("TEIL VI: PROXMOX HOSTING", "Kapitel 50: Reverse Proxy mit Caddy & SSL-Automation"),
    ("TEIL VII: RECHT & COMPLIANCE", "Kapitel 51: Schweizer Datenschutzrecht (revDSG) für Agenten"),
    ("TEIL VII: RECHT & COMPLIANCE", "Kapitel 52: EU-DSGVO Konformität bei internationalem Verkehr"),
    ("TEIL VII: RECHT & COMPLIANCE", "Kapitel 53: Schweizer UWG & Impressumspflichten (Art. 3)"),
    ("TEIL VII: RECHT & COMPLIANCE", "Kapitel 54: Datensparsamkeit & PCI-DSS Compliance"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Kapitel 55: 10-Punkte Produktions-Checkliste vor Go-Live"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Kapitel 56: Notfall-Prozeduren & Disaster Recovery"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Kapitel 57: Backup-Strategie für SQLite & Proxmox ZFS"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Kapitel 58: Zukunft autonomer Agenten-Netzwerke"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Anhang A: Referenz-Architekturplan & Netzwerk-Matrix"),
    ("TEIL VIII: RUNBOOKS & ANHANG", "Anhang B: Autoren-Notiz, System-Manifest & Lizenz")
]

def get_html_head():
    return """<!DOCTYPE html>
<html lang="de">
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
      <span class="font-mono" style="font-size: 6.8pt; color: #94a3b8;">DOKUMENT-ID: GCP-2026-P{page_num:02d}</span>
    </div>
    <h1>{title}</h1>
    {content_html}
  </div>
  <div class="page-footer">
    <span>CuonzTech (Zürich, Schweiz) • Proxmox CT 115 • Base L2</span>
    <span class="font-mono">Seite {page_num} von {total_pages}</span>
  </div>
</div>
"""

def generate_full_playbook():
    output_dir = os.path.join(os.getcwd(), 'products', 'gunther-craft')
    os.makedirs(output_dir, exist_ok=True)
    pdf_path = os.path.join(output_dir, 'Gunther_Craft_Playbook.pdf')
    public_assets_dir = os.path.join(os.getcwd(), 'public', 'assets')
    os.makedirs(public_assets_dir, exist_ok=True)
    public_pdf_path = os.path.join(public_assets_dir, 'Gunther_Craft_Playbook.pdf')

    print("Loading pages 1 to 66...")
    raw_pages = []
    raw_pages.extend(get_pages_part1()) # 1 to 20
    raw_pages.extend(get_pages_part2()) # 21 to 40
    raw_pages.extend(get_pages_part3()) # 41 to 66

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
            category, title = PAGE_METADATA[idx]
            wrapped = page_wrapper(page_num, total_pages, category, title, page_content)
            html += wrapped

    html += "</body></html>"

    temp_html_path = os.path.join(output_dir, 'full_playbook.html')
    with open(temp_html_path, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Wrote compiled HTML to: {temp_html_path}")

    print("Launching Chromium to render 66-page PDF...")
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

    print(f"PDF successfully rendered!")
    print(f"Location: {pdf_path}")
    print(f"Final Page Count: {final_count} pages")

    # Copy to public/assets
    with open(pdf_path, 'rb') as f_in, open(public_pdf_path, 'wb') as f_out:
        f_out.write(f_in.read())
    print(f"Copied to public assets: {public_pdf_path}")

    return pdf_path, final_count

if __name__ == '__main__':
    generate_full_playbook()
