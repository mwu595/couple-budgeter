# Changelog

---

## [0.10.0] — 2026-09-22

Budgets. A new block under the summary cards where you cap what you actually think of as a category — one label ("Dining"), several ("Travel" = Flights + Hotels), or labels plus the projects you already file trips under. Caps are monthly for the regular stuff and yearly for the lumpy stuff, and they recur: set "Travel $10,000 a year" once and every year gets it. Each tile puts the spend against the cap on a meter that's green while you're on track, amber from 80%, red once you're over — split into a segment per label or project so you can see what's eating it — under "$X left · 12 days left". A transaction is only ever counted once, even when it carries a budgeted label *and* sits in a budgeted project, and a cap is always measured against a whole month or year, so a half-month filter never makes one look healthy.

Drag the grip to put tiles in the order you think about them; click one and the transaction list below shows exactly what's behind that number. Underneath, a collapsed "Not in any budget this month" list is the nudge that turns a chart into a habit: Dining Out at $412 with no cap is one tap from having one. New `budgets`, `budget_labels` and `budget_projects` tables — run `supabase/005_budgets.sql` and `supabase/006_budget_sort_order.sql`, or the consolidated `setup.sql`.

---

## [0.9.1] — 2026-09-21

The agent can now pre-assign who paid, who it's for, and labels on the transactions it pushes — three optional fields on `POST /api/agent-ingest` (`payer`, `for_who`, `labels`), resolved server-side against the household's members and label names. Unknown label names are skipped and echoed back as `unknown_labels`. Labels only ever attach to rows the request itself created, so nothing you've already touched gets relabelled. Requests without the new fields behave exactly as before.

---

## [0.9.0] — 2026-09-21

Your own AI agent can now feed the app. A new private endpoint, `POST /api/agent-ingest`, lets an external agent — Muse, for one — that holds your Plaid connection push transactions straight into your household. The endpoint is insert-only and deduplicates against an append-only ledger, so anything you edit stays edited and anything you delete stays deleted; every imported row lands unreviewed with a `[Muse]` prefix for you to sort. Bring the bank connection; the app brings the review flow, labels, ownership, and charts.

To make room for that, the app's own half-built Plaid integration is gone — the API routes, the Link button, the OAuth page, the Settings panel, two packages. The bank connection lives with the agent now, not in this codebase. On the database side, `plaid_items` and `plaid_accounts` are dropped and `plaid_seen_ids` becomes `agent_seen_ids`, carrying its rows forward. New env vars: `BUDGET_INGEST_TOKEN`, `BUDGET_HOUSEHOLD_ID`. Contract in `supabase/AGENT_INGESTION.md`.

---

## [0.8.1] — 2026-09-21

Labels are now draggable on the Tags page — the order you set shows up everywhere else, so your most-used tags can finally live at the top. Monthly Accumulative Spending gets a thin blue ghost of last month behind the current line, so you can see at a glance whether you're winning or losing the race against yourself. And the dashboard summary row gains a fifth card, Top Projects, for the three projects soaking up the most spend.

---

## [0.8.0] — 2026-04-28

Three new dashboard cards: Savings by Person (who's carrying this household), Monthly Accumulative Spending (a line that goes solid-to-dotted at today, because the future is uncertain), and Transaction Calendar (a dot for every day you spent money, which is probably all of them). Charts reordered, unified in height, and the calendar stopped treating out-of-range dates like suspects.

---

## [0.7.2] — 2026-04-22

Account field is now optional and moved below "Who Pays" — because you shouldn't need to know which credit card you used to log a coffee. Fixed a recurring income ghost bug where deleted schedules kept haunting you like an ex who still watches your Stories. "Clear all" respects reviewed entries like a responsible adult.

---

## [0.7.1] — 2026-04-15

Payer and "for who" got emoji pills. Filter bars got labels, a status dropdown, and a Clear button. Rows now show the full receipts of blame in plain emoji. Past SQL migrations consolidated so future archaeologists have less to dig through.

---

## [0.7.0] — 2026-04-15

Big rename: "Owner" is now "Payer" everywhere — TypeScript, DB, UI, CSV. Added a Personal Expense flag so you can quietly log things without implicating your partner. The database column had its identity crisis resolved.

---

## [0.6.0] — 2026-04-11

Full UI makeover. Uber black/white vibes, standardized cards, pill buttons, and a filter bar that doesn't embarrass itself. Charts finally look intentional. The whole app went from "works fine" to "I'd show this to someone."

---

## [0.5.0] — 2026-04-10

Income gets its own page. Recurring income scheduler auto-spawns entries so you can pretend payday just happens. Cashflow Sankey chart added for when you want to feel feelings about where your money went.

---

## [0.4.0] — 2026-04-10

Projects can now be excluded from Dashboard metrics — great for hiding the "Renovation" project from your own anxiety. Owner filter gates everything. Filter bar unified into one tidy row.

---

## [0.3.0] — 2026-04-06

Select a bunch of transactions and boss them around in bulk — labels, project, owner, delete. The header transforms into a command bar, which is very satisfying to use.

---

## [0.2.0] — 2026-04-05

Projects are here. Name them, color them, give them a budget they'll definitely blow through. Assign to transactions inline. `/projects` page added.

---

## [0.1.0] — 2026-03-31

It exists. Full-stack couples budget tracker: transactions, labels, analytics, Supabase auth, households, RLS, Plaid sandbox. Zero to shipped.

---

## Versioning

- `0.x.0` — new features
- `0.x.y` — fixes and polish
- `1.0.0` — first public release
