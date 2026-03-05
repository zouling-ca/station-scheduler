// This function runs automatically every Friday at 7:00 AM EST
// Sends return reminders for gear cleanings due back today

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'onboarding@resend.dev';

import { readFileSync } from 'fs';
import { join } from 'path';

let pdfBase64 = null;
try {
  const pdfPath = join(process.cwd(), 'gear-cleaning-policy.pdf');
  pdfBase64 = readFileSync(pdfPath).toString('base64');
} catch (err) {
  console.warn('PDF not found for attachment:', err.message);
}

async function supaFetch(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`);
  return res.json();
}

async function supaUpdate(path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase update: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sendEmail(to, subject, html) {
  const payload = {
    from: `Station Scheduler <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html,
  };
  if (pdfBase64) {
    payload.attachments = [{ filename: 'gear-cleaning-policy.pdf', content: pdfBase64 }];
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend: ${JSON.stringify(data)}`);
  return data;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const EMAIL_FOOTER = `<hr style="border:none;border-top:1px solid #eee;margin:24px 0">
<p style="color:#333;font-size:13px;margin:0"><strong>Anya Kisiel</strong><br>Fire Services Coordinator</p>
<hr style="border:none;border-top:1px solid #eee;margin:20px 0">
<p style="color:#999;font-size:11px;margin:0">Station Scheduler — West Elgin · Dutton Dunwich · Southwold Fire Departments</p>`;

export default async (req) => {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[Scheduled] Checking gear returns for ${today}`);

  try {
    const dueReturns = await supaFetch(
      `gear_cleanings?return_date=eq.${today}&return_notified=eq.false`
    );

    if (dueReturns.length === 0) {
      console.log('No gear returns due today.');
      return new Response('No returns due', { status: 200 });
    }

    console.log(`Found ${dueReturns.length} gear return(s) due today.`);

    const memberIds = [...new Set(dueReturns.map(g => g.member_id))];
    const members = await supaFetch(`members?id=in.(${memberIds.join(',')})`);
    const memberMap = {};
    members.forEach(m => memberMap[m.id] = m);

    for (const gear of dueReturns) {
      const member = memberMap[gear.member_id];
      if (!member || !member.email) {
        console.log(`Skipping gear ${gear.id} — no member/email found`);
        continue;
      }

      try {
        await sendEmail(
          member.email,
          `Gear Return Today — ${formatDate(today)}`,
          `<div style="font-family:sans-serif;padding:20px;max-width:600px">
            <h2 style="color:#9c27b0">📦 Gear Return Reminder</h2>
            <p>Hi ${member.name},</p>
            <p>Your bunker gear cleaned by <strong>${gear.vendor}</strong> is scheduled to be <strong>returned today (${formatDate(today)})</strong> via the Friday van run.</p>
            <p>Please ensure your gear is collected from the <strong>fire hall</strong> and checked back into service.</p>
            ${EMAIL_FOOTER}
          </div>`
        );
        console.log(`Email sent to ${member.name} (${member.email})`);
      } catch (emailErr) {
        console.error(`Failed to email ${member.email}:`, emailErr.message);
      }

      try {
        await supaUpdate(`gear_cleanings?id=eq.${gear.id}`, { return_notified: true });
      } catch (updateErr) {
        console.error(`Failed to mark ${gear.id} as notified:`, updateErr.message);
      }
    }

    return new Response(`Processed ${dueReturns.length} return reminder(s)`, { status: 200 });
  } catch (err) {
    console.error('Scheduled function error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

// Runs every Friday at 7:00 AM Eastern (12:00 UTC)
export const config = {
  schedule: "0 12 * * 5"
};
