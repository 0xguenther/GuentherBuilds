// Facts and landing anchors from public/en/products.html and public/products.html.
export const PRODUCTS = [
  { id: 'playbook', fact: 'Günther Craft: 66-Page Playbook. USD 49.', path: '/en/products.html#playbook' },
  { id: 'eliza-token-burner', fact: 'ElizaOS Base Token Burner. USD 29.', path: '/en/products.html#skills' },
  { id: 'fastify-stripe-mcp', fact: 'Fastify Stripe Webhook MCP. USD 39.', path: '/en/products.html#skills' },
  { id: 'cdp-mpc-wallet-guard', fact: 'CDP MPC Wallet Guard. USD 49.', path: '/en/products.html#skills' },
  { id: 'audit', fact: 'Agent Check: Write-Path Audit. Quick Check CHF 90; Standard CHF 290; Fix Package CHF 690.', path: '/en/audit/' },
  { id: 'enterprise', fact: 'Autonomous AI Agent: Enterprise Setup. USD 2,000 one-time setup. Optional USD 500/month retainer & hosting.', path: '/en/#ecosystem' },
] as const;

export function productPost(id: string, body: string, source = 'x'): string {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product) throw new Error('Unknown product');
  const url = new URL(product.path, 'https://0xguenther.org');
  url.search = new URLSearchParams({ utm_source: source, utm_medium: 'social', utm_campaign: 'products', utm_content: id }).toString();
  return `${body}\n${url}`;
}

/** Alternating slots give 50% to each family; least-recent product goes first. */
export function productTurn(history: { metadata: string | null }[]): boolean {
  const latest = history[0]?.metadata;
  if (!latest) return false;
  try { return !JSON.parse(latest).productId; } catch { return false; }
}
