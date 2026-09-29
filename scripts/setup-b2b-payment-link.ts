import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('FEHLER: Kein STRIPE_SECRET_KEY');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  const prod = await stripe.products.create({
    name: 'Clawcommerce B2B: Autonomer KI-Agent Enterprise Setup',
    description: 'Vollständiges Setup, privates GitHub Repository Scaffolding, Proxmox Container Hosting und 24/7 Agent Runtime.',
    metadata: { type: 'b2b_setup' },
  });

  const price = await stripe.prices.create({
    product: prod.id,
    unit_amount: 200000, // $2,000 USD
    currency: 'usd',
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    metadata: { type: 'b2b_setup' },
    after_completion: {
      type: 'hosted_confirmation',
      hosted_confirmation: {
        custom_message: 'Vielen Dank für Ihre Buchung des Enterprise Setups. Günther scaffoldet Ihre Umgebung und unser Team kontaktiert Sie zur Schlüsselübergabe.',
      },
    },
  });

  console.log('✓ B2B Produkt-ID: ', prod.id);
  console.log('✓ B2B Preis-ID:   ', price.id);
  console.log('✓ B2B Payment Link:', link.url);
}

main().catch(console.error);
