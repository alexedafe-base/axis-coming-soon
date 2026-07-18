-- AXIO waitlist — Supabase schema
-- Run this once in the Supabase dashboard: Project → SQL Editor → New query → paste → Run.
--
-- Design notes:
--  - email has a unique constraint, so a duplicate signup gets a Postgres
--    409 conflict instead of a second row. scripts/site.js treats that as
--    a normal success ("you're already on the list") rather than an error.
--  - consent and client are stored as jsonb so the table shape matches the
--    existing client payload (scripts/site.js buildPayload()) exactly —
--    no field renaming/flattening needed on the JS side.
--  - Row Level Security is enabled with an INSERT-only policy for the
--    public "anon" role. The anon key is meant to be public (it ships in
--    client-side JS) — RLS is what keeps it safe: anyone can add a row,
--    nobody can read, edit or delete existing ones through this key.

create table if not exists waitlist (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  first_name     text,
  email          text not null unique,
  service_ids    text[] not null default '{}',
  consent        jsonb not null,
  client         jsonb,
  confirmed_at   timestamptz          -- set by the confirm-email flow later; null = unconfirmed
);

alter table waitlist enable row level security;

create policy "public can insert waitlist signups"
  on waitlist
  for insert
  to anon
  with check (true);

-- No select/update/delete policy is created for anon — by default that
-- means those operations are denied entirely for the public key, which
-- is intentional. You (the project owner) read/manage data via the
-- Supabase dashboard's Table Editor, authenticated as yourself, not
-- through the public API.
