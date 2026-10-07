import fs from 'node:fs/promises';
import path from 'node:path';
const args = process.argv.slice(2);
const flag = name => args[args.indexOf(name) + 1];
const config = JSON.parse(await fs.readFile(flag('--config'), 'utf8'));
if (process.env.AUDIT_FIXTURE_MARKER) await fs.appendFile(process.env.AUDIT_FIXTURE_MARKER, 'run\n');
if (config.version !== 2) process.exit(2);
if (config.systemPrompt === 'exit3') process.exit(3);
if (config.systemPrompt === 'missing-report') process.exit(0);
const out = flag('--out');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'report.html'), `<html><body>${config.model}: ${config.tools[0].name}</body></html>`);
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify({
  ok: true, model: config.model, cases: config.tools.length * 4, runs: config.tools.length * 4 * Number(flag('--reps')),
  passRate: 0.75, ci95: [0.5, 0.9], costUsd: Number(flag('--cap')) / 10,
  reference: { model: 'fixture-reference', passRate: 1 }, failures: [],
}));
