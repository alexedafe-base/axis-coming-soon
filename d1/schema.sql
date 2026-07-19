-- AXIO waitlist — Cloudflare D1 schema
-- Run this once against the D1 database:
--   npx wrangler d1 execute axio-waitlist --remote --file=d1/schema.sql
-- (drop --remote to apply to the local dev database instead)
--
-- Design notes:
--  - email has a UNIQUE constraint, so a duplicate signup raises a
--    constraint error that worker/index.js catches and treats as success
--    ("you're already on the list") rather than an error.
--  - service_ids, consent and client are stored as TEXT holding JSON —
--    D1/SQLite has no native array or JSON column type. worker/index.js
--    stores them with JSON.stringify() and the raw JSON is available if
--    you ever need to query it back out with SQLite's json_extract().
--  - No public API key or Row Level Security is needed here (unlike the
--    previous Supabase setup) — D1 is only ever reachable from inside
--    worker/index.js via its binding, never directly from the browser.

CREATE TABLE IF NOT EXISTS waitlist (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  first_name   TEXT,
  email        TEXT NOT NULL UNIQUE,
  service_ids  TEXT NOT NULL DEFAULT '[]',
  consent      TEXT NOT NULL,
  client       TEXT,
  confirmed_at TEXT
);
