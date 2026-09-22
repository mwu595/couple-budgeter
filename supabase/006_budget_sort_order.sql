-- ============================================================
-- Couple Budgeter — 006: budgets.sort_order (v0.10.0)
-- Run after 005_budgets.sql. Adds drag-to-reorder for budget tiles.
-- Idempotent. Already folded into setup.sql for fresh installs.
-- ============================================================

alter table budgets add column if not exists sort_order integer not null default 0;

create index if not exists budgets_household_sort_idx
  on budgets (household_id, sort_order);

-- Backfill a stable 0-based order (by creation time) for any household
-- whose budgets are still all at the default 0. Households with a real
-- order are left untouched.
update budgets b
set    sort_order = sub.rn
from (
  select id,
         row_number() over (partition by household_id order by created_at, id) - 1 as rn
  from   budgets
) sub
where b.id = sub.id
  and not exists (
    select 1 from budgets o
    where o.household_id = b.household_id
      and o.sort_order <> 0
  );
