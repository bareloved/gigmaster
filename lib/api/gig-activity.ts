/**
 * Gig Activity API
 * 
 * Fetches activity log entries for gigs to display in activity feeds.
 * Activity includes: setlist changes, file uploads, role assignments, and gig updates.
 */

import { createClient } from "@/lib/supabase/client";

export interface GigActivityLogEntry {
  id: string;
  gig_id: string;
  user_id: string | null;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    name: string | null;
    avatar_url: string | null;
  };
}

export type ActivityType =
  | "setlist_added"
  | "setlist_removed"
  | "setlist_updated"
  | "setlist_reordered"
  | "file_uploaded"
  | "file_removed"
  | "file_updated"
  | "role_assigned"
  | "role_removed"
  | "role_status_changed"
  | "gig_updated"
  | "notes_updated"
  | "schedule_updated"
  | "gig_created";

export interface FetchActivityOptions {
  limit?: number;
  offset?: number;
  activityTypes?: ActivityType[];
  since?: Date;
}

/**
 * Fetch activity log entries for a specific gig
 */
export async function fetchGigActivity(
  gigId: string,
  options: FetchActivityOptions = {}
): Promise<GigActivityLogEntry[]> {
  const supabase = createClient();
  const { limit = 20, offset = 0, activityTypes, since } = options;

  let query = supabase
    .from("gig_activity_log")
    .select(
      `
      id,
      gig_id,
      user_id,
      activity_type,
      description,
      metadata,
      created_at,
      user:user_id (
        name,
        avatar_url
      )
    `
    )
    .eq("gig_id", gigId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by activity types if specified
  if (activityTypes && activityTypes.length > 0) {
    query = query.in("activity_type", activityTypes);
  }

  // Filter by time if specified
  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching gig activity:", error);
    throw error;
  }

  return data as GigActivityLogEntry[];
}

/**
 * Fetch recent activity across all gigs the user is involved in
 */
export async function fetchRecentActivity(
  options: FetchActivityOptions = {}
): Promise<GigActivityLogEntry[]> {
  const supabase = createClient();
  const { limit = 50, offset = 0, activityTypes, since } = options;

  let query = supabase
    .from("gig_activity_log")
    .select(
      `
      id,
      gig_id,
      user_id,
      activity_type,
      description,
      metadata,
      created_at,
      user:user_id (
        name,
        avatar_url
      ),
      gig:gig_id (
        title,
        date
      )
    `
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by activity types if specified
  if (activityTypes && activityTypes.length > 0) {
    query = query.in("activity_type", activityTypes);
  }

  // Filter by time if specified
  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching recent activity:", error);
    throw error;
  }

  return data as GigActivityLogEntry[];
}

/**
 * Count new activity entries since a given timestamp for a gig
 */
export async function countNewActivity(
  gigId: string,
  since: Date
): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("gig_activity_log")
    .select("*", { count: "exact", head: true })
    .eq("gig_id", gigId)
    .gte("created_at", since.toISOString());

  if (error) {
    console.error("Error counting new activity:", error);
    throw error;
  }

  return count || 0;
}

/**
 * Get activity summary grouped by type for a gig
 */
export async function getActivitySummary(
  gigId: string,
  since?: Date
): Promise<Record<ActivityType, number>> {
  const supabase = createClient();

  let query = supabase
    .from("gig_activity_log")
    .select("activity_type")
    .eq("gig_id", gigId);

  if (since) {
    query = query.gte("created_at", since.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching activity summary:", error);
    throw error;
  }

  // Count by activity type
  const summary: Record<string, number> = {};
  data?.forEach((entry) => {
    summary[entry.activity_type] = (summary[entry.activity_type] || 0) + 1;
  });

  return summary as Record<ActivityType, number>;
}

/**
 * Manually log a custom activity (for cases not covered by triggers)
 */
export async function logActivity(
  gigId: string,
  activityType: ActivityType,
  description: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("gig_activity_log").insert({
    gig_id: gigId,
    user_id: user?.id || null,
    activity_type: activityType,
    description,
    metadata,
  });

  if (error) {
    console.error("Error logging activity:", error);
    throw error;
  }
}

/**
 * Get activity icon based on activity type
 */
export function getActivityIcon(activityType: ActivityType): string {
  const iconMap: Record<ActivityType, string> = {
    setlist_added: "🎵",
    setlist_removed: "❌",
    setlist_updated: "✏️",
    setlist_reordered: "🔄",
    file_uploaded: "📎",
    file_removed: "🗑️",
    file_updated: "📝",
    role_assigned: "👤",
    role_removed: "🚫",
    role_status_changed: "🔔",
    gig_updated: "🎤",
    notes_updated: "📋",
    schedule_updated: "📅",
    gig_created: "✨",
  };

  return iconMap[activityType] || "•";
}

/**
 * Get activity color based on activity type
 */
export function getActivityColor(activityType: ActivityType): string {
  const colorMap: Record<ActivityType, string> = {
    setlist_added: "text-green-600 dark:text-green-400",
    setlist_removed: "text-red-600 dark:text-red-400",
    setlist_updated: "text-blue-600 dark:text-blue-400",
    setlist_reordered: "text-purple-600 dark:text-purple-400",
    file_uploaded: "text-green-600 dark:text-green-400",
    file_removed: "text-red-600 dark:text-red-400",
    file_updated: "text-blue-600 dark:text-blue-400",
    role_assigned: "text-green-600 dark:text-green-400",
    role_removed: "text-red-600 dark:text-red-400",
    role_status_changed: "text-amber-600 dark:text-amber-400",
    gig_updated: "text-blue-600 dark:text-blue-400",
    notes_updated: "text-gray-600 dark:text-gray-400",
    schedule_updated: "text-blue-600 dark:text-blue-400",
    gig_created: "text-green-600 dark:text-green-400",
  };

  return colorMap[activityType] || "text-gray-600 dark:text-gray-400";
}

