# Gig Card Cleanup: Remove Redundant Status Elements

**Date:** 2026-02-16
**Status:** Approved

## Problem

The gig card (both list and grid views) shows redundant information for accepted gigs:
- **"You're in"** / **"Your status: You're in"** — if the gig is in your list, you're obviously in it
- **Role badge** (e.g., "guitar") — useful info but adds visual noise to every card

## Design

### Removals

| Element | Scope | Notes |
|---|---|---|
| "You're in" / "Your status: You're in" | List + Grid views | Remove entirely for `accepted` status |
| Role badge (outlined, capitalized) | List + Grid views | Replace with tooltip |

### What stays

- **"Respond" / "Please respond"** text — actionable, needs attention
- **Invitation badges** ("Invited", "Declined", "Need Sub") — actionable states
- All other badges (status, external, host) — unchanged

### Tooltip behavior

- **Desktop:** Wrap the metadata row with shadcn `<Tooltip>`. On hover, shows "Your role: Guitar".
- **Mobile:** No tooltip (touch doesn't support hover). Role visible only in gig detail view.
- Uses existing shadcn `<Tooltip>` component — no new dependencies.

### Affected components

1. `components/dashboard/gig-item.tsx` — List view (`DashboardGigItem`)
2. `components/dashboard/gig-item-grid.tsx` — Grid view (`DashboardGigItemGrid`)

### No changes to

- Data layer / queries (still fetch `playerRoleName`)
- Gig detail view
- Manager view (invitation summary stays)
