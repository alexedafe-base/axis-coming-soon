/* AXIO Coming Soon — Worker request handler.
   Everything except POST /api/waitlist just falls through to the static
   assets (index.html, styles/, scripts/, etc.) via env.ASSETS — this
   Worker only ever writes code for the one route that needs server logic. */

const RESEND_FROM = 'AXIO Advisory <advisory@axioadvisory.com>';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/waitlist' && request.method === 'POST') {
      return handleWaitlist(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function handleWaitlist(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: 'invalid_json' }, 400);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const firstName = typeof payload.firstName === 'string' ? payload.firstName.trim() : '';
  const serviceIds = Array.isArray(payload.serviceIds) ? payload.serviceIds : [];
  const consent = payload.consent;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'invalid_email' }, 400);
  }
  if (!consent || consent.accepted !== true) {
    return json({ error: 'consent_required' }, 400);
  }

  let isDuplicate = false;
  try {
    await env.DB.prepare(
      `INSERT INTO waitlist (first_name, email, service_ids, consent, client) VALUES (?, ?, ?, ?, ?)`
    ).bind(
      firstName || null,
      email,
      JSON.stringify(serviceIds),
      JSON.stringify(consent),
      JSON.stringify(payload.client || {})
    ).run();
  } catch (err) {
    // UNIQUE constraint on email = they're already on the list, which is
    // success from the visitor's point of view, not an error.
    if (String(err && err.message).indexOf('UNIQUE') !== -1) {
      isDuplicate = true;
    } else {
      return json({ error: 'database_error' }, 500);
    }
  }

  // Confirmation email is best-effort — a Resend hiccup shouldn't make the
  // signup itself fail, since the row is already safely in D1 either way.
  if (!isDuplicate) {
    try {
      await sendConfirmationEmail(env, email, firstName);
    } catch (_) {}
  }

  return json({ ok: true, duplicate: isDuplicate });
}

async function sendConfirmationEmail(env, email, firstName) {
  if (!env.RESEND_API_KEY) return; // not configured yet — skip quietly
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const html =
    `<p>${greeting}</p>` +
    `<p>You're on the AXIO Advisory waitlist. We'll email you the moment we launch.</p>` +
    `<p>— AXIO Advisory</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.RESEND_API_KEY
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: "You're on the AXIO Advisory waitlist",
      html: html
    })
  });
  if (!res.ok) console.error('Resend send failed', res.status, await res.text());
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
