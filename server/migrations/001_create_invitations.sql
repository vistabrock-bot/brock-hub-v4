-- ─── 001_create_invitations.sql ─────────────────────────────────────────────
-- Run once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste this file → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Invitation records.
-- Each row tracks a unique sign-up link sent to an email address.
create table if not exists public.invitations (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null,
  invited_by  uuid references auth.users(id) on delete set null,
  email       text not null,
  accepted    boolean not null default false,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

-- Row-Level Security: enable it so unprivileged clients can't read all rows.
alter table public.invitations enable row level security;

-- Policy: a logged-in user can only SELECT their own sent invitations.
-- The server backend uses the service-role key which bypasses RLS entirely,
-- so INSERT / UPDATE from the server is unrestricted.
create policy "owner_select" on public.invitations
  for select
  using (auth.uid() = invited_by);
