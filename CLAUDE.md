# CLAUDE.md — Working Guide for Claude Code

This file tells Claude Code how to work in this repository. Read it before making any changes.

---

## What This Project Is

A couples' shared budget tracker (PWA). Two users track transactions together, assign labels, ownership, and projects, and visualize spending. See `PRD.md` for full product requirements.

**Current state:** MVP shipped. V2 backend is live — Supabase Auth, PostgreSQL cloud database, and Plaid integration (sandbox) are all implemented. The store uses optimistic local updates synced to Supabase in the background. New features are tracked in `CHANGELOG.md`.

---

## Critical Files to Read First

| File | Purpose |
|------|---------|
| `PRD.md` | Full product requirements and feature roadmap |
| `ARCHITECTURE.md` | Module structure, dependency rules, folder layout, shared types |
| `BUILD_PLAN.md` | Step-by-step build history (all completed steps + upcoming) |
| `CHANGELOG.md` | Version history and release notes |

**Always read the relevant section of ARCHITECTURE.md before writing or modifying any module.**

---

## Build Discipline

1. **Log every feature in BUILD_PLAN.md and CHANGELOG.md.** New steps go in BUILD_PLAN.md with a description; shipped features go in CHANGELOG.md under the appropriate version.
2. **Do not skip steps or build ahead.** Each feature should be spec'd (requirement written) before implementation begins.
3. **Do not add features not in scope.** If something seems like a natural addition, note it as a future step but do not build it.

---

## Module Rules

These rules are non-negotiable. Violating them creates the exact coupling we're trying to avoid.

- **Modules never import from each other.** `labels/` cannot import from `transactions/`. If data from another module is needed, it is read from the shared Zustand store at the page level and passed as props.
- **Shared UI primitives live in `components/`.** Pickers, badges, dialogs, and any component used by more than one module belong in `components/`, not inside a module folder.
- **All shared types live in `core/types/`.** Never define a type in a module that another module or page will use.
- **Each module exports only through `index.ts`.** Internal components, hooks, and helpers are not exported.
- **Store access only through `core/store/`.** No module imports Zustand directly — they use the shared store hooks exported from `core/store/index.ts`.

---

## Coding Conventions

- **TypeScript strictly.** No `any`. Enable `strict: true` in tsconfig.
- **Zustand for all state.** No raw `useState` for data that needs to persist or be shared across components. Use the store.
- **Tailwind for all styling.** No inline styles, no CSS modules, no styled-components.
- **Base UI + shadcn/ui for common components.** Buttons, inputs, modals, popovers, date pickers — use these before building custom.
- **Named exports only.** No default exports except for Next.js pages (`page.tsx`) and layouts (`layout.tsx`).
- **date-fns for all date operations.** No raw `Date` arithmetic.

---

## Data Layer Rules

- **All app data flows through `core/store/`.** The store is the single source of truth.
- **Store actions are async with optimistic updates.** Apply state change locally first, then sync to Supabase via `lib/db/`. Revert on error.
- **Never read from or write to `localStorage` directly** in a component or module — use the store.
- **Never call Supabase directly from a component or module** — use the store actions which call `lib/db/` helpers.
- **Mock data lives in `core/mock/`.** Populates the store on first launch if no household data exists.

---

## What NOT to Do

- Do not create utility files in module directories — shared utilities go in `core/utils/`.
- Do not add `console.log` statements — use proper error boundaries and UI error states.
- Do not use `any` to work around a TypeScript error — fix the type.
- Do not install new dependencies without noting them in the relevant step of `BUILD_PLAN.md`.
- Do not call Supabase or `localStorage` directly from components — use the store.

---

## When Adding a New Feature

1. Determine which module owns it. If it's a new domain, create a new module.
2. If it requires a new shared type, add it to `core/types/index.ts` first, then implement.
3. If it requires new store state, add it to `core/store/` first, then implement.
4. If it requires a new DB table, add a migration in `supabase/` and a helper in `lib/db/`.
5. Add the feature to `BUILD_PLAN.md` as a new numbered step.
6. After shipping, add an entry to `CHANGELOG.md` under the appropriate version.
7. Update `PRD.md` if the feature changes product scope.
