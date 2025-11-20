# Step 19 - In-App Notifications Center

**Status:** ✅ Complete  
**Date:** November 18, 2024  
**Priority:** Critical High

## Overview

Built a complete in-app notification system with real-time updates using Supabase Realtime. Musicians and managers now receive instant notifications about invitations, status changes, gig updates, cancellations, and payments.

## What Was Built

### Core Features

1. **Bell Icon Dropdown** - Always-visible notification center in app header
2. **Real-Time Updates** - New notifications appear instantly via Supabase Realtime
3. **Unread Count Badge** - Red badge showing number of unread notifications
4. **Notification Types:**
   - `invitation_received` - New gig invitation
   - `status_changed` - Musician accepted/declined
   - `gig_updated` - Date, time, or location changed
   - `gig_cancelled` - Gig deleted
   - `payment_received` - Marked as paid

### User Experience

- **Clean UI:** Dropdown with scrollable list (max height 384px)
- **Unread Indicator:** Blue dot on unread notifications
- **Mark as Read:** Click notification or "Mark all read" button
- **Delete:** Hover to reveal delete button
- **Navigate:** Click notification to jump to relevant page
- **Empty State:** Friendly message when no notifications

## Database Schema

### Table: `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'invitation_received',
    'status_changed',
    'gig_updated',
    'gig_cancelled',
    'payment_received'
  )),
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional references for context
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gig_role_id UUID REFERENCES gig_roles(id) ON DELETE CASCADE
);
```

### Indexes

- `idx_notifications_user_read` - Fast unread count queries
- `idx_notifications_created` - Recent notifications (descending)
- `idx_notifications_user_created` - User's recent notifications

### RLS Policies

- Users can view/update/delete their own notifications
- System can insert notifications for any user
- Simple `user_id = auth.uid()` checks (highly cacheable)

## API Functions

### Core CRUD (`lib/api/notifications.ts`)

```typescript
getMyNotifications(userId, limit?) // Fetch notifications (recent first)
getUnreadCount(userId)             // Get badge count
markAsRead(notificationId)         // Mark single as read
markAllAsRead(userId)              // Mark all as read
deleteNotification(notificationId) // Delete notification
createNotification(data)           // Create new notification
subscribeToNotifications(userId, callback) // Real-time subscription
```

### Integration Points

**Invitations** (`lib/api/gig-invitations.ts`):
- Email invitation: Check if user exists, send notification
- WhatsApp invitation: Check if user exists, send notification

**Status Changes** (`lib/api/gig-roles.ts`):
- `updateMyInvitationStatus`: Notify manager when accepted/declined
- `updateRole`: Notify musician when paid

**Gig Updates** (`lib/api/gigs.ts`):
- `updateGig`: Notify all musicians if date/time/location changed
- `deleteGig`: Notify all musicians when gig cancelled

## UI Components

### `components/notifications-dropdown.tsx`

- Bell icon with badge in header
- Dropdown menu (width: 320px, height: 384px)
- Real-time subscription with cleanup
- TanStack Query caching (1-minute stale time)
- Poll unread count every 30 seconds
- Optimistic cache updates

### `components/notification-item.tsx`

- Click to navigate + mark as read
- Hover to show delete button
- Blue dot for unread
- Relative time display ("2 hours ago")
- Highlighted background for unread

### `components/app-header.tsx`

- Added `<NotificationsDropdown />` before dark mode toggle
- Always visible in app layout

## Performance Optimizations

### Database

- **Indexes:** All queries use indexed columns
- **Limit:** Default 50 notifications per query
- **Cascade Deletes:** Automatic cleanup when gigs/roles deleted

### Client-Side

- **TanStack Query:**
  - Notifications list: 1-minute stale time
  - Unread count: 30-second polling + real-time
  - Cache keys include `user?.id`
- **Real-Time:** Per-user channel subscription
- **Optimistic Updates:** Instant UI for mark as read/delete

### API

- **Non-Blocking:** `createNotification` logs errors but never throws
- **Batched:** All notifications for gig update sent in loop (acceptable for now)
- **Smart Checks:** Only notify if fields actually changed

## Security

### Row Level Security

- Users can only see their own notifications
- Users can only modify their own notifications
- Service role can insert for any user (for system notifications)

### Cache Isolation

- All query keys include `user?.id`
- No cross-user cache pollution
- Real-time subscriptions scoped to user

## Notification Triggers

### 1. Invitation Received

**When:** Manager invites musician via email or WhatsApp  
**Who Gets It:** Invited musician (if they have an account)  
**Links To:** Gig Pack page

```typescript
{
  type: 'invitation_received',
  title: 'Invitation: Wedding Gig',
  message: "You've been invited to play Keys for The Cover Band",
  link_url: '/gigs/abc123/pack'
}
```

### 2. Status Changed

**When:** Musician accepts or declines invitation  
**Who Gets It:** Gig manager/owner  
**Links To:** Gig detail page

```typescript
// Accepted
{
  type: 'status_changed',
  title: 'John Doe accepted',
  message: 'John Doe accepted their role as Keys in Wedding Gig',
  link_url: '/gigs/abc123'
}

// Declined
{
  type: 'status_changed',
  title: 'John Doe declined',
  message: 'John Doe declined their role as Keys in Wedding Gig. Need a sub!',
  link_url: '/gigs/abc123'
}
```

### 3. Gig Updated

**When:** Manager updates date, time, or location  
**Who Gets It:** All musicians on the gig  
**Links To:** Gig detail page

```typescript
{
  type: 'gig_updated',
  title: 'Gig updated: Wedding Gig',
  message: 'Date, time, or location has changed. Check the details!',
  link_url: '/gigs/abc123'
}
```

### 4. Gig Cancelled

**When:** Manager deletes a gig  
**Who Gets It:** All musicians on the gig  
**Links To:** Dashboard

```typescript
{
  type: 'gig_cancelled',
  title: 'Gig cancelled: Wedding Gig',
  message: 'This gig has been cancelled',
  link_url: '/dashboard'
}
```

### 5. Payment Received

**When:** Manager marks role as paid  
**Who Gets It:** The musician  
**Links To:** Money page

```typescript
{
  type: 'payment_received',
  title: 'Payment received',
  message: "You've been paid for Wedding Gig",
  link_url: '/money'
}
```

## Real-Time Subscription

Uses Supabase Realtime with Postgres Changes:

```typescript
const channel = supabase
  .channel(`notifications:${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Add to cache + increment badge count
  })
  .subscribe();
```

**Cleanup:** `useEffect` returns unsubscribe function to prevent memory leaks.

## Cache Strategy

### Query Keys

```typescript
["notifications", userId]           // Notifications list
["notifications-unread-count", userId] // Badge count
```

### Invalidation

- After mark as read: Invalidate both queries
- After mark all as read: Invalidate both queries
- After delete: Invalidate both queries
- On real-time insert: Update cache directly (no invalidation)

### Polling

- Unread count: Refetch every 30 seconds as backup
- Notifications list: No polling (real-time only)

## Files Created

**New Files:**
- `supabase/migrations/20241118190000_notifications_system.sql`
- `lib/api/notifications.ts`
- `components/notifications-dropdown.tsx`
- `components/notification-item.tsx`
- `docs/build-process/step-19-notifications-center.md`

**Modified Files:**
- `lib/types/database.ts` - Added notifications table types
- `lib/types/shared.ts` - Added Notification types and NotificationType enum
- `components/app-header.tsx` - Added NotificationsDropdown
- `lib/api/gig-invitations.ts` - Trigger invitation notifications
- `lib/api/gig-roles.ts` - Trigger status change and payment notifications
- `lib/api/gigs.ts` - Trigger update and cancellation notifications

## Testing Checklist

- [x] Migration applies successfully
- [x] Bell icon appears in header
- [x] Unread count displays correctly
- [x] Click bell opens dropdown
- [x] Notifications list displays
- [x] Click notification navigates to link
- [x] Mark as read works
- [x] Mark all as read works
- [x] Delete notification works
- [x] Real-time updates work (test with two browsers)
- [x] Empty state displays when no notifications
- [x] Invitation trigger works (email & WhatsApp)
- [x] Status change trigger works (accept & decline)
- [x] Gig update trigger works (date/time/location changes)
- [x] Gig cancellation trigger works
- [x] Payment trigger works
- [x] RLS policies enforce user isolation
- [x] No N+1 query issues
- [x] Mobile responsive dropdown

## Known Limitations

1. **No Email Digests:** In-app only (email digests deferred to future)
2. **No Preferences:** Can't toggle notification types on/off yet
3. **No Pagination:** Loads last 50 notifications only
4. **No Sound/Toast:** Silent notifications (no browser notification API)
5. **Batched Sends:** Gig updates loop through musicians (acceptable for now)

## Future Enhancements

See `docs/future-enhancements/next-steps.md` - Step 3 for:
- Email digest system (daily/weekly summaries)
- Notification preferences (per-type toggles)
- Browser push notifications
- Sound/toast alerts
- Notification history page (with pagination)
- Read receipts / seen by

## Success Metrics

**Time to Awareness:**
- Before: Musicians had to check email/WhatsApp manually
- After: Instant in-app notification when logged in
- **Reduction: Immediate awareness**

**UX Improvements:**
- All gig-related updates in one place
- No missed updates due to email spam folders
- Visual unread count drives action
- One-click navigation to relevant page

## Architecture Decisions

### Why Non-Blocking Notifications?

`createNotification` logs errors but never throws. Rationale:
- Notifications are **nice-to-have**, not critical
- Failed notification shouldn't break invitation flow
- Better to succeed at core action (invite, accept, pay) than fail both

### Why No Email Digests Yet?

- Focus on in-app MVP first
- Email adds complexity (templates, background jobs, unsubscribe)
- Can add later without database changes
- Users already get emails for invitations

### Why Supabase Realtime?

- Already using Supabase (no new dependencies)
- WebSocket-based (efficient for many users)
- Built-in subscription management
- Automatic cleanup on disconnect

### Why Simple RLS Policies?

- `user_id = auth.uid()` is fast and cacheable
- No joins needed in policies
- Scales to thousands of users
- Easy to audit and debug

## Lessons Learned

1. **Non-Blocking Async:** Notification failures should never break primary flows
2. **Real-Time is Powerful:** Users love instant updates without page refresh
3. **Cache Keys Matter:** Including `user?.id` prevents cross-user pollution
4. **Optimistic Updates:** Make UI feel instant (mark as read, delete)
5. **Smart Change Detection:** Only notify when fields actually changed (not every update)

## Related Documentation

- Main Roadmap: `/docs/future-enhancements/next-steps.md` (Step 3)
- Build Steps: `/BUILD_STEPS.md` (Updated)
- Database Guide: `/lib/supabase/CLIENTS_GUIDE.md`
- API Structure: `/lib/README.md`

---

**Step 19 is PRODUCTION-READY! 🎉 Musicians and managers now stay informed with real-time in-app notifications.**

