-- ============================================================
-- Couple Budgeter — Complete Schema
-- Run this first. Sets up all core tables, RLS, and helpers.
-- For Plaid integration, also run 002_plaid.sql.
-- ============================================================

-- ── Helper ───────────────────────────────────────────────────
-- Returns the household_id for the current auth user.
-- Used in all RLS policies.
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id
  from household_members
  where user_id = auth.uid()
  limit 1
$$;

-- ── Households ───────────────────────────────────────────────
create table if not exists households (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- ── Household members ────────────────────────────────────────
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

-- ── Household invites ────────────────────────────────────────
create table if not exists household_invites (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references households(id) on delete cascade,
  invited_email  text not null,
  invited_by     uuid not null references auth.users(id),
  accepted_at    timestamptz,
  created_at     timestamptz default now(),
  unique(household_id, invited_email)
);

-- ── Labels ───────────────────────────────────────────────────
create table if not exists labels (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  color        text not null,
  icon         text,
  created_at   timestamptz default now()
);

-- ── Accounts ─────────────────────────────────────────────────
create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

-- ── Projects ─────────────────────────────────────────────────
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

-- ── Recurring incomes ─────────────────────────────────────────
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

-- ── Transactions ─────────────────────────────────────────────
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

-- ── Transaction ↔ Label junction ─────────────────────────────
create table if not exists transaction_labels (
  transaction_id uuid not null references transactions(id) on delete cascade,
  label_id       uuid not null references labels(id) on delete cascade,
  primary key (transaction_id, label_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table household_invites  enable row level security;
alter table labels             enable row level security;
alter table accounts           enable row level security;
alter table projects           enable row level security;
alter table recurring_incomes  enable row level security;
alter table transactions       enable row level security;
alter table transaction_labels enable row level security;

-- households
create policy "households_select" on households
  for select using (id = my_household_id());

-- household_members
create policy "household_members_select" on household_members
  for select using (household_id = my_household_id());
create policy "household_members_insert" on household_members
  for insert with check (household_id = my_household_id());
create policy "household_members_update" on household_members
  for update using (household_id = my_household_id());

-- household_invites
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

-- labels, accounts, projects, recurring_incomes, transactions
create policy "labels_all"            on labels            for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "accounts_all"          on accounts          for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "projects_all"          on projects          for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "recurring_incomes_all" on recurring_incomes for all using (household_id = my_household_id()) with check (household_id = my_household_id());
create policy "transactions_all"      on transactions      for all using (household_id = my_household_id()) with check (household_id = my_household_id());

-- transaction_labels (access derived from parent transaction)
create policy "transaction_labels_all" on transaction_labels
  for all using (
    transaction_id in (select id from transactions where household_id = my_household_id())
  )
  with check (
    transaction_id in (select id from transactions where household_id = my_household_id())
  );
