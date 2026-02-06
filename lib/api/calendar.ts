import { createClient } from "@/lib/supabase/client";
import type { DashboardGig } from "@/lib/types/shared";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";
import { createEvents, EventAttributes } from "ics";

/**
 * Calendar API
 * 
 * Functions for calendar integration:
 * - ICS token management
 * - ICS feed generation
 * - Basic conflict detection (Ensemble gigs only)
 */

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Generate a new ICS token for a user
 * If user already has a token, returns existing token
 */
export async function generateICSToken(userId: string): Promise<string> {
  const supabase = createClient();

  // Check if user already has a token
  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("calendar_ics_token")
    .eq("id", userId)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message || "Failed to fetch profile");
  }

  // Return existing token if available
  if (profile?.calendar_ics_token) {
    return profile.calendar_ics_token;
  }

  // Generate new token (32 bytes = 64 hex characters)
  const token = generateSecureToken();

  // Save token to profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ calendar_ics_token: token })
    .eq("id", userId);

  if (updateError) {
    throw new Error(updateError.message || "Failed to save token");
  }

  return token;
}

/**
 * Regenerate ICS token (invalidates old token)
 */
export async function regenerateICSToken(userId: string): Promise<string> {
  const supabase = createClient();

  // Generate new token
  const token = generateSecureToken();

  // Update profile
  const { error } = await supabase
    .from("profiles")
    .update({ calendar_ics_token: token })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message || "Failed to regenerate token");
  }

  return token;
}

/**
 * Get existing ICS token for a user
 */
export async function getICSToken(userId: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("calendar_ics_token")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(error.message || "Failed to fetch token");
  }

  return data?.calendar_ics_token || null;
}

/**
 * Get user ID from ICS token
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("calendar_ics_token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

// ============================================================================
// ICS FEED GENERATION
// ============================================================================

/**
 * Generate ICS feed content for a user
 */
export async function generateICSFeed(userId: string): Promise<string> {
  // Fetch all user's gigs (wide date range for calendar subscription)
  const today = new Date();
  const past = new Date(today);
  past.setDate(past.getDate() - 30); // Include past 30 days
  const future = new Date(today);
  future.setFullYear(future.getFullYear() + 1); // Include next year

  const { gigs } = await listDashboardGigs(userId, {
    from: past,
    to: future,
    limit: 500, // Generous limit for calendar subscription
    offset: 0,
  });

  // Convert gigs to ICS events
  const events: EventAttributes[] = gigs.map((gig) => {
    return gigToICSEvent(gig);
  });

  // Generate ICS file
  const { error, value } = createEvents(events);

  if (error) {
    throw new Error("Failed to generate ICS feed");
  }

  return value || "";
}

/**
 * Convert a DashboardGig to an ICS event
 */
function gigToICSEvent(gig: DashboardGig): EventAttributes {
  const gigDate = new Date(gig.date);
  const year = gigDate.getFullYear();
  const month = gigDate.getMonth() + 1;
  const day = gigDate.getDate();

  // Parse times if available
  let startArray: [number, number, number, number, number];
  let endArray: [number, number, number, number, number];

  if (gig.startTime) {
    const [hours, minutes] = gig.startTime.split(":").map(Number);
    startArray = [year, month, day, hours, minutes];
  } else {
    // All-day event (starts at midnight)
    startArray = [year, month, day, 0, 0];
  }

  if (gig.endTime) {
    const [hours, minutes] = gig.endTime.split(":").map(Number);
    endArray = [year, month, day, hours, minutes];
  } else if (gig.startTime) {
    // Default 3-hour duration if start time exists
    const [hours, minutes] = gig.startTime.split(":").map(Number);
    endArray = [year, month, day, hours + 3, minutes];
  } else {
    // All-day event (ends at 11:59 PM)
    endArray = [year, month, day, 23, 59];
  }

  // Build description with link to Gig Pack
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://yourdomain.com";
  const gigPackUrl = `${baseUrl}/gigs/${gig.gigId}/pack`;
  
  let description = `View details: ${gigPackUrl}`;
  if (gig.isPlayer && gig.playerRoleName) {
    description = `Your role: ${gig.playerRoleName}\n\n${description}`;
  }

  // Build title: "Project Name - Gig Title" or just "Gig Title" for standalone gigs
  const titlePrefix = gig.projectName ? `${gig.projectName} - ` : '';
  const title = `${titlePrefix}${gig.gigTitle}`;

  return {
    start: startArray,
    end: endArray,
    title,
    description,
    location: gig.locationName || undefined,
    status: "CONFIRMED",
    busyStatus: "BUSY",
    uid: `ensemble-gig-${gig.gigId}@ensemble.app`,
  };
}

// ============================================================================
// CONFLICT DETECTION
// ============================================================================

/**
 * Check for conflicts with existing gigs (Ensemble gigs only - Phase 1)
 * Returns array of conflicting gigs
 */
export async function checkGigConflicts(
  userId: string,
  date: string,
  startTime: string | null,
  endTime: string | null
): Promise<DashboardGig[]> {
  // Fetch all gigs for the user on the same date
  const gigDate = new Date(date);
  const { gigs } = await listDashboardGigs(userId, {
    from: gigDate,
    to: gigDate,
    limit: 100,
    offset: 0,
  });

  // Filter to only gigs on the exact date
  const gigsOnDate = gigs.filter((gig) => gig.date === date);

  // If no times specified, any gig on same date is a potential conflict
  if (!startTime || !endTime) {
    return gigsOnDate;
  }

  // Check for time overlaps
  const conflicts: DashboardGig[] = [];

  for (const gig of gigsOnDate) {
    // If gig has no times, it's an all-day event (conflict)
    if (!gig.startTime || !gig.endTime) {
      conflicts.push(gig);
      continue;
    }

    // Check if times overlap
    if (timesOverlap(startTime, endTime, gig.startTime, gig.endTime)) {
      conflicts.push(gig);
    }
  }

  return conflicts;
}

/**
 * Check if two time ranges overlap
 * Exported for use in Google Calendar conflict detection
 */
export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  // Convert times to minutes since midnight for easy comparison
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);

  // Check overlap: start1 < end2 AND start2 < end1
  return s1 < e2 && s2 < e1;
}

// ============================================================================
// GOOGLE CALENDAR INTEGRATION (Phase 1.5)
// ============================================================================

// Note: Google Calendar functions have been moved to lib/api/calendar-google.ts
// to avoid bundling googleapis in client code. Import from there for server-side use.

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Generate a cryptographically secure random token
 */
function generateSecureToken(): string {
  if (typeof window !== "undefined" && window.crypto) {
    // Browser environment
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } else {
    // Node environment (server-side)
    const crypto = require("crypto");
    return crypto.randomBytes(32).toString("hex");
  }
}

