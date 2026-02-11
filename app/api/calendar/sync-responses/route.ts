import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient } from "@/lib/integrations/google-calendar";
import { mapResponseStatus } from "@/lib/api/calendar-invites";

/**
 * POST /api/calendar/sync-responses
 *
 * Actively syncs Google Calendar attendee responses for a gig's roles.
 * Called when the gig pack page loads as a reliable fallback to webhooks.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gigId } = (await request.json()) as { gigId: string };

    if (!gigId) {
      return NextResponse.json(
        { error: "gigId is required" },
        { status: 400 }
      );
    }

    // Verify user owns this gig (and get gig-level event ID)
    const { data: gig, error: gigError } = await supabase
      .from("gigs")
      .select("id, owner_id, google_calendar_event_id")
      .eq("id", gigId)
      .single();

    if (gigError || !gig || gig.owner_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Get roles that were sent via Google Calendar
    const { data: roles, error: rolesError } = await supabase
      .from("gig_roles")
      .select(
        `
        id,
        invitation_status,
        musician_id,
        musician_name,
        google_calendar_event_id,
        contact_id,
        musician_contacts (email)
      `
      )
      .eq("gig_id", gigId)
      .not("google_calendar_event_id", "is", null);

    if (rolesError || !roles || roles.length === 0) {
      return NextResponse.json({ synced: 0, updated: 0 });
    }

    // Get user's calendar connection
    const { data: connection } = await supabase
      .from("calendar_connections")
      .select("access_token, refresh_token, token_expires_at")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (!connection) {
      return NextResponse.json({ synced: 0, updated: 0 });
    }

    // Build email lookup for roles with musician_id
    const musicianIds = roles
      .map((r) => r.musician_id)
      .filter((id): id is string => id !== null);

    let profileEmails: Record<string, string> = {};
    if (musicianIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", musicianIds);

      if (profiles) {
        profileEmails = profiles.reduce(
          (acc, p) => {
            if (p.email) acc[p.id] = p.email;
            return acc;
          },
          {} as Record<string, string>
        );
      }
    }

    // Set up Google client
    const googleClient = new GoogleCalendarClient();
    googleClient.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      expiry_date: new Date(connection.token_expires_at).getTime(),
    });

    // Fetch event(s) from Google Calendar
    // Prefer gig-level event ID (single shared event), fall back to per-role IDs
    const eventIds = gig.google_calendar_event_id
      ? [gig.google_calendar_event_id]
      : [
          ...new Set(
            roles
              .map((r) => r.google_calendar_event_id)
              .filter((id): id is string => id !== null)
          ),
        ];

    const events: Record<
      string,
      Awaited<ReturnType<typeof googleClient.getEvent>>
    > = {};
    for (const eventId of eventIds) {
      try {
        events[eventId] = await googleClient.getEvent(eventId);
      } catch (err) {
        console.warn(`[Sync] Failed to fetch event ${eventId}:`, err);
      }
    }

    // Check each role's attendee status
    let updated = 0;
    for (const role of roles) {
      // Use gig-level event if available, otherwise role-level
      const eventId = gig.google_calendar_event_id || role.google_calendar_event_id;
      if (!eventId) continue;

      const event = events[eventId];
      if (!event?.attendees) continue;

      // Resolve email for this role
      const profileEmail = role.musician_id
        ? profileEmails[role.musician_id]
        : null;
      const contactEmail = role.musician_contacts?.email;
      const email = profileEmail || contactEmail;

      if (!email) continue;

      const attendee = event.attendees.find(
        (a) => a.email.toLowerCase() === email.toLowerCase()
      );

      if (!attendee?.responseStatus) continue;

      const newStatus = mapResponseStatus(attendee.responseStatus);

      if (newStatus !== role.invitation_status) {
        const { error: updateError } = await supabase
          .from("gig_roles")
          .update({ invitation_status: newStatus })
          .eq("id", role.id);

        if (!updateError) {
          updated++;
        }
      }
    }

    return NextResponse.json({ synced: roles.length, updated });
  } catch (error) {
    console.error("[Sync Responses] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync responses",
      },
      { status: 500 }
    );
  }
}
