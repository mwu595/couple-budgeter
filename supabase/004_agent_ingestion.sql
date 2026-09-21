-- ============================================================
-- Couple Budgeter — 004: retire in-app Plaid; add agent ingest ledger (v0.9.0)
-- Run after 003_label_sort_order.sql.
-- Idempotent. Already folded into setup.sql for fresh installs.
--
-- The app no longer integrates Plaid. An external agent holds its own
-- bank connection and POSTs transactions to /api/agent-ingest. The only
-- agent-owned state here is the agent_seen_ids dedup ledger.
-- Contract: supabase/AGENT_INGESTION.md
-- ============================================================

-- The agent never needs access tokens or account metadata stored here.
drop table if exists plaid_accounts;
drop table if exists plaid_items;

-- Carry the old ledger forward under its new name so transactions the
-- user already deleted stay deleted.
do $$
begin
  if to_regclass('public.plaid_seen_ids') is not null
     and to_regclass('public.agent_seen_ids') is null then
    alter table plaid_seen_ids rename to agent_seen_ids;
    alter table agent_seen_ids rename column plaid_transaction_id to external_transaction_id;
  end if;
end $$;

create table if not exists agent_seen_ids (
  household_id            uuid not null references households(id) on delete cascade,
  external_transaction_id text not null,
  seen_at                 timestamptz not null default now(),
  primary key (household_id, external_transaction_id)
);

-- Intentionally no policies: service-role only.
alter table agent_seen_ids enable row level security;

-- transactions.plaid_transaction_id stays as the unique external
-- fingerprint column; the name is historical, not Plaid-specific.
