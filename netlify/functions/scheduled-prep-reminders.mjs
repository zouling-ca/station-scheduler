// This function runs automatically every Thursday at 8:00 AM EST
// Sends prep reminders to firefighters who need gear at the doors tonight

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'onboarding@resend.dev';

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

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Station Scheduler <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
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

export default async (req) => {
  const today = new Date().toISOString().slice(0, 10);
  console.log(`[Scheduled] Checking gear preps for ${today}`);

  try {
    // Find gear cleanings where prep_by_date is today
    const duePreps = await supaFetch(
      `gear_cleanings?prep_by_date=eq.${today}&status=eq.scheduled`
    );

    if (duePreps.length === 0) {
      console.log('No gear preps due today.');
      return new Response('No preps due', { status: 200 });
    }

    console.log(`Found ${duePreps.length} gear prep(s) due today.`);

    const memberIds = [...new Set(duePreps.map(g => g.member_id))];
    const members = await supaFetch(`members?id=in.(${memberIds.join(',')})`);
    const memberMap = {};
    members.forEach(m => memberMap[m.id] = m);

    for (const gear of duePreps) {
      const member = memberMap[gear.member_id];
      if (!member || !member.email) continue;

      try {
        await sendEmail(
          member.email,
          `Gear Prep Reminder — Tonight`,
          `<div style="font-family:sans-serif;padding:20px;max-width:600px">
            <h2 style="color:#ff9800">📋 Gear Prep Reminder</h2>
            <p>Hi ${member.name},</p>
            <p>This is a reminder to have your <strong>bunker gear ready at the usual doors by this evening (Thursday)</strong>.</p>
            <p><strong>${gear.vendor}</strong> will pick it up <strong>tomorrow morning (Friday, ${formatDate(gear.pickup_date)})</strong>.</p>
            <p>Your cleaned gear will be returned on <strong>${formatDate(gear.return_date)}</strong>.</p>
            <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
            <p style="color:#999;font-size:12px">Station Scheduler — Fire Department Vacation & Gear Tracker</p>
          </div>`
        );
        console.log(`Prep reminder sent to ${member.name} (${member.email})`);
      } catch (emailErr) {
        console.error(`Failed to email ${member.email}:`, emailErr.message);
      }
    }

    return new Response(`Processed ${duePreps.length} prep reminder(s)`, { status: 200 });
  } catch (err) {
    console.error('Scheduled function error:', err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
};

// Runs every Thursday at 8:00 AM Eastern (13:00 UTC)
export const config = {
  schedule: "0 13 * * 4"
};
