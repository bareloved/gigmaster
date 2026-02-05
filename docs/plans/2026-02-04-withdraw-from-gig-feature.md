# Plan: Add "Withdraw from Gig" Option for Musicians

## Problem
After accepting a gig invitation, musicians have no way to withdraw or change their status from the All Gigs list. The dropdown menu only shows accept/decline for **pending** invitations (`status === "invited"`), but once accepted, player actions disappear.

## Root Cause
Two issues found:

1. **Missing role ID**: The All Gigs page query doesn't populate `playerGigRoleId` for accepted gigs (needed for the API call)
2. **UI condition too restrictive**: The dropdown menu only shows player actions when `invitationStatus === "invited"`

## Solution

### Files to Modify

1. **`/app/(app)/gigs/page.tsx`** (line ~200)
   - Add `playerGigRoleId: playerRole?.id || null` to the transformed DashboardGig

2. **`/components/dashboard/gig-item.tsx`** (lines ~260-360)
   - Add new condition: `showWithdrawAction` for accepted players
   - Add "Can't Make It" dropdown option that sets status to `declined`

3. **`/components/dashboard/gig-item-grid.tsx`** (same changes)
   - Mirror the changes from gig-item.tsx

### Detailed Changes

#### 1. Fix playerGigRoleId in All Gigs page

```typescript
// In the map function around line 200
return {
  gigId: gig.id,
  // ... existing fields ...
  playerRoleName: playerRole?.role_name || null,
  playerGigRoleId: playerRole?.id || null,  // ADD THIS LINE
  invitationStatus: playerRole?.invitation_status || null,
  // ...
};
```

#### 2. Update gig-item.tsx dropdown logic

**Add new condition (after line 262):**
```typescript
const showWithdrawAction = showPlayerActions && gig.invitationStatus === "accepted" && !isPastGig;
```

**Add to dropdown menu (after invitation actions, before manager actions):**
```typescript
{showWithdrawAction && (
  <DropdownMenuItem onClick={() => declineInvitationMutation.mutate(gig.playerGigRoleId!)}>
    <X className="h-4 w-4 mr-2 text-red-600" />
    Can't Make It
  </DropdownMenuItem>
)}
```

**Note:** Reusing `declineInvitationMutation` which already sets status to `declined` and notifies the manager.

### Implementation Order

1. Fix `playerGigRoleId` in `/app/(app)/gigs/page.tsx`
2. Add withdrawal option to `/components/dashboard/gig-item.tsx`
3. Add withdrawal option to `/components/dashboard/gig-item-grid.tsx`
4. Test the flow end-to-end

### Verification

1. Create a gig as manager, invite yourself (or another test user)
2. Accept the invitation
3. Go to All Gigs list
4. Click the three-dot menu on an accepted gig
5. Verify "Can't Make It" option appears
6. Click it and verify:
   - Status changes to declined
   - Gig disappears from list (per existing filter logic)
   - Manager is notified
