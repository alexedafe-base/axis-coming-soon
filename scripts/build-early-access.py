#!/usr/bin/env python3
"""
Regenerates early-access/index.html from index.html.

The site is served identically at both / and /early-access (e.g. for the
WhatsApp share link's www.axioadvisory.com/early-access URL). Rather than
hand-maintaining a second copy of the markup, this script derives it from
the real source (index.html) by rewriting the handful of paths that need
to change one directory deeper. Content, styling and behaviour all still
come from the single shared styles/site.css, scripts/config.js and
scripts/site.js — only this generated HTML shell differs.

Run after every edit to index.html:
    python3 scripts/build-early-access.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
DEST_DIR = ROOT / "early-access"
DEST = DEST_DIR / "index.html"

# relative asset/script paths that need a leading "../" one level down
REWRITE_ATTRS = [
    (r'href="assets/', 'href="../assets/'),
    (r'href="styles/', 'href="../styles/'),
    (r'src="scripts/', 'src="../scripts/'),
]

def build():
    html = SRC.read_text()

    for old, new in REWRITE_ATTRS:
        html = html.replace(old, new)

    # canonical + og:url stay pointed at the root on purpose (avoids
    # duplicate-content SEO issues — root is the one "real" URL; this
    # page is a functioning mirror, not a second indexable page)
    assert 'href="https://axioadvisory.com/"' in html, "canonical link not found as expected"
    assert 'content="https://axioadvisory.com/"' in html, "og:url not found as expected"

    DEST_DIR.mkdir(exist_ok=True)
    DEST.write_text(html)
    print(f"wrote {DEST.relative_to(ROOT)} ({len(html)} bytes)")

if __name__ == "__main__":
    build()
