-- ============================================================
-- Money Tracker — Plaid Schema
-- Run this in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Track each linked bank/institution (one Plaid Item per connection)
create table if not exists plaid_items (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households(id) on delete cascade,
  item_id          text not null unique,    -- Plaid's internal item identifier
  access_token     text not null,           -- NEVER exposed to the client
  institution_id   text,
  institution_name text,
  cursor           text,                    -- Incremental sync cursor for /transactions/sync
  created_at       timestamptz default now()
);

-- Linked accounts within each item (checking, savings, credit cards, etc.)
create table if not exists plaid_accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  plaid_item_id uuid not null references plaid_items(id) on delete cascade,
  account_id    text not null unique,       -- Plaid's account identifier
  name          text not null,
  official_name text,
  type          text not null,              -- depository, credit, investment, loan
  subtype       text,                       -- checking, savings, credit card, etc.
  mask          text,                       -- last 4 digits
  created_at    timestamptz default now()
);

-- Add deduplication column to transactions so we can re-sync without duplicates
alter table transactions
  add column if not exists plaid_transaction_id text unique;

-- ── Security ─────────────────────────────────────────────────────────────────
-- plaid_items: RLS enabled, NO permissive policies.
-- The anon client (browser) can never read access_token.
-- Only server-side Route Handlers using the service role key can access this table.
alter table plaid_items    enable row level security;

-- plaid_accounts: household members can read their own accounts (safe metadata only).
alter table plaid_accounts enable row level security;

create policy "plaid_accounts_household" on plaid_accounts
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());
