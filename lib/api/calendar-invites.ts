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
  owner_id: string | null;
  project_id: string | null;
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

  // Role info
  lines.push(`Your role: ${role.role_name || 'Musician'}`);
  lines.push('');

  // Schedule section
  lines.push('Schedule:');
  if (gig.call_time) {
    lines.push(`• Call time: ${gig.call_time}`);
  }
  if (gig.start_time) {
    lines.push(`• Start time: ${gig.start_time}`);
  }
  if (gig.dress_code) {
    lines.push(`• Dress code: ${gig.dress_code}`);
  }
  if (gig.location_name) {
    lines.push(`• Venue: ${gig.location_name}`);
  }
  if (gig.location_address) {
    lines.push(`• Address: ${gig.location_address}`);
  }

  lines.push('');
  lines.push(`View full gig details: ${baseUrl}/gigs/${gig.id}/pack`);
  lines.push('');
  lines.push('---');
  lines.push(`Organized with GigMaster | ${baseUrl}`);

  return lines.join('\n');
}

/**
 * Build event title: "Band Name - Event Title"
 */
function buildEventTitle(gig: GigForInvite): string {
  const bandName = gig.projectName || gig.ownerName || 'Gig';
  const eventTitle = gig.title || gig.location_name || 'Untitled Gig';
  return `${bandName} - ${eventTitle}`;
}

/**
 * Convert gig date/time to RFC 3339 format for Google Calendar API
 * Uses UTC (Z suffix) for unambiguous timestamps that Google Calendar accepts
 */
function toGoogleDateTime(date: string, time: string | null): {
  start: { dateTime: string };
  end: { dateTime: string };
} {
  // Extract just the date part (YYYY-MM-DD) if it's a full ISO timestamp
  const dateOnly = date.includes('T') ? date.split('T')[0] : date;

  // Use the gig's time or default to 6pm
  const startTime = time || '18:00';

  // Normalize time: ensure HH:MM:SS format
  // Handle "HH:MM" (add :00) or "HH:MM:SS" (use as-is)
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;

  // Parse as local time and convert to ISO string (UTC with Z suffix)
  const startDate = new Date(`${dateOnly}T${normalizedTime}`);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  // Validate the dates are valid before calling toISOString
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid date/time: date="${date}", time="${time}"`);
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
      location_name,
      location_address,
      dress_code,
      owner_id,
      project_id
    `)
    .eq("id", gigId)
    .single();

  if (gigError || !gig) {
    throw new Error(`Failed to fetch gig: ${gigError?.message}`);
  }

  // Get project name separately
  let projectName: string | null = null;
  if (gig.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", gig.project_id)
      .single();
    projectName = project?.name || null;
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
  const gigForInvite: GigForInvite = {
    ...gig,
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
  const { start, end } = toGoogleDateTime(gig.date, gig.start_time);

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
        id, title, date, start_time, end_time, call_time,
        location_name, location_address, dress_code, owner_id, project_id
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

  // Get project name separately
  let projectName: string | null = null;
  if (gig.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("name")
      .eq("id", gig.project_id)
      .single();
    projectName = project?.name || null;
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
  const gigForInvite: GigForInvite = {
    ...gig,
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
  const { start, end } = toGoogleDateTime(gig.date, gig.start_time);

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
