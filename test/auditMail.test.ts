import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFailureEmail, buildRejectionEmail, buildReportReadyEmail, orderLang, tierName,
} from '../src/services/auditMailTemplates.js';
import { sendEmail } from '../src/services/emailService.js';

const orderId = '3f9a1c7e-5b2d-4e8a-9c01-7d6b2a4f8e10';
const report = (lang: 'de' | 'en', tier = 'standard') => buildReportReadyEmail({ orderId, tier, lang, downloadToken: 'tok123' });

describe('audit mails', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('reads the language from the order config and defaults to German', () => {
    expect(orderLang(JSON.stringify({ lang: 'en' }))).toBe('en');
    expect(orderLang(JSON.stringify({ lang: 'de' }))).toBe('de');
    expect(orderLang('not json')).toBe('de');
    expect(orderLang(undefined)).toBe('de');
  });

  it('renders the report mail per language with the tier names of the order pages', () => {
    const de = report('de');
    expect(de.text.startsWith('Hallo,')).toBe(true);
    expect(de.html).toContain('Standard-Check');
    expect(de.html).toContain('Link 48 h gültig, max. 5 Downloads');
    expect(de.subject).toContain('Standard-Check');
    const en = report('en');
    expect(en.text.startsWith('Hi,')).toBe(true);
    expect(en.html).toContain('Standard Check');
    expect(en.html).toContain('Link valid for 48 h, max. 5 downloads');
    expect([tierName('de', 'fix'), tierName('en', 'fix'), tierName('de', 'quick'), tierName('en', 'quick')])
      .toEqual(['Fix-Paket', 'Fix Package', 'Quick-Check', 'Quick Check']);
    expect(report('en', 'fix').html).not.toContain('Fix-Paket');
  });

  it('contains the short order id, the download link and a plain-text part', () => {
    for (const lang of ['de', 'en'] as const) {
      const mail = report(lang);
      expect(mail.html).toContain('3f9a1c7e');
      expect(mail.html).not.toContain(orderId);
      expect(mail.html).toContain('https://0xguenther.org/api/audit/download/tok123');
      expect(mail.text).toContain('https://0xguenther.org/api/audit/download/tok123');
      expect(mail.text).toContain('3f9a1c7e');
      expect(mail.text).toContain('labs@0xguenther.org');
      expect(mail.html).toContain('max-width:600px');
    }
  });

  it('uses the agreed refund wording per language', () => {
    expect(buildFailureEmail({ orderId, lang: 'de', refundAmount: 'CHF 90.00' }).text).toContain('erscheint je nach Bank innert 5-10 Werktagen');
    expect(buildFailureEmail({ orderId, lang: 'en', refundAmount: 'CHF 90.00' }).text).toContain('appears within 5-10 business days depending on your bank');
    expect(buildFailureEmail({ orderId, lang: 'de' }).text).toContain('manuell innert 5 Werktagen');
    const manual = buildFailureEmail({ orderId, lang: 'en' });
    expect(manual.text).toContain('We refund manually within 5 business days');
    expect(manual.html + manual.text).not.toContain('notified');
    expect(buildFailureEmail({ orderId, lang: 'en' }).text.startsWith('Hi,')).toBe(true);
    expect(buildFailureEmail({ orderId, lang: 'de' }).html).toContain('Agent-Check');
    expect(buildFailureEmail({ orderId, lang: 'en' }).html).toContain('Agent Write-Path Check');
  });

  it('escapes dynamic values in HTML', () => {
    const evil = '<script>alert(1)</script> & "x"';
    const mail = buildRejectionEmail({ orderId, lang: 'en', reason: evil, refundAmount: '<b>CHF 1</b>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<b>CHF 1</b>');
    expect(mail.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;x&quot;');
    const tampered = buildReportReadyEmail({ orderId: '"><img src=x>', tier: '<i>', lang: 'de', downloadToken: '"><b>' });
    expect(tampered.html).not.toContain('<img');
    expect(tampered.html).not.toContain('<i>');
    expect(tampered.html).not.toContain('"><b>');
  });

  it('sends reply_to, the plain-text part and the noreply sender to Resend', async () => {
    vi.stubEnv('RESEND_API_KEY', 'test');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const mail = report('de');
    expect(await sendEmail({ to: 'buyer@example.test', ...mail })).toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ reply_to: 'labs@0xguenther.org', text: mail.text, html: mail.html, subject: mail.subject, to: 'buyer@example.test' });
    expect(body.from).toContain('noreply@0xguenther.org');
  });
});
