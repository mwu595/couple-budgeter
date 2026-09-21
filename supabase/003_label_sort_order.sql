-- ============================================================
-- Couple Budgeter — 003: labels.sort_order (v0.8.1)
-- Run after 002_plaid.sql. Adds user-defined label ordering.
-- Idempotent. Already folded into setup.sql for fresh installs.
-- ============================================================

alter table labels add column if not exists sort_order integer not null default 0;

create index if not exists labels_household_sort_idx
  on labels (household_id, sort_order);

-- Backfill a stable 0-based order (by creation time) for any household
-- whose labels are still all at the default 0. Households with a real
-- order are left untouched.
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
