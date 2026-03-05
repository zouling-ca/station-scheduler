import { readFileSync } from 'fs';
import { join } from 'path';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'onboarding@resend.dev';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Load the PDF once on cold start
let pdfBase64 = null;
try {
  const pdfPath = join(process.cwd(), 'gear-cleaning-policy.pdf');
  const pdfBuffer = readFileSync(pdfPath);
  pdfBase64 = pdfBuffer.toString('base64');
} catch (err) {
  console.warn('PDF not found — emails will send without attachment.', err.message);
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { to, subject, html } = JSON.parse(event.body);
    if (!to || !subject || !html) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'to, subject, and html are required' }) };
    }

    const emailPayload = {
      from: `Station Scheduler <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    };

    if (pdfBase64) {
      emailPayload.attachments = [{
        filename: 'gear-cleaning-policy.pdf',
        content: pdfBase64,
      }];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const data = await res.json();
    if (!res.ok) return { statusCode: res.status, headers, body: JSON.stringify({ error: data }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, id: data.id }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
