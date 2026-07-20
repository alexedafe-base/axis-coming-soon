/* AXIO Coming Soon — Worker request handler.
   Everything except POST /api/waitlist just falls through to the static
   assets (index.html, styles/, scripts/, etc.) via env.ASSETS — this
   Worker only ever writes code for the one route that needs server logic. */

const RESEND_FROM = 'AXIO Advisory <advisory@axioadvisory.com>';
const SITE_URL = 'https://axioadvisory.com';

// Mirrors scripts/config.js's `services` array (id -> display name). Keep
// these in sync if services are ever renamed/added there.
const SERVICE_NAMES = {
  foundation: 'Foundation',
  clarity: 'Clarity',
  growth: 'Growth',
  counsel: 'Counsel',
  legacy: 'Legacy',
  milestones: 'Milestones'
};

// Mirrors scripts/config.js's `shareMessage` (used by the website's own
// share-with-a-friend row) — kept in sync manually since the browser and
// this Worker are separate runtimes with no shared module. If you edit
// the wording in one place, edit it in the other too.
const SHARE_MESSAGE =
  "I came across this and immediately thought of you. Sharing so you can " +
  "get early access — genuinely think it's good for your financial " +
  "wellbeing. Get in here: www.axioadvisory.com/early-access";
const SHARE_URL = 'https://www.axioadvisory.com/early-access';

// Follow-us links are placeholders (bare platform homepages) until real
// AXIO handles exist — same gating convention as scripts/config.js's
// empty social{} URLs. Swap these four once you have them.
const SOCIAL_LINKS = {
  instagram: 'https://instagram.com',
  youtube: 'https://youtube.com',
  x: 'https://x.com',
  facebook: 'https://facebook.com'
};

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
      await sendConfirmationEmail(env, email, firstName, serviceIds);
    } catch (_) {}
  }

  // Response never reveals `isDuplicate` — an existing-email signal here
  // would let anyone probe arbitrary addresses to check waitlist
  // membership (an email-enumeration issue), and the client doesn't need
  // it anyway: it only checks the HTTP status, not the response body.
  return json({ ok: true });
}

async function sendConfirmationEmail(env, email, firstName, serviceIds) {
  if (!env.RESEND_API_KEY) return; // not configured yet — skip quietly

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
      html: confirmationEmailHtml(firstName, serviceIds)
    })
  });
  if (!res.ok) console.error('Resend send failed', res.status, await res.text());
}

function icon(name) {
  return SITE_URL + '/assets/email-icons/' + name + '.png';
}

function badge(href, iconUrl, alt, size) {
  return (
    '<td style="padding:0 ' + (size === 20 ? '7' : '8') + 'px;">' +
      '<a href="' + href + '">' +
        '<img src="' + iconUrl + '" width="' + size + '" height="' + size + '" alt="' + alt + '" ' +
             'style="display:block; border:0; width:' + size + 'px; height:' + size + 'px;">' +
      '</a>' +
    '</td>'
  );
}

function confirmationEmailHtml(firstName, serviceIds) {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,';

  const shareText = encodeURIComponent(SHARE_MESSAGE);
  const shareUrl = encodeURIComponent(SHARE_URL);
  const waHref = 'https://wa.me/?text=' + shareText;
  const smsHref = 'sms:?body=' + shareText;
  const fbShareHref = 'https://www.facebook.com/sharer/sharer.php?u=' + shareUrl;

  const interestsRow = serviceIds.length ? `
              <tr>
                <td align="center" style="padding:28px 44px 0;">
                  <div style="font-family:'Courier New',Courier,monospace; font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:#9a958b; margin-bottom:10px; text-align:center;">Your interests</div>
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    ${serviceIds.map((id, i) => `
                    ${i > 0 ? '<td style="width:8px;">&nbsp;</td>' : ''}
                    <td style="padding:6px 14px; border:1px solid #ac704e; border-radius:999px; font-family:'Courier New',Courier,monospace; font-size:11px; letter-spacing:.5px; text-transform:uppercase; color:#965630;">${escapeHtml(SERVICE_NAMES[id] || id)}</td>
                    `).join('')}
                  </tr></table>
                </td>
              </tr>` : '';

  return `<!--[if mso]>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f0;">
  <tr>
    <td align="center" style="padding:44px 20px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px; max-width:100%; background:#ffffff;">

        <tr>
          <td align="center" style="padding:40px 44px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-weight:700; font-size:21px; letter-spacing:2.5px; color:#1a1a1a; line-height:1; text-align:center;">AXIO</div>
            <div style="font-family:'Courier New',Courier,monospace; font-size:9.5px; letter-spacing:3.5px; text-transform:uppercase; color:#965630; margin-top:5px; text-align:center;">Advisory</div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:32px 44px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="52" height="52" align="center" valign="middle" style="width:52px; height:52px; border-radius:26px; background:#f0e8e0; border:1px solid #ac704e; font-family:Georgia,serif; font-size:22px; color:#965630; line-height:52px; text-align:center;">&#10003;</td>
            </tr></table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:20px 44px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-weight:400; font-size:28px; line-height:1.2; letter-spacing:-.3px; color:#1a1a1a; text-align:center;">You&rsquo;re on the list.</div>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 44px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-size:16px; line-height:1.65; color:#3a362f;">
              ${greeting}<br><br>
              Thanks for joining the AXIO Advisory waitlist. We&rsquo;ll email you in the days leading to our formal launch &mdash; there&rsquo;s nothing else you need to do in the meantime.
            </div>
          </td>
        </tr>
        ${interestsRow}
        <tr>
          <td align="center" style="padding:30px 44px 0;">
            <div style="font-family:Georgia,'Times New Roman',serif; font-style:italic; font-size:17px; color:#965630; text-align:center;">See you at launch.</div>
          </td>
        </tr>

        <tr>
          <td style="padding:34px 44px 0;">
            <div style="height:1px; line-height:1px; font-size:1px; background:#dedbd5;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:28px 44px 0;">
            <div style="font-family:'Courier New',Courier,monospace; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#9a958b; margin-bottom:14px; text-align:center;">Know someone who&rsquo;d love this? Share it.</div>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              ${badge(waHref, icon('whatsapp'), 'Share via WhatsApp', 40)}
              ${badge(smsHref, icon('sms'), 'Share via SMS', 40)}
              ${badge(fbShareHref, icon('facebook'), 'Share on Facebook', 40)}
            </tr></table>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:32px 44px 0;">
            <div style="font-family:'Courier New',Courier,monospace; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#9a958b; margin-bottom:14px; text-align:center;">Stay in the loop before we launch</div>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              ${badge(SOCIAL_LINKS.instagram, icon('instagram'), 'AXIO Advisory on Instagram', 20)}
              ${badge(SOCIAL_LINKS.youtube, icon('youtube'), 'AXIO Advisory on YouTube', 20)}
              ${badge(SOCIAL_LINKS.x, icon('x'), 'AXIO Advisory on X', 20)}
              ${badge(SOCIAL_LINKS.facebook, icon('facebook'), 'AXIO Advisory on Facebook', 20)}
            </tr></table>
          </td>
        </tr>

        <tr>
          <td style="padding:34px 44px 0;">
            <div style="height:1px; line-height:1px; font-size:1px; background:#dedbd5;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:20px 44px 40px;">
            <div style="font-family:'Courier New',Courier,monospace; font-size:10.5px; letter-spacing:.5px; color:#9a958b; line-height:1.8; text-align:center;">
              AXIO ADVISORY &nbsp;&middot;&nbsp; advisory@axioadvisory.com<br>
              You&rsquo;re receiving this because you registered your interest at axioadvisory.com.
              See our <a href="${SITE_URL}/privacy.html" style="color:#965630; text-decoration:underline;">Privacy Policy</a>.
            </div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr></table>
<![endif]-->`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
