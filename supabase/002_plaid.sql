-- ============================================================
-- Couple Budgeter — Plaid Schema (optional)
-- Run after 001_schema.sql if you want bank account linking.
-- All three tables are service-role-only (no client RLS policies).
-- ============================================================

-- Linked bank connections (one per Plaid Item)
create table if not exists plaid_items (
  id               uuid primary key default gen_random_uuid(),
  household_id     uuid not null references households(id) on delete cascade,
  item_id          text not null unique,
  access_token     text not null,           -- never exposed to the client
  institution_id   text,
  institution_name text,
  cursor           text,                    -- incremental sync cursor
  created_at       timestamptz default now()
);

-- Accounts within each item (checking, savings, credit, etc.)
create table if not exists plaid_accounts (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  plaid_item_id uuid not null references plaid_items(id) on delete cascade,
  account_id    text not null unique,
  name          text not null,
  official_name text,
  type          text not null,
  subtype       text,
  mask          text,
  created_at    timestamptz default now()
);

-- Append-only ledger of every plaid_transaction_id ever imported.
-- Prevents re-importing deleted transactions on cursor reset or item re-link.
create table if not exists plaid_seen_ids (
  household_id         uuid not null references households(id) on delete cascade,
  plaid_transaction_id text not null,
  seen_at              timestamptz not null default now(),
  primary key (household_id, plaid_transaction_id)
);

-- RLS enabled, no permissive policies — service role access only
alter table plaid_items    enable row level security;
alter table plaid_seen_ids enable row level security;

-- plaid_accounts: household members can read their own (safe metadata only)
alter table plaid_accounts enable row level security;
create policy "plaid_accounts_household" on plaid_accounts
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());
