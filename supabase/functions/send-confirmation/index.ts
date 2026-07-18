// AXIO waitlist — confirmation email
//
// Triggered by a Supabase Database Webhook on INSERT into public.waitlist
// (set up in the dashboard, not in code — see README "Waitlist backend").
// Sends a confirmation email via Resend.
//
// Required secrets (Project Settings → Edge Functions → Secrets, or
// `supabase secrets set NAME=value`):
//   RESEND_API_KEY      — from resend.com/api-keys
//   WEBHOOK_SECRET       — any random string; must match the header value
//                          configured on the Database Webhook, so this
//                          function can reject calls that aren't really
//                          from Supabase (the function URL is public).

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
const FROM_ADDRESS = 'AXIO Advisory <advisory@axioadvisory.com>'; // must be a Resend-verified domain

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;
  if (!record || !record.email) {
    return new Response('bad request: no record.email', { status: 400 });
  }

  const firstName = record.first_name ? String(record.first_name) : '';
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';

  const html = `
    <p>${greeting}</p>
    <p>You're on the AXIO Advisory waitlist. We'll email you the moment we launch.</p>
    <p>— AXIO Advisory</p>
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [record.email],
      subject: "You're on the AXIO Advisory waitlist",
      html
    })
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('Resend send failed', res.status, detail);
    return new Response('email send failed', { status: 502 });
  }

  return new Response('ok', { status: 200 });
});
