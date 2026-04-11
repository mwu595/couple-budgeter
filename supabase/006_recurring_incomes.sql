-- ── Recurring incomes ────────────────────────────────────────────────────────
-- Stores the recurring income manager entries. Each row drives automatic
-- spawning of income transactions when nextDate <= today on app load.

CREATE TABLE IF NOT EXISTS recurring_incomes (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id   UUID          NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name           TEXT          NOT NULL,
  amount         NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  owner_id       TEXT          NOT NULL CHECK (owner_id IN ('user_a', 'user_b', 'shared')),
  account_name   TEXT          NOT NULL,
  notes          TEXT,
  frequency      TEXT          NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'semimonthly')),
  start_date     DATE          NOT NULL,
  next_date      DATE          NOT NULL,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE recurring_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "household members can manage recurring incomes"
  ON recurring_incomes
  FOR ALL
  USING  (household_id = my_household_id())
  WITH CHECK (household_id = my_household_id());

-- ── Link spawned transactions back to their manager (informational) ───────────

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS recurring_income_id UUID
    REFERENCES recurring_incomes(id) ON DELETE SET NULL;
