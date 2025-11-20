# Gig Status Workflow

## Overview

The gig status workflow manages the complete lifecycle of a gig from initial draft creation through completion or cancellation. It integrates with role invitation management to provide clear tracking of gig readiness and musician confirmations.

## Status Types

### Gig Statuses

Located in: `lib/types/shared.ts`

```typescript
export type GigStatus = 
  | 'draft'             // Gig created, roles being added
  | 'invitations_sent'  // Invitations sent to musicians
  | 'confirmed'         // Gig confirmed, ready to go
  | 'completed'         // Gig completed
  | 'cancelled';        // Gig cancelled
```

### Invitation Statuses

Located in: `lib/types/shared.ts`

```typescript
export type InvitationStatus = 
  | 'pending'      // Added to role, but invitation not sent yet
  | 'invited'      // Invitation sent
  | 'accepted'     // Musician confirmed
  | 'declined'     // Musician declined (auto-converts to 'needs_sub')
  | 'tentative'    // Musician tentatively accepted
  | 'needs_sub'    // Declined or needs replacement
  | 'replaced';    // Musician was replaced
```

## Workflow States

### 1. Draft State
**Status:** `draft`

- Initial state when gig is created
- Manager adds musicians with `pending` invitation status
- Musicians appear as "Pending Invite" in the UI
- "Invite All Musicians" button visible to managers
- Gig details can be freely edited

**Transitions:**
- → `invitations_sent` (when "Invite All Musicians" clicked)
- → `confirmed` (if manager skips invitation step)
- → `cancelled` (if gig cancelled before sending invites)

### 2. Invitations Sent State
**Status:** `invitations_sent`

- Manager has sent invitations to all pending musicians
- Musicians see invitations in their dashboard
- Musicians can accept/decline invitations
- If new musicians added, they get `pending` status
- "Invite All Musicians" button reappears if new pending musicians exist

**Transitions:**
- → `confirmed` (when ready to proceed)
- → `cancelled` (if gig cancelled)
- Stays `invitations_sent` (can add more musicians and re-invite)

### 3. Confirmed State
**Status:** `confirmed`

- Gig is confirmed and ready to happen
- All critical roles should be filled
- Musicians can still update their status
- Minimal changes to gig details

**Transitions:**
- → `completed` (after gig happens)
- → `cancelled` (if gig cancelled)

### 4. Completed State
**Status:** `completed`

- Gig has happened
- Focus shifts to payment tracking
- Historical record maintained
- No further status changes allowed

**Terminal State:** No transitions

### 5. Cancelled State
**Status:** `cancelled`

- Gig was cancelled
- All musicians notified of cancellation
- Historical record maintained

**Terminal State:** No transitions

## Components

### GigStatusBadge

**Location:** `components/gig-status-badge.tsx`

Displays visual representation of gig status with color coding:
- `draft` → Gray badge
- `invitations_sent` → Blue badge
- `confirmed` → Green badge
- `completed` → Slate/muted badge
- `cancelled` → Red badge

**Usage:**
```tsx
<GigStatusBadge status={gig.status} />
```

### GigStatusSelect

**Location:** `components/gig-status-select.tsx`

Dropdown for managers to change gig status with workflow enforcement:
- Shows only valid transitions from current state
- Requires confirmation for destructive actions (cancelled, completed)
- Sends notifications to musicians on status changes
- Invalidates relevant queries after update

**Usage:**
```tsx
<GigStatusSelect
  gigId={gigId}
  currentStatus={gig.status}
  onStatusChange={() => {
    // Refresh queries
  }}
/>
```

**Permissions:**
- Only visible to gig owners (project owner or standalone gig owner)
- Players see `GigStatusBadge` instead

### RoleStatusBadge

**Location:** `components/role-status-badge.tsx`

Displays musician invitation status with smart display logic:
- If gig is `draft` and role is `invited` (old data), displays as `pending`
- Otherwise shows actual status
- Color coded per status

**Usage:**
```tsx
<RoleStatusBadge 
  status={role.invitation_status} 
  gigStatus={gig.status} 
/>
```

### Invite All Musicians Button

**Location:** `components/gig-people-section.tsx`

Manager action to transition pending musicians to invited:
- Visible when there are musicians with `pending` status
- Transitions gig from `draft` → `invitations_sent`
- Updates all `pending` roles to `invited`
- Reappears if new pending musicians added later
- Hidden for `completed` and `cancelled` gigs

**Logic:**
```typescript
const showButton = isOwner && 
                   (hasPendingMusicians || hasOldInvitedMusicians) &&
                   gig.status !== 'completed' && 
                   gig.status !== 'cancelled';
```

## API Functions

### updateGigStatus

**Location:** `lib/api/gig-actions.ts`

Updates gig status and sends notifications to musicians:

```typescript
export async function updateGigStatus(
  gigId: string, 
  status: GigStatus
): Promise<void>
```

**Notifications sent:**
- `confirmed` → "Gig confirmed" notification
- `cancelled` → "Gig cancelled" notification

### inviteAllMusicians

**Location:** `lib/api/gig-roles.ts`

Sends invitations to all pending musicians:

```typescript
export async function inviteAllMusicians(
  gigId: string
): Promise<{ count: number }>
```

**Actions:**
1. Fetches all roles with `pending` or `invited` status (handles old data)
2. Updates them to `invited` status
3. Updates gig status to `invitations_sent`
4. Returns count of invited musicians

## Database Schema

### Gigs Table

```sql
CREATE TABLE gigs (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'draft',
  -- other fields...
);
```

**Default:** `draft`

### Gig Roles Table

```sql
CREATE TABLE gig_roles (
  id UUID PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id),
  invitation_status TEXT NOT NULL DEFAULT 'pending',
  -- other fields...
);
```

**Default:** `pending` (changed from `invited` in migration `20250119000000`)

## Migration History

### 20250119000000_change_invitation_status_default.sql

Changed default `invitation_status` from `'invited'` to `'pending'`:

```sql
ALTER TABLE gig_roles 
ALTER COLUMN invitation_status SET DEFAULT 'pending';
```

**Reason:** Allows managers to control when invitations are sent via "Invite All" button, preventing accidental premature invitations.

## Best Practices

### For Managers

1. **Creating Gigs:**
   - Add all musicians while in `draft` status
   - Review lineup before sending invitations
   - Click "Invite All Musicians" when ready

2. **Managing Invitations:**
   - Send invitations only when details are finalized
   - If you need to add more musicians later, they'll be added as `pending`
   - Click "Invite All Musicians" again to invite new additions

3. **Status Transitions:**
   - Move to `confirmed` when you have all critical roles filled
   - Use `cancelled` status (not delete) to maintain historical records
   - Mark as `completed` after the gig happens for payment tracking

### For Players

1. **Receiving Invitations:**
   - Check "My Gigs" dashboard for new invitations
   - Respond promptly to invitations
   - Update status if circumstances change

2. **Gig Status Meaning:**
   - `draft` = Gig being planned, invitation coming
   - `invitations_sent` = You should have received invitation
   - `confirmed` = Gig is happening, prepare accordingly
   - `cancelled` = Gig won't happen

## Common Scenarios

### Scenario 1: Standard Workflow

```
1. Manager creates gig → status: draft
2. Manager adds musicians → musicians: pending
3. Manager clicks "Invite All" → status: invitations_sent, musicians: invited
4. Musicians accept → musicians: accepted
5. Manager confirms gig → status: confirmed
6. Gig happens
7. Manager marks complete → status: completed
```

### Scenario 2: Adding Musicians After Invitations Sent

```
1. Gig status: invitations_sent
2. Original musician declines → status: needs_sub
3. Manager adds replacement → new musician: pending
4. "Invite All Musicians" button reappears
5. Manager clicks "Invite All" → new musician: invited
6. Gig remains: invitations_sent
```

### Scenario 3: Direct to Confirmed (Skip Invitations)

```
1. Manager creates gig → status: draft
2. Manager adds musicians → musicians: pending
3. Manager changes status to confirmed → status: confirmed
4. Musicians still see as pending/invited (depending on data)
5. Note: Less common, but supported
```

## Troubleshooting

### Musicians Show "Invited" Instead of "Pending"

**Symptom:** New musicians appear as "Invited" immediately after adding.

**Cause:** Old data or code not updated.

**Check:**
1. Database default: `SELECT column_default FROM information_schema.columns WHERE table_name = 'gig_roles' AND column_name = 'invitation_status';`
   - Should be: `'pending'::text`
2. All add functions use `invitation_status: 'pending'`:
   - `addRoleToGig` in forms
   - `addSystemUserToGig` in search
   - `handleUnifiedAddFromCircle` in quick add

### "Invite All Musicians" Button Not Appearing

**Symptom:** Button missing even with pending musicians.

**Check:**
1. User is owner (project owner or standalone gig owner)
2. Gig status is not `completed` or `cancelled`
3. At least one musician has `pending` status
4. For `draft` gigs, also checks for `invited` musicians (old data handling)

### Old Data Showing Incorrect Status

**Symptom:** Draft gigs with "Invited" musicians that shouldn't be invited yet.

**Solution:** The `RoleStatusBadge` component handles this automatically:
- If `gigStatus === 'draft'` and `status === 'invited'`, displays as `'pending'`
- This allows old data to work correctly without migration

## Related Documentation

- [Step 5: Gig Roles](../build-process/step-5-gig-roles.md) - Original role system
- [Step 13: Invitations System](../build-process/step-13-invitations-system.md) - Invitation mechanics
- [Database Schema](../database/schema.md) - Complete database structure
- [RLS Policies](../database/rls-policies.md) - Security and permissions

## Future Enhancements

### Planned Features

1. **Email Notifications:**
   - Send actual email when invitations are sent
   - Reminder emails for pending acceptances

2. **Scheduling Integration:**
   - Detect musician conflicts automatically
   - Suggest optimal invitation timing

3. **Analytics:**
   - Track average response time per musician
   - Identify reliable vs. slow responders

4. **Bulk Actions:**
   - Invite specific musicians (not all)
   - Resend invitations to non-responders

### Performance Optimizations

1. **Index Improvements:**
   - Add covering indexes for common queries
   - Optimize RLS policy checks

2. **Query Optimization:**
   - Reduce N+1 queries in gig lists
   - Cache frequently accessed data

---

**Last Updated:** 2025-01-19
**Version:** 1.0.0
**Status:** Complete and Deployed

