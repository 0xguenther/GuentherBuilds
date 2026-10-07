import { fetchResponseWithRetry } from '../utils/retryUtil.js';
import { config } from '../config/index.js';
import { CONTACT_EMAIL } from './auditMailTemplates.js';

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = '0xGünther <noreply@0xguenther.org>';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return false;
  }

  try {
    const res = await fetchResponseWithRetry(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html, text, reply_to: CONTACT_EMAIL }),
      signal: AbortSignal.timeout(10000),
    }, { retryableStatuses: [429] });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[email] Resend API error ${res.status}: ${body}`);
      return false;
    }

    console.log(`[email] Sent to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error('[email] Send failed:', err);
    return false;
  }
}
