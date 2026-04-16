# Changelog

---

## [0.7.1] — 2026-04-15

- **Multi-select Payer/Applied To**: toggle-based; empty = All; emoji avatars in pills and row metadata
- **Transaction form**: "Who Pays" + "For Who" emoji selectors replace payer picker + checkbox
- **`applied_to`**: replaces `is_personal` boolean; stores `user_a | user_b | shared` directly
- **Filter bar**: group labels, Status dropdown, Clear button on all pages
- **Row metadata**: `🧑 paid, for 👩` / `Earned by 🧑`; future dates unblocked in date pickers
- **SQL**: 8 migrations → `001_schema.sql` + `002_plaid.sql`

---

## [0.7.0] — 2026-04-15

- **Owner → Payer**: full rename across UI, TypeScript (`OwnerId` → `PayerId`), and DB (`owner_id` → `payer_id`)
- **Personal Expense flag**: checkbox on transaction form when a specific payer is selected; filters `is_personal` on Dashboard and Expenses
- **Applied Person filter**: separate filter group from Payer; personal transactions count toward payer, non-personal toward Shared
- **CSV**: "Owner" → "Payer"; new "Personal" column

---

## [0.6.0] — 2026-04-11

Comprehensive UI overhaul.

- **Design system**: Uber-inspired black/white; cards standardized to `border + shadow + rounded-xl`; buttons `rounded-full`; inputs `border-foreground`
- **Filter bars**: single scrollable row with divider-separated groups; period → custom range → payer → reviewed → projects → labels → search
- **Income page**: History and Recurring always visible as stacked cards; no more toggle
- **TransactionRow**: CSS grid layout; project indicator on right; inline label/project pickers on hover
- **Charts**: custom HTML legends pinned to card bottom; pie chart fills container
- **Tags page**: label name in label color; project status group headers

---

## [0.5.0] — 2026-04-10

- **Income page** (`/income`): dedicated feed, period selector, owner filter
- **Recurring income**: schedule manager with auto-spawn on load (weekly/biweekly/semi-monthly/monthly)
- **Cashflow Sankey chart**: income → spending categories waterfall on Dashboard
- **Expenses**: income entries hidden from expense list; income-only rows have rainbow gradient and `+` sign
- **Dashboard**: income rows open toast instead of edit modal

---

## [0.4.0] — 2026-04-10

- **Exclude Projects filter**: hide projects from all Dashboard metrics; persists across sessions
- **Page-level owner filter**: gates all charts, cards, and list
- **Unified filter bar**: period + owner + projects in one scrollable row

---

## [0.3.0] — 2026-04-06

- **Bulk actions in header**: select mode transforms page header into command bar (Labels, Project, Owner, Delete)
- **Bulk project assignment**: assign project to many transactions at once
- Bulk owner/label pickers compute true common value across selection

---

## [0.2.0] — 2026-04-05

- **Projects**: named projects with color, icon, date range, optional budget; inline picker on every transaction row; `/projects` page

---

## [0.1.0] — 2026-03-31

Initial release — zero to working couples budget tracker.

- Next.js 15, TypeScript strict, Tailwind, shadcn/ui, Zustand, Recharts
- Transactions: add/edit/delete, search, filter, date grouping, bulk actions, CSV export
- Labels: color + emoji, inline multi-select
- Analytics: spend by owner/label, pie + line charts, period selector
- Cloud: Supabase Auth, households, PostgreSQL, RLS, optimistic updates, Plaid sandbox

---

## Versioning

- `0.x.0` — new features
- `0.x.y` — fixes and polish
- `1.0.0` — first public release
