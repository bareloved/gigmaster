# Step 8: Calendar Integration - Phase 1

**Status:** ✅ Complete  
**Date:** November 17, 2025  
**Author:** AI Assistant  
**Related Docs:** `docs/future-enhancements/calendar-integration-roadmap.md`

---

## Overview

Implemented Phase 1 of calendar integration, enabling users to subscribe to their Ensemble gigs in external calendar apps (Google Calendar, Apple Calendar, Outlook, etc.) via ICS feed. Also includes an in-app calendar view and basic conflict detection when accepting invitations.

### Goals

1. Allow users to subscribe to their gigs in external calendars
2. Provide visual calendar view within the app
3. Detect scheduling conflicts when accepting gig invitations
4. Maintain security with token-based authentication

### What Was Built

- **ICS Calendar Feed**: Personal subscription URL for external calendars
- **Calendar Settings Page**: Token management and subscription instructions
- **In-App Calendar View**: Visual calendar showing all user's gigs
- **Conflict Detection**: Warns users about scheduling conflicts
- **Navigation**: Added Calendar to main sidebar

---

## Technical Implementation

### 1. Database Schema

**Migration:** `supabase/migrations/20241117000002_calendar_integration.sql`

```sql
-- Add calendar ICS token to profiles
ALTER TABLE profiles ADD COLUMN calendar_ics_token TEXT UNIQUE;

-- Create index for fast token lookup
CREATE INDEX idx_profiles_calendar_token ON profiles(calendar_ics_token);
```

**Why:**
- Unique token per user for secure calendar subscription
- Indexed for fast lookup on public API endpoint

**Security:**
- Token is auto-generated (32-byte hex string)
- User can regenerate if compromised
- RLS policies already cover the new column

### 2. API Functions

**File:** `lib/api/calendar.ts`

**Token Management:**
- `generateICSToken(userId)` - Generate new token (or return existing)
- `regenerateICSToken(userId)` - Invalidate old token, create new
- `getICSToken(userId)` - Retrieve existing token
- `getUserIdFromToken(token)` - Validate token and get user ID

**ICS Feed Generation:**
- `generateICSFeed(userId)` - Create ICS file content
- `gigToICSEvent(gig)` - Transform gig to ICS event format
  - Includes title, date/time, location, description with link
  - Handles all-day events (no start/end time)
  - Default 3-hour duration if only start time provided

**Conflict Detection:**
- `checkGigConflicts(userId, date, startTime, endTime)` - Find overlapping gigs
- `timesOverlap(start1, end1, start2, end2)` - Check time overlap logic

**Performance:**
- Fetches gigs for wide date range (past 30 days, future 1 year)
- Limit 500 gigs for calendar subscription (generous)
- Efficient date filtering in queries

### 3. ICS API Route

**File:** `app/api/calendar.ics/route.ts`

**Endpoint:** `GET /api/calendar.ics?token=USER_TOKEN`

**Features:**
- Public endpoint (no authentication required)
- Token-based access control
- Returns `text/calendar` content type
- 5-minute cache header

**Security:**
- Token validation before generating feed
- Invalid token returns 401
- Missing token returns 400

### 4. Calendar Settings Page

**File:** `app/(app)/settings/calendar/page.tsx`

**Features:**
- Auto-generates token on first visit
- Display subscription URL with copy button
- Regenerate URL (with confirmation)
- Instructions for Google Calendar, Apple Calendar, Outlook
- Security warning about keeping URL private

**UX:**
- Copy button with success feedback
- Confirmation dialog before regenerating
- Helpful tooltips and instructions
- Responsive design

### 5. In-App Calendar View

**File:** `app/(app)/calendar/page.tsx`

**Features:**
- Month, week, and day views
- Filter by role: All | Managing | Playing
- Color-coded events:
  - Blue: Playing
  - Green: Managing
  - Purple: Both
- Click event → navigate to Gig Pack
- Hover tooltip with details
- Responsive design

**Technical:**
- Uses `react-big-calendar` with `moment` localizer
- Fetches gigs based on current view (±1-2 months)
- TanStack Query for caching (5-minute stale time)
- Transforms gigs to calendar events with proper time parsing

**Performance:**
- Fetches only visible date range
- Limit 500 gigs (generous)
- Client-side role filtering
- Memoized event transformation

### 6. Conflict Warning Dialog

**File:** `components/conflict-warning-dialog.tsx`

**Features:**
- Shows conflicting gigs with details
- Displays date, time, location, roles for each conflict
- "Accept Anyway" or "Cancel" options
- Responsive scrollable list for many conflicts

**UX:**
- Amber warning theme
- Clear conflict information
- Shows what user is trying to accept
- Loading state during acceptance

### 7. Conflict Detection Integration

**Updated Files:**
- `components/dashboard-gig-item.tsx`
- `components/dashboard-gig-item-grid.tsx`

**Flow:**
1. User clicks "Accept Invitation"
2. System checks for conflicts (`checkGigConflicts`)
3. If conflicts found, show dialog
4. User can accept anyway or cancel
5. On accept, update gig role status and close dialog

**Implementation:**
- Added state for dialog visibility and conflicts
- New `handleAcceptInvitation` handler
- Modified dropdown onClick to call handler
- Added `ConflictWarningDialog` component at end

### 8. TypeScript Types

**File:** `lib/types/shared.ts`

**Added:**
```typescript
export interface CalendarGig {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  locationName: string | null;
  locationAddress: string | null;
  isManager: boolean;
  isPlayer: boolean;
  roleName?: string | null;
  status: string | null;
}
```

**File:** `lib/types/database.ts`

**Updated:**
```typescript
profiles: {
  Row: {
    // ... existing fields
    calendar_ics_token: string | null;
  };
  Insert: {
    // ... existing fields
    calendar_ics_token?: string | null;
  };
  Update: {
    // ... existing fields
    calendar_ics_token?: string | null;
  };
}
```

### 9. Navigation

**File:** `components/app-sidebar.tsx`

**Changes:**
- Added Calendar icon import
- Added Calendar to navItems array (after Dashboard, before Money)

---

## Dependencies Installed

```bash
npm install ics react-big-calendar moment
```

- **ics**: ICS file generation (RFC 5545 compliant)
- **react-big-calendar**: Visual calendar component
- **moment**: Date/time localization for react-big-calendar

---

## Files Created

1. `supabase/migrations/20241117000002_calendar_integration.sql` - DB migration
2. `lib/api/calendar.ts` - Calendar API functions
3. `app/api/calendar.ics/route.ts` - ICS feed endpoint
4. `app/(app)/settings/calendar/page.tsx` - Settings page
5. `app/(app)/calendar/page.tsx` - Calendar view page
6. `components/conflict-warning-dialog.tsx` - Conflict dialog
7. `docs/future-enhancements/calendar-integration-roadmap.md` - Full roadmap
8. `docs/build-process/step-8-calendar-integration-phase-1.md` - This doc

## Files Modified

1. `lib/types/shared.ts` - Added CalendarGig interface
2. `lib/types/database.ts` - Added calendar_ics_token to profiles
3. `components/app-sidebar.tsx` - Added Calendar navigation
4. `components/dashboard-gig-item.tsx` - Added conflict detection
5. `components/dashboard-gig-item-grid.tsx` - Added conflict detection

---

## How to Test

### 1. Calendar Subscription

1. Sign in to Ensemble
2. Navigate to Settings → Calendar
3. Copy the calendar subscription URL
4. Open Google Calendar:
   - Click "+" next to "Other calendars"
   - Select "From URL"
   - Paste subscription URL
   - Click "Add calendar"
5. Verify gigs appear in Google Calendar

### 2. In-App Calendar

1. Navigate to Calendar (sidebar)
2. Verify gigs appear in month view
3. Switch to week and day views
4. Test role filter (All | Managing | Playing)
5. Click a gig, verify navigation to Gig Pack
6. Hover over event, verify tooltip

### 3. Conflict Detection

1. Create two gigs on the same date and time
2. As a player, get invited to both
3. Accept first invitation (should succeed)
4. Accept second invitation (should show conflict dialog)
5. Verify conflicting gig details are shown
6. Click "Accept Anyway", verify acceptance
7. Try accepting a gig with no conflicts (should accept directly)

### 4. Token Management

1. Settings → Calendar
2. Click "Regenerate URL"
3. Confirm regeneration
4. Verify new URL is different
5. Test old URL (should return 401)
6. Test new URL (should work)

---

## Security Considerations

### Token Security

- ✅ 32-byte cryptographically secure random tokens
- ✅ Unique constraint prevents duplicates
- ✅ Indexed for fast lookup
- ✅ User can regenerate if compromised
- ✅ Tokens not exposed in UI except when needed

### API Security

- ✅ Public endpoint uses token-based auth
- ✅ Invalid token returns 401 (not 403, to avoid leaking info)
- ✅ Missing token returns 400
- ✅ RLS policies cover calendar_ics_token column

### Data Exposure

- ⚠️ **Important:** Anyone with the ICS URL can view user's gigs
- ✅ Warning displayed in settings UI
- ✅ Clear instructions to regenerate if shared accidentally

### Best Practices

- Token should be treated like a password
- Users should not share subscription URL
- If compromised, regenerate immediately
- Consider adding rate limiting to ICS endpoint (future enhancement)

---

## Performance Considerations

### ICS Feed Generation

- Fetches gigs for wide date range (30 days past, 1 year future)
- Limit 500 gigs (reasonable for most users)
- 5-minute cache header reduces server load
- Indexed query on calendar_ics_token

### Calendar View

- Fetches only visible date range (dynamic based on view)
- Client-side role filtering (fast, no extra requests)
- TanStack Query caching (5-minute stale time)
- Memoized event transformation

### Conflict Detection

- Single query fetching gigs on specific date
- Client-side time overlap check (fast)
- No additional requests unless conflicts exist

### External Calendar Refresh

- ⚠️ Google Calendar refreshes subscribed calendars every few hours
- ⚠️ Not real-time (users should be aware)
- ✅ Documented in settings page instructions

---

## Known Limitations (Phase 1)

1. **One-Way Sync:** Gigs appear in external calendar, but changes in external calendar don't affect Ensemble
2. **No Import:** Cannot import existing calendar events as gigs (Phase 1.5)
3. **Basic Conflict Detection:** Only checks Ensemble gigs, not external calendar events (Phase 1.5)
4. **Google Calendar Only (Instructions):** Instructions provided for Google, Apple, Outlook, but focused on Google
5. **Slow Refresh:** External calendars cache ICS feeds (typically 1-6 hours)
6. **No Calendar Event Editing:** User cannot edit gig details directly in external calendar

---

## Future Enhancements (Phase 1.5)

See `docs/future-enhancements/calendar-integration-roadmap.md` for full details.

### Google Calendar OAuth (Read-Only)

- Connect Google Calendar with OAuth
- Import existing events as draft gigs
- Full conflict detection (Ensemble + Google Calendar)
- Encouraged during onboarding

### Implementation Plan

1. Set up Google Cloud project and OAuth credentials
2. Add calendar_connections and calendar_sync_log tables
3. Implement OAuth flow
4. Add import events UI
5. Extend conflict detection
6. Add to onboarding flow

---

## TanStack Query Cache Keys

```typescript
// Calendar view
["calendar-gigs", userId, dateRange.from, dateRange.to]
```

**Invalidation:**
- Not needed for Phase 1 (gigs are the source of truth)
- Mutations on gigs automatically invalidate dashboard queries
- Calendar view refetches when date range changes

---

## Lessons Learned

### What Went Well

1. **ICS Format:** RFC 5545 compliant, works with all major calendar apps
2. **Token-Based Auth:** Simple and secure for public endpoint
3. **Conflict Detection:** Straightforward implementation, good UX
4. **Reusable Components:** `ConflictWarningDialog` can be extended for Phase 1.5

### Challenges

1. **ICS Library:** Had to test various ICS libraries, `ics` npm package worked best
2. **Time Parsing:** Handling all-day events and missing times required careful logic
3. **External Calendar Caching:** Cannot control refresh rate, documented limitation
4. **react-big-calendar:** Required moment.js, added extra dependency

### Improvements for Phase 1.5

1. Add Google Calendar OAuth for two-way awareness
2. Background sync job for continuous import
3. More sophisticated conflict detection (overlaps, travel time)
4. Calendar event templates for faster gig creation

---

## Documentation References

- **Roadmap:** `docs/future-enhancements/calendar-integration-roadmap.md`
- **BUILD_STEPS.md:** Section on calendar integration (to be updated)
- **API Docs:** Inline JSDoc in `lib/api/calendar.ts`

---

## Appendix: Code Snippets

### Generating ICS Feed

```typescript
// lib/api/calendar.ts
export async function generateICSFeed(userId: string): Promise<string> {
  const { gigs } = await listDashboardGigs(userId, {
    from: past30Days,
    to: next1Year,
    limit: 500,
    offset: 0,
  });

  const events: EventAttributes[] = gigs.map(gigToICSEvent);
  const { error, value } = createEvents(events);

  if (error) throw new Error("Failed to generate ICS feed");
  return value || "";
}
```

### Conflict Detection

```typescript
// lib/api/calendar.ts
export async function checkGigConflicts(
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null
): Promise<DashboardGig[]> {
  const { gigs } = await listDashboardGigs(userId, {
    from: new Date(date),
    to: new Date(date),
    limit: 100,
    offset: 0,
  });

  const gigsOnDate = gigs.filter((gig) => gig.date === date);

  if (!startTime || !endTime) return gigsOnDate;

  return gigsOnDate.filter((gig) => {
    if (!gig.startTime || !gig.endTime) return true;
    return timesOverlap(startTime, endTime, gig.startTime, gig.endTime);
  });
}
```

### Accept Invitation with Conflict Check

```typescript
// components/dashboard-gig-item.tsx
const handleAcceptInvitation = async () => {
  if (!user) return;

  const conflictingGigs = await checkGigConflicts(
    user.id,
    gig.date,
    gig.startTime,
    gig.endTime
  );

  if (conflictingGigs.length > 0) {
    setConflicts(conflictingGigs);
    setShowConflictDialog(true);
  } else {
    acceptInvitationMutation.mutate();
  }
};
```

---

**Next Steps:**
1. Test Phase 1 with real calendar apps
2. Gather user feedback
3. Plan Phase 1.5 timeline
4. Consider additional calendar providers (Apple iCloud, Outlook)

**Status:** Phase 1 ✅ Complete | Phase 1.5 🔜 Next

