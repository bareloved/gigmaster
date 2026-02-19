# Gig Card Navigation Redesign

**Date:** 2026-02-19
**Status:** Approved

## Problem

The current gig card navigation is ambiguous — clicking anywhere on a card silently routes to different destinations based on role (manager → editor, player → GigPack). Users can't tell where they'll end up.

## Solution

Replace "click anywhere" navigation with explicit **Edit** and **View GigPack** buttons on all gig cards. Card body becomes non-interactive.

## Scope

| Component | Change |
|-----------|--------|
| DashboardGigItem (list view) | Remove Link/onClick from card body. Add button row. |
| DashboardGigItemGrid (grid view) | Remove Link/onClick from card body. Add button row. |
| Dashboard hero ("Next Up") | Already has buttons. Remove any remaining card-body click. |
| "This Week" mini-cards | Always navigate to GigPack (no smart routing). |

## Button Row

Appears at the bottom of each list/grid card with a subtle separator.

### Visibility Rules

| User Role | Edit | GigPack |
|-----------|------|---------|
| Manager (non-external) | Yes — opens editor sheet | Yes — navigates to /gigs/{id}/pack |
| Manager (external) | No | Yes |
| Player (any status) | No | Yes |
| Manager + Player | Yes | Yes |

### Behavior

- **Edit**: Calls `handleEditGig()` → opens GigEditorPanel as slide-over sheet
- **GigPack**: Navigates to `/gigs/{id}/pack?returnUrl=...`

### Styling

- `ghost` or `outline` variant, `size="sm"`
- Icons: Pencil (Edit), Briefcase (GigPack)
- Left-aligned, subtle separator above

## "This Week" Mini-Cards

Simple clickable items → always navigate to GigPack regardless of role. Too compact for a button row.

## Unchanged

- Dropdown menu (status, duplicate, delete)
- Invitation actions (Accept/Decline)
- Permission logic (reused for button visibility)
- Sheet-based editor behavior
- Return URL tracking
