import { createHash, createHmac, randomBytes } from 'crypto';
import path from 'path';
import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';

const processSecret = randomBytes(32).toString('hex');
const BOT_UA = /bot|crawl|spider|slurp|preview|monitor|uptime|kuma|curl|wget|python|headless/i;

export function visitorHash(day: string, ip: string, userAgent: string): string {
  const dailySalt = createHmac('sha256', process.env.TRACKING_SALT || processSecret).update(day).digest('hex');
  return createHash('sha256').update(dailySalt + ip + userAgent).digest('hex').slice(0, 16);
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.split(',')[0]?.trim() || undefined;
}

export async function recordPageView(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (process.env.NODE_ENV === 'test' && process.env.TRACKING_ENABLED !== 'true') return;
  if (request.method !== 'GET' || reply.statusCode !== 200) return;
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (/^\/(api|download|assets)(?:\/|$)/i.test(pathname)) return;
  if (!(pathname.endsWith('/') || pathname.endsWith('.html') || !path.posix.extname(pathname))) return;
  if (!String(reply.getHeader('content-type') ?? '').toLowerCase().startsWith('text/html')) return;
  const userAgent = request.headers['user-agent'] ?? '';
  if (BOT_UA.test(userAgent)) return;
  const ip = firstHeader(request.headers['cf-connecting-ip'])
    ?? firstHeader(request.headers['x-forwarded-for']) ?? request.ip;
  const createdAt = new Date();
  const day = createdAt.toISOString().slice(0, 10);
  let referrerHost: string | undefined;
  try {
    const referrer = new URL(request.headers.referer ?? '');
    if (referrer.protocol === 'http:' || referrer.protocol === 'https:') referrerHost = referrer.hostname;
  } catch { /* Missing or malformed referrers are ignored. */ }
  await prisma.pageView.create({
    data: { createdAt, day, path: pathname, visitorHash: visitorHash(day, ip, userAgent), referrerHost },
  });
}
