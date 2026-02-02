import { createClient } from "@/lib/supabase/client";
import type { DashboardGig } from "@/lib/types/shared";

// Type definition for RPC response row
interface DashboardRpcRow {
  gig_id: string;
  gig_title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  call_time: string | null;
  location_name: string | null;
  status: string | null;
  is_manager: boolean;
  is_player: boolean;
  player_role_name: string | null;
  player_gig_role_id: string | null;
  invitation_status: string | null;
  host_name: string | null;
  host_id: string | null;
  total_count: number;
  gig_type: string | null;
  hero_image_url: string | null;
  role_stats?: { total: number; invited: number; accepted: number; declined: number; pending: number } | null;
}

/**
 * Dashboard Gigs API
 *
 * Unified view that combines gigs where user is manager and/or player.
 * Returns a single list with perspective flags for UI rendering.
 *
 * PERFORMANCE: Uses server-side RPC functions for true pagination.
 * Fallback to client-side filtering if RPC not available.
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
 * Uses server-side RPC for true pagination (fallback to client-side if RPC unavailable)
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

  // Try server-side RPC first (true pagination)
  // Note: RPC function needs to be applied via Supabase Dashboard SQL Editor
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('list_dashboard_gigs', {
      p_user_id: userId,
      p_from_date: fromStr,
      p_to_date: toStr,
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      // RPC succeeded - transform response
      const total = rpcData[0]?.total_count ?? 0;
      const gigs: DashboardGig[] = (rpcData as DashboardRpcRow[]).map((row) => ({
        gigId: row.gig_id,
        gigTitle: row.gig_title,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        callTime: row.call_time,
        locationName: row.location_name,
        status: row.status,
        isManager: row.is_manager,
        isPlayer: row.is_player,
        playerRoleName: row.player_role_name,
        playerGigRoleId: row.player_gig_role_id,
        invitationStatus: row.invitation_status,
        hostId: row.host_id,
        hostName: row.host_name,
        heroImageUrl: row.hero_image_url,
        gigType: row.gig_type,
        roleStats: row.role_stats,
      }));

      return {
        gigs,
        hasMore: offset + limit < total,
        total,
      };
    }
  } catch {
    // RPC not available, fall back to client-side filtering
    console.warn('list_dashboard_gigs RPC not available, using fallback');
  }

  // Fallback: client-side filtering (for backwards compatibility)
  return listDashboardGigsFallback(userId, options);
}

/**
 * Fallback function using client-side filtering
 * Used when RPC function is not available
 */
async function listDashboardGigsFallback(
  userId: string,
  options?: ListDashboardGigsOptions
): Promise<{ gigs: DashboardGig[]; hasMore: boolean; total: number }> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = options?.from || today;
  const to = options?.to || new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { data: allGigs, error: allGigsError } = await supabase
    .from("gigs")
    .select(`
      id,
      owner_id,
      title,
      date,
      start_time,
      end_time,
      call_time,
      location_name,
      status,
      hero_image_url,
      gig_type,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        payment_status,
        musician_id
      )
    `)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(100);

  if (allGigsError) {
    throw new Error(allGigsError.message || "Failed to fetch gigs");
  }

  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      const userRole = roles.find(r =>
        r?.musician_id === userId &&
        r?.invitation_status !== 'pending' &&
        r?.invitation_status !== 'declined'
      );

      const isManager = gig.owner_id === userId;
      const isPlayer = !!userRole;

      if (!isManager && !isPlayer) continue;

      const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
      const hostName = ownerData?.name || null;

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
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        callTime: gig.call_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        hostId: gig.owner_id,
        hostName,
        heroImageUrl: gig.hero_image_url,
        gigType: gig.gig_type,
        roleStats,
      });
    }
  }

  const allResults = Array.from(gigMap.values());

  allResults.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return a.startTime.localeCompare(b.startTime);
  });

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
 * Returns recent completed gigs from the past 30 days
 * @param limit - Number of gigs to return (default 5 for performance)
 */
export async function listRecentPastGigs(
  userId: string,
  limit: number = 5
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
  // PERFORMANCE: Start with small limit, load more on demand
  const { data: allGigs, error: gigsError } = await supabase
    .from("gigs")
    .select(`
      id,
      owner_id,
      title,
      date,
      start_time,
      end_time,
      call_time,
      location_name,
      status,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        payment_status,
        musician_id
      )
    `)
    .gte("date", fromStr)
    .lte("date", toStr)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(limit);

  if (gigsError) {
    throw new Error(gigsError.message || "Failed to fetch recent past gigs");
  }

  // Transform and filter
  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      // Only consider user a player if they have a role that's been invited (not pending)
      const userRole = roles.find(r => r?.musician_id === userId && r?.invitation_status !== 'pending');

      const isManager = gig.owner_id === userId;
      const isPlayer = !!userRole;

      // Skip if user has no connection to this gig
      if (!isManager && !isPlayer) continue;

      const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
      const hostName = ownerData?.name || null;

      gigMap.set(gig.id, {
        gigId: gig.id,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        callTime: gig.call_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        hostId: gig.owner_id,
        hostName,
      });
    }
  }

  // Convert to array and sort (already sorted by query)
  const results = Array.from(gigMap.values());
  return results.slice(0, limit);
}

/**
 * List all past gigs for history page
 * Uses server-side RPC for true pagination (fallback to client-side if RPC unavailable)
 * Returns paginated results sorted by date descending (most recent first)
 */
export async function listAllPastGigs(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ gigs: DashboardGig[]; hasMore: boolean; total: number }> {
  const supabase = createClient();

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Try server-side RPC first (true pagination)
  // Note: RPC function needs to be applied via Supabase Dashboard SQL Editor
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)('list_past_gigs', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
      const total = rpcData[0]?.total_count ?? 0;
      const gigs: DashboardGig[] = (rpcData as DashboardRpcRow[]).map((row) => ({
        gigId: row.gig_id,
        gigTitle: row.gig_title,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        callTime: row.call_time,
        locationName: row.location_name,
        status: row.status,
        isManager: row.is_manager,
        isPlayer: row.is_player,
        playerRoleName: row.player_role_name,
        playerGigRoleId: row.player_gig_role_id,
        invitationStatus: row.invitation_status,
        hostId: row.host_id,
        hostName: row.host_name,
      }));

      return {
        gigs,
        hasMore: offset + limit < total,
        total,
      };
    }
  } catch {
    console.warn('list_past_gigs RPC not available, using fallback');
  }

  // Fallback: client-side filtering
  return listAllPastGigsFallback(userId, options);
}

/**
 * Fallback function for past gigs using client-side filtering
 */
async function listAllPastGigsFallback(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ gigs: DashboardGig[]; hasMore: boolean; total: number }> {
  const supabase = createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { data: allGigs, error: gigsError } = await supabase
    .from("gigs")
    .select(`
      id,
      owner_id,
      title,
      date,
      start_time,
      end_time,
      call_time,
      location_name,
      status,
      owner:profiles!gigs_owner_profiles_fkey(
        id,
        name
      ),
      gig_roles (
        id,
        role_name,
        invitation_status,
        payment_status,
        musician_id
      )
    `)
    .lt("date", todayStr)
    .order("date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(50);

  if (gigsError) {
    throw new Error(gigsError.message || "Failed to fetch past gigs");
  }

  const gigMap = new Map<string, DashboardGig>();

  if (allGigs) {
    for (const gig of allGigs) {
      const roles = Array.isArray(gig.gig_roles) ? gig.gig_roles : [gig.gig_roles];
      const userRole = roles.find(r => r?.musician_id === userId && r?.invitation_status !== 'pending');

      const isManager = gig.owner_id === userId;
      const isPlayer = !!userRole;

      if (!isManager && !isPlayer) continue;

      const ownerData = Array.isArray(gig.owner) ? gig.owner[0] : gig.owner;
      const hostName = ownerData?.name || null;

      gigMap.set(gig.id, {
        gigId: gig.id,
        gigTitle: gig.title,
        date: gig.date,
        startTime: gig.start_time,
        endTime: gig.end_time,
        callTime: gig.call_time,
        locationName: gig.location_name,
        status: gig.status,
        isManager,
        isPlayer,
        playerRoleName: userRole?.role_name || null,
        playerGigRoleId: userRole?.id || null,
        invitationStatus: userRole?.invitation_status || null,
        hostId: gig.owner_id,
        hostName,
      });
    }
  }

  const allResults = Array.from(gigMap.values());
  const total = allResults.length;
  const paginatedResults = allResults.slice(offset, offset + limit);
  const hasMore = offset + limit < total;

  return {
    gigs: paginatedResults,
    hasMore,
    total,
  };
}

