-- ============================================================
-- Couple Budgeter — Complete Database Setup
-- ============================================================
-- Copy/paste this entire file into the Supabase SQL editor and run.
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE.
--
-- Contains:
--   1. Helper function (my_household_id)
--   2. Core tables (households, labels, budgets, transactions, etc.)
--   3. Row-Level Security policies
--   4. Agent ingestion — the ledger behind POST /api/agent-ingest,
--      plus removal of the retired in-app Plaid tables.
-- ============================================================


-- ─── 1. Helper function ─────────────────────────────────────
-- Returns the household_id for the current auth user.
-- Used in every RLS policy below.
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id
  from household_members
  where user_id = auth.uid()
  limit 1
$$;


-- ─── 2. Core tables ─────────────────────────────────────────

create table if not exists households (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  slot         text not null check (slot in ('user_a', 'user_b')),
  display_name text not null,
  avatar_emoji text not null default '🧑',
  created_at   timestamptz default now(),
  unique(household_id, user_id),
  unique(household_id, slot)
);

create table if not exists household_invites (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  invited_email  text not null,
  invited_by     uuid not null references auth.users(id),
  accepted_at    timestamptz,
  created_at     timestamptz default now(),
  unique(household_id, invited_email)
);

create table if not exists labels (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null,
  icon         text,
  sort_order   integer not null default 0,
  created_at   timestamptz default now()
);

create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null default '#888784',
  icon         text,
  start_date   date not null,
  end_date     date not null,
  budget       numeric(12,2),
  created_at   timestamptz default now()
);

create table if not exists recurring_incomes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null check (amount > 0),
  payer_id     text not null check (payer_id in ('user_a', 'user_b', 'shared')),
  account_name text not null,
  notes        text,
  frequency    text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'semimonthly')),
  start_date   date not null,
  next_date    date not null,
  created_at   timestamptz not null default now()
);

-- Two pre-release drafts of `budgets` (a monthly-only one with `month`, and a
-- per-label one with `label_id` + `period_start`) never shipped; drop either
-- if present so `create table if not exists` below isn't a no-op on them.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets'
      and column_name in ('month', 'label_id', 'period_start')
  ) then
    drop table budgets cascade;
  end if;
end $$;

-- A named, recurring spending cap ('month' | 'year') over any number of
-- labels and projects (junction tables below). Deleting a label or project
-- drops it from every budget; the budget itself stays.
create table if not exists budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  period       text not null check (period in ('month', 'year')),
  amount       numeric(12,2) not null check (amount > 0),
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Deployments that ran 005 before sort_order existed: `create table if not
-- exists` above is a no-op for them, so add the column here.
alter table budgets add column if not exists sort_order integer not null default 0;

create table if not exists budget_labels (
  budget_id uuid not null references budgets(id) on delete cascade,
  label_id  uuid not null references labels(id)  on delete cascade,
  primary key (budget_id, label_id)
);

create table if not exists budget_projects (
  budget_id  uuid not null references budgets(id)  on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (budget_id, project_id)
);

create index if not exists budgets_household_idx on budgets (household_id);
create index if not exists budgets_household_sort_idx on budgets (household_id, sort_order);

create table if not exists transactions (
  id                   uuid primary key default gen_random_uuid(),
  household_id         uuid not null references households(id) on delete cascade,
  date                 date not null,
  merchant             text not null,
  amount               numeric(12,2) not null,
  account_name         text not null,
  notes                text,
  payer_id             text not null check (payer_id in ('user_a', 'user_b', 'shared')),
  applied_to           text not null default 'shared' check (applied_to in ('user_a', 'user_b', 'shared')),
  reviewed             boolean not null default false,
  project_id           uuid references projects(id) on delete set null,
  recurring_income_id  uuid references recurring_incomes(id) on delete set null,
  plaid_transaction_id text unique,
  created_at           timestamptz default now()
);

create table if not exists transaction_labels (
  transaction_id uuid not null references transactions(id) on delete cascade,
  label_id       uuid not null references labels(id) on delete cascade,
  primary key (transaction_id, label_id)
);

-- Deployments created before sort_order existed: `create table if not exists`
-- above is a no-op for them, so add the column here.
alter table labels add column if not exists sort_order integer not null default 0;

-- Index used by `order by sort_order` when loading labels.
create index if not exists labels_household_sort_idx
  on labels (household_id, sort_order);

-- Backfill a stable initial order (0-based, by creation time) for any
-- household whose labels are still all at the default 0. Households that
-- already have a real order — including ones where a user dragged a label
-- to position 0 — are left untouched, so this is safe to re-run.
update labels l
set    sort_order = sub.rn
from (
  select id,
         row_number() over (partition by household_id order by created_at, id) - 1 as rn
  from   labels
) sub
where l.id = sub.id
  and not exists (
    select 1 from labels o
    where o.household_id = l.household_id
      and o.sort_order <> 0
  );


-- ─── 3. Row-Level Security ──────────────────────────────────

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table household_invites  enable row level security;
alter table labels             enable row level security;
alter table accounts           enable row level security;
alter table projects           enable row level security;
alter table recurring_incomes  enable row level security;
alter table budgets            enable row level security;
alter table budget_labels      enable row level security;
alter table budget_projects    enable row level security;
alter table transactions       enable row level security;
alter table transaction_labels enable row level security;

-- Drop-then-create pattern so this script is re-runnable.
drop policy if exists "households_select"               on households;
drop policy if exists "household_members_select"        on household_members;
drop policy if exists "household_members_insert"        on household_members;
drop policy if exists "household_members_update"        on household_members;
drop policy if exists "household_invites_select_member" on household_invites;
drop policy if exists "household_invites_select_invitee" on household_invites;
drop policy if exists "household_invites_insert"        on household_invites;
drop policy if exists "household_invites_update"        on household_invites;
drop policy if exists "labels_all"                      on labels;
drop policy if exists "accounts_all"                    on accounts;
drop policy if exists "projects_all"                    on projects;
drop policy if exists "recurring_incomes_all"           on recurring_incomes;
drop policy if exists "budgets_all"                     on budgets;
drop policy if exists "budget_labels_all"               on budget_labels;
drop policy if exists "budget_projects_all"             on budget_projects;
drop policy if exists "transactions_all"                on transactions;
drop policy if exists "transaction_labels_all"          on transaction_labels;

create policy "households_select" on households
  for select using (id = my_household_id());

create policy "household_members_select" on household_members
  for select using (household_id = my_household_id());
create policy "household_members_insert" on household_members
  for insert with check (household_id = my_household_id());
create policy "household_members_update" on household_members
  for update using (household_id = my_household_id());

create policy "household_invites_select_member" on household_invites
  for select using (household_id = my_household_id());
create policy "household_invites_select_invitee" on household_invites
  for select using (
    invited_email = (select email from auth.users where id = auth.uid())
  );
create policy "household_invites_insert" on household_invites
  for insert with check (household_id = my_household_id());
create policy "household_invites_update" on household_invites
  for update using (household_id = my_household_id());

create policy "labels_all"            on labels            for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "accounts_all"          on accounts          for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "projects_all"          on projects          for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "recurring_incomes_all" on recurring_incomes for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "budgets_all"           on budgets           for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "transactions_all"      on transactions      for all using (household_id = my_household_id()) with check (household_id = my_household_id());

create policy "transaction_labels_all" on transaction_labels
  for all using (
    transaction_id in (select id from transactions where household_id = my_household_id())
  )
  with check (
    transaction_id in (select id from transactions where household_id = my_household_id())
  );

create policy "budget_labels_all" on budget_labels
  for all using (
    budget_id in (select id from budgets where household_id = my_household_id())
  )
  with check (
    budget_id in (select id from budgets where household_id = my_household_id())
  );

create policy "budget_projects_all" on budget_projects
  for all using (
    budget_id in (select id from budgets where household_id = my_household_id())
  )
  with check (
    budget_id in (select id from budgets where household_id = my_household_id())
  );


-- ============================================================
-- 4. Agent ingestion
-- ============================================================
-- This app does NOT talk to Plaid or any bank. An external agent holds
-- its own bank connection and sync state, and POSTs new transactions to
-- /api/agent-ingest (bearer-token auth, service role inside). The only
-- agent-owned state in this database is the dedup ledger below.
-- Contract: supabase/AGENT_INGESTION.md and the header of
-- src/app/api/agent-ingest/route.ts.
--
-- transactions.plaid_transaction_id is the agent's external fingerprint
-- (unique). The column name is historical; it is not Plaid-specific.
-- ============================================================

-- Retired in-app Plaid integration (v0.9.0). The agent never needs
-- access tokens or account metadata stored here.
drop table if exists plaid_accounts;
drop table if exists plaid_items;

-- Existing deployments: carry the old ledger forward under its new name
-- so transactions the user already deleted stay deleted.
do $$
begin
  if to_regclass('public.plaid_seen_ids') is not null
     and to_regclass('public.agent_seen_ids') is null then
    alter table plaid_seen_ids rename to agent_seen_ids;
    alter table agent_seen_ids rename column plaid_transaction_id to external_transaction_id;
  end if;
end $$;

-- Append-only ledger of every external fingerprint ever ingested.
-- Deleting a transaction in the app does not remove its ledger row,
-- which is exactly what prevents it from being re-imported.
create table if not exists agent_seen_ids (
  household_id            uuid not null references households(id) on delete cascade,
  external_transaction_id text not null,
  seen_at                 timestamptz not null default now(),
  primary key (household_id, external_transaction_id)
);

-- Intentionally no policies: service-role only.
alter table agent_seen_ids enable row level security;
