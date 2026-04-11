-- Manually-managed accounts (separate from Plaid-linked accounts)
create table accounts (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade,
  name         text not null,
  created_at   timestamptz default now()
);

alter table accounts enable row level security;

create policy "household_isolation" on accounts
  for all using (
    household_id in (
      select household_id from household_members
      where user_id = auth.uid()
    )
  );
