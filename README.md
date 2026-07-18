# AXIO — "Coming Soon" landing page

Static, self-contained pre-launch landing page and waitlist form for AXIO Advisory.
Built from the approved wireframe/prototype and **PRD v2.2**. This is the
**unbundled, editable source of truth** the PRD Asset Register asks for
(the previous deliverable existed only as a generated single-file bundle).

## Run locally

No build step. Serve the folder over HTTP (fonts need `http://`, not `file://`):

```bash
cd Website
python3 -m http.server 8137
# open http://localhost:8137
```

## Structure

```
Website/
  index.html          # markup (semantic, config-driven via data-* hooks) — THE edited source
  early-access/index.html  # generated mirror of index.html — do not edit directly, see below
  privacy.html         # privacy policy page (see "Editing content" below)
  styles/site.css      # design tokens + all styles (self-hosted @font-face)
  scripts/config.js    # ← single source of content & settings (edit this)
  scripts/site.js      # behaviour: chips, countdown, rotator, form
  scripts/build-early-access.py  # regenerates early-access/index.html from index.html
  robots.txt           # allows crawling (indexing is gated by meta robots, not robots.txt)
  sitemap.xml           # single homepage entry
  supabase/
    schema.sql          # waitlist table + RLS policy — run once in the Supabase SQL Editor
    functions/send-confirmation/index.ts  # Edge Function: emails a confirmation via Resend
  assets/
    favicon.svg        # AXIO mark
    favicon-32.png      # PNG fallback favicon (32×32)
    apple-touch-icon.png # iOS/home-screen icon (180×180)
    og-image.png         # social preview image (1200×630)
    fonts/*.woff2       # 34 self-hosted subsets: Crimson Text, IBM Plex Mono, Caveat
```

## The `/early-access` mirror

The site needs to be reachable at both `axioadvisory.com/` and
`axioadvisory.com/early-access` (the latter is the URL used in the
WhatsApp/SMS share message — see `shareMessage` in `scripts/config.js`).
Both are the *same page*, so rather than hand-maintaining two copies of
the markup, `early-access/index.html` is generated from `index.html`:

```bash
python3 scripts/build-early-access.py
```

Run this after every edit to `index.html`, before committing. The
generated file just has its relative asset paths rewritten one level
deeper (`assets/…` → `../assets/…`, etc.) — `styles/site.css`,
`scripts/config.js` and `scripts/site.js` are the same shared files, so
content/behaviour changes there apply to both automatically without
regenerating anything. The canonical link and `og:url` in the generated
copy deliberately still point at the root URL (not itself), so search
engines and social platforms treat `/early-access` as a mirror of the
homepage rather than duplicate content.

## Editing content — `scripts/config.js`

Everything the business changes lives in `AXIO_CONFIG` (maps to PRD §16):
launch date, hero messages, service catalogue, consent version, contact email,
privacy URL, social links, and the waitlist API URL. Do not hard-code content
in `index.html`.

- **Reschedule launch:** set `launchISO` (ISO 8601 UTC).
- **Social channels:** fill only the live URLs in `social{}`; empty ones are
  hidden automatically (PRD "render only non-empty approved values").
- **Privacy policy:** set `privacyUrl`. While empty, the link renders as plain
  text instead of a dead `#`. Currently points at the local `privacy.html`
  (transcribed from `AXIO_Website_Privacy_Policy_v1.0.pdf`, sections 1–17 only
  — the "Implementation note", Schedule 1/2 and Document approval table in
  that PDF are drafting instructions for engineering/legal, not end-user
  content, and were intentionally left out of the public page).

  **Still bracketed on `privacy.html`, pending legal sign-off** (shown inline
  as gold italic "TBC" text, per the PDF's own draft convention — same
  gating pattern as `legalEntity`/D-01 above): registered address, effective
  date, last-updated date, and DPO name/title (if one is appointed). The
  policy also currently points contacts at `advisory@axioadvisory.com`
  rather than the PDF's proposed `privacy@axioadvisory.com`, since that inbox
  isn't confirmed live yet — switch it once it exists. Do not publish/index
  the site (see D-07 below) until these are resolved.

## What was applied from the PRD

- **P0 — consent promise reconciled.** The old "…and nothing else" hero line was
  replaced with copy consistent with the consent checkbox (PRD §2.2, Appendix A).
- **P0 — no dead `#` links.** Social + privacy links are config-driven and are
  hidden / rendered as text when no real URL is set.
- **P0 — legal entity gated.** Displays `AXIO Advisory` (not "Ltd") until the
  registered controller name is confirmed — change `legalEntity` (D-01).
- Canonical service IDs (`foundation, clarity, growth, counsel, legacy, milestones`)
  drive selection; the form builds the exact **PRD §5.2 payload**.
- Accessibility: skip link, `aria-live` success region, Escape-dismiss popovers,
  reduced-motion handling, keyboard-operable chips, focus-pausing hero rotator.
- Decorative dashboard is `aria-hidden`, labelled *illustrative*, hidden ≤900px.
- Pre-launch `noindex` default (remove the robots meta in `index.html` to allow
  indexing — decision D-07).

## SEO — prepared now, switched on at D-07

Everything is in place so indexing can be turned on with a single-line change.
Until then, `noindex` deliberately keeps the placeholder out of search results
while `robots.txt` still allows crawling (crawlers must be able to fetch the
page to see the `noindex` tag).

What's already done:

- Descriptive `<title>` / meta description, canonical link, Open Graph +
  Twitter Card tags, and a JSON-LD `Organization` block (`index.html`).
  `sameAs` is synced at runtime from `AXIO_CONFIG.social` (`scripts/site.js`)
  so it never drifts from the footer links.
- `assets/og-image.png` (1200×630) and `assets/apple-touch-icon.png` (180×180)
  — on-brand, generated from the live design tokens. To regenerate after a
  copy/brand change, rebuild a temp HTML file styled with `styles/site.css`
  and render it with headless Chrome, e.g.:
  `chrome --headless --window-size=1200,630 --screenshot=out.png file://…`,
  then downscale 2× with `sips` if `--force-device-scale-factor=2` was used.
- `robots.txt` and `sitemap.xml` at the project root.
- Single `<h1>` (the active hero slide only — the other two rotator slides
  use `<p class="statement">` so search engines never see three H1s).

**Checklist to flip on at launch (D-07):**

1. Confirm the production domain. Every SEO tag currently hardcodes
   `https://axioadvisory.com/` (canonical, `og:url`, `og:image`, Twitter,
   JSON-LD `url`/`logo`, `sitemap.xml`) — update all of them together if the
   domain changes.
2. Remove `<meta name="robots" content="noindex, follow">` in `index.html`.
3. Fill in `privacyUrl` and at least the LinkedIn URL in `social{}`
   (`scripts/config.js`) — `sameAs` and the privacy link populate automatically.
4. Resolve D-01 (registered legal entity name) — JSON-LD `name` currently
   says "AXIO Advisory", not "Ltd".
5. Submit `sitemap.xml` in Google Search Console / Bing Webmaster Tools once
   the domain is live and verified.

## Waitlist backend (Supabase + Resend)

The form runs in **static/dev mode** until `supabaseUrl`/`supabaseAnonKey`
are set in `scripts/config.js` — until then it validates and shows the
success state, persisting to `localStorage` only (fine for previewing the
site, not for real signups).

**One-time setup**, all done in each provider's own dashboard — nothing
here needs a local build step or CLI install:

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (free tier is enough for a waitlist).
2. **Run the schema**: Project → SQL Editor → New query → paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql) → Run. This creates the
   `waitlist` table with Row Level Security locked to insert-only.
3. **Copy your keys**: Project Settings → API → copy the **Project URL** and
   the **`anon` `public`** key (not `service_role` — that one must never
   go in client-side code). Paste both into `scripts/config.js`
   (`supabaseUrl`, `supabaseAnonKey`). The anon key is safe to commit —
   it's designed to be public; the RLS policy from step 2 is what actually
   restricts what it can do.
4. **Create a Resend account** at [resend.com](https://resend.com) and verify
   `axioadvisory.com` as a sending domain (Resend gives you DNS records —
   SPF/DKIM — to add at your registrar; sending will fail until verified).
   Generate an API key.
5. **Deploy the confirmation email function**: `supabase/functions/send-confirmation/index.ts`.
   Deploying needs the [Supabase CLI](https://supabase.com/docs/guides/cli)
   (`supabase functions deploy send-confirmation`) — a one-time install,
   separate from anything the website itself needs.
6. **Set the function's secrets** (Project Settings → Edge Functions → Secrets):
   `RESEND_API_KEY` (from step 4) and `WEBHOOK_SECRET` (any random string
   you make up — used to verify webhook calls really come from Supabase).
7. **Wire up the trigger**: Database → Webhooks → Create a new webhook →
   table `waitlist`, event `INSERT`, target the deployed function URL, and
   add an HTTP header `x-webhook-secret: <the same value from step 6>`.

Once all seven steps are done, a real signup: inserts a row into
Supabase → the webhook fires → the Edge Function emails a confirmation via
Resend. Test by submitting the form and checking Supabase's Table Editor
for the new row, then your inbox for the email.

**Later, if/when this needs to harden for scale** (per PRD §6, decisions
D-01…D-08): swap the direct-to-Supabase insert for a Cloudflare Worker in
front of it (bot protection via Turnstile, rate limiting, idempotency
keys — `scripts/site.js` already has a legacy `apiUrl` code path ready for
this), and move email/CRM to Brevo or HubSpot for suppression-list sync.
Also still open: confirmed **legal entity**, live **privacy-policy URL**,
**social handles**, **launch date/destination**, analytics + cookie
posture, and a deletion/suppression process.

## Source artefacts

Originals in `OneDrive-Personal/AXIO_Website/`: the two standalone HTML bundles
(wireframe + prototype) and `AXIO_Coming_Soon_PRD_v2.2_Senior_Engineer.pdf`.
