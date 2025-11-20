import { createClient } from "@/lib/supabase/client";
import type { DashboardGig } from "@/lib/types/shared";

/**
 * Dashboard Gigs API
 * 
 * Unified view that combines gigs where user is manager and/or player.
 * Returns a single list with perspective flags for UI rendering.
 */

// Re-export for convenience
export type { DashboardGig };

export interface ListDashboardGigsOptions {
  from?: Date; // default: today
  to?: Date;   // default: +90 days
  limit?: number; // default: 20
  offset?: number; // default: 0
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List all gigs for dashboard view
 * Combines manager and player perspectives into unified list
 * Supports pagination via limit and offset
 */
export async function listDashboardGigs(
  userId: string,
  options?: ListDashboardGigsOptions
): Promise<{ gigs: DashboardGig[]; hasMore: boolean; total: number }> {
  const supabase = createClient();

  // Calculate date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = options?.from || today;
  const to = options?.to || new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000); // +90 days

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  // Pagination defaults
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Fetch all gigs accessible to the user (RLS handles permissions)
  // The RLS policies allow viewing owned gigs OR gigs with user roles
  const { data: allGigs, error: allGigsError } = await supabase
    .from("gigs")
    .select(`
      id,
      project_id,
      title,
      date,
      start_time,
      end_time,
      location_name,
      status,
      projects (
        id,
        name,
        owner_id,
        is_personal,
        owner:profiles!projects_owner_id_fkey (
          name
        )
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        is_paid,
        musician_id
      )
    `)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(200);

  if (allGigsError) {
    throw new Error(allGigsError.message || "Failed to fetch gigs");
  }

  // Transform and determine user perspective
  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const projectData = Array.isArray(gig.projects) ? gig.projects[0] : gig.projects;
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      // Only consider user a player if they have a role that's been invited (not pending)
      const userRole = roles.find(r => r?.musician_id === userId && r?.invitation_status !== 'pending');

      // Determine if user is manager (owns the project)
      const isManager = projectData?.owner_id === userId;

      // Determine if user is player (has a role that's been invited)
      const isPlayer = !!userRole;

      let paymentStatus: "paid" | "unpaid" | null = null;
      if (isPlayer && userRole) {
        paymentStatus = userRole.is_paid ? "paid" : "unpaid";
      }

      // Extract host name from project owner (if gig has a project)
      const projectOwner = projectData ? (Array.isArray(projectData.owner) 
        ? projectData.owner[0] 
        : projectData.owner) : null;
      const hostName = projectOwner?.name || null;

      // Calculate role statistics for managers
      let roleStats = null;
      if (isManager) {
        const total = roles.length;
        const invited = roles.filter(r => r?.invitation_status === 'invited').length;
        const accepted = roles.filter(r => r?.invitation_status === 'accepted').length;
        const declined = roles.filter(r => r?.invitation_status === 'declined').length;
        const pending = roles.filter(r => r?.invitation_status === 'pending').length;
        
        roleStats = { total, invited, accepted, declined, pending };
      }

      gigMap.set(gig.id, {
        gigId: gig.id,
        projectId: gig.project_id,
        projectName: projectData?.name || null,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        paymentStatus,
        hostName,
        isPersonalProject: projectData?.is_personal || false,
        roleStats,
      });
    }
  }

  // 2. Convert map to array and sort by date/time
  const allResults = Array.from(gigMap.values());
  
  allResults.sort((a, b) => {
    // First sort by date
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    
    // Then by start time (nulls last)
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

  // 5. Apply pagination
  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    gigs: paginatedResults,
    hasMore,
    total,
  };
}

/**
 * List recent past gigs for dashboard view
 * Returns last 20 completed gigs from the past 30 days
 */
export async function listRecentPastGigs(
  userId: string
): Promise<DashboardGig[]> {
  const supabase = createClient();

  // Calculate date range: last 30 days to yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  const fromStr = thirtyDaysAgo.toISOString().split('T')[0];
  const toStr = yesterday.toISOString().split('T')[0];

  // Fetch recent past gigs
  const { data: allGigs, error: gigsError } = await supabase
    .from("gigs")
    .select(`
      id,
      project_id,
      title,
      date,
      start_time,
      end_time,
      location_name,
      status,
      projects (
        id,
        name,
        owner_id,
        is_personal,
        owner:profiles!projects_owner_id_fkey (
          name
        )
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        is_paid,
        musician_id
      )
    `)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(100);

  if (gigsError) {
    throw new Error(gigsError.message || "Failed to fetch recent past gigs");
  }

  // Transform and filter
  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const projectData = Array.isArray(gig.projects) ? gig.projects[0] : gig.projects;
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      // Only consider user a player if they have a role that's been invited (not pending)
      const userRole = roles.find(r => r?.musician_id === userId && r?.invitation_status !== 'pending');

      const isManager = projectData?.owner_id === userId;
      const isPlayer = !!userRole;

      // Skip if user has no connection to this gig
      if (!isManager && !isPlayer) continue;

      let paymentStatus: "paid" | "unpaid" | null = null;
      if (isPlayer && userRole) {
        paymentStatus = userRole.is_paid ? "paid" : "unpaid";
      }

      // Extract host name from project owner (if gig has a project)
      const projectOwner = projectData ? (Array.isArray(projectData.owner) 
        ? projectData.owner[0] 
        : projectData.owner) : null;
      const hostName = projectOwner?.name || null;

      gigMap.set(gig.id, {
        gigId: gig.id,
        projectId: gig.project_id,
        projectName: projectData?.name || null,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        paymentStatus,
        hostName,
        isPersonalProject: projectData?.is_personal || false,
      });
    }
  }

  // Convert to array and sort (already sorted by query)
  const results = Array.from(gigMap.values());
  return results.slice(0, 20);
}

/**
 * List all past gigs for history page
 * Fetches all gigs where date < today, with pagination support
 * Returns paginated results sorted by date descending (most recent first)
 */
export async function listAllPastGigs(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ gigs: DashboardGig[]; hasMore: boolean; total: number }> {
  const supabase = createClient();

  // Calculate date: all gigs before today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // Pagination defaults
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Fetch all past gigs
  const { data: allGigs, error: gigsError} = await supabase
    .from("gigs")
    .select(`
      id,
      project_id,
      title,
      date,
      start_time,
      end_time,
      location_name,
      status,
      projects (
        id,
        name,
        owner_id,
        is_personal,
        owner:profiles!projects_owner_id_fkey (
          name
        )
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        is_paid,
        musician_id
      )
    `)
    .lt("date", todayStr)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(500);

  if (gigsError) {
    throw new Error(gigsError.message || "Failed to fetch past gigs");
  }

  // Transform and filter
  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const projectData = Array.isArray(gig.projects) ? gig.projects[0] : gig.projects;
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      // Only consider user a player if they have a role that's been invited (not pending)
      const userRole = roles.find(r => r?.musician_id === userId && r?.invitation_status !== 'pending');

      const isManager = projectData?.owner_id === userId;
      const isPlayer = !!userRole;

      // Skip if user has no connection to this gig
      if (!isManager && !isPlayer) continue;

      let paymentStatus: "paid" | "unpaid" | null = null;
      if (isPlayer && userRole) {
        paymentStatus = userRole.is_paid ? "paid" : "unpaid";
      }

      // Extract host name from project owner (if gig has a project)
      const projectOwner = projectData ? (Array.isArray(projectData.owner) 
        ? projectData.owner[0] 
        : projectData.owner) : null;
      const hostName = projectOwner?.name || null;

      gigMap.set(gig.id, {
        gigId: gig.id,
        projectId: gig.project_id,
        projectName: projectData?.name || null,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        paymentStatus,
        hostName,
        isPersonalProject: projectData?.is_personal || false,
      });
    }
  }

  // Convert to array (already sorted by query)
  const allResults = Array.from(gigMap.values());

  // Apply pagination
  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    gigs: paginatedResults,
    hasMore,
    total,
  };
}

