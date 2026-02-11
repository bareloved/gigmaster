import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GoogleCalendarClient, CreateEventInput } from "@/lib/integrations/google-calendar";
import { inviteMusicianByEmail } from "@/lib/api/gig-invitations";
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
  email?: string | null; // Resolved email (from contact or profile lookup)
  musician_contacts: {
    email: string | null;
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
  on_stage_time: string | null;
  notes: string | null;
  parking_notes: string | null;
  owner_id: string | null;
  band_id: string | null;
  public_slug: string | null;
  projectName?: string | null; // Fetched separately
  ownerName?: string | null; // Fetched separately
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

  // Get roles that haven't been invited yet
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
      )
    `)
    .eq("gig_id", gigId)
    .is("google_calendar_event_id", null)
    .is("invitation_method", null);

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`);
  }

  console.log("[getRolesNeedingInvites] Found roles:", roles?.length || 0, "for gig:", gigId);
  console.log("[getRolesNeedingInvites] Roles data:", JSON.stringify(roles, null, 2));

  // Get profile emails for roles with musician_id
  const musicianIds = (roles || [])
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

  // Separate roles with and without emails
  const rolesWithEmails: GigRoleForInvite[] = [];
  const missingEmails: GigRoleForInvite[] = [];

  for (const role of roles || []) {
    const profileEmail = role.musician_id ? profileEmails[role.musician_id] : null;
    const contactEmail = role.musician_contacts?.email;
    const email = profileEmail || contactEmail;

    const roleWithEmail: GigRoleForInvite = {
      ...role,
      email,
    };

    if (email) {
      rolesWithEmails.push(roleWithEmail);
    } else {
      missingEmails.push(roleWithEmail);
    }
  }

  console.log("[getRolesNeedingInvites] With emails:", rolesWithEmails.length, "Missing emails:", missingEmails.length);

  return { roles: rolesWithEmails, missingEmails };
}

/**
 * Build calendar event description
 */
function formatTime(time: string): string {
  // Strip seconds: "09:30:00" -> "09:30", "09:30" stays as-is
  return time.replace(/^(\d{2}:\d{2}):\d{2}$/, '$1');
}

function buildEventDescription(
  role: GigRoleForInvite,
  gig: GigForInvite,
  baseUrl: string
): string {
  const lines: string[] = [];
  const bandName = gig.projectName || gig.ownerName || 'the band';
  const inviterName = gig.ownerName || 'the band manager';

  // Invitation header
  lines.push(`You've been invited to "${gig.title}" with ${bandName} by ${inviterName}.`);
  lines.push('');

  // Venue (before role)
  if (gig.location_name) {
    lines.push(`Venue: ${gig.location_name}`);
  }
  if (gig.location_address) {
    lines.push(`Address: ${gig.location_address}`);
  }
  if (gig.location_name || gig.location_address) {
    lines.push('');
  }


  // Schedule section (times only)
  const scheduleItems: string[] = [];
  if (gig.call_time) {
    scheduleItems.push(`• Call time: ${formatTime(gig.call_time)}`);
  }
  if (gig.start_time) {
    scheduleItems.push(`• Start time: ${formatTime(gig.start_time)}`);
  }
  if (gig.on_stage_time) {
    scheduleItems.push(`• On stage: ${formatTime(gig.on_stage_time)}`);
  }
  if (scheduleItems.length > 0) {
    lines.push('Schedule:');
    lines.push(...scheduleItems);
    lines.push('');
  }

  // Other info section
  const otherItems: string[] = [];
  if (gig.dress_code) {
    otherItems.push(`• Dress code: ${gig.dress_code}`);
  }
  if (gig.parking_notes) {
    otherItems.push(`• Parking: ${gig.parking_notes}`);
  }
  if (otherItems.length > 0) {
    lines.push('Other info:');
    lines.push(...otherItems);
    lines.push('');
  }

  // Notes
  if (gig.notes) {
    lines.push(`Notes: ${gig.notes}`);
    lines.push('');
  }

  const publicPath = gig.public_slug ? `/p/${gig.public_slug}` : `/gigs/${gig.id}/pack`;
  lines.push(`View full gig details: ${baseUrl}${publicPath}`);
  lines.push('');
  lines.push('---');
  lines.push(`Organized with GigMaster | ${baseUrl}`);

  return lines.join('\n');
}

/**
 * Build event title: "Band Name - Event Title" (with project) or just "Event Title" (standalone)
 */
function buildEventTitle(gig: GigForInvite): string {
  const eventTitle = gig.title || gig.location_name || 'Untitled Gig';
  if (gig.projectName) {
    return `${gig.projectName} - ${eventTitle}`;
  }
  return eventTitle;
}

/**
 * Parse a time string ("HH:MM" or "HH:MM:SS") into a Date on the given date.
 */
function parseTime(dateOnly: string, time: string): Date {
  const normalized = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateOnly}T${normalized}`);
}

/**
 * Convert gig schedule to Google Calendar start/end times.
 *
 * Start: earliest of call_time, start_time (fallback 18:00)
 * End:   end_time if set, otherwise latest schedule time + buffer:
 *   - on_stage_time → +2h (typical set length)
 *   - start_time    → +2h
 *   - call_time only → +3h (soundcheck + show)
 */
function toGoogleDateTime(gig: {
  date: string;
  call_time: string | null;
  start_time: string | null;
  end_time: string | null;
  on_stage_time: string | null;
}): {
  start: { dateTime: string };
  end: { dateTime: string };
} {
  const dateOnly = gig.date.includes('T') ? gig.date.split('T')[0] : gig.date;

  // Start = earliest available time
  const startTimeStr = gig.call_time || gig.start_time || '18:00';
  const startDate = parseTime(dateOnly, startTimeStr);

  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid date/time: date="${gig.date}", time="${startTimeStr}"`);
  }

  // End = end_time if provided, otherwise latest schedule time + buffer
  let endDate: Date;
  if (gig.end_time) {
    endDate = parseTime(dateOnly, gig.end_time);
  } else if (gig.on_stage_time) {
    endDate = new Date(parseTime(dateOnly, gig.on_stage_time).getTime() + 2 * 60 * 60 * 1000);
  } else if (gig.start_time) {
    endDate = new Date(parseTime(dateOnly, gig.start_time).getTime() + 2 * 60 * 60 * 1000);
  } else if (gig.call_time) {
    endDate = new Date(parseTime(dateOnly, gig.call_time).getTime() + 3 * 60 * 60 * 1000);
  } else {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }

  return {
    start: { dateTime: startDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
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
      on_stage_time,
      location_name,
      location_address,
      dress_code,
      notes,
      parking_notes,
      owner_id,
      band_id,
      gig_shares ( token )
    `)
    .eq("id", gigId)
    .single();

  if (gigError || !gig) {
    throw new Error(`Failed to fetch gig: ${gigError?.message}`);
  }

  // Get band name separately
  let projectName: string | null = null;
  if (gig.band_id) {
    const { data: band } = await supabase
      .from("bands")
      .select("name")
      .eq("id", gig.band_id)
      .single();
    projectName = band?.name || null;
  }

  // Get owner name separately
  let ownerName: string | null = null;
  if (gig.owner_id) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", gig.owner_id)
      .single();
    ownerName = ownerProfile?.name || null;
  }

  // Create gig object for event building
  const publicSlug = Array.isArray(gig.gig_shares) ? gig.gig_shares[0]?.token : null;
  const gigForInvite: GigForInvite = {
    ...gig,
    public_slug: publicSlug || null,
    projectName,
    ownerName,
  };

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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gigmaster.io';
  const { start, end } = toGoogleDateTime(gig);

  // Send invites one by one
  for (const role of allRoles) {
    const email = role.email || role.musician_contacts?.email;
    const displayName = role.musician_name || undefined;

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
        summary: buildEventTitle(gigForInvite),
        description: buildEventDescription(role, gigForInvite, baseUrl),
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

      // Register webhook for response tracking (non-blocking)
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
        // Non-fatal - invites still sent successfully
      }

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
      } catch (_emailError) {
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
        id, title, date, start_time, end_time, call_time, on_stage_time,
        location_name, location_address, dress_code, notes, parking_notes,
        owner_id, band_id, gig_shares ( token )
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

  // Get band name separately
  let projectName: string | null = null;
  if (gig.band_id) {
    const { data: band } = await supabase
      .from("bands")
      .select("name")
      .eq("id", gig.band_id)
      .single();
    projectName = band?.name || null;
  }

  // Get owner name separately
  let ownerName: string | null = null;
  if (gig.owner_id) {
    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", gig.owner_id)
      .single();
    ownerName = ownerProfile?.name || null;
  }

  // Create gig object for event building
  const publicSlug = Array.isArray(gig.gig_shares) ? gig.gig_shares[0]?.token : null;
  const gigForInvite: GigForInvite = {
    ...gig,
    public_slug: publicSlug || null,
    projectName,
    ownerName,
  };

  // Get roles with calendar events
  const { data: roles } = await supabase
    .from("gig_roles")
    .select("id, google_calendar_event_id, role_name, musician_name")
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gigmaster.io';
  const { start, end } = toGoogleDateTime(gig);

  let updated = 0;

  for (const role of roles) {
    if (!role.google_calendar_event_id) continue;

    try {
      await googleClient.updateEvent(role.google_calendar_event_id, {
        summary: buildEventTitle(gigForInvite),
        description: buildEventDescription(
          role as unknown as GigRoleForInvite,
          gigForInvite,
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
 * Cancel all Google Calendar events for a gig (when gig is deleted)
 * Deletes the calendar events so attendees get a cancellation notification from Google.
 * Also cleans up any webhook watches.
 */
export async function cancelCalendarEvents(
  gigId: string,
  userId: string
): Promise<number> {
  const supabase = await createClient();

  // Get roles with calendar events
  const { data: roles } = await supabase
    .from("gig_roles")
    .select("id, google_calendar_event_id")
    .eq("gig_id", gigId)
    .not("google_calendar_event_id", "is", null);

  if (!roles || roles.length === 0) {
    return 0;
  }

  // Get calendar connection for the gig owner
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (!connection) {
    console.warn("[cancelCalendarEvents] No calendar connection found for user:", userId);
    return 0;
  }

  // Initialize Google client
  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  let cancelled = 0;

  for (const role of roles) {
    if (!role.google_calendar_event_id) continue;

    try {
      // Delete the event — Google sends cancellation emails to attendees automatically
      await googleClient.deleteEvent(role.google_calendar_event_id);
      cancelled++;
    } catch (error) {
      console.error(`Failed to cancel calendar event ${role.google_calendar_event_id}:`, error);
      // Continue with other events even if one fails
    }
  }

  // Clean up webhook watches for this gig
  const { data: watches } = await supabase
    .from("google_calendar_watches")
    .select("channel_id, resource_id")
    .eq("gig_id", gigId);

  if (watches && watches.length > 0) {
    for (const watch of watches) {
      try {
        await googleClient.stopWatch(watch.channel_id, watch.resource_id);
      } catch (error) {
        console.warn(`Failed to stop watch ${watch.channel_id}:`, error);
      }
    }

    await supabase
      .from("google_calendar_watches")
      .delete()
      .eq("gig_id", gigId);
  }

  return cancelled;
}

/**
 * Cancel Google Calendar events for specific removed roles.
 * Called when lineup members are removed during gig editing.
 * Deletes each event so the attendee gets a cancellation notification from Google.
 */
export async function cancelRoleCalendarEvents(
  userId: string,
  eventIds: string[]
): Promise<number> {
  if (eventIds.length === 0) return 0;

  const supabase = await createClient();

  // Get calendar connection for the gig owner
  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("user_id", userId)
    .eq("provider", "google")
    .single();

  if (!connection) {
    console.warn("[cancelRoleCalendarEvents] No calendar connection found for user:", userId);
    return 0;
  }

  const googleClient = new GoogleCalendarClient();
  googleClient.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });

  let cancelled = 0;

  for (const eventId of eventIds) {
    try {
      await googleClient.deleteEvent(eventId);
      cancelled++;
    } catch (error) {
      console.error(`[cancelRoleCalendarEvents] Failed to cancel event ${eventId}:`, error);
    }
  }

  // Clean up webhook watches for these events
  const { data: watches } = await supabase
    .from("google_calendar_watches")
    .select("id, channel_id, resource_id, calendar_event_id")
    .in("calendar_event_id", eventIds);

  if (watches && watches.length > 0) {
    for (const watch of watches) {
      try {
        await googleClient.stopWatch(watch.channel_id, watch.resource_id);
      } catch (error) {
        console.warn(`[cancelRoleCalendarEvents] Failed to stop watch ${watch.channel_id}:`, error);
      }
    }

    const { error: deleteError } = await supabase
      .from("google_calendar_watches")
      .delete()
      .in("id", watches.map(w => w.id));

    if (deleteError) {
      console.error("[cancelRoleCalendarEvents] Failed to delete watch rows:", deleteError);
    }
  }

  console.log(`[cancelRoleCalendarEvents] Cancelled ${cancelled}/${eventIds.length} events`);
  return cancelled;
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
