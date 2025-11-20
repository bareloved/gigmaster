<!-- 8742b366-0c8f-49b1-b1bb-64429d1af386 7fd57e7c-7c41-4f1f-91cf-8602f66256bf -->
# Complete Gig Status Workflow Feature

## Current State

- ✅ Status field exists in database
- ✅ All gigs default to "draft"
- ✅ `updateGigStatus` API function exists
- ❌ No UI to change status
- ❌ Missing "invitations_sent" status in type definition
- ❌ No workflow validation/enforcement
- ❌ Badge styling not informative (all non-confirmed are gray)

## Proposed Status Workflow

```
draft → invitations_sent → confirmed → completed
         ↓                    ↓
      cancelled           cancelled
```

### Status Definitions

1. **draft** - Initial state, gig is being set up

   - Manager can edit everything freely
   - Musicians can be added but NOT invited yet

2. **invitations_sent** - Invitations have been sent to musicians

   - Triggered manually via "Invite All" button
   - Manager awaiting responses

3. **confirmed** - Gig is locked in

   - All critical roles accepted OR manager manually confirms
   - Setlist/materials are being finalized

4. **completed** - Gig has happened

   - For historical tracking
   - Focus shifts to payment tracking

5. **cancelled** - Gig was cancelled

   - Can transition from any status
   - Notifications sent to all invited musicians

## Implementation Plan

### 1. Update Type Definitions

**Files:** `lib/api/gig-actions.ts`, `lib/types/shared.ts`

- Add "invitations_sent" to GigStatus type
- Ensure all status values match: `draft | invitations_sent | confirmed | completed | cancelled`

### 2. Create Status Management UI Component

**New file:** `components/gig-status-select.tsx`

A dropdown/select component for managers to change gig status:

- Only show valid transitions (workflow enforcement)
- Styled as a badge-like select (compact, inline)
- Confirmation dialog for destructive actions (cancel, complete)
- Color-coded by status (draft=gray, invitations_sent=blue, confirmed=green, completed=slate, cancelled=red)

Valid transitions:

- From **draft**: → invitations_sent, confirmed, cancelled
- From **invitations_sent**: → confirmed, cancelled
- From **confirmed**: → completed, cancelled
- From **completed**: (none, final state)
- From **cancelled**: (none, final state)

### 3. Add UI to Gig Detail Page

**File:** `app/(app)/gigs/[id]/page.tsx`

Replace the static badge with `GigStatusSelect`:

- Only show for managers (check if current user is project owner)
- For players, show read-only badge
- Position next to gig title (keep current layout)

### 4. Improve Badge Styling

**New file:** `components/gig-status-badge.tsx`

Create dedicated status badge component with better visual design:

- **draft**: Gray (secondary)
- **invitations_sent**: Blue (default)
- **confirmed**: Green (success-like)
- **completed**: Slate (muted)
- **cancelled**: Red (destructive)

Use this in:

- Dashboard gig items (list & grid)
- Project gig lists
- Gig pack view
- Anywhere status is displayed

### 5. Add "Invite All" Button to People Section

**File:** `components/gig-people-section.tsx`

Add button at the bottom of the People section table:

- Only visible to managers (project owners)
- Only shows when gig status is "draft" and there are musicians with roles
- Button styling: Primary button with Mail icon
- Button text: "Invite All Musicians"

Clicking the button triggers:

1. Update all gig_roles for this gig to `invitation_status = 'invited'`
2. Auto-update gig status from "draft" → "invitations_sent"
3. Show success toast: "Invitations sent to X musicians"
4. Refresh roles and gig data

**New API function:** `lib/api/gig-roles.ts` - `inviteAllMusicians(gigId)`

- Updates all roles for the gig
- Updates gig status
- Returns count of invited musicians

### 6. Add Notifications for Status Changes

**File:** `lib/api/gigs.ts` (in `updateGig` function or new helper)

When status changes:

- **→ invitations_sent**: (optional) Notify all musicians "You're invited to {gig title}"
- **→ confirmed**: Notify all invited musicians "Gig is confirmed!"
- **→ cancelled**: Notify all invited musicians (already exists for delete)
- **→ completed**: (optional) Could trigger payment reminders

### 7. Dashboard Quick Actions (Already Exists)

**Files:** `components/dashboard-gig-item.tsx`, `components/dashboard-gig-item-grid.tsx`

These already have `updateGigStatus` integration but need:

- Update to include "invitations_sent" in the status type
- Ensure dropdown shows valid transitions only

### 8. Add Status Filter to Dashboard (Optional)

**File:** `app/(app)/dashboard/page.tsx`

Add status filter to "Upcoming Gigs" section:

- All statuses
- Draft only
- Pending invitations (invitations_sent)
- Confirmed only

This helps managers focus on gigs that need attention.

## Testing Checklist

After implementation:

- [ ] Create a draft gig → status shows as "draft" (gray)
- [ ] Add musicians → still shows "draft", no auto-invite
- [ ] Click "Invite All" button → status changes to "invitations_sent" (blue)
- [ ] All roles updated to invitation_status = 'invited'
- [ ] Manually change to "confirmed" → badge turns green
- [ ] Cancel gig → badge turns red, musicians notified
- [ ] Try invalid transitions → properly blocked
- [ ] Check all views (dashboard, project, gig pack) show correct badge
- [ ] Verify only managers can change status and see "Invite All"
- [ ] Verify players see read-only badge

## Files to Create

- `components/gig-status-select.tsx` - Dropdown for managers
- `components/gig-status-badge.tsx` - Styled badge component

## Files to Modify

- `lib/api/gig-actions.ts` - Add "invitations_sent" to type
- `lib/types/shared.ts` - Update status types if defined there
- `lib/api/gig-roles.ts` - Add `inviteAllMusicians()` function
- `lib/api/gigs.ts` - Add status change notifications
- `components/gig-people-section.tsx` - Add "Invite All" button
- `app/(app)/gigs/[id]/page.tsx` - Replace badge with select for managers
- `components/dashboard-gig-item.tsx` - Use new badge component
- `components/dashboard-gig-item-grid.tsx` - Use new badge component
- `app/(app)/projects/[id]/page.tsx` - Use new badge component
- `app/(app)/gigs/[id]/pack/page.tsx` - Use new badge component
- `app/(app)/dashboard/page.tsx` - Add status filter (optional)

## Performance Considerations

- Status updates are single-field updates (fast)
- "Invite All" does batch update of roles (one query)
- Badge component is read-only, no extra queries
- Filter on dashboard uses existing queries, just client-side filtering

## Future Enhancements (Out of Scope)

- Individual "Send Invite" per role (selective inviting)
- Status history/audit trail
- Bulk status updates across gigs
- "Smart" status suggestions based on role acceptance rate
- Email notifications (not just in-app)
- When all roles accepted → auto-suggest "confirmed"

### To-dos

- [ ] Add invitations_sent to GigStatus type definitions
- [ ] Create GigStatusBadge component with color-coded styling
- [ ] Create GigStatusSelect component with workflow enforcement
- [ ] Replace static badge with GigStatusSelect for managers
- [ ] Add automatic draft→invitations_sent transition when roles added
- [ ] Add notifications for status changes (confirmed, cancelled)
- [ ] Update dashboard components to use new badge component
- [ ] Replace all status badges with new component across app
- [ ] Test complete status workflow and all transitions