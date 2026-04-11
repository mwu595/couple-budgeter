# Changelog

`[version] — date` • What shipped and why it matters.

---

## [0.5.0] — 2026-04-10

Money now has a whole new tab for income, a pretty Sankey chart, and strong opinions about where things belong.

- **Income page** (`/income`): dedicated home for income entries — form, date-grouped feed, period selector, owner filter
- **Recurring income manager**: tile grid of schedules (Weekly / Bi-weekly / Semi-monthly / Monthly); auto-spawns missed entries on load; editing only affects future, deleting only stops future
- **Cashflow Sankey chart** (Dashboard): income → spending categories waterfall; graceful no-income fallback; includes a "Potential Savings" node when you're not burning it all
- **Expenses rename**: "Transactions" is now "Expenses" everywhere except the URL, which doesn't care
- **Income hidden from Expenses page**: income entries mind their own business and stay out of the expense list
- **Income edit modal**: "Mark as reviewed" checkbox, same as Expenses
- **Reviewed checkmark on income rows**: green ✓ beside the amount on both Income page and Dashboard
- **Read-only income on Dashboard**: clicking an income row shows a toast instead of opening an edit form; page name in the message is dynamic
- **No tags or projects on income rows**: label picker and project picker hidden for income entries
- **Rainbow gradient on income rows**: deeper opacity (0.15) across all surfaces
- **Amount signs**: income shows `+`, expenses show `−`; income rows get the rainbow treatment on Expenses and Dashboard too
- **Settings note**: "Account connection coming soon." while Plaid API quota is still limited
- **Tags page cleanup**: project summary tiles removed; list view is enough

---

## [0.4.0] — 2026-04-10

The Dashboard got a proper filter bar and stopped pretending one pie chart controls everything.

- **Exclude Projects filter**: hide specific projects (or untagged transactions) from all dashboard metrics; persists across sessions
- **Page-level owner filter**: All / Person 1 / Person 2 / Shared pills now gate every chart, card, and list on the page
- **Unified filter bar**: period + owner + projects in one horizontally-scrollable row with pill styling
- **Period presets trimmed**: All Time, This Month, Last Month, Custom — the rest were clutter
- **Line chart defaults to Daily granularity**; "Granularity:" label added for clarity
- Removed: owner + project controls from inside pie chart card; Amount/Count view toggle (Amount only now)

---

## [0.3.1] — 2026-04-06

Bulk-select stopped lying about which labels and owners were actually shared.

- Bulk owner picker now shows the real common owner instead of always defaulting to Shared
- Project badge survives bulk-select mode (static colored dot instead of vanishing)
- `OwnerPicker` and `ProjectPicker` close on selection — no more phantom dropdowns
- Bulk label toggle computes the true intersection so clicking adds and clicking again removes

---

## [0.3.0] — 2026-04-06

Bulk actions grew up and moved into the header where they belong.

- **Bulk actions in header**: select mode transforms the page header into a command bar (Labels, Project, Owner, Delete, Cancel)
- **Bulk project assignment**: slap a project on a hundred transactions at once
- **Project summary strip** on Projects page: horizontal scrollable cards sorted newest first
- Toggle behavior: bulk-applying something already applied to all selected rows removes it
- Removed: `BulkActionBar` bottom sheet; project summary cards from Dashboard

---

## [0.2.0] — 2026-04-05

Projects landed. Now your "bathroom reno" can have its own color and its own shame spiral.

- **Projects feature**: named projects with color, icon, date range, optional budget
- `/projects` page with list, edit, delete, and per-project summary card
- Inline project picker on every transaction row
- `Project` type, `projectId` on `Transaction`, `lib/db/projects.ts`, `supabase/004_projects.sql`
- Nav bar updated with Projects tab

---

## [0.1.0] — 2026-03-31

The whole thing. Zero to working couples budget tracker in one shot.

**Core app (Steps 0–7)**
- Next.js 15, TypeScript strict, Tailwind v4, shadcn/ui, Zustand, Recharts
- Transaction feed: add, edit, delete, search, filter by label/owner/reviewed, date grouping
- Label system: color + emoji, inline multi-label assignment
- Ownership: User A / User B / Shared, inline picker, profile setup
- Analytics dashboard: total spend, by-owner, top labels, avg daily; pie + line charts
- Period selector: presets + custom range
- Bulk select: bulk-assign label/owner/reviewed, bulk delete
- CSV export, onboarding flow, sample data, PWA manifest, mobile + desktop layout

**Cloud backend (Steps 8–9)**
- Supabase Auth: email/password sign-up, sign-in, session management
- Households: two-user shared workspace, invite via email link
- Cloud PostgreSQL, optimistic updates, RLS scoped to household
- Plaid integration (sandbox): link-token, token exchange, account list, transaction sync

---

## Versioning

- `0.x.0` — new features
- `0.x.y` — fixes and polish
- `1.0.0` — first public release
