// Netlify Edge Function — blocks all non-Canadian traffic
// Netlify automatically provides geo data on the request context

export default async (request, context) => {
  const country = context.geo?.country?.code;

  // Allow Canadian IPs through
  if (country === 'CA') {
    return context.next();
  }

  // Also allow requests with no geo data (local dev, health checks)
  if (!country) {
    return context.next();
  }

  // Block everything else
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Access Restricted</title>
      <style>
        body {
          font-family: -apple-system, sans-serif;
          background: #0f0c14;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
          text-align: center;
        }
        .box { max-width: 400px; padding: 40px; }
        h1 { font-size: 48px; margin: 0 0 16px; }
        h2 { font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #C41E3A; }
        p { color: rgba(255,255,255,.5); font-size: 14px; line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🔒</h1>
        <h2>Access Restricted</h2>
        <p>This site is only accessible from within Canada.</p>
      </div>
    </body>
    </html>`,
    {
      status: 403,
      headers: { 'Content-Type': 'text/html' },
    }
  );
};

export const config = {
  path: "/*"
};
