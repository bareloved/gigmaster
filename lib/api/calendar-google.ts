import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardGig } from "@/lib/types/shared";
import { checkGigConflicts, timesOverlap } from "@/lib/api/calendar";
import { GoogleCalendarClient, GoogleCalendarEvent, parseGoogleDateTime } from "@/lib/integrations/google-calendar";
import { parseScheduleFromDescription } from "@/lib/utils/parse-schedule";
import { matchAttendeesToUsers, mapResponseStatus } from "@/lib/utils/match-attendees";

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
 * Import calendar event as gig
 */
export async function importCalendarEventAsGig(
  userId: string,
  event: GoogleCalendarEvent
): Promise<string> {
  const supabase = await createClient();

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

  // Create gig with notes and schedule
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
      status: "draft",
      external_calendar_event_id: event.id,
      external_calendar_provider: "google",
      imported_from_calendar: true,
    })
    .select("id")
    .single();

  if (gigError || !gig) {
    throw new Error(gigError?.message || "Failed to create gig");
  }

  // Import attendees as GigRoles
  if (event.attendees && event.attendees.length > 0) {
    // Match attendees to existing Ensemble users
    const matchedAttendees = await matchAttendeesToUsers(event.attendees);

    // Create GigRoles for attendees
    const roleInserts = matchedAttendees.map(attendee => ({
      gig_id: gig.id,
      role_name: "Player", // Default role
      musician_name: attendee.displayName || attendee.email,
      musician_id: attendee.userId || null, // Link if user exists in Ensemble
      invitation_status: mapResponseStatus(attendee.responseStatus),
      // Note: NOT automatically adding to My Circle
      // Users can manually add attendees to their circle later
    }));

    const { error: rolesError } = await supabase
      .from("gig_roles")
      .insert(roleInserts);

    if (rolesError) {
      console.error("[Import Gig] Error creating gig roles:", rolesError);
      // Don't fail the entire import if roles fail, just log it
    }
  }

  // Get connection ID
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (connection) {
    // Log import - map to existing schema fields
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

