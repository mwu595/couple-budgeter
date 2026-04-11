-- ============================================================
-- Money Tracker — Plaid Seen IDs Ledger
-- Run this in Supabase SQL Editor after 004_projects.sql
-- ============================================================

-- Permanent append-only record of every plaid_transaction_id ever imported
-- for a household. Prevents re-importing deleted transactions on cursor reset
-- or item re-link.
create table if not exists plaid_seen_ids (
  household_id         uuid not null references households(id) on delete cascade,
  plaid_transaction_id text not null,
  seen_at              timestamptz not null default now(),

  primary key (household_id, plaid_transaction_id)
);

-- ── Security ─────────────────────────────────────────────────────────────────
-- Service role only — same pattern as plaid_items.
-- The browser client (anon key) can never read or write this table.
alter table plaid_seen_ids enable row level security;
-- No permissive policies added — all access goes through server-side
-- Route Handlers using the service role key.
