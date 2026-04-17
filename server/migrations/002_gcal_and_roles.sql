-- ─── 002_gcal_and_roles.sql ──────────────────────────────────────────────────
-- Run once in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste this file → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Google Calendar tokens ───────────────────────────────────────────────────
-- Stores OAuth 2.0 tokens per user for Google Calendar access.
-- The service-role key bypasses RLS so the server can read/write freely.
-- Authenticated users can only see their own row.

create table if not exists public.google_calendar_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  access_token  text not null,
  refresh_token text,
  token_expiry  timestamptz,
  scope         text,
  connected_at  timestamptz not null default now(),
  constraint google_calendar_tokens_user_id_unique unique (user_id)
);

-- Row-Level Security: each user can only access their own token row.
alter table public.google_calendar_tokens enable row level security;

-- Authenticated users may select/update/delete their own token row.
create policy "owner_access" on public.google_calendar_tokens
  for all
  using (auth.uid() = user_id);

-- ─── Role helper (optional) ──────────────────────────────────────────────────
-- Convenience view so frontend queries can see role from app_metadata.
-- This relies on Supabase's auth.users table; no extra table is needed.
-- Roles are stored in auth.users.app_metadata->>'role' and set only via
-- the service-role key (admin API), so users cannot escalate their own role.

-- If you prefer an explicit profiles table you can create one here, e.g.:
--
-- create table if not exists public.user_profiles (
--   id       uuid primary key references auth.users(id) on delete cascade,
--   role     text not null default 'user' check (role in ('user', 'admin')),
--   full_name text
-- );
-- alter table public.user_profiles enable row level security;
-- create policy "owner_select" on public.user_profiles
--   for select using (auth.uid() = id);
