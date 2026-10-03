import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuditOrderService, AUDIT_TIERS } from '../../services/auditOrderService.js';

const OrderSchema = z.object({
  tier: z.enum(Object.keys(AUDIT_TIERS) as [string, ...string[]]),
  tools: z.array(z.record(z.unknown())).min(1).max(50),
  buyerEmail: z.string().email().optional(),
});

export async function auditRoutes(fastify: FastifyInstance) {
  // Bestellannahme: validiert die Konfiguration und liefert den Checkout-Link.
  fastify.post('/api/audit/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = OrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Ungültige Bestellung', details: parsed.error.issues.slice(0, 5) });
    }
    try {
      const result = await AuditOrderService.create({
        tier: parsed.data.tier as keyof typeof AUDIT_TIERS,
        tools: parsed.data.tools,
        buyerEmail: parsed.data.buyerEmail,
      });
      return reply.status(201).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      fastify.log.error(`[Audit] Bestellung fehlgeschlagen: ${message}`);
      return reply.status(500).send({ error: 'Bestellung konnte nicht angelegt werden' });
    }
  });

  // Status einer Bestellung. Gibt keine Konfiguration zurück.
  fastify.get('/api/audit/orders/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const order = await AuditOrderService.get(request.params.id);
    if (!order) return reply.status(404).send({ error: 'Bestellung nicht gefunden' });
    return reply.send({ id: order.id, tier: order.tier, status: order.status, createdAt: order.createdAt });
  });
}
