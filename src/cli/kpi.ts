import { MetricsService } from '../services/metricsService.js';
import { prisma } from '../db/client.js';

/** Prints the status of the current measurement window. Usage: node dist/cli/kpi.js [days] */
async function main() {
  const days = Number(process.argv[2] || 30);
  const f = await MetricsService.getFunnel({ days });
  const k = f.killCriterion;
  const line = (label: string, value: string | number) => console.log(`${label.padEnd(34)} ${value}`);
  console.log(`Measurement window ${k.start} -> ${k.decisionDay} (${k.windowDays} days, ${k.daysLeft} left)`);
  line('Qualified visitors (target)', `${k.visitors} / ${k.targets.visitors}`);
  line('Raw visitors incl. unattributed', k.rawVisitors);
  line('Paid orders (target)', `${k.paidOrders} / ${k.targets.paidOrders}`);
  line('On track', k.onTrack ? 'yes' : 'no');
  console.log(`\nLast ${days} days`);
  line('Checkouts started', f.checkoutsStarted);
  line('Research-page visitors', f.researchVisitors);
  line('Visits by campaign source', f.topSources.map((s) => `${s.source}:${s.pageViews}`).join(' ') || '-');
  line('Top referrers', f.topReferrerHosts.slice(0, 5).map((r) => `${r.host}:${r.pageViews}`).join(' ') || '-');
  line('Top paths', f.topPaths.slice(0, 5).map((p) => `${p.path}:${p.pageViews}`).join(' '));
}

main().catch((err) => { console.error(err); process.exitCode = 1; }).finally(() => prisma.$disconnect());
