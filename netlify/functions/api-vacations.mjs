const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

async function supaFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': options.method === 'POST' ? 'return=representation' : undefined,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error: ${res.status} ${err}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    if (event.httpMethod === 'GET') {
      const data = await supaFetch('vacations?order=start_date.asc');
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      const data = await supaFetch('vacations', {
        method: 'POST',
        body: JSON.stringify({
          id: body.id,
          member_id: body.memberId,
          start_date: body.start,
          end_date: body.end,
          notes: body.notes || '',
        }),
      });
      return { statusCode: 201, headers, body: JSON.stringify(data[0]) };
    }

    if (event.httpMethod === 'DELETE') {
      const id = event.queryStringParameters?.id;
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
      await supaFetch(`vacations?id=eq.${id}`, { method: 'DELETE' });
      return { statusCode: 200, headers, body: JSON.stringify({ deleted: true }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
}
