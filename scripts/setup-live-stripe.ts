import Stripe from 'stripe';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function main() {
  console.log('====================================================');
  console.log('  AUTOMATISCHES STRIPE LIVE-SETUP & PROVISIONING');
  console.log('====================================================\n');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('FEHLER: Kein STRIPE_SECRET_KEY in der Umgebung gefunden.');
    process.exit(1);
  }

  const isLive = secretKey.startsWith('sk_live_') || secretKey.startsWith('rk_live_');
  console.log(`Modus: ${isLive ? '🟢 LIVE-MODUS' : '🟡 TEST-MODUS (Sandbox)'}`);

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  try {
    // 1. Account Info prüfen
    const account = await stripe.accounts.retrieve();
    console.log(`✓ Verbunden mit Stripe Account: ${account.id} (${account.business_profile?.name || account.settings?.dashboard?.display_name || 'Aktiv'})`);
    console.log(`  Charges enabled: ${account.charges_enabled}, Payouts enabled: ${account.payouts_enabled}`);

    // 2. Flaggschiff Playbook Produkt & Payment Link anlegen
    console.log('\n[1/3] Erstelle/Prüfe Flaggschiff-Produkt ("Günther Craft Playbook")...');
    const playbookProduct = await stripe.products.create({
      name: 'Günther Craft: 66-Seiten Playbook für autonome KI-Agenten',
      description: 'Vollständiger Quellcode & Architektur-Schemas: ElizaOS, Prisma SQLite, Base L2 MPC Wallets.',
      metadata: { type: 'flagship_playbook', version: '1.0' },
    });

    const playbookPrice = await stripe.prices.create({
      product: playbookProduct.id,
      unit_amount: 4900, // $49.00 USD
      currency: 'usd',
    });

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{ price: playbookPrice.id, quantity: 1 }],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Vielen Dank für deinen Kauf. Dein Download-Token wird automatisch generiert und freigeschaltet.',
        },
      },
    });

    console.log(`✓ Playbook Produkt-ID: ${playbookProduct.id}`);
    console.log(`✓ Playbook Preis-ID:   ${playbookPrice.id}`);
    console.log(`✓ Neuer Payment Link:  ${paymentLink.url}`);

    // 3. Verlinke in public/index.html
    const indexPath = path.resolve(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      let html = fs.readFileSync(indexPath, 'utf-8');
      // Ersetze alte Payment-Links durch den neuen
      html = html.replace(/https:\/\/buy\.stripe\.com\/[a-zA-Z0-9_]+/g, paymentLink.url);
      fs.writeFileSync(indexPath, html, 'utf-8');
      console.log('✓ public/index.html mit dem neuen Payment Link aktualisiert!');
    }

    // 4. Webhook Endpoint automatisch anlegen (falls Domain konfiguriert)
    const domain = process.env.PUBLIC_DOMAIN || 'https://0xguenther.org';
    const webhookUrl = `${domain}/webhooks/stripe`;
    console.log(`\n[2/3] Konfiguriere Webhook Endpoint (${webhookUrl})...`);

    try {
      const webhookEndpoint = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: [
          'checkout.session.completed',
          'payment_intent.succeeded',
          'charge.refunded',
        ],
        description: 'Günther Core Autonomous Webhook Listener',
      });
      console.log(`✓ Webhook Endpoint erfolgreich angelegt: ${webhookEndpoint.id}`);
      console.log(`✓ Neuer Webhook Secret (whsec): ${webhookEndpoint.secret}`);
      console.log('  -> Bitte diesen Secret in KeePass und .env hinterlegen!');
    } catch (whErr: any) {
      console.warn(`  Webhook-Registrierung übersprungen/fehlgeschlagen: ${whErr.message}`);
    }

    console.log('\n====================================================');
    console.log('🎉 STRIPE INITIALISIERUNG VOLLSTÄNDIG ABGESCHLOSSEN!');
    console.log(`Payment Link: ${paymentLink.url}`);
    console.log('====================================================');
  } catch (err: any) {
    console.error('Fehler bei der Stripe API Konfiguration:', err.message || err);
    process.exit(1);
  }
}

main();
