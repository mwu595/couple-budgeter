-- ============================================================
-- Couple Budgeter — 005: budgets (v0.10.0)
-- Run after 004_agent_ingestion.sql.
-- Idempotent. Already folded into setup.sql for fresh installs.
--
-- A budget is a named, recurring spending cap ('month' or 'year') over a
-- set of sources: any number of labels and any number of projects. Spend
-- counts a transaction once if it carries any of the budget's labels or
-- belongs to any of its projects. Deleting a label or project drops it
-- from every budget (junction rows cascade); the budget itself stays.
--
-- Paste this whole file into the Supabase SQL editor and run it.
-- ============================================================

-- Two earlier drafts of this table never shipped: a monthly-only one with a
-- `month` column, and a per-label one with `label_id` + `period_start`.
-- Both are dropped if present so the shape below is the only one that exists.
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

create table if not exists budgets (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name         text not null,
  period       text not null check (period in ('month', 'year')),
  amount       numeric(12,2) not null check (amount > 0),
  created_at   timestamptz not null default now()
);

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

alter table budgets         enable row level security;
alter table budget_labels   enable row level security;
alter table budget_projects enable row level security;

drop policy if exists "budgets_all" on budgets;
create policy "budgets_all" on budgets
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());

drop policy if exists "budget_labels_all" on budget_labels;
create policy "budget_labels_all" on budget_labels
  for all using (
    budget_id in (select id from budgets where household_id = my_household_id())
  )
  with check (
    budget_id in (select id from budgets where household_id = my_household_id())
  );

drop policy if exists "budget_projects_all" on budget_projects;
create policy "budget_projects_all" on budget_projects
  for all using (
    budget_id in (select id from budgets where household_id = my_household_id())
  )
  with check (
    budget_id in (select id from budgets where household_id = my_household_id())
  );
