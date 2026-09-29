import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error('FEHLER: Kein STRIPE_SECRET_KEY gefunden.');
    process.exit(1);
  }

  const stripe = new Stripe(secretKey, {
    apiVersion: '2025-02-24.acacia' as any,
  });

  const skills = [
    {
      slug: 'eliza-token-burner',
      name: 'ElizaOS Base L2 Token Burner',
      description: 'Autonomer ElizaOS Action Plugin für mathematisch begrenzte $GÜNTER Burns auf Base L2.',
      amountCents: 2900,
    },
    {
      slug: 'fastify-stripe-mcp',
      name: 'Fastify Stripe Webhook MCP Gateway',
      description: 'Hardened Fastify Webhook Gateway mit Raw-Body HMAC-SHA256 Signaturprüfung und MCP-Tool-Anbindung.',
      amountCents: 3900,
    },
    {
      slug: 'cdp-mpc-wallet-guard',
      name: 'CDP MPC Wallet Guard for Agents',
      description: 'Zero-Plaintext-Key MPC Wallet Manager für autonome Agenten mit Gas-Spike-Schutzschalter.',
      amountCents: 4900,
    },
  ];

  console.log('--- Erstelle Live Stripe Payment Links für Claw Mart Skills ---');

  for (const s of skills) {
    const prod = await stripe.products.create({
      name: `[Claw Mart] ${s.name}`,
      description: s.description,
      metadata: { slug: s.slug, type: 'skill_purchase' },
    });

    const price = await stripe.prices.create({
      product: prod.id,
      unit_amount: s.amountCents,
      currency: 'usd',
    });

    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { slug: s.slug, type: 'skill_purchase' },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Vielen Dank für deinen Kauf bei Claw Mart. Dein Krypto-Download-Token wird automatisch freigeschaltet.',
        },
      },
    });

    console.log(`✓ ${s.name}:`);
    console.log(`  Produkt: ${prod.id}`);
    console.log(`  Preis:   ${price.id} ($${(s.amountCents / 100).toFixed(2)})`);
    console.log(`  Link:    ${link.url}\n`);
  }
}

main().catch(console.error);
