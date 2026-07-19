# AXIO Advisory — Coming Soon site: project summary

**Purpose of this document**: a reference for what's been built, why it was built that way, and what's still open — so anyone (including future-you) can get oriented without digging through git history or chat logs. For "how do I edit X" or "how do I run this locally," see [README.md](README.md) instead; this document is about the bigger picture.

_Last updated: 2026-07-19._

---

## What this is

A pre-launch "coming soon" waitlist site for **AXIO Advisory**, an independent financial, strategic and wealth advisory business. Visitors read a rotating hero pitch, see a countdown to launch, and submit their name/email/service interests to join a waitlist. On submission they're stored in a database and sent a branded confirmation email.

It's a static-first site (plain HTML/CSS/JS, no framework, no build step) with a small serverless backend bolted on for the one thing that needs a server: collecting waitlist signups.

---

## Live infrastructure at a glance

| Piece | What it is | Where |
|---|---|---|
| Hosting | Cloudflare Workers (static assets + one API route) | Project name `axis-coming-soon` in the Cloudflare dashboard |
| Domain | `axioadvisory.com` and `www.axioadvisory.com`, both live | DNS hosted on Cloudflare (migrated from GoDaddy) |
| Extra path | `/early-access` — identical page, used in share links | Generated mirror, see below |
| Waitlist database | Cloudflare D1 (`axio-waitlist`) | SQLite-based, only reachable from inside the Worker |
| Confirmation email | Resend, sending from `advisory@axioadvisory.com` | Domain-verified, DMARC-aligned |
| Email/CRM (future) | Not yet — see "Still open" below | — |
| Registrar | GoDaddy (still owns the domain registration; DNS moved off GoDaddy) | — |
| Company email | Microsoft 365 (direct subscription, not via GoDaddy) | MX/SPF/DKIM preserved through the DNS migration |

---

## What's built

### The site itself
- Single-page design: rotating hero (4 messages), countdown timer to launch, waitlist signup form with service-interest chips, success screen.
- Success screen includes a "share with a friend" row (WhatsApp/SMS/Facebook, pre-filled message) and personalizes based on which services the visitor selected.
- `/early-access` is a byte-identical mirror of the homepage (`early-access/index.html`), regenerated from `index.html` via `scripts/build-early-access.py` — used because the site's own share message links to `axioadvisory.com/early-access`. Canonical/OG tags on the mirror point back at the root so it doesn't count as duplicate content for search engines.
- `privacy.html` — a privacy policy page transcribed from the original PRD/legal draft. **Still has unresolved bracketed placeholders** (registered address, effective date, last-updated date, DPO name) — see "Still open."
- Full SEO pass: meta description, Open Graph, Twitter Card, JSON-LD `Organization` schema, `sitemap.xml`, `robots.txt`. The site is currently set to **`noindex`** deliberately (pre-launch) — everything is prepared so indexing can be switched on with a one-line change when you're ready (see README's "SEO" section for the exact steps).

### Waitlist backend
- Browser submits the form → POSTs to `/api/waitlist` (same origin, handled by `worker/index.js`) → inserts a row into D1 → sends the confirmation email via Resend → returns success.
- Duplicate email submissions are treated as success ("you're already on the list"), not an error — enforced by a `UNIQUE` constraint on `email` in the D1 schema (`d1/schema.sql`).
- No public API key or database credentials are ever exposed to the browser — the D1 database is only reachable from inside the Worker's own code, a meaningfully more secure setup than the earlier Supabase-based version (see "Key decisions" below).

### Confirmation email
- Full branded HTML template (`worker/index.js`'s `confirmationEmailHtml()`), designed to match the site's own visual identity translated into email-safe constraints (table layout, inline styles, system fonts — no custom web fonts, no modern CSS, since Gmail/Outlook strip both).
- Content: wordmark, seal + "You're on the list.", personalized greeting, a badge row showing which services they selected (only shown if they picked any), an italic sign-off, a "share it" row (WhatsApp/SMS/Facebook, same message as the site's own share feature), and a "stay in the loop" follow-us row (Instagram/YouTube/X/Facebook — **currently placeholder links**, see "Still open").
- Icons are real branded PNG badges (`assets/email-icons/*.png`), rendered from the exact same SVG artwork already used on the site, not new icon designs.
- `firstName` is HTML-escaped before being inserted into the email (defends against a malicious name value containing HTML/script).

### Domain & DNS
The domain was migrated from GoDaddy's default DNS to Cloudflare, while keeping Microsoft 365 email working throughout. Worth knowing if DNS ever needs touching again:
- Two legacy `A` records (GoDaddy's old Website Builder) and some zone-level "Workers Routes" without wildcard patterns caused a multi-day debugging saga where the root domain worked but every other path (CSS, JS, `/early-access`) 404'd. Root cause: Cloudflare Workers **Custom Domains** and **Workers Routes** are two different, easy-to-confuse mechanisms — Routes need an existing DNS record and don't wildcard-match subpaths unless you explicitly write `/*`. The fix was deleting the stray Routes/A-records and adding a plain proxied CNAME (`axioadvisory.com` → `axis-coming-soon.alex-edafe.workers.dev`) directly.
- Two DKIM CNAME records (`secureserver1/2._domainkey`) turned out to be orphaned leftovers from a **previously cancelled** GoDaddy-resold Microsoft 365 subscription — confirmed unused by the current (direct) M365 tenant and safely dropped.
- One unidentified TXT record (`"T9633689"`) still sits in DNS — never identified what it verifies. Left in place (harmless to keep, since TXT records are inert) rather than risk dropping something load-bearing.
- DMARC is set to `p=reject` (strict). Resend sends through a dedicated `send.axioadvisory.com` subdomain rather than the root domain specifically to avoid conflicting with the existing Microsoft 365 SPF record — DKIM alignment (not SPF) is what actually satisfies DMARC for Resend's sends.

### Deployment workflow
- Git-based: feature branches → merge to `main` → Cloudflare auto-deploys from `main` on every push (via its GitHub integration, using `npx wrangler deploy` under the hood).
- No manual file uploads, no separate deploy step — pushing to `main` is the deploy.

---

## Key decisions & why

| Decision | Why |
|---|---|
| Cloudflare over GitHub Pages/Cloudflare Pages | Consolidates hosting, DNS, database (D1), and (eventually) other infra under one account. GitHub Pages was the original plan and briefly set up, but abandoned once Cloudflare D1 made a single-platform setup possible. |
| Cloudflare D1 over Supabase | The waitlist backend was originally built on Supabase (browser → Supabase REST API directly, gated by Row Level Security). Rebuilt on D1 once hosting moved to Cloudflare Workers, since D1 needs no public API key at all (the database is only reachable from server-side Worker code) and avoids a second external account. The Supabase version was fully removed, not kept as a fallback. |
| No bot protection (Turnstile) yet | Deliberately deferred — adds real setup complexity for a pre-launch waitlist that isn't yet getting meaningful traffic. Flagged as a "harden later" item. |
| First name required (not optional) | Originally optional; changed to required so every confirmation email and future outreach can be personalized. |
| CTA copy: "Request early access" not "Join the private launch list" | "Private" read as exclusive/velvet-rope, in tension with the free "Foundation" tier and a hero line explicitly about financial intelligence *not* being a privilege. |
| `noindex` still on | Deliberate pre-launch choice (PRD decision D-07) — the page is fully prepared for SEO (meta tags, structured data, sitemap) so indexing is a one-line flip when the business is ready, not a rebuild. |

---

## Still open

Legal/content — needs business/legal input, not engineering:
- **Registered legal entity name** — currently displays "AXIO Advisory," not a full registered name like "AXIO Advisory Ltd" (PRD decision D-01).
- **`privacy.html` placeholders** — registered address, effective date, last-updated date, DPO name/title all still bracketed TBC placeholders. The site's `noindex` status and low current traffic make this non-urgent, but it should be resolved before the site is promoted publicly or `noindex` is removed.
- **Launch date** — `launchISO` in `scripts/config.js` is currently a placeholder (`2026-10-01T09:00:00Z`); update when there's a real date.
- **Social media handles** — every entry in `scripts/config.js`'s `social{}` object (LinkedIn, X, Instagram, Facebook, YouTube, TikTok, WhatsApp) is empty, so the site's own footer icons are hidden. Separately, the confirmation email's "follow us" row points at generic platform homepages as placeholders. Both need real AXIO-specific URLs once accounts exist.
- **`privacy@axioadvisory.com`** — the privacy policy currently points people at `advisory@axioadvisory.com` instead, since the dedicated inbox doesn't exist yet.

Engineering — reasonable to defer, not currently broken:
- **Bot protection / rate limiting** on `/api/waitlist` — no Turnstile or rate limiting yet. Fine at current volume; worth adding if the waitlist starts getting spam signups.
- **CRM / bulk email** — Resend currently only sends the one-time confirmation. No tool is wired up yet for sending a bulk "we've launched" email to the full list, or for proper unsubscribe/suppression-list management at scale. The privacy policy already names Brevo/HubSpot as the intended future tool for this.
- **Analytics** — mentioned as a possibility in the privacy policy (Plausible/Google Analytics) but nothing is actually implemented.
- **The unidentified `T9633689` DNS TXT record** — harmless to leave, but nobody's confirmed what service it belongs to.
- **Project naming mismatch** — the Cloudflare Worker/GitHub repo is named `axis-coming-soon` while the brand is "AXIO" — cosmetic, but worth knowing if you're hunting for the project in the Cloudflare dashboard.

---

## Where to go for more detail

- **[README.md](README.md)** — practical how-to: running locally, editing content (`scripts/config.js`), the `/early-access` mirror, the full waitlist backend setup checklist (D1 + Resend, step by step), and the SEO go-live checklist.
- **`scripts/config.js`** — the single source of truth for all editable content (hero copy, launch date, services, social links, share message).
- **`worker/index.js`** — the entire server-side logic: the waitlist API and the confirmation email template.
- **`d1/schema.sql`** — the waitlist table structure.
