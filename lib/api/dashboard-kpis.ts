/**
 * Dashboard KPIs API
 * 
 * Aggregates key metrics for the musician-focused artistry dashboard.
 * Provides quick snapshots of upcoming work, pending actions, and activity.
 */

import { createClient } from "@/lib/supabase/client";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";

/**
 * Dashboard KPIs response structure
 */
export interface DashboardKPIs {
  gigsThisWeek: {
    total: number;
    hosted: number;
    playing: number;
  };
  songsToLearn: {
    total: number;
    acrossGigs: number;
  };
  changesSinceLastVisit: {
    total: number;
    breakdown: {
      setlists: number;
      notes: number;
      files: number;
      roles: number;
    };
  };
  pendingInvitations: {
    total: number;
  };
}

/**
 * Fetch all dashboard KPIs for the current user
 * Optimized for performance with parallel queries
 */
export async function fetchDashboardKPIs(
  lastVisit?: Date
): Promise<DashboardKPIs> {
  const supabase = createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const userId = user.id;

  // Calculate date ranges
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7); // Next Sunday
  endOfWeek.setHours(23, 59, 59, 999);

  // Execute all queries in parallel for performance
  const [
    gigsThisWeekData,
    songsToLearnData,
    changesSinceLastVisitData,
    pendingInvitationsData,
  ] = await Promise.all([
    fetchGigsThisWeek(supabase, userId, startOfWeek, endOfWeek),
    fetchSongsToLearn(supabase, userId),
    lastVisit
      ? fetchChangesSinceLastVisit(supabase, userId, lastVisit)
      : Promise.resolve({
        total: 0,
        breakdown: { setlists: 0, notes: 0, files: 0, roles: 0 },
      }),
    fetchPendingInvitations(supabase, userId),
  ]);

  return {
    gigsThisWeek: gigsThisWeekData,
    songsToLearn: songsToLearnData,
    changesSinceLastVisit: changesSinceLastVisitData,
    pendingInvitations: pendingInvitationsData,
  };
}

/**
 * Fetch gigs this week count with breakdown
 * Counts gigs where user is manager (project owner) or player (has gig_role)
 * Uses existing listDashboardGigs API to avoid complex query issues
 */
async function fetchGigsThisWeek(
  supabase: any,
  userId: string,
  startOfWeek: Date,
  endOfWeek: Date
): Promise<{ total: number; hosted: number; playing: number }> {
  const fromStr = startOfWeek.toISOString();
  const toStr = endOfWeek.toISOString();

  // 1. Count gigs where user is owner (hosted)
  const { count: hostedCount, error: hostedError } = await supabase
    .from("gigs")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("date", fromStr)
    .lte("date", toStr);

  if (hostedError) {
    console.error("Error fetching hosted gigs count:", hostedError);
  }

  // 2. Count gigs where user is a player (playing)
  // Join gig_roles -> gigs to filter by date
  const { count: playingCount, error: playingError } = await supabase
    .from("gig_roles")
    .select(
      `
      gigs!inner (
        id,
        date
      )
    `,
      { count: "exact", head: true }
    )
    .eq("musician_id", userId)
    .neq("invitation_status", "pending")
    .neq("invitation_status", "declined")
    .gte("gigs.date", fromStr)
    .lte("gigs.date", toStr);

  if (playingError) {
    console.error("Error fetching playing gigs count:", playingError);
  }

  const hosted = hostedCount || 0;
  const playing = playingCount || 0;

  return {
    total: hosted + playing,
    hosted,
    playing,
  };
}

/**
 * Fetch songs to learn count
 * Counts unlearned songs from setlist_learning_status for upcoming gigs
 * Note: setlist_items now uses section_id (FK to setlist_sections) instead of direct gig_id
 */
async function fetchSongsToLearn(
  supabase: any,
  userId: string
): Promise<{ total: number; acrossGigs: number }> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Query unlearned songs for upcoming gigs
  // Join path: setlist_learning_status -> setlist_items -> setlist_sections -> gigs
  const { data, error } = await supabase
    .from("setlist_learning_status")
    .select(
      `
      id,
      learned,
      setlist_items!inner (
        id,
        setlist_sections!inner (
          gig_id,
          gigs!inner (
            id,
            date
          )
        )
      )
    `
    )
    .eq("musician_id", userId)
    .eq("learned", false)
    .gte("setlist_items.setlist_sections.gigs.date", today);

  if (error) {
    // Don't throw on query errors - return 0 gracefully
    // This handles cases where tables don't exist or have schema issues
    console.error("Error fetching songs to learn:", error);
    return { total: 0, acrossGigs: 0 };
  }

  if (!data || data.length === 0) {
    return { total: 0, acrossGigs: 0 };
  }

  // Count unique gigs (navigate through the nested structure)
  const uniqueGigs = new Set(
    data
      .map((item: any) => item.setlist_items?.setlist_sections?.gig_id)
      .filter(Boolean)
  );

  return {
    total: data.length,
    acrossGigs: uniqueGigs.size,
  };
}

/**
 * Fetch changes since last visit
 * Counts activity log entries since user's last visit with breakdown by type
 */
async function fetchChangesSinceLastVisit(
  supabase: any,
  userId: string,
  lastVisit: Date
): Promise<{
  total: number;
  breakdown: {
    setlists: number;
    notes: number;
    files: number;
    roles: number;
  };
}> {
  // Try RPC function first (more efficient if it exists)
  const { data: activities, error } = await supabase.rpc(
    "get_user_activity_since",
    {
      p_user_id: userId,
      p_since: lastVisit.toISOString(),
    }
  );

  // If RPC doesn't exist (404) or fails, use fallback query
  if (error) {
    // Don't log 404 errors (RPC not deployed yet is expected)
    // PGRST202 = function not found, PGRST204 = function exists but wrong params
    if (error.code !== "PGRST202" && error.code !== "PGRST204") {
      console.error("Error fetching changes since last visit:", error);
    }
    // Fallback: try direct query
    return await fetchChangesSinceLastVisitFallback(
      supabase,
      userId,
      lastVisit
    );
  }

  if (!activities || activities.length === 0) {
    return {
      total: 0,
      breakdown: { setlists: 0, notes: 0, files: 0, roles: 0 },
    };
  }

  // Count by category
  let setlists = 0;
  let notes = 0;
  let files = 0;
  let roles = 0;

  activities.forEach((activity: any) => {
    const type = activity.activity_type;
    if (
      type.includes("setlist") ||
      type === "setlist_added" ||
      type === "setlist_removed" ||
      type === "setlist_updated"
    ) {
      setlists++;
    } else if (type.includes("notes") || type === "notes_updated") {
      notes++;
    } else if (
      type.includes("file") ||
      type === "file_uploaded" ||
      type === "file_removed"
    ) {
      files++;
    } else if (
      type.includes("role") ||
      type === "role_assigned" ||
      type === "role_status_changed"
    ) {
      roles++;
    }
  });

  return {
    total: activities.length,
    breakdown: { setlists, notes, files, roles },
  };
}

/**
 * Fallback query for changes since last visit
 * Used if RPC function doesn't exist yet
 * PERFORMANCE: Single JOIN query instead of N+1 pattern
 */
async function fetchChangesSinceLastVisitFallback(
  supabase: any,
  userId: string,
  lastVisit: Date
): Promise<{
  total: number;
  breakdown: {
    setlists: number;
    notes: number;
    files: number;
    roles: number;
  };
}> {
  // OPTIMIZED: Single query with JOIN to gigs (RLS filters by user's gigs)
  // This replaces the previous N+1 pattern (fetch gig IDs, then activities)
  const { data: activities, error: activityError } = await supabase
    .from("gig_activity_log")
    .select(`
      activity_type,
      gigs!inner (id)
    `)
    .gte("created_at", lastVisit.toISOString())
    .limit(100); // Limit to reasonable number

  if (activityError || !activities || activities.length === 0) {
    // Don't log - this is expected if table doesn't exist or no activities
    return {
      total: 0,
      breakdown: { setlists: 0, notes: 0, files: 0, roles: 0 },
    };
  }

  // Count by category
  let setlists = 0;
  let notes = 0;
  let files = 0;
  let roles = 0;

  activities.forEach((activity: any) => {
    const type = activity.activity_type;
    if (type.includes("setlist")) {
      setlists++;
    } else if (type.includes("notes")) {
      notes++;
    } else if (type.includes("file")) {
      files++;
    } else if (type.includes("role")) {
      roles++;
    }
  });

  return {
    total: activities.length,
    breakdown: { setlists, notes, files, roles },
  };
}

/**
 * Fetch pending invitations count
 * Counts gig_roles where user is invited but hasn't responded yet
 */
async function fetchPendingInvitations(
  supabase: any,
  userId: string
): Promise<{ total: number }> {
  const today = new Date().toISOString();

  // Query gig roles with invited status for upcoming gigs
  const { count, error } = await supabase
    .from("gig_roles")
    .select(
      `
      id,
      gigs!inner (
        id,
        date
      )
    `,
      { count: "exact", head: true }
    )
    .eq("musician_id", userId)
    .eq("invitation_status", "invited")
    .gte("gigs.date", today);

  if (error) {
    console.error("Error fetching pending invitations:", error);
    throw error;
  }

  return { total: count || 0 };
}

/**
 * Store user's last visit timestamp
 * Used to calculate "changes since last visit" on next visit
 */
export async function updateLastVisit(): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Store in localStorage (client-side only)
  if (typeof window !== "undefined") {
    localStorage.setItem(
      `dashboard_last_visit_${user.id}`,
      new Date().toISOString()
    );
  }
}

/**
 * Get user's last visit timestamp from localStorage
 */
export function getLastVisit(): Date | undefined {
  const supabase = createClient();

  if (typeof window === "undefined") return undefined;

  const {
    data: { user },
  } = supabase.auth.getUser();

  // This is synchronous, so we can't await
  // In practice, we'll pass this from the component after auth loads
  const userId = (user as any)?.id;
  if (!userId) return undefined;

  const lastVisitStr = localStorage.getItem(`dashboard_last_visit_${userId}`);
  return lastVisitStr ? new Date(lastVisitStr) : undefined;
}

