import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardGig, CalendarRefreshDiff } from "@/lib/types/shared";
import { checkGigConflicts, timesOverlap } from "@/lib/api/calendar";
import { GoogleCalendarClient, GoogleCalendarEvent, parseGoogleDateTime } from "@/lib/integrations/google-calendar";
import { parseScheduleFromDescription, extractScheduleItemsAsJson } from "@/lib/utils/parse-schedule";

/**
 * Google Calendar Integration Functions (Phase 1.5)
 * 
 * Server-only functions for Google Calendar OAuth and import
 * These functions cannot be used in client components
 */

// ============================================================================
// GOOGLE CALENDAR INTEGRATION
// ============================================================================

/**
 * Get user's calendar connection
 */
export async function getCalendarConnection(userId: string): Promise<{
  id: string;
  provider: string;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
} | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calendar_connections")
    .select("id, provider, sync_enabled, last_synced_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    provider: data.provider,
    syncEnabled: data.sync_enabled ?? false,
    lastSyncedAt: data.last_synced_at,
  };
}

/**
 * Disconnect calendar (delete connection and tokens)
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "google");

  if (error) {
    throw new Error(error.message || "Failed to disconnect calendar");
  }
}

/**
 * Fetch events from Google Calendar
 */
export async function fetchGoogleCalendarEvents(
  userId: string,
  from: Date,
  to: Date
): Promise<GoogleCalendarEvent[]> {
  const supabase = await createClient();

  // Get connection
  const { data: connection, error: connError } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connError) {
    console.error("[Fetch Events] Error fetching connection:", {
      message: connError.message,
      details: connError.details,
      hint: connError.hint,
      code: connError.code,
    });
    throw new Error(`Calendar not connected: ${connError.message}`);
  }

  if (!connection) {
    console.error("[Fetch Events] No connection found for user:", userId);
    throw new Error("Calendar not connected");
  }

  // Check if token expired
  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  let accessToken = connection.access_token;
  const refreshToken = connection.refresh_token;

  if (expiresAt <= now) {
    // Refresh token
    try {
      const googleClient = new GoogleCalendarClient();
      const newTokens = await googleClient.refreshAccessToken(refreshToken);

      // Update database
      await supabase
        .from("calendar_connections")
        .update({
          access_token: newTokens.access_token,
          token_expires_at: new Date(newTokens.expiry_date).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", "google");

      accessToken = newTokens.access_token;
    } catch (refreshError) {
      const msg = refreshError instanceof Error ? refreshError.message : "";
      if (msg.includes("invalid_grant")) {
        // Token was revoked or expired — remove the stale connection
        await supabase
          .from("calendar_connections")
          .delete()
          .eq("user_id", userId)
          .eq("provider", "google");

        throw new Error(
          "Google Calendar session expired. Please reconnect your calendar."
        );
      }
      throw refreshError;
    }
  }

  // Fetch events
  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: expiresAt.getTime(),
  });

  return await googleClient.listEvents(from, to);
}

/**
 * Import calendar event as an external gig
 *
 * Creates a gig with is_external=true where the importer is a participant (not manager).
 * Only one gig_role is created - for the importer themselves.
 * Attendees from the calendar event are ignored (musician imports are personal).
 * Returns the existing gig ID if the event was already imported (duplicate detection).
 */
export async function importCalendarEventAsGig(
  userId: string,
  event: GoogleCalendarEvent
): Promise<string> {
  const supabase = await createClient();

  // Check for duplicate import
  const { data: existing } = await supabase
    .from("gigs")
    .select("id")
    .eq("external_calendar_event_id", event.id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Parse event date/time
  const { date, time: startTime } = parseGoogleDateTime(
    event.start.dateTime,
    event.start.date
  );
  const { time: endTime } = parseGoogleDateTime(
    event.end.dateTime,
    event.end.date
  );

  // Parse schedule from description
  const { schedule, remainingText } = parseScheduleFromDescription(event.description);
  const scheduleNotes = extractScheduleItemsAsJson(schedule);

  // Create external gig
  const { data: gig, error: gigError } = await supabase
    .from("gigs")
    .insert({
      owner_id: userId,
      title: event.summary,
      date,
      start_time: startTime,
      end_time: endTime,
      location_name: event.location || null,
      notes: remainingText || null,
      schedule: schedule || null,
      schedule_notes: scheduleNotes.length > 0 ? scheduleNotes : null,
      status: "confirmed",
      is_external: true,
      external_calendar_event_id: event.id,
      external_calendar_provider: "google",
      external_event_url: event.htmlLink || null,
      imported_from_calendar: true,
    })
    .select("id")
    .single();

  if (gigError || !gig) {
    throw new Error(gigError?.message || "Failed to create gig");
  }

  // Create a single gig_role for the importer
  // Attendee matching is dormant for musician imports - see match-attendees.ts
  const { error: roleError } = await supabase
    .from("gig_roles")
    .insert({
      gig_id: gig.id,
      musician_id: userId,
      role_name: "Musician",
      invitation_status: "accepted",
    });

  if (roleError) {
    console.error("[Import Gig] Error creating gig role:", roleError);
  }

  // Log import
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connection) {
    await supabase.from("calendar_sync_log").insert({
      user_id: userId,
      provider: "google",
      status: "import",
      details: JSON.stringify({
        connection_id: connection.id,
        external_event_id: event.id,
        gig_id: gig.id,
        sync_direction: "import",
      }),
    });
  }

  return gig.id;
}

/**
 * Refresh an external gig from Google Calendar
 *
 * Fetches the latest event data and compares with the stored gig.
 * Returns a diff of changed fields. If applyChanges=true, updates the gig.
 * Preserves user data (personal earnings, setlists, player notes).
 */
export async function refreshExternalGig(
  gigId: string,
  userId: string,
  applyChanges: boolean = false
): Promise<CalendarRefreshDiff> {
  const supabase = await createClient();

  // Fetch the gig
  const { data: gig, error: gigError } = await supabase
    .from("gigs")
    .select("*")
    .eq("id", gigId)
    .single();

  if (gigError || !gig) {
    throw new Error(gigError?.message || "Gig not found");
  }

  if (!gig.is_external) {
    throw new Error("This is not an external gig");
  }

  // Verify user has access (either owner or has a role)
  const { data: role } = await supabase
    .from("gig_roles")
    .select("id")
    .eq("gig_id", gigId)
    .eq("musician_id", userId)
    .maybeSingle();

  if (gig.owner_id !== userId && !role) {
    throw new Error("You don't have access to this gig");
  }

  // Get Google Calendar credentials
  const { data: connection, error: connError } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connError || !connection) {
    throw new Error("Google Calendar not connected");
  }

  // Fetch the latest event from Google Calendar
  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  const event = await googleClient.getEvent(gig.external_calendar_event_id!);

  // Parse the updated event
  const { date: newDate, time: newStartTime } = parseGoogleDateTime(
    event.start.dateTime,
    event.start.date
  );
  const { time: newEndTime } = parseGoogleDateTime(
    event.end.dateTime,
    event.end.date
  );
  const { schedule: newSchedule, remainingText: newNotes } =
    parseScheduleFromDescription(event.description);
  const newScheduleNotes = extractScheduleItemsAsJson(newSchedule);

  // Compare fields
  const changes: CalendarRefreshDiff["changes"] = [];

  const comparisons: Array<{ field: string; oldVal: string | null; newVal: string | null }> = [
    { field: "title", oldVal: gig.title, newVal: event.summary || null },
    { field: "date", oldVal: gig.date, newVal: newDate },
    { field: "start_time", oldVal: gig.start_time, newVal: newStartTime },
    { field: "end_time", oldVal: gig.end_time, newVal: newEndTime },
    { field: "location_name", oldVal: gig.location_name, newVal: event.location || null },
  ];

  for (const { field, oldVal, newVal } of comparisons) {
    if (oldVal !== newVal) {
      changes.push({ field, oldValue: oldVal, newValue: newVal });
    }
  }

  // Check if notes/schedule changed
  if ((gig.notes || null) !== (newNotes || null)) {
    changes.push({ field: "notes", oldValue: gig.notes, newValue: newNotes || null });
  }
  if ((gig.schedule || null) !== (newSchedule || null)) {
    changes.push({ field: "schedule", oldValue: gig.schedule, newValue: newSchedule || null });
  }

  const diff: CalendarRefreshDiff = {
    hasChanges: changes.length > 0,
    changes,
  };

  // Apply changes if requested
  if (applyChanges && diff.hasChanges) {
    const updateData: Record<string, unknown> = {};
    for (const change of changes) {
      updateData[change.field] = change.newValue;
    }
    // Also update schedule_notes JSONB
    if (changes.some(c => c.field === "schedule")) {
      updateData.schedule_notes = newScheduleNotes.length > 0 ? newScheduleNotes : null;
    }

    await supabase.from("gigs").update(updateData).eq("id", gigId);
  }

  return diff;
}

/**
 * Check for conflicts with both Ensemble gigs and Google Calendar events
 */
export async function checkAllConflicts(
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null
): Promise<{
  ensembleGigs: DashboardGig[];
  calendarEvents: GoogleCalendarEvent[];
}> {
  // Check Ensemble gigs (Phase 1 logic)
  const ensembleGigs = await checkGigConflicts(userId, date, startTime, endTime);

  // Check Google Calendar events
  let calendarEvents: GoogleCalendarEvent[] = [];

  try {
    const connection = await getCalendarConnection(userId);
    if (connection) {
      const gigDate = new Date(date);
      const events = await fetchGoogleCalendarEvents(
        userId,
        gigDate,
        gigDate
      );

      // Filter events on same date
      calendarEvents = events.filter((event) => {
        const { date: eventDate } = parseGoogleDateTime(
          event.start.dateTime,
          event.start.date
        );
        return eventDate === date;
      });

      // If times specified, check overlaps
      if (startTime && endTime && calendarEvents.length > 0) {
        calendarEvents = calendarEvents.filter((event) => {
          const { time: eventStartTime } = parseGoogleDateTime(
            event.start.dateTime,
            event.start.date
          );
          const { time: eventEndTime } = parseGoogleDateTime(
            event.end.dateTime,
            event.end.date
          );

          if (!eventStartTime || !eventEndTime) {
            // All-day event, consider it a conflict
            return true;
          }

          return timesOverlap(startTime, endTime, eventStartTime, eventEndTime);
        });
      }
    }
  } catch (error) {
    console.error("Failed to check Google Calendar conflicts:", error);
    // Continue without calendar events if error
  }

  return {
    ensembleGigs,
    calendarEvents,
  };
}

