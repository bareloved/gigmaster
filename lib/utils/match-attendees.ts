/**
 * Attendee Matching — DORMANT
 *
 * This module is NOT used in the current musician import flow.
 * Musicians import calendar events where they are participants, not owners.
 * Other attendees from the calendar event are ignored because they are
 * likely not on the platform and the importer doesn't manage the gig.
 *
 * This module is preserved for a potential future band-leader import feature
 * where the owner of a calendar event creates a gig and wants to match
 * attendees to existing platform users.
 */
import { createClient } from "@/lib/supabase/server";

export interface AttendeeMatch {
  email: string;
  displayName?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  userId?: string; // Matched user ID if found
  isRegistered: boolean; // True if user exists in Ensemble
}

/**
 * Match calendar event attendees to existing Ensemble users
 * 
 * Queries the profiles table by email to find registered users.
 * Does NOT automatically add attendees to My Circle.
 * Users can manually add them later if desired.
 */
export async function matchAttendeesToUsers(
  attendees: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
  }>
): Promise<AttendeeMatch[]> {
  if (!attendees || attendees.length === 0) {
    return [];
  }

  const supabase = await createClient();

  // Extract unique emails
  const emails = [...new Set(attendees.map(a => a.email.toLowerCase()))];

  // Query profiles table for matching emails
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email")
    .in("email", emails);

  if (error) {
    console.error("[Match Attendees] Error querying profiles:", error);
    // Return unmatched attendees on error
    return attendees.map(attendee => ({
      ...attendee,
      isRegistered: false,
    }));
  }

  // Create email -> userId map
  const emailToUserId = new Map<string, string>();
  profiles?.forEach(profile => {
    if (profile.email) {
      emailToUserId.set(profile.email.toLowerCase(), profile.id);
    }
  });

  // Match attendees to users
  return attendees.map(attendee => {
    const userId = emailToUserId.get(attendee.email.toLowerCase());
    
    return {
      email: attendee.email,
      displayName: attendee.displayName,
      responseStatus: attendee.responseStatus,
      userId,
      isRegistered: !!userId,
    };
  });
}

/**
 * Map Google Calendar response status to Ensemble invitation status
 */
export function mapResponseStatus(
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
): 'confirmed' | 'declined' | 'invited' {
  switch (responseStatus) {
    case 'accepted':
      return 'confirmed';
    case 'declined':
      return 'declined';
    case 'tentative':
    case 'needsAction':
    default:
      return 'invited';
  }
}

