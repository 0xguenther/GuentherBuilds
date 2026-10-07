// Schreibt statische Vorschauen der Audit-Mails (Beispieldaten) nach docs/preview/.
// Aufruf: npm run audit:mail-preview
import fs from 'fs';
import path from 'path';
import { buildReportReadyEmail, buildFailureEmail } from '../src/services/auditMailTemplates.js';

const outDir = path.resolve(process.cwd(), 'docs', 'preview');
const orderId = '3f9a1c7e-5b2d-4e8a-9c01-7d6b2a4f8e10';
fs.mkdirSync(outDir, { recursive: true });

for (const lang of ['de', 'en'] as const) {
  const report = buildReportReadyEmail({ orderId, tier: 'standard', lang, downloadToken: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4' });
  const failed = buildFailureEmail({ orderId, lang, refundAmount: 'CHF 290.00' });
  fs.writeFileSync(path.join(outDir, `mail_report_${lang}.html`), report.html);
  fs.writeFileSync(path.join(outDir, `mail_failed_${lang}.html`), failed.html);
}
console.log(`Vorschauen in ${outDir}`);
