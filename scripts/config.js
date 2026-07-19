/* ============================================================================
   AXIO "Coming Soon" — site configuration (single source of truth)
   Maps to PRD v2.2 §16 "Content inventory and configuration".
   Edit values here; do not hard-code content in index.html or site.js.
   ============================================================================ */
window.AXIO_CONFIG = {

  /* Brand / legal ----------------------------------------------------------
     D-01 (PRD §17): confirm the exact REGISTERED controller name before
     publishing "Ltd". Display brand and legal entity are kept separate. */
  brand:        'AXIO',
  legalEntity:  'AXIO Advisory',            // TODO D-01: set to registered name (e.g. "AXIO Advisory Ltd") once confirmed
  copyrightYear: 2026,
  contactEmail: 'advisory@axioadvisory.com',

  /* Launch — ISO 8601 UTC (PRD §4.2). Edit to reschedule. ----------------- */
  launchISO: '2026-10-01T09:00:00Z',

  /* Privacy policy (PRD P0 / D-06): must be a live HTTPS URL before launch.
     While empty, the consent copy shows plain text instead of a dead link.
     Root-relative ('/privacy.html', not 'privacy.html') so it resolves
     correctly from both / and /early-access/ — this file is shared by
     both copies of the page. privacy.html itself still has a couple of
     bracketed placeholders (registered address, effective date) pending
     legal sign-off; see the note at the top of that page. */
  privacyUrl: '/privacy.html',

  /* Consent — versioned constant (PRD §5.2 / §16). Changing the text below
     MUST also bump consentVersion so a new consent version is recorded. */
  consentVersion: 'waitlist-2026-07-11',

  /* Waitlist storage (Cloudflare D1, via worker/index.js — see README
     "Waitlist backend"). A same-origin relative path, not a full URL,
     since the API is served by the same Worker as the site itself.

     Now that this is set, local preview needs `npx wrangler dev` (which
     runs the Worker + a local D1 copy) rather than a plain
     `python3 -m http.server` — the latter has no /api/waitlist route to
     answer, so the form would show the "couldn't save" error, not the
     old static/dev success-without-a-backend behaviour. Set this back to
     '' temporarily if you want that simple no-backend preview mode. */
  apiUrl: '/api/waitlist',

  /* "Share with a friend" row (WhatsApp / SMS / Facebook) on the success
     screen. WhatsApp and SMS send this text verbatim — if you include an
     optional {url} token, it's swapped for the page's own live address at
     runtime; otherwise the message is used exactly as written (e.g. with
     a fixed link already baked in, as below). Facebook only accepts a URL
     to share (no custom text), so it always links to the page's own live
     address regardless of what's written here. */
  shareMessage: "I came across this and immediately thought of you. Sharing so you can get early access — genuinely think it's good for your financial wellbeing. Get in here: www.axioadvisory.com/early-access",

  /* Social channels (PRD §16 / P1): render ONLY non-empty, live URLs.
     LinkedIn is the primary channel. Leave others '' to hide them. */
  social: {
    linkedin:  '',   // TODO D-06: primary channel
    x:         '',
    instagram: '',
    facebook:  '',
    youtube:   '',
    tiktok:    '',
    whatsapp:  ''
  },

  /* Hero rotator (PRD §4.1) — content approval required for changes. ------ */
  hero: [
    { title: 'Your money has a story. <em>We help you write the next chapter.</em>',
      lede:  'Independent strategic, financial and wealth advisory built around your life, business and long-term ambitions.' },
    { title: 'Money compounds. <em>So does time.</em> We help you plan for both.',
      lede:  'Independent financial and strategic advice for business owners, executives, investors and families navigating consequential decisions.' },
    { title: 'No products to push. No script to follow. <em>Just your plan.</em>',
      lede:  'Evidence-based wealth advisory built around your life, not a template.' },
    { title: 'Financial intelligence and freedom are <em>your right, not a privilege.</em>',
      lede:  'No jargon, no assumptions — just clear guidance on the questions that actually keep people up at night.' }
  ],

  /* Service catalogue — canonical IDs (PRD §5.1) are the integration key.
     Display labels/descriptions never travel to the API alone. */
  services: [
    { id:'foundation', name:'Foundation', tier:'Free',        desc:'Free tools to see your whole financial picture in one place.' },
    { id:'clarity',    name:'Clarity',    tier:'Planning',    desc:'A structured financial plan mapped to your life goals.' },
    { id:'growth',     name:'Growth',     tier:'Investment',  desc:'Managed, evidence-based investing tuned to your risk.' },
    { id:'counsel',    name:'Counsel',    tier:'Advisory',    desc:'Ongoing guidance from a dedicated personal adviser.' },
    { id:'legacy',     name:'Legacy',     tier:'Wealth Mgmt', desc:'Full wealth management for estates, trusts and family.' },
    { id:'milestones', name:'Milestones', tier:'Specialist',  desc:'Specialist advice for one-off moments — sale, move, retirement.' }
  ]
};
