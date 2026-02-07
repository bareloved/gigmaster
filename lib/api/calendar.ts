import type { DashboardGig } from "@/lib/types/shared";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";

/**
 * Calendar API
 *
 * Conflict detection for gig scheduling.
 */

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
