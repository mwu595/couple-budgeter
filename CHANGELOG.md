# Changelog

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
