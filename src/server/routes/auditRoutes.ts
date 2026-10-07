import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuditOrderService, AUDIT_TIERS } from '../../services/auditOrderService.js';
import { AuditFulfillmentService } from '../../services/auditFulfillmentService.js';
import fs from 'fs';

const OrderSchema = z.object({
  tier: z.enum(Object.keys(AUDIT_TIERS) as [string, ...string[]]),
  tools: z.array(z.record(z.unknown())).min(1).max(50),
  buyerEmail: z.string().email().optional(),
});

// Bestellungen sind gesperrt, bis AUDIT_ORDERS_ENABLED=1 gesetzt ist. Der aktuelle
// Lauf prüft nur eine feste Referenz-Konfiguration, nicht den Agenten des Kunden.
export const auditOrdersPaused = () => process.env.AUDIT_ORDERS_ENABLED !== '1';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/api/audit/availability', async () => ({ paused: auditOrdersPaused() }));

  // Bestellannahme: validiert die Konfiguration und liefert den Checkout-Link.
  fastify.post('/api/audit/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    if (auditOrdersPaused()) {
      return reply.status(503).send({ error: 'paused', paused: true });
    }
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

  // Status einer Bestellung. Gibt keine Konfiguration zurück. Den Download-Link
  // gibt es nur mit der passenden Stripe-Session-ID aus der Success-URL.
  fastify.get('/api/audit/orders/:id', async (request: FastifyRequest<{ Params: { id: string }; Querystring: { session_id?: string } }>, reply: FastifyReply) => {
    const order = await AuditOrderService.get(request.params.id);
    if (!order) return reply.status(404).send({ error: 'Bestellung nicht gefunden' });
    const sessionId = request.query.session_id;
    const canDownload = order.status === 'delivered'
      && !!order.downloadToken
      && !!sessionId && sessionId === order.stripeSessionId
      && !!order.downloadExpiresAt && order.downloadExpiresAt > new Date();
    return reply.send({
      id: order.id, tier: order.tier, status: order.status, createdAt: order.createdAt,
      ...(canDownload ? { downloadUrl: `/api/audit/download/${order.downloadToken}` } : {}),
    });
  });

  // Bericht herunterladen. Der Token ist die Berechtigung, Ablauf und Anzahl werden geprüft.
  fastify.get('/api/audit/download/:token', async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
    const res = await AuditFulfillmentService.consumeDownload(request.params.token);
    if (!res.ok) return reply.status(403).send({ error: res.reason });
    reply.header('Content-Type', 'text/html; charset=utf-8');
    const content = await fs.promises.readFile(res.path, 'utf8');
    return reply.send(content);
  });
}
