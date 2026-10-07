// Kundenmails des Agent-Check Audits (DE/EN). Reine Funktionen ohne Seiteneffekte,
// damit die Vorschau (scripts/previewAuditMails.ts) dieselben Texte rendert wie der Versand.

export type MailLang = 'de' | 'en';

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

export const CONTACT_EMAIL = 'labs@0xguenther.org';
const SITE_URL = 'https://0xguenther.org';

export const PRODUCT_NAME: Record<MailLang, string> = { de: 'Agent-Check', en: 'Agent Write-Path Check' };

// Gleiche Namen wie auf den Bestellseiten (public/audit, public/en/audit).
export const TIER_NAMES: Record<MailLang, Record<string, string>> = {
  de: { quick: 'Quick-Check', standard: 'Standard-Check', fix: 'Fix-Paket' },
  en: { quick: 'Quick Check', standard: 'Standard Check', fix: 'Fix Package' },
};

// Farben und Schriften aus den CSS-Variablen von public/audit/index.html.
const C = {
  bg: '#05070B', card: '#0d1117', border: '#1e293b', accent: '#00FF66',
  text: '#e2e8f0', muted: '#94a3b8', faint: '#64748b', danger: '#f87171',
};
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";
const MONO = "'JetBrains Mono',Consolas,'Courier New',monospace";

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch
  ));
}

/** Sprache aus der Bestell-Konfiguration; bei kaputter oder fehlender Angabe Deutsch. */
export function orderLang(configJson: string | null | undefined): MailLang {
  try {
    return JSON.parse(configJson ?? '{}').lang === 'en' ? 'en' : 'de';
  } catch {
    return 'de';
  }
}

export function tierName(lang: MailLang, tier: string): string {
  return TIER_NAMES[lang][tier] ?? tier;
}

export function shortOrderId(orderId: string): string {
  return orderId.slice(0, 8);
}

interface Layout {
  lang: MailLang;
  title: string;
  orderId: string;
  paragraphs: string[];
  button?: { label: string; url: string; note: string };
  box?: { text: string; danger?: boolean };
}

const COPY = {
  de: {
    greeting: 'Hallo,',
    order: 'Bestellung',
    footer: `Fragen? Antworte auf diese E-Mail oder schreib an ${CONTACT_EMAIL}.`,
    company: '0xGünther Architecture Labs · Zürich, Schweiz',
  },
  en: {
    greeting: 'Hi,',
    order: 'Order',
    footer: `Questions? Reply to this email or write to ${CONTACT_EMAIL}.`,
    company: '0xGünther Architecture Labs · Zurich, Switzerland',
  },
};

function render(l: Layout): RenderedMail & { html: string } {
  const copy = COPY[l.lang];
  const id = shortOrderId(l.orderId);
  const p = (t: string) => `<tr><td style="padding:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${C.muted}">${t}</td></tr>`;
  const box = l.box
    ? `<tr><td style="padding:0 0 16px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${l.box.danger ? '#1a0a0a' : C.card}" style="background-color:${l.box.danger ? '#1a0a0a' : C.card};border:1px solid ${l.box.danger ? '#7f1d1d' : C.border};border-radius:8px;padding:14px 16px;font-family:${FONT};font-size:14px;line-height:22px;color:${l.box.danger ? C.danger : C.text}">${escapeHtml(l.box.text)}</td></tr></table></td></tr>`
    : '';
  const button = l.button
    ? `<tr><td align="center" style="padding:8px 0 8px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="${C.accent}" style="background-color:${C.accent};border-radius:8px"><a href="${escapeHtml(l.button.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-family:${MONO};font-size:15px;font-weight:bold;line-height:20px;color:#000000;text-decoration:none;border-radius:8px">${escapeHtml(l.button.label)}</a></td></tr></table></td></tr>
<tr><td align="center" style="padding:0 0 16px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.faint}">${escapeHtml(l.button.note)}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="${l.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${escapeHtml(l.title)}</title></head>
<body style="margin:0;padding:0;background-color:${C.bg}" bgcolor="${C.bg}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid ${C.border}"><span style="font-family:${MONO};font-size:20px;font-weight:bold;color:${C.accent}">&gt;0xGünther■</span> <span style="font-family:${FONT};font-size:14px;color:${C.muted}">&nbsp;${escapeHtml(PRODUCT_NAME[l.lang])}</span></td></tr>
<tr><td style="padding:24px 0 8px 0;font-family:${FONT};font-size:24px;line-height:32px;font-weight:bold;color:#ffffff">${escapeHtml(l.title)}</td></tr>
<tr><td style="padding:0 0 20px 0;font-family:${MONO};font-size:13px;color:${C.faint}">${copy.order} <span style="color:${C.accent}">${escapeHtml(id)}</span></td></tr>
<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${p(copy.greeting)}
${l.paragraphs.map((t) => p(escapeHtml(t))).join('\n')}
${box}${button}
</table></td></tr>
<tr><td style="padding:16px 0 0 0;border-top:1px solid ${C.border};font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint}">${escapeHtml(copy.footer)}<br>${escapeHtml(copy.company)} · <a href="${SITE_URL}" style="color:${C.accent};text-decoration:none">0xguenther.org</a></td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    copy.greeting, '',
    ...l.paragraphs.flatMap((t) => [t, '']),
    ...(l.box ? [l.box.text, ''] : []),
    ...(l.button ? [`${l.button.label}: ${l.button.url}`, l.button.note, ''] : []),
    `${copy.order} ${id}`, '', '--', copy.footer, copy.company, SITE_URL,
  ].join('\n');

  return { subject: '', html, text };
}

export function buildReportReadyEmail(p: { orderId: string; tier: string; lang: MailLang; downloadToken: string }): RenderedMail {
  const { lang } = p;
  const tier = tierName(lang, p.tier);
  const product = PRODUCT_NAME[lang];
  const url = `${SITE_URL}/api/audit/download/${p.downloadToken}`;
  const de = lang === 'de';
  const out = render({
    lang,
    title: de ? 'Dein Bericht ist fertig' : 'Your report is ready',
    orderId: p.orderId,
    paragraphs: [de
      ? `dein ${tier} im ${product} ist abgeschlossen. Der Bericht steht zum Download bereit.`
      : `your ${tier} in the ${product} is complete. The report is ready to download.`],
    button: {
      label: de ? 'Bericht herunterladen' : 'Download report',
      url,
      note: de ? 'Link 48 h gültig, max. 5 Downloads' : 'Link valid for 48 h, max. 5 downloads',
    },
  });
  return { ...out, subject: de ? `${product}: Dein Bericht ist fertig (${tier}, ${shortOrderId(p.orderId)})` : `${product}: Your report is ready (${tier}, ${shortOrderId(p.orderId)})` };
}

function refundSentence(lang: MailLang, refundAmount?: string): string {
  if (lang === 'de') {
    return refundAmount
      ? `Wir haben dir ${refundAmount} zurückerstattet. Die Gutschrift erscheint je nach Bank innert 5-10 Werktagen.`
      : 'Die automatische Rückerstattung hat nicht geklappt. Wir erstatten den Betrag manuell innert 5 Werktagen.';
  }
  return refundAmount
    ? `We have refunded ${refundAmount}. The refund appears within 5-10 business days depending on your bank.`
    : 'The automatic refund did not go through. We refund manually within 5 business days.';
}

export function buildFailureEmail(p: { orderId: string; lang: MailLang; refundAmount?: string }): RenderedMail {
  const { lang } = p;
  const de = lang === 'de';
  const out = render({
    lang,
    title: de ? 'Der Lauf ist fehlgeschlagen' : 'The run failed',
    orderId: p.orderId,
    paragraphs: [
      de ? `bei deiner Bestellung im ${PRODUCT_NAME.de} ist ein technischer Fehler aufgetreten. Der Audit konnte nicht abgeschlossen werden.`
        : `a technical error occurred with your ${PRODUCT_NAME.en} order. The audit could not be completed.`,
      refundSentence(lang, p.refundAmount),
    ],
  });
  return { ...out, subject: de ? `${PRODUCT_NAME.de}: Bestellung fehlgeschlagen (${shortOrderId(p.orderId)})` : `${PRODUCT_NAME.en}: Order failed (${shortOrderId(p.orderId)})` };
}

export function buildRejectionEmail(p: { orderId: string; lang: MailLang; reason: string; refundAmount?: string }): RenderedMail {
  const { lang } = p;
  const de = lang === 'de';
  const out = render({
    lang,
    title: de ? 'Bestellung nicht bearbeitbar' : 'Order could not be processed',
    orderId: p.orderId,
    paragraphs: [
      de ? `deine Bestellung im ${PRODUCT_NAME.de} konnte nicht bearbeitet werden.` : `your ${PRODUCT_NAME.en} order could not be processed.`,
      refundSentence(lang, p.refundAmount),
    ],
    box: p.reason ? { text: p.reason, danger: true } : undefined,
  });
  return { ...out, subject: de ? `${PRODUCT_NAME.de}: Bestellung nicht bearbeitbar (${shortOrderId(p.orderId)})` : `${PRODUCT_NAME.en}: Order could not be processed (${shortOrderId(p.orderId)})` };
}
