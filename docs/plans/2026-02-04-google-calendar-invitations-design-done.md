# Google Calendar Gig Invitations

**Date:** 2026-02-04
**Status:** Design Complete

## Overview

Send Google Calendar invitations to lineup members when a manager views their gig pack. Musicians receive standard Google Calendar invites they can accept/decline, and responses sync back to GigMaster in real-time.

This is an optional feature - managers must enable it in settings and connect Google Calendar with write permissions.

## User Flow

### Manager Setup (One-time)
1. Go to Settings > Calendar
2. Connect Google Calendar (or reconnect with expanded permissions if already connected read-only)
3. Enable toggle: "Send Google Calendar invites to lineup members"

### Sending Invitations
1. Manager creates gig in editor
2. Manager adds lineup members (name, role, email)
3. Manager clicks "Gig Pack" button
4. System checks for uninvited members
5. If any members missing emails → modal prompts to collect them
6. Invitations sent in background (manager doesn't wait)
7. Gig pack view opens immediately
8. Toast shows progress: "Sending invitations..." → "✓ 4 invitations sent"

### Invitation Delivery
- Primary: Google Calendar event with musician as attendee
- Fallback: Email invitation with magic link (if calendar fails)
- Each member's invitation method tracked and shown in editor

### Response Handling
1. Musician receives Google Calendar invite
2. Musician accepts/declines/marks tentative in their calendar app
3. Google sends webhook to GigMaster (real-time)
4. GigMaster updates lineup status
5. Manager receives in-app notification: "John accepted" or "Sarah declined - needs sub"

### Gig Updates
When manager edits critical gig details, calendar events auto-update:
- Date or time changes
- Venue/location changes
- Call time changes
- Gig title changes

Non-critical changes (dress code, setlist, notes, payment) do not trigger updates.

## Calendar Event Format

### Title
```
[Band Name] - Venue Name
```
Example: `[The Jazz Quartet] - Blue Note NYC`

### Location
Venue name + address (if available)

### Time
- Start: Gig start time
- End: Gig end time (or start + 2 hours if not specified)

### Description
```
Your role: Lead Guitarist
Call time: 6:30 PM
Dress code: Smart casual

View full gig details:
https://gigmaster.app/gigs/{gig_id}/pack

---
This gig was organized with GigMaster.
Manage your gigs smarter → https://gigmaster.app
```

## Technical Design

### OAuth Changes

**New scope required:**
```
https://www.googleapis.com/auth/calendar.events
```

This allows creating and editing calendar events. Current read-only scopes remain for import functionality.

**Upgrade flow:**
If manager has existing read-only connection and enables the feature, prompt to reconnect with expanded permissions.

### Database Changes

**gig_roles table - new columns:**
```sql
ALTER TABLE gig_roles ADD COLUMN google_calendar_event_id TEXT;
ALTER TABLE gig_roles ADD COLUMN invitation_method TEXT; -- 'google_calendar', 'email', null
ALTER TABLE gig_roles ADD COLUMN invitation_sent_at TIMESTAMPTZ;
```

**calendar_connections table - new columns:**
```sql
ALTER TABLE calendar_connections ADD COLUMN write_access BOOLEAN DEFAULT false;
ALTER TABLE calendar_connections ADD COLUMN send_invites_enabled BOOLEAN DEFAULT false;
```

**New table for webhook management:**
```sql
CREATE TABLE google_calendar_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gcw_expiration ON google_calendar_watches(expiration);
CREATE INDEX idx_gcw_channel ON google_calendar_watches(channel_id);
```

### API Endpoints

**New endpoints:**

`POST /api/calendar/send-invites`
- Body: `{ gigId: string }`
- Creates calendar events for uninvited lineup members
- Returns: `{ sent: number, failed: number, results: [...] }`

`POST /api/webhooks/google-calendar`
- Receives push notifications from Google
- Verifies channel token
- Updates gig_role invitation_status
- Creates manager notification

`POST /api/calendar/update-event`
- Body: `{ gigId: string }`
- Updates existing calendar events with new gig details
- Called automatically after gig save

**Modified endpoints:**

`POST /api/auth/google-calendar/callback`
- Handle new write scope
- Set `write_access = true` on calendar_connections

### Background Processing

**Invitation sending:**
- Triggered when manager clicks "Gig Pack"
- Runs async, doesn't block UI
- Creates calendar events one by one
- Falls back to email if calendar fails
- Updates gig_role with invitation_method and event_id

**Webhook renewal:**
- Google Calendar watches expire after ~7 days
- Background job runs daily
- Renews watches expiring within 2 days
- If renewal fails, re-register on next gig pack view

**Gig update propagation:**
- Triggered on gig save if calendar-relevant fields changed
- Compares old vs new values for: date, start_time, end_time, location_name, location_address, call_time, title
- Updates all calendar events in background

### Status Mapping

| Google Calendar | GigMaster |
|-----------------|-----------|
| accepted | accepted |
| declined | declined |
| tentative | tentative |
| needsAction | pending |

### Error Handling

**Calendar event creation fails:**
- Fall back to email invitation (magic link system)
- Mark invitation_method as 'email'
- Log failure for debugging

**Webhook delivery fails:**
- Google retries with exponential backoff
- If still failing, status updates on next gig pack view (manual check)

**Invalid email:**
- Google Calendar API rejects invalid attendee emails
- Fall back to email invitation
- Show warning in UI: "Could not send calendar invite to X - sent email instead"

## UI Changes

### Settings Page (`/settings/calendar`)

Add new section when Google Calendar is connected:

```
[Toggle] Send Google Calendar invites to lineup members
         When you view a gig pack, lineup members will receive
         a Google Calendar invitation they can accept or decline.
```

If connected with read-only access:
```
[Button] Upgrade permissions
         Required to send calendar invitations
```

### Gig Editor - Lineup Tab

Add invitation method indicator per member:

| Icon | Meaning |
|------|---------|
| 📅 | Sent via Google Calendar |
| ✉️ | Sent via email |
| ⏳ | Not yet invited |
| ⚠️ | Failed (click to retry) |

Tooltip on hover: "Invited via Google Calendar on Feb 4, 2026"

### Gig Pack Button

Behavior when clicked:

```
IF calendar connected AND send_invites_enabled:
  IF any members missing emails:
    Show email collection modal
  Send invitations in background
  Show toast: "Sending invitations..."
Open gig pack view

ON background complete:
  Update toast: "✓ 4 invitations sent"
  OR: "3 sent, 1 failed - click to retry"
```

### Notifications

**For managers:**
- "John Smith accepted your gig invitation for [Gig Name]"
- "Sarah Jones declined - needs sub for [Gig Name]" (with link)

**Toast messages:**
- "Sending invitations..." (spinner)
- "✓ 4 invitations sent"
- "3 sent, 1 failed - click to retry"

## Files to Modify/Create

### New Files
- `/app/api/calendar/send-invites/route.ts` - Send calendar invites endpoint
- `/app/api/webhooks/google-calendar/route.ts` - Webhook receiver
- `/lib/api/calendar-invites.ts` - Calendar invitation logic
- `/components/gigs/email-collection-modal.tsx` - Collect missing emails

### Modified Files
- `/lib/integrations/google-calendar.ts` - Add createEvent, updateEvent, watchEvent methods
- `/app/api/auth/google-calendar/callback/route.ts` - Handle write scope
- `/app/(app)/settings/calendar/page.tsx` - Add invite toggle
- `/components/gigpack/editor/gig-editor-panel.tsx` - Add invitation icons to lineup
- `/components/dashboard/gig-item.tsx` - Modify Gig Pack button behavior
- `/lib/api/gigs.ts` - Trigger event updates on save

### Database Migrations
- `YYYYMMDD_calendar_invites.sql` - New columns and webhook table

## Security Considerations

- Webhook endpoint validates Google's channel token
- Only process webhooks for events we created (check calendar_event_id exists)
- RLS policies ensure users can only send invites for their own gigs
- Email addresses only collected/stored with user consent
- Calendar events created on manager's calendar (they own the data)

## Future Enhancements

- Bulk retry for failed invitations
- Preview calendar invite before sending
- Custom message in calendar description
- Support for other calendar providers (Outlook, Apple)
- Two-way sync (changes in Google Calendar update GigMaster)

## Open Questions

None - design complete and approved.
