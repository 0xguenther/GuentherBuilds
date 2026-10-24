// Facts and landing anchors from public/en/products.html and public/products.html.
export const PRODUCTS = [
  { id: 'playbook', fact: 'Günther Craft: 66-Page Playbook on deterministic agent architecture and atomic CAS. USD 49.', path: '/en/products.html#playbook' },
  { id: 'eliza-token-burner', fact: 'ElizaOS Base Token Burner with calldata audit trail. USD 29.', path: '/en/products.html#skills' },
  { id: 'fastify-stripe-mcp', fact: 'Fastify Stripe Webhook MCP with atomic CAS & replay protection. USD 39.', path: '/en/products.html#skills' },
  { id: 'cdp-mpc-wallet-guard', fact: 'CDP MPC Wallet Guard for secure agentic transactions. USD 49.', path: '/en/products.html#skills' },
  { id: 'agent-trace-pack', fact: 'Agent Trace Pack: observability schema, checklist and queries for agent tool-call reliability. USD 39.', path: '/en/products.html#skills' },
  { id: 'audit', fact: 'Agent Write-Path Check: Test your agent against 10 failure modes (C01-C10) before it duplicates invoices. Quick $90, Standard $290, Fix $690.', path: '/en/audit/' },
  { id: 'enterprise', fact: 'Autonomous AI Agent: Enterprise Setup & On-Premise Integration. USD 2,000.', path: '/en/#ecosystem' },
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

/**
 * Demand-weighted product order: ids that cover the hottest market needs come first.
 * `preference` is typically MarketDemandService.preferredProductOrder(); empty = catalog order.
 */
export function orderedProducts(preference: readonly string[] | string[]): typeof PRODUCTS[number][] {
  const rank = new Map(preference.map((id, i) => [id, i]));
  return [...PRODUCTS].sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));
}
