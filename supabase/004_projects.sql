-- Projects table
create table projects (
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

alter table projects enable row level security;

create policy "projects_all" on projects
  for all using (household_id = my_household_id())
  with check (household_id = my_household_id());

-- Add project_id to transactions
alter table transactions
  add column project_id uuid references projects(id) on delete set null;
