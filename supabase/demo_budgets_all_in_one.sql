-- ============================================================
-- Couple Budgeter — Budgets: migration + demo data, all in one
-- ============================================================
-- Select all, copy, paste into a NEW Supabase SQL editor tab, Run.
-- Safe to re-run.
--
-- Part 1 — 005_budgets.sql : (re)creates `budgets` + `budget_labels` +
--          `budget_projects`. Drops the pre-release drafts if present.
-- Part 2 — demo seed        : "Test …" labels and projects, "[TEST] …"
--          transactions, and budgets in every state (ok / near / over),
--          including one grouped across labels and one that mixes labels
--          with projects.
--
-- To remove the demo data later, run the DELETEs at the bottom of Part 2.
-- ============================================================


-- ############################################################
-- Part 1 — migration
-- ############################################################

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


-- ############################################################
-- Part 2 — demo seed
-- ############################################################

-- Session-scoped helper (pg_temp vanishes when the SQL editor session ends):
-- insert one test transaction, optionally attached to a label and a project.
create or replace function pg_temp.demo_add_tx(hid uuid, d date, merchant text, amt numeric, lbl uuid, proj uuid default null)
returns void language plpgsql as $fn$
declare tid uuid;
begin
  insert into transactions (household_id, date, merchant, amount, account_name, payer_id, applied_to, reviewed, project_id)
  values (hid, d, '[TEST] ' || merchant, amt, 'Test Card', 'shared', 'shared', true, proj)
  returning id into tid;
  if lbl is not null then
    insert into transaction_labels (transaction_id, label_id) values (tid, lbl);
  end if;
end $fn$;

-- Insert a budget with its label + project sources; returns nothing.
create or replace function pg_temp.demo_add_budget(hid uuid, nm text, per text, amt numeric, lbls uuid[], projs uuid[])
returns void language plpgsql as $fn$
declare bid uuid;
begin
  insert into budgets (household_id, name, period, amount) values (hid, nm, per, amt) returning id into bid;
  insert into budget_labels   (budget_id, label_id)   select bid, unnest(lbls)  where lbls  is not null;
  insert into budget_projects (budget_id, project_id) select bid, unnest(projs) where projs is not null;
end $fn$;

do $$
declare
  -- Uses the oldest household. If you have more than one, replace with:
  --   hid uuid := '00000000-0000-0000-0000-000000000000';
  hid uuid := (select id from households order by created_at asc limit 1);

  this_m date := date_trunc('month', current_date)::date;
  last_m date := (date_trunc('month', current_date) - interval '1 month')::date;
  this_y date := date_trunc('year',  current_date)::date;

  l_dining    uuid;
  l_groceries uuid;
  l_transport uuid;
  l_fun       uuid;
  l_flights   uuid;
  l_hotels    uuid;
  l_gifts     uuid;
  p_japan     uuid;
  p_getaway   uuid;
  next_sort   integer;
begin
  if hid is null then
    raise exception 'No household found — sign in and finish onboarding first.';
  end if;

  -- Idempotent: wipe our own previous rows.
  delete from transactions where household_id = hid and merchant like '[TEST] %';
  delete from budgets      where household_id = hid and name like 'Test %';
  delete from labels       where household_id = hid and name like 'Test %';
  delete from projects     where household_id = hid and name like 'Test %';

  select coalesce(max(sort_order), -1) + 1 into next_sort from labels where household_id = hid;

  insert into labels (household_id, name, color, icon, sort_order) values
    (hid, 'Test Dining',    '#f97316', '🍜', next_sort),
    (hid, 'Test Groceries', '#22c55e', '🥬', next_sort + 1),
    (hid, 'Test Transport', '#3b82f6', '🚕', next_sort + 2),
    (hid, 'Test Fun',       '#ec4899', '🎟️', next_sort + 3),
    (hid, 'Test Flights',   '#0ea5e9', '✈️', next_sort + 4),
    (hid, 'Test Hotels',    '#8b5cf6', '🏨', next_sort + 5),
    (hid, 'Test Gifts',     '#f59e0b', '🎁', next_sort + 6);

  select id into l_dining    from labels where household_id = hid and name = 'Test Dining';
  select id into l_groceries from labels where household_id = hid and name = 'Test Groceries';
  select id into l_transport from labels where household_id = hid and name = 'Test Transport';
  select id into l_fun       from labels where household_id = hid and name = 'Test Fun';
  select id into l_flights   from labels where household_id = hid and name = 'Test Flights';
  select id into l_hotels    from labels where household_id = hid and name = 'Test Hotels';
  select id into l_gifts     from labels where household_id = hid and name = 'Test Gifts';

  insert into projects (household_id, name, color, icon, start_date, end_date) values
    (hid, 'Test Japan Trip',      '#ef4444', '🗾', this_y + 60,  this_y + 74),
    (hid, 'Test Weekend Getaway', '#14b8a6', '🏕️', this_y + 180, this_y + 182);

  select id into p_japan   from projects where household_id = hid and name = 'Test Japan Trip';
  select id into p_getaway from projects where household_id = hid and name = 'Test Weekend Getaway';

  -- ── This month ─────────────────────────────────────────────
  perform pg_temp.demo_add_tx(hid, this_m + 1,  'Ramen Bar',        62.00, l_dining);     -- Dining 412
  perform pg_temp.demo_add_tx(hid, this_m + 4,  'Taco Truck',       48.00, l_dining);
  perform pg_temp.demo_add_tx(hid, this_m + 8,  'Sushi Night',     140.00, l_dining);
  perform pg_temp.demo_add_tx(hid, this_m + 12, 'Pizza Delivery',   57.00, l_dining);
  perform pg_temp.demo_add_tx(hid, this_m + 16, 'Brunch Spot',     105.00, l_dining);

  perform pg_temp.demo_add_tx(hid, this_m + 2,  'Farmers Market',   80.00, l_groceries);  -- Groceries 280
  perform pg_temp.demo_add_tx(hid, this_m + 9,  'Supermarket',     120.00, l_groceries);
  perform pg_temp.demo_add_tx(hid, this_m + 15, 'Corner Grocer',    80.00, l_groceries);

  perform pg_temp.demo_add_tx(hid, this_m + 3,  'Metro Card',       60.00, l_transport);  -- Transport 120
  perform pg_temp.demo_add_tx(hid, this_m + 11, 'Rideshare',        60.00, l_transport);

  perform pg_temp.demo_add_tx(hid, this_m + 6,  'Cinema',           35.00, l_fun);        -- Fun 95, no budget
  perform pg_temp.demo_add_tx(hid, this_m + 13, 'Bowling',          60.00, l_fun);

  perform pg_temp.demo_add_tx(hid, this_m + 7,  'Mystery Charge',   50.00, null);         -- unlabeled 50

  -- ── Last month ─────────────────────────────────────────────
  perform pg_temp.demo_add_tx(hid, last_m + 3,  'Steakhouse',      220.00, l_dining);     -- Dining 520
  perform pg_temp.demo_add_tx(hid, last_m + 10, 'Wine Bar',        180.00, l_dining);
  perform pg_temp.demo_add_tx(hid, last_m + 20, 'Noodle House',    120.00, l_dining);

  perform pg_temp.demo_add_tx(hid, last_m + 5,  'Supermarket',     200.00, l_groceries);  -- Groceries 200

  -- ── This year (yearly-cadence sources) ─────────────────────
  -- Dated relative to Jan 1 (Feb–Jul) so they never land in this month or
  -- last month and the monthly numbers above stay exact.
  -- Japan trip: a flight tagged Flights AND filed under the project counts
  -- once, attributed to the project; the hotel is project-only.
  perform pg_temp.demo_add_tx(hid, this_y + 61,  'Airline Tickets', 1400.00, l_flights, p_japan);  -- Japan 2400
  perform pg_temp.demo_add_tx(hid, this_y + 63,  'Kyoto Ryokan',    1000.00, null,      p_japan);
  perform pg_temp.demo_add_tx(hid, this_y + 181, 'Cabin Rental',     420.00, null,      p_getaway); -- Getaway 420
  perform pg_temp.demo_add_tx(hid, this_y + 120, 'Weekend Flight',   380.00, l_flights);           -- Flights 380 (no project)
  perform pg_temp.demo_add_tx(hid, this_y + 121, 'City Hotel',       260.00, l_hotels);            -- Hotels 260 (no project)

  perform pg_temp.demo_add_tx(hid, this_y + 45,  'Birthday Gift',    150.00, l_gifts);   -- Gifts 650
  perform pg_temp.demo_add_tx(hid, this_y + 130, 'Wedding Gift',     300.00, l_gifts);
  perform pg_temp.demo_add_tx(hid, this_y + 160, 'Anniversary',      200.00, l_gifts);

  -- ── Budgets ────────────────────────────────────────────────
  -- Monthly: single-label caps in each state, plus one grouped across two labels.
  perform pg_temp.demo_add_budget(hid, 'Test Dining',         'month', 300.00,  array[l_dining],              null);              -- over  (412 / 300)
  perform pg_temp.demo_add_budget(hid, 'Test Groceries',      'month', 320.00,  array[l_groceries],           null);              -- near  (280 / 320)
  perform pg_temp.demo_add_budget(hid, 'Test Getting around', 'month', 400.00,  array[l_transport],           null);              -- ok    (120 / 400)
  perform pg_temp.demo_add_budget(hid, 'Test Food',           'month', 800.00,  array[l_dining, l_groceries], null);              -- ok    (692 / 800), two segments
  -- Yearly: labels + projects in one cap, and a single label that's over.
  perform pg_temp.demo_add_budget(hid, 'Test Travel',         'year',  6000.00, array[l_flights, l_hotels],   array[p_japan, p_getaway]); -- ok (3460 / 6000), four segments
  perform pg_temp.demo_add_budget(hid, 'Test Gifts',          'year',   500.00, array[l_gifts],               null);              -- over  (650 / 500)

  raise notice 'Seeded budgets demo for household % (month %, last month %, year %)', hid, this_m, last_m, this_y;
end $$;

-- ── Cleanup (uncomment and run to remove the demo data) ──────────────────
-- delete from transactions where merchant like '[TEST] %';
-- delete from budgets      where name like 'Test %';
-- delete from labels       where name like 'Test %';
-- delete from projects     where name like 'Test %';
