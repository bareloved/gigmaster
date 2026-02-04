# Google Calendar Invitations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send Google Calendar invitations to lineup members when a manager views their gig pack, with real-time response sync via webhooks.

**Architecture:** Extend existing Google Calendar integration with write permissions. Add new columns to track invitation method per gig_role. Create webhook endpoint for real-time response updates. Background processing for non-blocking UX.

**Tech Stack:** Next.js API routes, Google Calendar API (googleapis), Supabase, TanStack Query

---

## Task 1: Database Migration - Add Calendar Invite Columns

**Files:**
- Create: `supabase/migrations/YYYYMMDD_calendar_invites.sql`

**Step 1: Write the migration SQL**

```sql
-- Google Calendar Invitations Schema
-- Adds support for sending calendar invites to lineup members

-- Add columns to calendar_connections for write access tracking
ALTER TABLE calendar_connections
ADD COLUMN IF NOT EXISTS write_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS send_invites_enabled BOOLEAN DEFAULT false;

-- Add columns to gig_roles for tracking calendar invitations
ALTER TABLE gig_roles
ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
ADD COLUMN IF NOT EXISTS invitation_method TEXT,
ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;

-- Create index for looking up roles by calendar event
CREATE INDEX IF NOT EXISTS idx_gig_roles_calendar_event
ON gig_roles(google_calendar_event_id)
WHERE google_calendar_event_id IS NOT NULL;

-- Create table for webhook channel management
CREATE TABLE IF NOT EXISTS google_calendar_watches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  calendar_event_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  resource_id TEXT NOT NULL,
  expiration TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, calendar_event_id)
);

-- Indexes for webhook management
CREATE INDEX idx_gcw_user ON google_calendar_watches(user_id);
CREATE INDEX idx_gcw_expiration ON google_calendar_watches(expiration);
CREATE INDEX idx_gcw_channel ON google_calendar_watches(channel_id);

-- RLS for google_calendar_watches
ALTER TABLE google_calendar_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calendar watches"
  ON google_calendar_watches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar watches"
  ON google_calendar_watches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar watches"
  ON google_calendar_watches FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON COLUMN calendar_connections.write_access IS 'Whether user has granted write access for creating calendar events';
COMMENT ON COLUMN calendar_connections.send_invites_enabled IS 'Whether user has enabled sending calendar invites to lineup members';
COMMENT ON COLUMN gig_roles.google_calendar_event_id IS 'Google Calendar event ID if invited via calendar';
COMMENT ON COLUMN gig_roles.invitation_method IS 'How invitation was sent: google_calendar, email, or null';
COMMENT ON COLUMN gig_roles.invitation_sent_at IS 'When the invitation was sent';
COMMENT ON TABLE google_calendar_watches IS 'Tracks Google Calendar webhook channels for response sync';
```

**Step 2: Apply migration via Supabase Dashboard**

Run: Open Supabase Dashboard > SQL Editor > Paste and run the migration

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(db): add calendar invites schema"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts` (regenerate from Supabase)
- Modify: `lib/types/shared.ts`

**Step 1: Regenerate database types**

Run: `npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/types/database.ts`

Or manually add to `lib/types/database.ts` in the `gig_roles` table Row type:
```typescript
google_calendar_event_id: string | null
invitation_method: string | null
invitation_sent_at: string | null
```

And in `calendar_connections` Row type:
```typescript
write_access: boolean | null
send_invites_enabled: boolean | null
```

**Step 2: Add new types to shared.ts**

Add after the `InvitationStatus` type definition around line 96:

```typescript
/**
 * Invitation method tracking
 */
export type InvitationMethod = 'google_calendar' | 'email' | null;

/**
 * Google Calendar watch for webhook sync
 */
export interface GoogleCalendarWatch {
  id: string;
  userId: string;
  gigId: string;
  calendarEventId: string;
  channelId: string;
  resourceId: string;
  expiration: string;
  createdAt: string;
}

/**
 * Calendar invite send result
 */
export interface CalendarInviteResult {
  roleId: string;
  success: boolean;
  method: InvitationMethod;
  eventId?: string;
  error?: string;
}

/**
 * Batch calendar invite response
 */
export interface SendInvitesResponse {
  sent: number;
  failed: number;
  results: CalendarInviteResult[];
}
```

**Step 3: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add lib/types/
git commit -m "feat(types): add calendar invite types"
```

---

## Task 3: Extend Google Calendar Client with Write Methods

**Files:**
- Modify: `lib/integrations/google-calendar.ts`

**Step 1: Add write scopes constant**

Add after line 11 (after the imports section):

```typescript
/**
 * OAuth scopes for read-only access (current)
 */
export const GOOGLE_CALENDAR_READ_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
];

/**
 * OAuth scopes for write access (calendar invitations)
 */
export const GOOGLE_CALENDAR_WRITE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];
```

**Step 2: Add CreateEventInput interface**

Add after the `GoogleTokens` interface (around line 48):

```typescript
export interface CreateEventInput {
  summary: string;
  description: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface WatchResponse {
  channelId: string;
  resourceId: string;
  expiration: number;
}
```

**Step 3: Update getAuthorizationUrl to accept write scope parameter**

Replace the `getAuthorizationUrl` method (around line 80-91):

```typescript
/**
 * Generate authorization URL for OAuth flow
 * @param writeAccess - If true, request write permissions for creating events
 */
getAuthorizationUrl(writeAccess: boolean = false): string {
  const scopes = writeAccess
    ? GOOGLE_CALENDAR_WRITE_SCOPES
    : GOOGLE_CALENDAR_READ_SCOPES;

  return this.oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
}
```

**Step 4: Add createEvent method**

Add after the `getEvent` method (around line 245):

```typescript
/**
 * Create a calendar event with attendees
 */
async createEvent(input: CreateEventInput): Promise<GoogleCalendarEvent> {
  try {
    const response = await this.calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
        attendees: input.attendees.map(a => ({
          email: a.email,
          displayName: a.displayName,
        })),
        reminders: {
          useDefault: true,
        },
      },
      sendUpdates: "all", // Send invitations to attendees
    });

    const event = response.data;
    return {
      id: event.id || '',
      summary: event.summary || '',
      description: event.description || undefined,
      location: event.location || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      htmlLink: event.htmlLink || '',
      status: event.status || '',
      attendees: event.attendees?.map(a => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to create calendar event: ${message}`);
  }
}

/**
 * Update an existing calendar event
 */
async updateEvent(eventId: string, input: Partial<CreateEventInput>): Promise<GoogleCalendarEvent> {
  try {
    const response = await this.calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: input.start,
        end: input.end,
      },
      sendUpdates: "all",
    });

    const event = response.data;
    return {
      id: event.id || '',
      summary: event.summary || '',
      description: event.description || undefined,
      location: event.location || undefined,
      start: {
        dateTime: event.start?.dateTime || undefined,
        date: event.start?.date || undefined,
        timeZone: event.start?.timeZone || undefined,
      },
      end: {
        dateTime: event.end?.dateTime || undefined,
        date: event.end?.date || undefined,
        timeZone: event.end?.timeZone || undefined,
      },
      htmlLink: event.htmlLink || '',
      status: event.status || '',
      attendees: event.attendees?.map(a => ({
        email: a.email || '',
        displayName: a.displayName || undefined,
        responseStatus: a.responseStatus as 'accepted' | 'declined' | 'tentative' | 'needsAction' | undefined,
      })),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update calendar event: ${message}`);
  }
}

/**
 * Watch a calendar event for changes (webhook registration)
 */
async watchEvent(eventId: string, webhookUrl: string): Promise<WatchResponse> {
  try {
    // Generate unique channel ID
    const channelId = `gigmaster-${eventId}-${Date.now()}`;

    const response = await this.calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        params: {
          ttl: "604800", // 7 days in seconds
        },
      },
    });

    return {
      channelId: response.data.id || channelId,
      resourceId: response.data.resourceId || '',
      expiration: parseInt(response.data.expiration || '0', 10),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to watch calendar event: ${message}`);
  }
}

/**
 * Stop watching a calendar event
 */
async stopWatch(channelId: string, resourceId: string): Promise<void> {
  try {
    await this.calendar.channels.stop({
      requestBody: {
        id: channelId,
        resourceId,
      },
    });
  } catch (error: unknown) {
    // Ignore errors when stopping watches - channel may have expired
    console.warn(`Failed to stop watch ${channelId}:`, error);
  }
}
```

**Step 5: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 6: Commit**

```bash
git add lib/integrations/google-calendar.ts
git commit -m "feat(google): add calendar event write methods"
```

---

## Task 4: Create Calendar Invites API

**Files:**
- Create: `lib/api/calendar-invites.ts`

**Step 1: Create the API file**

```typescript
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient, CreateEventInput } from "@/lib/integrations/google-calendar";
import { inviteMusicianByEmail } from "@/lib/api/gig-invitations";
import { createNotification } from "@/lib/api/notifications";
import type { CalendarInviteResult, SendInvitesResponse } from "@/lib/types/shared";

/**
 * Calendar Invites API
 *
 * Server-only functions for sending Google Calendar invitations to lineup members
 */

interface GigRoleForInvite {
  id: string;
  role_name: string | null;
  musician_name: string | null;
  musician_id: string | null;
  invitation_status: string | null;
  invitation_method: string | null;
  google_calendar_event_id: string | null;
  contact_id: string | null;
  musician_contacts: {
    email: string | null;
  } | null;
  profiles: {
    email: string | null;
    name: string | null;
  } | null;
}

interface GigForInvite {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  call_time: string | null;
  location_name: string | null;
  location_address: string | null;
  dress_code: string | null;
  owner_id: string;
  owner: {
    name: string | null;
  } | null;
  projects: {
    name: string;
  } | null;
}

/**
 * Check if user has calendar write access enabled
 */
export async function hasCalendarWriteAccess(userId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("calendar_connections")
    .select("write_access, send_invites_enabled")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  return Boolean(data?.write_access && data?.send_invites_enabled);
}

/**
 * Get gig roles that need calendar invitations
 */
export async function getRolesNeedingInvites(gigId: string): Promise<{
  roles: GigRoleForInvite[];
  missingEmails: GigRoleForInvite[];
}> {
  const supabase = await createClient();

  const { data: roles, error } = await supabase
    .from("gig_roles")
    .select(`
      id,
      role_name,
      musician_name,
      musician_id,
      invitation_status,
      invitation_method,
      google_calendar_event_id,
      contact_id,
      musician_contacts (
        email
      ),
      profiles:musician_id (
        email,
        name
      )
    `)
    .eq("gig_id", gigId)
    .is("google_calendar_event_id", null)
    .is("invitation_method", null);

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  const rolesWithData = (roles || []) as GigRoleForInvite[];

  // Separate roles with and without emails
  const rolesWithEmails: GigRoleForInvite[] = [];
  const missingEmails: GigRoleForInvite[] = [];

  for (const role of rolesWithData) {
    const email = role.profiles?.email || role.musician_contacts?.email;
    if (email) {
      rolesWithEmails.push(role);
    } else {
      missingEmails.push(role);
    }
  }

  return { roles: rolesWithEmails, missingEmails };
}

/**
 * Build calendar event description
 */
function buildEventDescription(
  role: GigRoleForInvite,
  gig: GigForInvite,
  baseUrl: string
): string {
  const lines: string[] = [];

  lines.push(`Your role: ${role.role_name || 'Musician'}`);

  if (gig.call_time) {
    lines.push(`Call time: ${gig.call_time}`);
  }

  if (gig.dress_code) {
    lines.push(`Dress code: ${gig.dress_code}`);
  }

  lines.push('');
  lines.push(`View full gig details:`);
  lines.push(`${baseUrl}/gigs/${gig.id}/pack`);
  lines.push('');
  lines.push('---');
  lines.push('This gig was organized with GigMaster.');
  lines.push(`Manage your gigs smarter → ${baseUrl}`);

  return lines.join('\n');
}

/**
 * Build event title
 */
function buildEventTitle(gig: GigForInvite): string {
  const bandName = gig.projects?.name || gig.owner?.name || 'Gig';
  const venue = gig.location_name || 'TBD';
  return `[${bandName}] - ${venue}`;
}

/**
 * Convert gig date/time to ISO format for Google Calendar
 */
function toGoogleDateTime(date: string, time: string | null, fallbackHours: number = 2): {
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
} {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  if (time) {
    const startDateTime = `${date}T${time}:00`;
    // Default to 2 hours if no end time
    const endDateTime = `${date}T${time}:00`;

    return {
      start: { dateTime: startDateTime, timeZone },
      end: { dateTime: endDateTime, timeZone },
    };
  }

  // All-day event fallback
  return {
    start: { dateTime: `${date}T18:00:00`, timeZone },
    end: { dateTime: `${date}T20:00:00`, timeZone },
  };
}

/**
 * Send calendar invitations to lineup members
 */
export async function sendCalendarInvites(
  gigId: string,
  userId: string,
  roleEmails?: Record<string, string> // roleId -> email for missing emails
): Promise<SendInvitesResponse> {
  const supabase = await createClient();
  const results: CalendarInviteResult[] = [];

  // Get calendar connection
  const { data: connection, error: connError } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, write_access, send_invites_enabled")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connError || !connection) {
    throw new Error("Google Calendar not connected");
  }

  if (!connection.write_access || !connection.send_invites_enabled) {
    throw new Error("Calendar invites not enabled");
  }

  // Get gig details
  const { data: gig, error: gigError } = await supabase
    .from("gigs")
    .select(`
      id,
      title,
      date,
      start_time,
      end_time,
      call_time,
      location_name,
      location_address,
      dress_code,
      owner_id,
      owner:profiles!gigs_owner_id_fkey (
        name
      ),
      projects (
        name
      )
    `)
    .eq("id", gigId)
    .single();

  if (gigError || !gig) {
    throw new Error(`Failed to fetch gig: ${gigError?.message}`);
  }

  // Verify user owns this gig
  if (gig.owner_id !== userId) {
    throw new Error("Not authorized to send invites for this gig");
  }

  // Get roles needing invites
  const { roles, missingEmails } = await getRolesNeedingInvites(gigId);

  // Merge provided emails for missing ones
  const allRoles = [...roles];
  for (const role of missingEmails) {
    if (roleEmails?.[role.id]) {
      // Add email from provided map
      allRoles.push({
        ...role,
        musician_contacts: { email: roleEmails[role.id] },
      });
    }
  }

  if (allRoles.length === 0) {
    return { sent: 0, failed: 0, results: [] };
  }

  // Initialize Google client
  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gigmaster.app';
  const { start, end } = toGoogleDateTime(gig.date, gig.start_time);

  // Send invites one by one
  for (const role of allRoles) {
    const email = role.profiles?.email || role.musician_contacts?.email;
    const displayName = role.profiles?.name || role.musician_name || undefined;

    if (!email) {
      results.push({
        roleId: role.id,
        success: false,
        method: null,
        error: "No email address",
      });
      continue;
    }

    try {
      // Create calendar event
      const eventInput: CreateEventInput = {
        summary: buildEventTitle(gig as GigForInvite),
        description: buildEventDescription(role, gig as GigForInvite, baseUrl),
        location: gig.location_name || undefined,
        start,
        end,
        attendees: [{ email, displayName }],
      };

      const event = await googleClient.createEvent(eventInput);

      // Update gig_role with event ID
      await supabase
        .from("gig_roles")
        .update({
          google_calendar_event_id: event.id,
          invitation_method: "google_calendar",
          invitation_sent_at: new Date().toISOString(),
          invitation_status: role.invitation_status === "pending" ? "invited" : role.invitation_status,
        })
        .eq("id", role.id);

      results.push({
        roleId: role.id,
        success: true,
        method: "google_calendar",
        eventId: event.id,
      });

    } catch (error) {
      // Fall back to email invitation
      console.error(`Calendar invite failed for role ${role.id}:`, error);

      try {
        await inviteMusicianByEmail(role.id, email);

        await supabase
          .from("gig_roles")
          .update({
            invitation_method: "email",
            invitation_sent_at: new Date().toISOString(),
          })
          .eq("id", role.id);

        results.push({
          roleId: role.id,
          success: true,
          method: "email",
        });
      } catch (emailError) {
        results.push({
          roleId: role.id,
          success: false,
          method: null,
          error: `Calendar and email both failed: ${error instanceof Error ? error.message : 'Unknown'}`,
        });
      }
    }
  }

  const sent = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return { sent, failed, results };
}

/**
 * Update calendar events when gig details change
 */
export async function updateCalendarEvents(
  gigId: string,
  userId: string,
  changedFields: string[]
): Promise<number> {
  // Only update for significant changes
  const significantFields = ['date', 'start_time', 'end_time', 'location_name', 'call_time', 'title'];
  const hasSignificantChange = changedFields.some(f => significantFields.includes(f));

  if (!hasSignificantChange) {
    return 0;
  }

  const supabase = await createClient();

  // Get gig and connection
  const [gigResult, connectionResult] = await Promise.all([
    supabase
      .from("gigs")
      .select(`
        id, title, date, start_time, end_time, call_time,
        location_name, location_address, dress_code, owner_id,
        owner:profiles!gigs_owner_id_fkey (name),
        projects (name)
      `)
      .eq("id", gigId)
      .single(),
    supabase
      .from("calendar_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", userId)
      .eq("provider", "google")
      .single(),
  ]);

  if (gigResult.error || !gigResult.data || connectionResult.error || !connectionResult.data) {
    return 0;
  }

  const gig = gigResult.data;
  const connection = connectionResult.data;

  // Get roles with calendar events
  const { data: roles } = await supabase
    .from("gig_roles")
    .select("id, google_calendar_event_id, role_name, musician_name, profiles:musician_id (name)")
    .eq("gig_id", gigId)
    .not("google_calendar_event_id", "is", null);

  if (!roles || roles.length === 0) {
    return 0;
  }

  // Initialize Google client
  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gigmaster.app';
  const { start, end } = toGoogleDateTime(gig.date, gig.start_time);

  let updated = 0;

  for (const role of roles) {
    if (!role.google_calendar_event_id) continue;

    try {
      await googleClient.updateEvent(role.google_calendar_event_id, {
        summary: buildEventTitle(gig as unknown as GigForInvite),
        description: buildEventDescription(
          role as unknown as GigRoleForInvite,
          gig as unknown as GigForInvite,
          baseUrl
        ),
        location: gig.location_name || undefined,
        start,
        end,
      });
      updated++;
    } catch (error) {
      console.error(`Failed to update event ${role.google_calendar_event_id}:`, error);
    }
  }

  return updated;
}

/**
 * Map Google Calendar response status to GigMaster invitation status
 */
export function mapResponseStatus(googleStatus: string): string {
  switch (googleStatus) {
    case 'accepted':
      return 'accepted';
    case 'declined':
      return 'declined';
    case 'tentative':
      return 'tentative';
    case 'needsAction':
    default:
      return 'invited';
  }
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add lib/api/calendar-invites.ts
git commit -m "feat(api): add calendar invites API"
```

---

## Task 5: Create Send Invites API Route

**Files:**
- Create: `app/api/calendar/send-invites/route.ts`

**Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendCalendarInvites, getRolesNeedingInvites } from "@/lib/api/calendar-invites";

/**
 * POST /api/calendar/send-invites
 *
 * Sends Google Calendar invitations to lineup members
 * Falls back to email if calendar fails
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { gigId, roleEmails } = body as {
      gigId: string;
      roleEmails?: Record<string, string>;
    };

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    const result = await sendCalendarInvites(gigId, user.id, roleEmails);

    return NextResponse.json(result);

  } catch (error) {
    console.error("[Send Invites] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send invites" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/send-invites?gigId=xxx
 *
 * Get roles that need invitations (for showing email collection modal)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const gigId = searchParams.get("gigId");

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    const { roles, missingEmails } = await getRolesNeedingInvites(gigId);

    return NextResponse.json({
      needsInvites: roles.length + missingEmails.length,
      withEmails: roles.length,
      missingEmails: missingEmails.map(r => ({
        id: r.id,
        name: r.musician_name || r.profiles?.name || 'Unknown',
        role: r.role_name,
      })),
    });

  } catch (error) {
    console.error("[Get Roles] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get roles" },
      { status: 500 }
    );
  }
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add app/api/calendar/send-invites/
git commit -m "feat(api): add send-invites endpoint"
```

---

## Task 6: Create Webhook Endpoint

**Files:**
- Create: `app/api/webhooks/google-calendar/route.ts`

**Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";
import { mapResponseStatus } from "@/lib/api/calendar-invites";
import { createNotification } from "@/lib/api/notifications";

/**
 * POST /api/webhooks/google-calendar
 *
 * Receives push notifications from Google Calendar when attendees respond
 */
export async function POST(request: NextRequest) {
  try {
    // Google sends these headers for verification
    const channelId = request.headers.get("x-goog-channel-id");
    const resourceState = request.headers.get("x-goog-resource-state");
    const resourceId = request.headers.get("x-goog-resource-id");

    // Sync message - just acknowledge
    if (resourceState === "sync") {
      return NextResponse.json({ received: true });
    }

    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Find the watch record
    const { data: watch, error: watchError } = await supabase
      .from("google_calendar_watches")
      .select("user_id, gig_id, calendar_event_id")
      .eq("channel_id", channelId)
      .single();

    if (watchError || !watch) {
      console.warn(`[Webhook] Unknown channel: ${channelId}`);
      return NextResponse.json({ received: true });
    }

    // Get user's calendar connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", watch.user_id)
      .eq("provider", "google")
      .single();

    if (!connection) {
      console.warn(`[Webhook] No connection for user: ${watch.user_id}`);
      return NextResponse.json({ received: true });
    }

    // Fetch updated event from Google
    const googleClient = new GoogleCalendarClient();
    googleClient.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expiry_date: new Date(connection.token_expires_at).getTime(),
    });

    const event = await googleClient.getEvent(watch.calendar_event_id);

    if (!event.attendees) {
      return NextResponse.json({ received: true });
    }

    // Get gig roles with this event ID
    const { data: roles } = await supabase
      .from("gig_roles")
      .select(`
        id,
        invitation_status,
        musician_id,
        role_name,
        musician_contacts (email),
        profiles:musician_id (email, name)
      `)
      .eq("gig_id", watch.gig_id)
      .eq("google_calendar_event_id", watch.calendar_event_id);

    if (!roles || roles.length === 0) {
      return NextResponse.json({ received: true });
    }

    // Get gig details for notification
    const { data: gig } = await supabase
      .from("gigs")
      .select("id, title, owner_id")
      .eq("id", watch.gig_id)
      .single();

    // Update role statuses based on attendee responses
    for (const role of roles) {
      const email = role.profiles?.email || role.musician_contacts?.email;
      if (!email) continue;

      const attendee = event.attendees.find(a =>
        a.email.toLowerCase() === email.toLowerCase()
      );

      if (!attendee?.responseStatus) continue;

      const newStatus = mapResponseStatus(attendee.responseStatus);

      // Only update if status changed
      if (newStatus !== role.invitation_status) {
        await supabase
          .from("gig_roles")
          .update({ invitation_status: newStatus })
          .eq("id", role.id);

        // Notify gig owner
        if (gig && gig.owner_id) {
          const musicianName = role.profiles?.name || 'A musician';
          let title = '';
          let message = '';

          if (newStatus === 'accepted') {
            title = `${musicianName} accepted`;
            message = `${musicianName} accepted the invitation for ${gig.title}`;
          } else if (newStatus === 'declined') {
            title = `${musicianName} declined`;
            message = `${musicianName} declined the invitation for ${gig.title} - needs sub`;
          } else if (newStatus === 'tentative') {
            title = `${musicianName} is tentative`;
            message = `${musicianName} marked tentative for ${gig.title}`;
          }

          if (title) {
            await createNotification({
              user_id: gig.owner_id,
              type: 'status_changed',
              title,
              message,
              link: `/gigs/${gig.id}`,
              gig_id: gig.id,
              gig_role_id: role.id,
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error("[Webhook] Error:", error);
    // Always return 200 to prevent Google from retrying
    return NextResponse.json({ received: true });
  }
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add app/api/webhooks/google-calendar/
git commit -m "feat(api): add Google Calendar webhook endpoint"
```

---

## Task 7: Update OAuth Callback for Write Access

**Files:**
- Modify: `app/api/auth/google-calendar/callback/route.ts`
- Modify: `app/api/calendar/connect/route.ts`

**Step 1: Update callback to detect write scope**

Replace `app/api/auth/google-calendar/callback/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient, GOOGLE_CALENDAR_WRITE_SCOPES } from "@/lib/integrations/google-calendar";

/**
 * Google Calendar OAuth Callback
 *
 * Handles the OAuth redirect from Google after user authorizes the app.
 * Detects if write access was granted and stores appropriately.
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const scope = searchParams.get("scope");

    // Check for OAuth errors
    if (error) {
      console.error("Google OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/settings/calendar?error=oauth_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/calendar?error=missing_code", request.url)
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.redirect(
        new URL("/auth/sign-in?error=unauthenticated", request.url)
      );
    }

    // Exchange authorization code for tokens
    const googleClient = new GoogleCalendarClient();
    const tokens = await googleClient.authorize(code);

    // Check if write scope was granted
    const grantedScopes = scope?.split(" ") || [];
    const hasWriteAccess = grantedScopes.includes(
      "https://www.googleapis.com/auth/calendar.events"
    );

    // Store tokens in database
    const { error: dbError } = await supabase
      .from("calendar_connections")
      .upsert(
        {
          user_id: user.id,
          provider: "google",
          provider_calendar_id: "primary",
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(tokens.expiry_date).toISOString(),
          sync_enabled: true,
          write_access: hasWriteAccess,
          last_synced_at: null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      )
      .select();

    if (dbError) {
      console.error("[OAuth Callback] Failed to save calendar connection:", dbError);
      return NextResponse.redirect(
        new URL("/settings/calendar?error=save_failed", request.url)
      );
    }

    // Success! Redirect back to settings
    const successParam = hasWriteAccess ? "connected_write" : "connected";
    return NextResponse.redirect(
      new URL(`/settings/calendar?success=${successParam}`, request.url)
    );
  } catch (error: unknown) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(`/settings/calendar?error=callback_failed`, request.url)
    );
  }
}
```

**Step 2: Update connect route to accept write access parameter**

Update `app/api/calendar/connect/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";

/**
 * GET /api/calendar/connect?writeAccess=true
 *
 * Initiates Google Calendar OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const writeAccess = searchParams.get("writeAccess") === "true";

    const googleClient = new GoogleCalendarClient();
    const authUrl = googleClient.getAuthorizationUrl(writeAccess);

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("[Calendar Connect] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate auth URL" },
      { status: 500 }
    );
  }
}
```

**Step 3: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add app/api/auth/google-calendar/callback/route.ts app/api/calendar/connect/route.ts
git commit -m "feat(auth): support write access in OAuth flow"
```

---

## Task 8: Update Settings Page UI

**Files:**
- Modify: `app/(app)/settings/calendar/page.tsx`

**Step 1: Add state for write access and invites toggle**

Add after line 30 (after the existing state declarations):

```typescript
const [hasWriteAccess, setHasWriteAccess] = useState(false);
const [sendInvitesEnabled, setSendInvitesEnabled] = useState(false);
const [isUpgrading, setIsUpgrading] = useState(false);
const [isTogglingInvites, setIsTogglingInvites] = useState(false);
```

**Step 2: Update the init function to check write access**

Replace the Google Calendar connection check section (around line 66-77):

```typescript
// Check Google Calendar connection
const supabase = createClient();
const { data: connection } = await supabase
  .from("calendar_connections")
  .select("last_synced_at, write_access, send_invites_enabled")
  .eq("user_id", user.id)
  .eq("provider", "google")
  .single();

if (connection) {
  setGoogleConnected(true);
  setLastSynced(connection.last_synced_at);
  setHasWriteAccess(connection.write_access ?? false);
  setSendInvitesEnabled(connection.send_invites_enabled ?? false);
}
```

**Step 3: Update success message handling**

Update the useEffect for searchParams (around line 34-44):

```typescript
useEffect(() => {
  const success = searchParams.get("success");
  const error = searchParams.get("error");

  if (success === "connected") {
    toast.success("Google Calendar connected (read-only)");
    setGoogleConnected(true);
  } else if (success === "connected_write") {
    toast.success("Google Calendar connected with full access!");
    setGoogleConnected(true);
    setHasWriteAccess(true);
  } else if (error) {
    toast.error(`Connection failed: ${error}`);
  }
}, [searchParams]);
```

**Step 4: Add upgrade and toggle handlers**

Add after the handleDisconnectGoogle function (around line 170):

```typescript
const handleUpgradeToWriteAccess = async () => {
  try {
    setIsUpgrading(true);
    const response = await fetch("/api/calendar/connect?writeAccess=true");
    const data = await response.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error("Failed to initiate upgrade");
      setIsUpgrading(false);
    }
  } catch (error) {
    console.error("Error upgrading:", error);
    toast.error("Failed to upgrade permissions");
    setIsUpgrading(false);
  }
};

const handleToggleInvites = async () => {
  if (!user) return;

  try {
    setIsTogglingInvites(true);
    const supabase = createClient();

    const newValue = !sendInvitesEnabled;
    const { error } = await supabase
      .from("calendar_connections")
      .update({ send_invites_enabled: newValue })
      .eq("user_id", user.id)
      .eq("provider", "google");

    if (error) throw error;

    setSendInvitesEnabled(newValue);
    toast.success(newValue ? "Calendar invites enabled" : "Calendar invites disabled");
  } catch (error) {
    console.error("Error toggling invites:", error);
    toast.error("Failed to update setting");
  } finally {
    setIsTogglingInvites(false);
  }
};
```

**Step 5: Update the connected state UI**

Replace the connected state Alert and buttons section (around line 206-246) with:

```typescript
{googleConnected ? (
  <>
    <Alert>
      <Check className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-sm">
        <strong>Connected.</strong> Your Google Calendar is connected
        {hasWriteAccess ? " with full access" : " (read-only)"}.
        {lastSynced && (
          <span className="block text-xs text-gray-600 mt-1">
            Last synced: {new Date(lastSynced).toLocaleString()}
          </span>
        )}
      </AlertDescription>
    </Alert>

    {/* Calendar Invites Toggle - only show if write access */}
    {hasWriteAccess && (
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="send-invites" className="text-base">
            Send Google Calendar invites
          </Label>
          <p className="text-sm text-muted-foreground">
            When you view a gig pack, lineup members receive calendar invitations
          </p>
        </div>
        <Button
          id="send-invites"
          variant={sendInvitesEnabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggleInvites}
          disabled={isTogglingInvites}
        >
          {isTogglingInvites ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : sendInvitesEnabled ? (
            "Enabled"
          ) : (
            "Disabled"
          )}
        </Button>
      </div>
    )}

    {/* Upgrade to write access */}
    {!hasWriteAccess && (
      <Alert>
        <AlertDescription className="text-sm">
          <strong>Want to send calendar invites?</strong> Upgrade your connection to send
          Google Calendar invitations to your lineup members.
          <Button
            variant="link"
            size="sm"
            className="p-0 h-auto ml-2"
            onClick={handleUpgradeToWriteAccess}
            disabled={isUpgrading}
          >
            {isUpgrading ? "Upgrading..." : "Upgrade permissions"}
          </Button>
        </AlertDescription>
      </Alert>
    )}

    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.location.href = "/calendar/import"}
      >
        Import Events
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDisconnectGoogle}
        disabled={isDisconnecting}
      >
        {isDisconnecting ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Disconnecting...
          </>
        ) : (
          <>
            <Unlink className="h-4 w-4 mr-2" />
            Disconnect
          </>
        )}
      </Button>
    </div>
  </>
) : (
  // ... existing not-connected UI
)}
```

**Step 6: Run type check and lint**

Run: `npm run check && npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add app/(app)/settings/calendar/page.tsx
git commit -m "feat(ui): add calendar invites settings toggle"
```

---

## Task 9: Create Email Collection Modal

**Files:**
- Create: `components/gigs/email-collection-modal.tsx`

**Step 1: Create the modal component**

```typescript
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

interface MissingEmailRole {
  id: string;
  name: string;
  role: string | null;
}

interface EmailCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingEmails: MissingEmailRole[];
  onSubmit: (emails: Record<string, string>) => void;
  onSkip: () => void;
}

export function EmailCollectionModal({
  open,
  onOpenChange,
  missingEmails,
  onSubmit,
  onSkip,
}: EmailCollectionModalProps) {
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (roleId: string, value: string) => {
    setEmails(prev => ({ ...prev, [roleId]: value }));
    if (errors[roleId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[roleId];
        return newErrors;
      });
    }
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    for (const [roleId, email] of Object.entries(emails)) {
      if (email && !validateEmail(email)) {
        newErrors[roleId] = "Invalid email format";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Filter out empty emails
    const validEmails = Object.fromEntries(
      Object.entries(emails).filter(([, email]) => email.trim())
    );

    onSubmit(validEmails);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Missing Email Addresses
          </DialogTitle>
          <DialogDescription>
            The following lineup members don&apos;t have email addresses.
            Add their emails to send calendar invitations, or skip to send only to members with emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {missingEmails.map((role) => (
            <div key={role.id} className="space-y-2">
              <Label htmlFor={`email-${role.id}`}>
                {role.name} {role.role && `(${role.role})`}
              </Label>
              <Input
                id={`email-${role.id}`}
                type="email"
                placeholder="email@example.com"
                value={emails[role.id] || ""}
                onChange={(e) => handleEmailChange(role.id, e.target.value)}
                className={errors[role.id] ? "border-red-500" : ""}
              />
              {errors[role.id] && (
                <p className="text-xs text-red-500">{errors[role.id]}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip}>
            Skip these members
          </Button>
          <Button onClick={handleSubmit}>
            Send Invitations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add components/gigs/email-collection-modal.tsx
git commit -m "feat(ui): add email collection modal"
```

---

## Task 10: Update Gig Pack Button Behavior

**Files:**
- Modify: `components/dashboard/gig-item.tsx`

**Step 1: Add imports and state**

Add to imports (around line 18):

```typescript
import dynamic from "next/dynamic";

// Add this with the other dynamic imports (around line 35-50)
const EmailCollectionModal = dynamic(
  () => import("@/components/gigs/email-collection-modal").then(m => m.EmailCollectionModal),
  { ssr: false }
);
```

**Step 2: Add state for sending invites**

Add inside the GigItem component, after other state declarations:

```typescript
const [isSendingInvites, setIsSendingInvites] = useState(false);
const [showEmailModal, setShowEmailModal] = useState(false);
const [missingEmails, setMissingEmails] = useState<Array<{id: string; name: string; role: string | null}>>([]);
const [calendarEnabled, setCalendarEnabled] = useState<boolean | null>(null);
```

**Step 3: Add function to check and send invites**

Add after the existing handler functions:

```typescript
const checkAndSendInvites = async () => {
  if (!gig.isManager) return;

  try {
    // Check if calendar invites are enabled
    const supabase = createClient();
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("write_access, send_invites_enabled")
      .eq("user_id", user?.id)
      .eq("provider", "google")
      .single();

    if (!connection?.write_access || !connection?.send_invites_enabled) {
      // Calendar invites not enabled, just navigate
      return false;
    }

    setCalendarEnabled(true);

    // Check for roles needing invites
    const response = await fetch(`/api/calendar/send-invites?gigId=${gig.gigId}`);
    const data = await response.json();

    if (data.needsInvites === 0) {
      // No invites needed, just navigate
      return false;
    }

    if (data.missingEmails?.length > 0) {
      // Show email collection modal
      setMissingEmails(data.missingEmails);
      setShowEmailModal(true);
      return true; // Prevent navigation
    }

    // Send invites in background
    setIsSendingInvites(true);
    toast.loading("Sending invitations...", { id: "send-invites" });

    fetch("/api/calendar/send-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gigId: gig.gigId }),
    })
      .then(res => res.json())
      .then(result => {
        toast.dismiss("send-invites");
        if (result.failed > 0) {
          toast.success(`${result.sent} sent, ${result.failed} failed`);
        } else if (result.sent > 0) {
          toast.success(`${result.sent} invitation${result.sent > 1 ? 's' : ''} sent`);
        }
      })
      .catch(() => {
        toast.dismiss("send-invites");
        toast.error("Failed to send invitations");
      })
      .finally(() => {
        setIsSendingInvites(false);
      });

    return false; // Don't prevent navigation
  } catch (error) {
    console.error("Error checking invites:", error);
    return false;
  }
};

const handleGigPackClick = async (e: React.MouseEvent) => {
  e.preventDefault();
  const shouldPrevent = await checkAndSendInvites();
  if (!shouldPrevent) {
    window.location.href = `/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`;
  }
};

const handleSendWithEmails = async (emails: Record<string, string>) => {
  setShowEmailModal(false);
  setIsSendingInvites(true);
  toast.loading("Sending invitations...", { id: "send-invites" });

  try {
    const response = await fetch("/api/calendar/send-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gigId: gig.gigId, roleEmails: emails }),
    });
    const result = await response.json();

    toast.dismiss("send-invites");
    if (result.failed > 0) {
      toast.success(`${result.sent} sent, ${result.failed} failed`);
    } else if (result.sent > 0) {
      toast.success(`${result.sent} invitation${result.sent > 1 ? 's' : ''} sent`);
    }
  } catch {
    toast.dismiss("send-invites");
    toast.error("Failed to send invitations");
  } finally {
    setIsSendingInvites(false);
    window.location.href = `/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`;
  }
};

const handleSkipEmails = () => {
  setShowEmailModal(false);
  // Send to members with emails only
  handleSendWithEmails({});
};
```

**Step 4: Update the Gig Pack button**

Replace the Gig Pack Link/Button (around line 314-319):

```typescript
{/* Gig Pack Button (only for hosts) */}
{gig.isManager && (
  <Button
    variant="outline"
    size="sm"
    className="gap-2"
    onClick={handleGigPackClick}
    disabled={isSendingInvites}
  >
    <Package className={`h-4 w-4 ${isSendingInvites ? 'animate-pulse' : ''}`} />
    {isSendingInvites ? 'Sending...' : 'Gig Pack'}
  </Button>
)}
```

**Step 5: Add the modal at the end of the component**

Add before the closing fragment of the return statement:

```typescript
{/* Email Collection Modal */}
<EmailCollectionModal
  open={showEmailModal}
  onOpenChange={setShowEmailModal}
  missingEmails={missingEmails}
  onSubmit={handleSendWithEmails}
  onSkip={handleSkipEmails}
/>
```

**Step 6: Run type check and lint**

Run: `npm run check && npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add components/dashboard/gig-item.tsx
git commit -m "feat(ui): integrate calendar invites with Gig Pack button"
```

---

## Task 11: Add Invitation Method Icons to Lineup

**Files:**
- Modify: `components/gigpack/ui/lineup-member-pill.tsx`

**Step 1: Read the current file to understand structure**

This task requires reading the file first to understand its structure.

**Step 2: Add invitation method indicator**

Add a small icon showing how the invitation was sent:
- 📅 for google_calendar
- ✉️ for email
- ⏳ for not sent yet

Look for where the status badge is rendered and add the icon nearby.

**Step 3: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add components/gigpack/ui/lineup-member-pill.tsx
git commit -m "feat(ui): add invitation method icons to lineup"
```

---

## Task 12: Auto-Update Calendar Events on Gig Save

**Files:**
- Modify: `lib/api/gigs.ts`

**Step 1: Find the gig update function**

Locate the function that saves/updates gig details.

**Step 2: Add calendar event update trigger**

After a successful gig update, check if any calendar-relevant fields changed and call `updateCalendarEvents` from `calendar-invites.ts`.

The trigger fields are: date, start_time, end_time, location_name, call_time, title

**Step 3: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Commit**

```bash
git add lib/api/gigs.ts
git commit -m "feat(api): auto-update calendar events on gig save"
```

---

## Task 13: Register Webhooks After Sending Invites

**Files:**
- Modify: `lib/api/calendar-invites.ts`

**Step 1: Add webhook registration after creating calendar event**

In the `sendCalendarInvites` function, after successfully creating an event, register a webhook to watch for responses.

Add after the event creation succeeds:

```typescript
// Register webhook for response tracking
try {
  const webhookUrl = `${baseUrl}/api/webhooks/google-calendar`;
  const watch = await googleClient.watchEvent(event.id, webhookUrl);

  await supabase
    .from("google_calendar_watches")
    .insert({
      user_id: userId,
      gig_id: gigId,
      calendar_event_id: event.id,
      channel_id: watch.channelId,
      resource_id: watch.resourceId,
      expiration: new Date(watch.expiration).toISOString(),
    });
} catch (watchError) {
  console.warn("Failed to register webhook:", watchError);
  // Non-fatal - invites still sent
}
```

**Step 2: Run type check**

Run: `npm run check`
Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add lib/api/calendar-invites.ts
git commit -m "feat(api): register webhooks after sending invites"
```

---

## Task 14: Write Tests for Calendar Invites API

**Files:**
- Create: `tests/api/calendar-invites.test.ts`

**Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/supabase/server");
vi.mock("@/lib/integrations/google-calendar");

describe("Calendar Invites API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasCalendarWriteAccess", () => {
    it("returns true when write_access and send_invites_enabled are both true", async () => {
      // Test implementation
    });

    it("returns false when write_access is false", async () => {
      // Test implementation
    });

    it("returns false when send_invites_enabled is false", async () => {
      // Test implementation
    });
  });

  describe("getRolesNeedingInvites", () => {
    it("separates roles with and without emails", async () => {
      // Test implementation
    });

    it("returns empty arrays when no roles need invites", async () => {
      // Test implementation
    });
  });

  describe("sendCalendarInvites", () => {
    it("sends calendar invite to role with email", async () => {
      // Test implementation
    });

    it("falls back to email when calendar fails", async () => {
      // Test implementation
    });

    it("skips roles without emails unless provided", async () => {
      // Test implementation
    });
  });

  describe("mapResponseStatus", () => {
    it("maps accepted correctly", () => {
      // Test implementation
    });

    it("maps declined correctly", () => {
      // Test implementation
    });

    it("maps tentative correctly", () => {
      // Test implementation
    });

    it("maps needsAction to invited", () => {
      // Test implementation
    });
  });
});
```

**Step 2: Run tests**

Run: `npm test tests/api/calendar-invites.test.ts`
Expected: Tests pass

**Step 3: Commit**

```bash
git add tests/api/calendar-invites.test.ts
git commit -m "test(api): add calendar invites API tests"
```

---

## Task 15: Final Integration Test

**Step 1: Build the app**

Run: `npm run build`
Expected: Build succeeds

**Step 2: Run all tests**

Run: `npm run test:run`
Expected: All tests pass

**Step 3: Manual testing checklist**

- [ ] Connect Google Calendar with write access in Settings
- [ ] Enable "Send Google Calendar invites" toggle
- [ ] Create a gig with lineup members
- [ ] Click "Gig Pack" button
- [ ] Verify email collection modal appears for members without emails
- [ ] Verify calendar invites are sent
- [ ] Check Google Calendar for created event
- [ ] Accept invite in Google Calendar
- [ ] Verify status updates in GigMaster via webhook

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete Google Calendar invitations integration"
```

---

## Summary

This plan implements:

1. **Database schema** for tracking calendar invites and webhooks
2. **Extended Google Calendar client** with write methods
3. **Calendar invites API** for sending invitations
4. **Webhook endpoint** for real-time response sync
5. **Updated OAuth flow** for write access
6. **Settings UI** for enabling calendar invites
7. **Email collection modal** for missing addresses
8. **Updated Gig Pack button** to trigger invites
9. **Invitation method icons** in lineup display
10. **Auto-update events** when gig details change
11. **Tests** for the new functionality

Total estimated tasks: 15
