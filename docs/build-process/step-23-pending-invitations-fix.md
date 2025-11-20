# Fix: Prevent Premature Gig Visibility for Pending Invitations

**Feature:** Pending Invitations Privacy Fix  
**Date:** November 20, 2025  
**Status:** ✅ Complete

---

## Problem
When managers added people to gigs, the system was immediately:
1. ✅ ~~Sending notifications to musicians~~ (FIXED in previous commit)
2. ❌ Showing gigs in users' dashboards **before** manager clicked "Invite All"
3. ❌ Allowing users to view gig details via direct URL

This contradicted the intended workflow where managers build lineups first, then invite all at once.

---

## Root Causes

### 1. Application Layer Queries
Multiple API functions were fetching gig_roles by `musician_id` without filtering out `'pending'` status:
- Dashboard gigs queries
- Money/payment queries  
- Player gigs list
- Gig update/delete notifications

### 2. Database RLS Policy
The `gigs_select` RLS policy allowed viewing if user had ANY gig_role, including pending ones:
```sql
-- OLD POLICY (PROBLEM)
OR EXISTS (
  SELECT 1 FROM gig_roles
  WHERE gig_roles.musician_id = auth.uid()
  -- ❌ No status filter!
)
```

---

## Solutions Implemented

### A. Code Changes (Completed)

#### 1. **lib/api/gig-roles.ts**
- ✅ Removed immediate notification from `addSystemUserToGig()` 
- ✅ Added notification logic to `inviteAllMusicians()` so notifications only sent when manager is ready

#### 2. **lib/api/dashboard-gigs.ts**
- ✅ Updated `listDashboardGigs()` - exclude pending roles when determining if user is player
- ✅ Updated `listRecentPastGigs()` - exclude pending roles
- ✅ Updated `listAllPastGigs()` - exclude pending roles

#### 3. **lib/api/player-money.ts**
- ✅ Updated `getPlayerMoneySummary()` - added `.neq('invitation_status', 'pending')`
- ✅ Updated `getPlayerMoneyGigs()` - added `.neq('invitation_status', 'pending')`

#### 4. **lib/api/gigs.ts**
- ✅ Updated `listGigsAsPlayer()` - added `.neq("gig_roles.invitation_status", "pending")`
- ✅ Updated `updateGig()` notifications - only notify invited musicians (not pending)
- ✅ Updated `deleteGig()` notifications - only notify invited musicians (not pending)

#### 5. **lib/api/gig-pack.ts**
- ✅ Updated `getGigPack()` - added `.neq('invitation_status', 'pending')` to userRole query

---

### B. Database Migration (Applied)

**File:** `supabase/migrations/20251120000001_exclude_pending_roles_from_gigs_select.sql`

**What it does:**
- Updates `gigs_select` RLS policy to exclude pending roles
- Adds index on `gig_roles(musician_id, invitation_status)` for performance
- Ensures users cannot access gigs via direct URL if they only have pending roles

---

## Verification

### Test Case 1: Manager Creates Gig & Adds People
1. ✅ Manager creates new gig
2. ✅ Manager adds musicians to roles → Status: 'pending'
3. ✅ Musicians do NOT see gig in dashboard
4. ✅ Musicians do NOT receive notifications
5. ✅ Musicians CANNOT access gig pack via URL

### Test Case 2: Manager Invites All
1. ✅ Manager clicks "Invite All" button
2. ✅ All roles change from 'pending' → 'invited'
3. ✅ Gig status changes to 'invitations_sent'
4. ✅ Musicians receive notifications
5. ✅ Musicians now see gig in dashboard
6. ✅ Musicians can access gig pack

### Test Case 3: Gig Updates/Cancellations
1. ✅ Manager updates gig date/time/location
2. ✅ Only invited musicians get notified (not pending)
3. ✅ Manager cancels gig
4. ✅ Only invited musicians get notified (not pending)

---

## Files Modified

### API Layer (5 files)
- `lib/api/gig-roles.ts`
- `lib/api/dashboard-gigs.ts`
- `lib/api/player-money.ts`
- `lib/api/gigs.ts`
- `lib/api/gig-pack.ts`

### Database Layer (1 file)
- `supabase/migrations/20251120000001_exclude_pending_roles_from_gigs_select.sql`

---

## Technical Details

### Filter Pattern Used
All queries that fetch user's gigs now include:
```typescript
.neq('invitation_status', 'pending')
// or for nested queries:
.neq('gig_roles.invitation_status', 'pending')
```

### RLS Policy Change
```sql
-- NEW POLICY (FIXED)
OR EXISTS (
  SELECT 1 FROM gig_roles
  WHERE gig_roles.gig_id = gigs.id
  AND gig_roles.musician_id = auth.uid()
  AND gig_roles.invitation_status != 'pending'  -- ✅ Now filters out pending!
)
```

---

## Performance Considerations

1. ✅ **Index Added**: `idx_gig_roles_musician_status` on `(musician_id, invitation_status)` 
   - Optimizes all queries filtering by these columns
   - Partial index (only where musician_id IS NOT NULL) for efficiency

2. ✅ **Query Efficiency**: All queries already had `musician_id` filters; adding status filter uses same index

3. ✅ **RLS Performance**: The EXISTS subquery in RLS is optimized by the new index

---

## Security Impact

**Before:** Users with pending roles could:
- ❌ See gig in dashboard (blocked by app code but not RLS)
- ❌ Access gig pack via direct URL (RLS allowed it)
- ❌ View all gig details before being officially invited

**After:** Users with pending roles:
- ✅ Cannot see gig in dashboard
- ✅ Cannot access gig pack via direct URL (RLS blocks it)
- ✅ Only see gig after manager clicks "Invite All"

---

## Notes

- The `'pending'` status is only used during gig creation before invitations are sent
- Once "Invite All" is clicked, all pending roles become `'invited'`
- Managers can still see all roles (including pending) when viewing their own gigs
- This change only affects musician/player views, not manager views

---

**Status:** ✅ Complete and tested

