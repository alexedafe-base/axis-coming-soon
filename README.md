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
  index.html          # markup (semantic, config-driven via data-* hooks)
  privacy.html         # privacy policy page (see "Editing content" below)
  styles/site.css      # design tokens + all styles (self-hosted @font-face)
  scripts/config.js    # ← single source of content & settings (edit this)
  scripts/site.js      # behaviour: chips, countdown, rotator, form
  robots.txt           # allows crawling (indexing is gated by meta robots, not robots.txt)
  sitemap.xml           # single homepage entry
  assets/
    favicon.svg        # AXIO mark
    favicon-32.png      # PNG fallback favicon (32×32)
    apple-touch-icon.png # iOS/home-screen icon (180×180)
    og-image.png         # social preview image (1200×630)
    fonts/*.woff2       # 34 self-hosted subsets: Crimson Text, IBM Plex Mono, Caveat
```

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

## Not built here (needs external accounts + open decisions)

The form runs in **static/dev mode**: it validates and shows the success state,
persisting to `localStorage` only. The PRD names localStorage-only a **release
blocker** — a real backend is required before public launch. To connect it, set
`AXIO_CONFIG.apiUrl` to the waitlist Worker; the client already POSTs the correct
JSON with an `Idempotency-Key`.

Still required for production (PRD §6, blocked on decisions D-01…D-08):

- **Waitlist API** (Cloudflare Worker) — validation, Turnstile, idempotency,
  consent logging → **Supabase** (system of record).
- **Email/CRM** (Brevo) — confirmation email, double opt-in, suppression sync.
- Confirmed **legal entity**, live **privacy-policy URL**, **social handles**,
  **launch date/destination**, analytics + cookie posture.
- SPF/DKIM/DMARC, monitoring, deletion/suppression process, launch checklist (§13.1).

## Source artefacts

Originals in `OneDrive-Personal/AXIO_Website/`: the two standalone HTML bundles
(wireframe + prototype) and `AXIO_Coming_Soon_PRD_v2.2_Senior_Engineer.pdf`.
