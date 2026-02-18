# Code Review & Refactor Guide

A practical guide for reviewing and cleaning up the GigMaster codebase. Written so you can come back to this anytime and pick up where you left off.

## The Golden Rule

**Small, focused PRs that each leave the codebase better than you found it.** Never try to fix everything at once — that's how you introduce new bugs.

## How It Works

Break the review into **phases**. Each phase is its own git branch. You can do them days or weeks apart. Always merge one before starting the next.

---

## Phase 0 — Automated Sweep

The quick wins. Low risk, high impact.

- Run `npm run check` to catch type errors and lint issues
- Run `npm run lint` to catch style problems
- Remove leftover `console.log` statements
- Delete dead/unused files and duplicate components
- Fix any TODO/FIXME comments that point to real bugs

**How to verify:** `npm run check` passes, app loads normally.

---

## Phase 1 — Types & API Alignment

Make sure the database, TypeScript types, and API functions all agree with each other. Do this **one feature at a time** (e.g., gigs, then bands, then setlists).

For each feature area, check:
- Does the DB schema match the TypeScript types?
- Do the API functions return the right types?
- Are there any stale types or functions nobody uses?
- Are there any hardcoded values that should be constants?

**How to verify:** `npm run check` passes, `npm run test:run` passes.

---

## Phase 2 — Component Cleanup

The biggest phase. Break it into sub-tasks, one PR each.

### 2a. Move database calls out of components
Components should never talk to the database directly. If a component imports `createClient()` from Supabase, move that query into a function in `lib/api/` and have the component call that instead.

### 2b. Break up oversized components
If a component file is 500+ lines, it's doing too much. Split it into smaller focused pieces — one per section, tab, or responsibility.

### 2c. Remove duplicates
If the same component exists in two places, pick one as the source of truth and delete the other. Update all imports.

### 2d. Clean up directory structure
Make sure component folders have a clear purpose. If `ui/` and `shared/` contain the same kinds of things, consolidate them.

**How to verify:** App works identically before and after. `npm run check` passes.

---

## Phase 3 — Test Coverage

After cleanup, add tests for the things that matter most.

- Identify critical user flows that aren't tested
- Add component tests for key UI (forms, dialogs, editors)
- Add tests for any code you refactored in earlier phases

**How to verify:** `npm run test:run` passes, coverage report shows improvement.

---

## How to Start Any Phase

1. Make sure your current work is committed or stashed
2. Create a new branch: `git checkout -b chore/phase-name`
3. Do the work for that phase only — don't scope-creep
4. Run `npm run check` and `npm run test:run`
5. Test in the browser manually
6. Commit and merge back to `main`
7. Move to next phase whenever you're ready

## Tips

- **Don't refactor what works.** If a component is ugly but functional and stable, leave it. Focus on things that are broken, duplicated, or blocking you.
- **One concern per PR.** "Remove console.logs" is one PR. "Break up gig editor" is another. Don't mix them.
- **Test after every change.** Run `npm run check` constantly. If something breaks, you'll know exactly what caused it.
- **You don't have to finish.** Phase 0 alone makes the codebase better. Each phase is independently valuable.
