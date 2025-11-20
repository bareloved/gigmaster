# Access Control Fix - Gig Permissions

**Date**: November 20, 2025  
**Feature**: Restrict gig detail page access to owners only

## Problem

Invited musicians could access the full gig detail page (`/gigs/[id]`) which showed edit/delete buttons and management controls they shouldn't have access to. While RLS policies correctly prevented actual modifications, the UI was exposing these controls unnecessarily.

## Solution Implemented

Implemented ownership-based access control with automatic routing:

- **Gig owners**: Full access to `/gigs/[id]` with all management controls
- **Invited musicians**: Automatically redirected to `/gigs/[id]/pack` (read-only gig pack view)
- **Musicians**: Can still manage their own participation status (accept/decline)

## Files Modified

### 1. Gig Detail Page - Access Control
**File**: `app/(app)/gigs/[id]/page.tsx`

Added ownership check and redirect for non-owners:

```typescript
// Check ownership and redirect non-owners to gig pack
const isOwner = gig?.owner_id === user?.id;

// Redirect non-owners to the read-only gig pack view
if (gig && !isOwner) {
  router.replace(`/gigs/${gigId}/pack`);
  return null;
}
```

### 2. Gig Pack Page - Conditional Navigation
**File**: `app/(app)/gigs/[id]/pack/page.tsx`

Updated back button to route based on ownership:

```typescript
const isOwner = pack.ownerId === user?.id;

// Owners: Link back to /gigs/[id]
// Invited musicians: Link to dashboard
{isOwner ? (
  <Link href={`/gigs/${gigId}`}>
    <Button>Back to Gig Detail</Button>
  </Link>
) : (
  <Link href="/dashboard">
    <Button>Back to Dashboard</Button>
  </Link>
)}
```

### 3. Dashboard Components - Smart Routing
**Files**: 
- `components/dashboard-gig-item.tsx`
- `components/dashboard-gig-item-grid.tsx`

Added conditional URL routing based on ownership:

```typescript
// Determine gig URL based on ownership
const gigUrl = gig.isManager ? `/gigs/${gig.id}` : `/gigs/${gig.id}/pack`;
```

### 4. Money Table - Player View Links
**File**: `components/player-money-table.tsx`

Updated all gig links to point to `/pack` since this table is for player money view:

```typescript
<Link href={`/gigs/${gig.id}/pack`}>
  {/* table cell content */}
</Link>
```

### 5. Notification Links - Context-Aware Routing
**Files**:
- `lib/api/gigs.ts` - Updated gig update notifications
- `lib/api/gig-actions.ts` - Updated gig confirmation notifications

Changed notification links to direct musicians to the gig pack:

```typescript
// When notifying musicians about updates
link_url: `/gigs/${gigId}/pack`
```

**Note**: Manager notifications (when someone accepts/declines) still link to full detail page since they need management access.

## Database Security (Already in Place)

RLS policies were already correctly configured (no changes needed):

```sql
-- UPDATE policy (owner-only)
CREATE POLICY "gigs_update" ON gigs
  FOR UPDATE USING (owner_id = auth.uid());

-- DELETE policy (owner-only)  
CREATE POLICY "gigs_delete" ON gigs
  FOR DELETE USING (owner_id = auth.uid());
```

These policies ensure that even if someone tries to bypass the UI, the database will reject unauthorized modifications.

## Testing Results

✅ **Verified**:
1. No linter errors in any modified files
2. Owner can access full gig detail page with all controls
3. Redirect logic correctly implemented for non-owners
4. Dashboard links route to appropriate page based on ownership
5. Gig pack displays correctly with read-only view
6. Back navigation works appropriately for both owners and invited musicians

## User Flows

### As Gig Owner/Manager:
1. Dashboard shows "Managing" badge on gigs
2. Clicking gig → navigates to `/gigs/[id]` (full detail)
3. Can edit gig, manage roles, update status, delete gig
4. "Gig Pack" button available to preview player view

### As Invited Musician:
1. Dashboard shows role badge (e.g., "Keyboard")
2. Clicking gig → navigates to `/gigs/[id]/pack` (gig pack)
3. Can view logistics, setlist, files, lineup
4. Can accept/decline invitation and manage their own notes
5. Cannot see edit/delete controls or manage other roles
6. Back button returns to dashboard (not to restricted detail page)

## Performance Impact

- **Minimal**: Single ownership check per page load
- **No database impact**: Uses existing `owner_id` field
- **No additional queries**: Ownership data already fetched with gig

## Security Considerations

- **Defense in depth**: UI restrictions + RLS policies
- **No sensitive data exposure**: Non-owners never see management controls
- **Graceful redirects**: No error messages, seamless UX
- **Maintains player autonomy**: Musicians can still manage their own participation

## Next Steps

None required - feature is complete and working as designed.

## Related Documentation

- [Database Safety Protocol](../agent-protocols/database-safety.md)
- [Gig Status Workflow](../features/gig-status-workflow.md)
- [Projects & Gigs Refactor](../features/gigs_projects_refactor.md)

