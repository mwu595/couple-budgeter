-- ============================================================
-- Money Tracker — Initial Schema
-- Run this in Supabase SQL Editor to set up all tables + RLS.
-- ============================================================

-- ── Households ───────────────────────────────────────────────
create table if not exists households (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

-- ── Household members ────────────────────────────────────────
-- Each auth user maps to a slot ('user_a' or 'user_b') in a household.
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

-- ── Transactions ─────────────────────────────────────────────
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  date         date not null,
  merchant     text not null,
  amount       numeric(12, 2) not null,
  account_name text not null,
  notes        text,
  owner_id     text not null check (owner_id in ('user_a', 'user_b', 'shared')),
  reviewed     boolean not null default false,
  created_at   timestamptz default now()
);

-- ── Transaction ↔ Label junction ─────────────────────────────
create table if not exists transaction_labels (
  transaction_id uuid not null references transactions(id) on delete cascade,
  label_id       uuid not null references labels(id) on delete cascade,
  primary key (transaction_id, label_id)
);

-- ============================================================
-- Row Level Security
-- Every table is locked down: users can only read/write rows
-- belonging to their own household.
-- ============================================================

alter table households          enable row level security;
alter table household_members   enable row level security;
alter table household_invites   enable row level security;
alter table labels              enable row level security;
alter table transactions        enable row level security;
alter table transaction_labels  enable row level security;

-- Helper: returns the household_id for the current auth user.
-- Used in all RLS policies to avoid repeating the subquery.
create or replace function my_household_id()
returns uuid language sql stable security definer as $$
  select household_id
  from household_members
  where user_id = auth.uid()
  limit 1
$$;

-- ── households: members can read their own household ─────────
create policy "households_select" on households
  for select using (id = my_household_id());

-- ── household_members: read all members of own household ─────
create policy "household_members_select" on household_members
  for select using (household_id = my_household_id());

create policy "household_members_insert" on household_members
  for insert with check (household_id = my_household_id());

create policy "household_members_update" on household_members
  for update using (household_id = my_household_id());

-- ── household_invites ────────────────────────────────────────
-- Sender can read/create invites for their household.
-- Invitee can read an invite addressed to their email (for acceptance).
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

-- ── labels ───────────────────────────────────────────────────
create policy "labels_all" on labels
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());

-- ── transactions ─────────────────────────────────────────────
create policy "transactions_all" on transactions
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());

-- ── transaction_labels ───────────────────────────────────────
-- Access is derived: if you can see the transaction, you can see its labels.
create policy "transaction_labels_all" on transaction_labels
  for all using (
    transaction_id in (
      select id from transactions where household_id = my_household_id()
    )
  )
  with check (
    transaction_id in (
      select id from transactions where household_id = my_household_id()
    )
  );
