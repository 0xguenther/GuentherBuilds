import { StripeMcpClient } from '../src/mcp/stripeMcp.js';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('====================================================');
  console.log('  INITIALISIERE STRIPE PRODUKT & PAYMENT LINK');
  console.log('====================================================\n');

  try {
    console.log('Erstelle Produkt "Günther Craft: 66-Seiten Playbook" via Stripe API...');
    const { productId, priceId, paymentLinkUrl } = await StripeMcpClient.createProductAndPaymentLink({
      name: 'Günther Craft: 66-Seiten Playbook für autonome KI-Agenten',
      description: 'Vollständiger Quellcode & Architektur-Schemas: ElizaOS, Prisma SQLite, CDP AgentKit (Base L2).',
      priceInCents: 4900, // $49.00
      currency: 'usd',
    });

    console.log(`✓ Produkt erfolgreich angelegt: ${productId}`);
    console.log(`✓ Preis erfolgreich angelegt:   ${priceId}`);
    console.log(`✓ Echter Payment Link generiert: ${paymentLinkUrl}\n`);

    // Aktualisiere public/index.html mit dem echten Link
    const indexPath = path.resolve(process.cwd(), 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');

    // Ersetze Alert-Button durch echten Link
    html = html.replace(
      /<button onclick="alert\([^)]+\)"([^>]*)>([\s\S]*?)<\/button>/,
      `<a href="${paymentLinkUrl}" target="_blank"$1>$2</a>`
    );

    // Ersetze Header-Button-Ziel
    html = html.replace(
      /<a href="#playbook" class="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-orange-900\/40">/,
      `<a href="${paymentLinkUrl}" target="_blank" class="bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shadow-lg shadow-orange-900/40">`
    );

    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log('✓ Landingpage (public/index.html) Buttons mit Stripe Payment Link verknüpft!');

    console.log('\n====================================================');
    console.log('  STRIPE SETUP ERFOLGREICH!');
    console.log(`  Live URL: ${paymentLinkUrl}`);
    console.log('====================================================');
  } catch (err: any) {
    console.error('Fehler bei der Initialisierung auf Stripe:', err.message || err);
    process.exit(1);
  }
}

main();
