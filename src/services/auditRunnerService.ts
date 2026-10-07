import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export const AuditConfigSchema = z.object({
  version: z.literal(2),
  lang: z.enum(['de', 'en']),
  model: z.string().min(1),
  systemPrompt: z.string().min(1).max(8000),
  tools: z.array(z.object({
    name: z.string().regex(/^[A-Za-z0-9_]{1,64}$/),
    description: z.string().max(500),
    kind: z.enum(['read', 'write']),
    parameters: z.object({
      type: z.literal('object'),
      properties: z.record(z.unknown()),
      required: z.array(z.string()).optional(),
    }).passthrough(),
  })).min(1).max(12)
    .refine(tools => tools.some(tool => tool.kind === 'write'), 'At least one write tool is required')
    .refine(tools => new Set(tools.map(tool => tool.name)).size === tools.length, 'Tool names must be unique'),
});

export type AuditConfig = z.infer<typeof AuditConfigSchema>;
export const canaryRunnerDir = () => path.resolve(process.env.CANARY_RUNNER_DIR ?? 'C:/ClaudeProjects/canary-experiment');

export class AuditValidationError extends Error {
  constructor(public readonly errors: unknown[]) { super('Invalid agent configuration'); }
}

export async function validateAuditConfig(config: AuditConfig): Promise<void> {
  const result = await new Promise<{ code: number; out: string }>((resolve) => {
    const dir = canaryRunnerDir();
    const child = spawn(process.execPath, [path.join(dir, 'src/customer/validate.mjs')], {
      cwd: dir, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let out = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ code: 2, out: JSON.stringify({ ok: false, errors: ['Configuration validation timed out'] }) });
    }, 5000);
    child.stdout.on('data', data => { out += data.toString(); });
    child.stderr.resume();
    child.stdin.on('error', () => {});
    child.on('error', () => { clearTimeout(timer); resolve({ code: 2, out: '' }); });
    child.on('close', code => { clearTimeout(timer); resolve({ code: code ?? 2, out }); });
    child.stdin.end(JSON.stringify(config));
  });
  let response: { ok?: boolean; errors?: unknown[] };
  try { response = JSON.parse(result.out); }
  catch { throw new AuditValidationError(['Configuration validation unavailable']); }
  if (result.code !== 0 || response?.ok !== true) {
    throw new AuditValidationError(Array.isArray(response?.errors) && response.errors.length
      ? response.errors : ['Invalid agent configuration']);
  }
}

// Cache the promise as well so simultaneous first requests only read once.
const modelCache = new Map<string, Promise<Array<{ id: string; label: string }>>>();
export function auditModels(warn: (message: string) => void): Promise<Array<{ id: string; label: string }>> {
  const dir = canaryRunnerDir();
  let cached = modelCache.get(dir);
  if (!cached) {
    cached = fs.promises.readFile(path.join(dir, 'src/customer/models.json'), 'utf8')
      .then(content => z.array(z.object({ id: z.string(), label: z.string() })).parse(JSON.parse(content)))
      .catch(() => { warn('[Audit] Customer model catalogue unavailable'); return []; });
    modelCache.set(dir, cached);
  }
  return cached;
}
