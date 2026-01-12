# Step 27: Dead Code Cleanup

## Date: 2025-01-07

## Summary
Identified and removed dead code from the codebase related to an old tabbed gig detail page that was replaced by the popup/sheet-style editor.

## Problem Discovered
While investigating how to add invitation functionality, we discovered that:
1. The "People section" (`components/gigs/detail/people-section.tsx`) that contained invitation dialogs was **never imported anywhere in the app**
2. The entire `components/gigs/detail/` directory (5 files) was dead code
3. Several other components in `components/roles/` were only used by this dead code
4. The `InviteMusicianDialog` and `QuickInviteDialog` existed but were inaccessible from the UI

## Files Deleted

### Components
- `components/gigs/detail/` (entire directory)
  - `people-section.tsx` - Roster management with invite buttons (dead)
  - `setlist-section.tsx` - Setlist display (dead)
  - `schedule-section.tsx` - Schedule display (dead)
  - `resources-section.tsx` - Materials/resources display (dead)
  - `host-notes-section.tsx` - Host notes display (dead)

- `components/gigs/dialogs/` - Was deleted, then recreated with only `delete-gig-dialog.tsx`
- `components/gigs/files/` - Unused file-related components

- `components/roles/`
  - `status-badge.tsx` - Unused status badge
  - `add-role-dialog.tsx` - Unused (roles added via lineup editor)
  - `edit-role-dialog.tsx` - Only used in tests
  - `invite-dialog.tsx` - Was only used by dead people-section
  - `quick-invite-dialog.tsx` - Was only used by dead people-section

### Tests
- `tests/components/roles/edit-role-dialog.test.tsx` - Test for deleted component
- `tests/components/roles/` directory (now empty, removed)

## Files Kept

### Still in use
- `components/roles/player-actions.tsx` - Used in `/invitations` page
- `components/gigs/shared/status-badge.tsx` - Used in dashboard components
- `app/(app)/gigs/[id]/page.tsx` - Opens GigEditorPanel as sheet (active)
- `app/(app)/gigs/[id]/edit/page.tsx` - Edit page using GigEditorWrapper (linked from pack page)
- `app/(app)/gigs/new/page.tsx` - New gig page (linked from dashboard/nav)
- `app/(app)/gigs/editor-wrapper.tsx` - Used by new/edit pages

## Files Created
- `components/gigs/dialogs/delete-gig-dialog.tsx` - Recreated because it was being used by dashboard components

## Current App Architecture

### Gig Editing Flow
1. User clicks a gig card on dashboard
2. Navigates to `/gigs/[id]`
3. `GigEditorPanel` opens as a sheet/popup
4. Tabs: Schedule, Lineup, Setlist, Materials, Info
5. No separate "People" tab exists

### What's NOT in the app
- No dedicated roster/people management page
- No invitation dialogs accessible from the UI
- Users cannot send email/WhatsApp invitations through the app currently

## Next Steps
Need to design and implement a new invitation system that fits the current popup/sheet editor architecture.

## Build Verification
- `npm run build` passes
- No TypeScript errors related to these changes
