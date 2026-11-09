-- ============================================================
-- Couple Budgeter — 007: multi-currency expenses (v0.11.0)
-- Run after 006_budget_sort_order.sql. Idempotent.
-- Already folded into setup.sql for fresh installs.
--
-- transactions.amount stays the USD amount everything reads.
-- Foreign-currency expenses also record what was actually paid and the
-- rate used, locked at save time:
--   amount = original_amount / exchange_rate
--   exchange_rate = units of `currency` per 1 USD (e.g. 6.67 for CNY)
-- USD rows: currency = 'USD', original_amount / exchange_rate null.
-- ============================================================

alter table transactions add column if not exists currency        text not null default 'USD';
alter table transactions add column if not exists original_amount numeric(14,2);
alter table transactions add column if not exists exchange_rate   numeric(18,8);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transactions_currency_format') then
    alter table transactions
      add constraint transactions_currency_format check (currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transactions_exchange_rate_positive') then
    alter table transactions
      add constraint transactions_exchange_rate_positive check (exchange_rate is null or exchange_rate > 0);
  end if;
end $$;
