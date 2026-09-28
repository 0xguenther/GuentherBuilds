---
name: deploy-digital-product
description: Use this skill to package a new product, generate a Stripe payment link via MCP, and deploy via Vercel.
---

# Deploy Digital Product

## Purpose
Automatisiert den Launch eines neuen Info-Produkts von der Asset-Erstellung bis zum Live-Gang der Landingpage.

## When to Use
Wenn Günther entscheidet, ein neues Playbook oder Template im "Claw Mart" oder als Standalone-Produkt zu veröffentlichen.

## Workflow
1. **Asset Finalisierung:** Prüfe die Markdown/PDF-Datei im `products/` Ordner.
2. **Stripe Integration (MCP):** Rufe den Stripe-MCP-Server auf, um ein Produkt und einen Payment-Link zu erstellen. Konfiguriere den Webhook.
3. **Frontend Generierung:** Generiere eine kompakte HTML/Tailwind-Landingpage via Claude 3.5 Sonnet.
4. **Vercel Deployment (MCP):** Committe ins GitHub Repo und triggere das Vercel Deployment via Vercel-MCP.

## Rules
- Landingpages müssen Mobile-First und extrem schnell sein.
- Der Stripe-Link muss zwingend auf den korrekten Webhook verweisen.
- Logge den gesamten Workflow in Langfuse zur Qualitätskontrolle.

## Do Not Do
- Gehe nicht live ohne einen Test-Purchase-Check via Stripe Testmode.