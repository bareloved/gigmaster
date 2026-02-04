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
        musician_name,
        contact_id,
        musician_contacts (email)
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

    // Get profile emails for roles with musician_id
    const musicianIds = roles
      .map(r => r.musician_id)
      .filter((id): id is string => id !== null);

    let profileEmails: Record<string, string> = {};
    if (musicianIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", musicianIds);

      if (profiles) {
        profileEmails = profiles.reduce((acc, p) => {
          if (p.email) acc[p.id] = p.email;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    // Update role statuses based on attendee responses
    for (const role of roles) {
      const profileEmail = role.musician_id ? profileEmails[role.musician_id] : null;
      const contactEmail = role.musician_contacts?.email;
      const email = profileEmail || contactEmail;

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
          const musicianName = role.musician_name || 'A musician';
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
