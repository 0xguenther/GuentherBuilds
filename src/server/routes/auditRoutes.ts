import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuditOrderService, AUDIT_TIERS } from '../../services/auditOrderService.js';
import { AuditFulfillmentService, DOWNLOAD_MAX } from '../../services/auditFulfillmentService.js';
import fs from 'fs';
import { downloadErrorPage } from './auditDownloadErrorPage.js';
import { AuditConfigSchema, AuditValidationError, auditModels } from '../../services/auditRunnerService.js';

const OrderSchema = AuditConfigSchema.omit({ version: true }).extend({
  tier: z.enum(['quick', 'standard', 'fix']),
  buyerEmail: z.string().email(),
});

// Bestellungen sind gesperrt, bis AUDIT_ORDERS_ENABLED=1 gesetzt ist.
// Kunden-Runner und Berichte müssen vor der Freigabe abgenommen sein.
export const auditOrdersPaused = () => process.env.AUDIT_ORDERS_ENABLED !== '1';

export async function auditRoutes(fastify: FastifyInstance) {
  fastify.get('/api/audit/availability', async () => ({ paused: auditOrdersPaused() }));

  fastify.get('/api/audit/models', async () => auditModels(message => fastify.log.warn(message)));

  // Bestellannahme: validiert die Konfiguration und liefert den Checkout-Link.
  fastify.post('/api/audit/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    if (auditOrdersPaused()) {
      return reply.status(503).send({ error: 'paused', paused: true });
    }
    const parsed = OrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Ungültige Bestellung', errors: parsed.error.issues });
    }
    try {
      const result = await AuditOrderService.create({
        tier: parsed.data.tier as keyof typeof AUDIT_TIERS,
        lang: parsed.data.lang,
        model: parsed.data.model,
        systemPrompt: parsed.data.systemPrompt,
        tools: parsed.data.tools,
        buyerEmail: parsed.data.buyerEmail,
      });
      return reply.status(201).send(result);
    } catch (err: unknown) {
      if (err instanceof AuditValidationError) {
        return reply.status(400).send({ error: 'Ungültige Agent-Konfiguration', errors: err.errors });
      }
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
    const downloadsLeft = Math.max(0, DOWNLOAD_MAX - order.downloadCount);
    const canDownload = order.status === 'delivered'
      && !!order.downloadToken
      && !!sessionId && sessionId === order.stripeSessionId
      && !!order.downloadExpiresAt && order.downloadExpiresAt > new Date()
      && downloadsLeft > 0;
    return reply.send({
      id: order.id, tier: order.tier, status: order.status, createdAt: order.createdAt, downloadsLeft,
      ...(canDownload ? { downloadUrl: `/api/audit/download/${order.downloadToken}` } : {}),
    });
  });

  // Bericht herunterladen. Der Token ist die Berechtigung, Ablauf und Anzahl werden geprüft.
  fastify.get<{ Params: { token: string } }>('/api/audit/download/:token', {
    onSend: async (request, reply, payload) => {
      // The file has been read and preceding hooks have selected the response status.
      if (request.method !== 'GET' || reply.statusCode !== 200) return payload;
      const res = await AuditFulfillmentService.consumeDownload(request.params.token);
      if (res.ok) return payload;
      reply.code(403).type('text/html; charset=utf-8');
      reply.removeHeader('content-length');
      return downloadErrorPage(res.reason, res.lang);
    },
  }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const res = await AuditFulfillmentService.consumeDownload(request.params.token, false);
    if (!res.ok) return reply.status(403).type('text/html; charset=utf-8').send(downloadErrorPage(res.reason, res.lang));
    reply.header('Content-Type', 'text/html; charset=utf-8');
    const content = await fs.promises.readFile(res.path, 'utf8');
    return reply.send(content);
  });
}
