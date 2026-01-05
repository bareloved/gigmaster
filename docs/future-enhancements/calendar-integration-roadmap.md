# Calendar Integration - Complete Roadmap

**Last Updated:** November 17, 2025  
**Status:** Phase 1 in progress

---

## Overview

Complete calendar integration for Ensemble, implemented in two phases:
- **Phase 1:** ICS feed export + in-app calendar view + basic conflict detection
- **Phase 1.5:** Google Calendar OAuth (read-only) + import events + full conflict detection

This document serves as the complete roadmap for both phases.

---

## Phase 1: ICS Feed & In-App Calendar ✅ IN PROGRESS

**Goal:** Users can subscribe to their Ensemble gigs in external calendars and view them in-app.

### What We're Building

1. **ICS Feed Export**
   - Personal calendar feed URL: `https://yourdomain.com/api/calendar.ics?token=USER_TOKEN`
   - Subscribe once, events auto-update when calendar refreshes
   - Works with Google Calendar, Apple Calendar, Outlook, any ICS-compatible calendar
   - Each gig becomes a calendar event with:
     - Title: `[Project Name] Gig Title`
     - Start/end times from gig
     - Location from gig
     - Description with link to Gig Pack
     - All-day event if no specific time

2. **In-App Calendar View**
   - Visual calendar showing all user's gigs
   - Month, week, and list views
   - Color coded by project
   - Click event → navigate to gig detail
   - Filter: All | As Player | As Manager

3. **Basic Conflict Detection**
   - Checks only gigs within Ensemble
   - Warns when accepting invitation that overlaps with existing gig
   - Shows list of conflicting gigs
   - User can "Accept Anyway" or cancel

4. **Calendar Settings Page**
   - Display ICS subscription URL
   - Copy URL button
   - Regenerate token button (with confirmation)
   - Instructions for subscribing in different calendar apps

### Technical Implementation

#### Database Schema
```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN calendar_ics_token TEXT UNIQUE;
CREATE INDEX idx_profiles_calendar_token ON profiles(calendar_ics_token);
```

#### API Functions (`lib/api/calendar.ts`)
```typescript
// Token management
export async function generateICSToken(userId: string): Promise<string>
export async function regenerateICSToken(userId: string): Promise<string>
export async function getICSToken(userId: string): Promise<string | null>

// ICS feed generation
export async function generateICSFeed(userId: string): Promise<string>

// Conflict detection (Ensemble gigs only)
export async function checkGigConflicts(
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null
): Promise<DashboardGig[]>
```

#### ICS API Route (`app/api/calendar.ics/route.ts`)
- Public endpoint (no auth, token-based)
- Query param: `?token=USER_TOKEN`
- Validates token, generates ICS feed
- Returns `text/calendar` content type

#### UI Components
- `/app/(app)/calendar/page.tsx` - Calendar view
- `/app/(app)/settings/calendar/page.tsx` - Token management
- `components/calendar-sync-setup.tsx` - Subscription instructions
- `components/conflict-warning-dialog.tsx` - Conflict warning

#### Dependencies
- `ics` - ICS file generation
- `react-big-calendar` - Calendar UI component
- `date-fns` - Date manipulation (already installed)

### User Experience

1. **First-Time Setup**
   - User navigates to Settings → Calendar
   - System auto-generates ICS token
   - User copies subscription URL
   - Follows instructions to subscribe in their calendar app

2. **Daily Use**
   - Gigs appear automatically in external calendar
   - User views in-app calendar for quick overview
   - Filter by role (player/manager)
   - Click gig to see details

3. **Accepting Invitations**
   - When accepting invitation, system checks for conflicts
   - If conflict exists, shows warning dialog
   - User can accept anyway or cancel

### Limitations (Phase 1)

- ❌ Cannot see user's existing calendar events
- ❌ Conflict detection only checks Ensemble gigs
- ❌ Cannot import calendar events as gigs
- ❌ One-way sync (gigs → calendar only)
- ❌ Manual refresh needed in external calendar
- ⚠️ External calendars cache ICS feeds (~1 hour)

### Success Criteria

- [x] User can generate ICS subscription URL
- [x] Gigs appear in Google Calendar when subscribed
- [x] In-app calendar shows all user's gigs
- [x] Color coding works consistently per project
- [x] Filter by role works correctly
- [x] Click event navigates to gig detail
- [x] Conflict warning appears when accepting overlapping gig
- [x] Regenerate token invalidates old URL

---

## Phase 1.5: Google Calendar OAuth (Read-Only) 🔜 NEXT

**Goal:** Import user's existing calendar events and enable full conflict detection.

### What We're Adding

1. **Google Calendar Integration (Read-Only)**
   - OAuth connection to Google Calendar
   - Read permission only (no writes/deletes)
   - Access to user's primary calendar
   - Can disconnect at any time

2. **Import Calendar Events as Gigs**
   - View existing calendar events in a list
   - Select events to import as draft gigs
   - Auto-populate title, date, time, location
   - User can edit before saving
   - Link back to original calendar event

3. **Full Conflict Detection**
   - Checks ALL calendar events (not just Ensemble gigs)
   - Includes: meetings, appointments, other gigs, personal events
   - Shows source of conflict (Ensemble gig vs. Calendar event)
   - More accurate scheduling decisions

4. **Encouraged During Onboarding**
   - "Connect your calendar for better scheduling"
   - Show benefits: import events, detect conflicts
   - Skippable (not required)
   - Can enable later in settings

### Technical Implementation

#### Database Schema
```sql
-- Store OAuth connection details
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  provider_calendar_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Track imported events
CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  sync_direction TEXT NOT NULL, -- 'import' for Phase 1.5
  synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add to gigs table
ALTER TABLE gigs ADD COLUMN external_calendar_event_id TEXT;
ALTER TABLE gigs ADD COLUMN external_calendar_provider TEXT;
ALTER TABLE gigs ADD COLUMN imported_from_calendar BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_calendar_connections_user ON calendar_connections(user_id);
CREATE INDEX idx_calendar_sync_log_external ON calendar_sync_log(external_event_id);
CREATE INDEX idx_gigs_external_event ON gigs(external_calendar_event_id);
```

#### API Functions (`lib/api/calendar.ts` - extend)
```typescript
// OAuth connection
export async function connectGoogleCalendar(
  userId: string,
  authCode: string
): Promise<void>

export async function disconnectGoogleCalendar(userId: string): Promise<void>

export async function getCalendarConnection(
  userId: string
): Promise<CalendarConnection | null>

// Fetch events from Google Calendar
export async function fetchGoogleCalendarEvents(
  userId: string,
  from: Date,
  to: Date
): Promise<GoogleCalendarEvent[]>

// Import events as gigs
export async function importCalendarEventAsGig(
  userId: string,
  projectId: string,
  eventId: string,
  eventDetails: GoogleCalendarEvent
): Promise<Gig>

// Full conflict detection (Ensemble + Calendar)
export async function checkAllConflicts(
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null
): Promise<{
  ensembleGigs: DashboardGig[];
  calendarEvents: GoogleCalendarEvent[];
}>
```

#### OAuth Setup (`lib/integrations/google-calendar.ts`)
```typescript
// Google Calendar API wrapper
export class GoogleCalendarClient {
  async authorize(authCode: string): Promise<Tokens>
  async refreshAccessToken(refreshToken: string): Promise<Tokens>
  async listEvents(from: Date, to: Date): Promise<GoogleCalendarEvent[]>
  async getEvent(eventId: string): Promise<GoogleCalendarEvent>
}
```

#### UI Components (New/Modified)
- `/app/(app)/settings/calendar/page.tsx` - Add OAuth connection section
- `/app/(app)/calendar/import/page.tsx` - Import events interface
- `components/google-calendar-connect-button.tsx` - OAuth button
- `components/import-events-dialog.tsx` - Select and import events
- `components/conflict-warning-dialog.tsx` - Extended to show calendar events

#### OAuth Flow
1. User clicks "Connect Google Calendar"
2. Opens Google OAuth consent screen (read-only permissions)
3. User approves, returns auth code
4. Exchange auth code for access + refresh tokens
5. Store tokens securely in database
6. Fetch and cache calendar events

#### Environment Variables
```env
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret
GOOGLE_CALENDAR_REDIRECT_URI=https://yourdomain.com/api/auth/google-calendar/callback
```

### User Experience

1. **Connection Flow**
   - Settings → Calendar → "Connect Google Calendar"
   - OAuth popup (read-only permissions)
   - Success message, connection status shown

2. **Import Events**
   - Calendar → "Import Events" button
   - Shows list of upcoming calendar events
   - Checkboxes to select events
   - Choose project for imported gigs
   - Preview before importing
   - Creates draft gigs (user can edit/delete)

3. **Full Conflict Detection**
   - When accepting invitation, checks BOTH:
     - Ensemble gigs
     - Google Calendar events
   - Warning shows source: "Conflicts with: Dentist Appointment (Google Calendar)"
   - More informed decision making

4. **Onboarding (Encouraged)**
   - After profile setup: "Connect your calendar?"
   - Shows benefits: import events, avoid conflicts
   - "Connect Now" or "Skip for now"
   - Can enable later in settings

### Security & Privacy

- ✅ Read-only access (no writes/deletes)
- ✅ User can disconnect at any time
- ✅ Tokens encrypted in database
- ✅ Refresh token flow for long-term access
- ✅ Clear messaging about permissions
- ✅ RLS policies on calendar_connections
- ⚠️ Tokens stored in database (consider encryption at rest)

### Performance

- Cache calendar events (5-minute stale time)
- Background sync job (optional: refresh every hour)
- Limit event fetch to reasonable range (±90 days)
- Index on external_event_id for fast lookups

### Limitations (Phase 1.5)

- ❌ Google Calendar only (no Apple/Outlook)
- ❌ Still no automatic sync (gigs → calendar)
- ❌ Import is manual (not continuous background sync)
- ⚠️ Requires OAuth setup (client ID/secret)
- ⚠️ Token refresh flow needed for long-term access

---

## Future Considerations (Phase 2 - Not Planned Yet)

### Two-Way Sync
- Create gig → auto-create calendar event
- Update gig → update calendar event
- Delete gig → delete calendar event
- **Risks:** Complexity, user confusion, accidental deletions

### Multiple Calendar Providers
- Apple Calendar (CalDAV)
- Outlook (Microsoft Graph API)
- Each requires separate OAuth setup

### Advanced Features
- Background sync (continuous import)
- Smart scheduling suggestions
- Availability sharing
- Calendar event templates

---

## Migration Path: Phase 1 → Phase 1.5

When ready to implement Phase 1.5:

1. **Prerequisites**
   - Google Cloud project setup
   - OAuth credentials configured
   - Redirect URI whitelisted
   - Environment variables added

2. **Database Migration**
   - Run Phase 1.5 migration
   - Add calendar_connections table
   - Add sync_log table
   - Extend gigs table

3. **Install Dependencies**
   ```bash
   npm install googleapis
   ```

4. **Implementation Order**
   - OAuth connection flow
   - Token storage and refresh
   - Fetch calendar events
   - Import events UI
   - Extended conflict detection
   - Onboarding flow

5. **Testing**
   - OAuth flow (connect/disconnect)
   - Token refresh
   - Import events
   - Full conflict detection
   - Multi-user isolation

---

## Success Metrics

### Phase 1
- Users can subscribe to ICS feed
- Gigs appear in external calendars
- In-app calendar is usable and performant
- Basic conflict warnings work

### Phase 1.5
- Users connect Google Calendar
- Import existing events successfully
- Full conflict detection prevents double-booking
- "Encouraged" UX improves adoption

---

## Documentation References

- **Build Process:** `docs/build-process/step-8-calendar-integration.md` (Phase 1)
- **API Documentation:** `lib/api/calendar.ts` (inline JSDoc)
- **User Guide:** TBD (for Phase 1.5)

---

## Questions & Decisions

### Why ICS First?
- Simple, no OAuth complexity
- Works with all calendar apps
- Users can test immediately
- Validates core use case

### Why Read-Only?
- Safer (no accidental deletions)
- Simpler (no sync conflicts)
- Faster to implement
- Users trust it more

### Why Google Calendar First?
- Most popular (70% of users)
- Best API documentation
- OAuth flow well-established
- Can add others later

### Why "Encouraged" Not Required?
- Some users don't use Google Calendar
- Optional features have better adoption
- Reduces onboarding friction
- Can always add later

---

**Status:** Phase 1 implementation in progress  
**Next:** Complete Phase 1, test with real usage, gather feedback, plan Phase 1.5 timeline

