import { config } from '../config/index.js';

const RESEND_API = 'https://api.resend.com/emails';
const FROM_ADDRESS = '0xGünther <noreply@0xguenther.org>';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email send');
    return false;
  }

  try {
    const res = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });

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

export function buildReportReadyEmail(orderId: string, tier: string): SendEmailParams & { subject: string } {
  const downloadUrl = `https://0xguenther.org/audit/thanks?order=${orderId}`;
  return {
    to: '', // filled by caller
    subject: `Your AgentCheck Report is Ready (${tier})`,
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#05070B;color:#e2e8f0;padding:32px;max-width:600px;margin:0 auto">
  <div style="border-bottom:1px solid #1e293b;padding-bottom:16px;margin-bottom:24px">
    <span style="color:#00FF66;font-family:monospace;font-size:20px;font-weight:bold">&gt;0xGünther■</span>
  </div>
  <h1 style="color:#fff;font-size:24px;margin-bottom:16px">Your AgentCheck Report is Ready</h1>
  <p style="color:#94a3b8;line-height:1.6">Your <strong style="color:#fff">${tier}</strong> write-path audit has been completed. The report is available for download.</p>
  <div style="background:#0d1117;border:1px solid #1e293b;border-radius:8px;padding:20px;margin:24px 0">
    <p style="color:#64748b;font-size:13px;margin:0 0 8px">Order ID</p>
    <p style="color:#00FF66;font-family:monospace;font-size:14px;margin:0">${orderId}</p>
  </div>
  <a href="${downloadUrl}" style="display:inline-block;background:#00FF66;color:#000;font-weight:bold;font-family:monospace;padding:12px 24px;border-radius:8px;text-decoration:none;margin:8px 0">&gt; Download Report</a>
  <p style="color:#64748b;font-size:13px;margin-top:24px">The download link is valid for 48 hours and limited to 5 downloads.</p>
  <hr style="border:none;border-top:1px solid #1e293b;margin:32px 0">
  <p style="color:#475569;font-size:12px">0xGünther Architecture Labs · Zürich, Schweiz<br><a href="https://0xguenther.org" style="color:#00FF66">0xguenther.org</a></p>
</body></html>`,
  };
}