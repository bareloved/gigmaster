"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGigActivity,
  fetchRecentActivity,
  GigActivityLogEntry,
  getActivityIcon,
  getActivityColor,
} from "@/lib/api/gig-activity";
import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Activity types hidden from the widget */
const HIDDEN_ACTIVITY_TYPES: Set<string> = new Set([
  "gig_created",
  "setlist_removed",
  "file_removed",
  "role_assigned",
  "role_removed",
]);

interface GigActivityWidgetProps {
  gigId?: string;
  limit?: number;
  showViewAll?: boolean;
  className?: string;
}

export function GigActivityWidget({
  gigId,
  limit = 10,
  showViewAll = false,
  className = "",
}: GigActivityWidgetProps) {
  const [activities, setActivities] = useState<GigActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const data = gigId
          ? await fetchGigActivity(gigId, { limit })
          : await fetchRecentActivity({ limit });
        setActivities(
          data.filter((a) => !HIDDEN_ACTIVITY_TYPES.has(a.activity_type))
        );
      } catch (err) {
        console.error("Failed to fetch activity:", err);
        setError("Failed to load activity");
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [gigId, limit]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No activity yet</p>
            <p className="text-xs mt-1">
              Changes to the setlist, files, and lineup will appear here
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} showGigName={!gigId} />
                ))}
              </div>
            </ScrollArea>
            {showViewAll && activities.length >= limit && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-sm"
                onClick={() => {
                  // TODO: Navigate to full activity log or expand
                }}
              >
                View all activity
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Activity types where metadata lines replace the generic description */
const METADATA_DETAIL_TYPES: Set<string> = new Set([
  "gig_updated",
  "gig_times_changed",
  "gig_venue_changed",
  "gig_fee_changed",
  "gig_status_changed",
  "role_status_changed",
]);

function ActivityItem({ activity, showGigName = false }: { activity: GigActivityLogEntry; showGigName?: boolean }) {
  const icon = getActivityIcon(activity.activity_type);
  const colorClass = getActivityColor(activity.activity_type);

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  const hasDetailMetadata =
    METADATA_DETAIL_TYPES.has(activity.activity_type) &&
    activity.metadata &&
    Object.keys(activity.metadata).length > 0;

  return (
    <div className="flex items-start gap-2">
      <span className={`text-lg leading-none ${colorClass}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        {showGigName && activity.gig?.title && (
          <p className="text-xs font-bold text-muted-foreground leading-tight">
            {activity.gig.title}
          </p>
        )}
        {!hasDetailMetadata && (
          <p className="text-sm font-medium leading-tight">
            {activity.description}
          </p>
        )}
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <ActivityMetadata
            activityType={activity.activity_type}
            metadata={activity.metadata}
          />
        )}
        <p className="text-[10px] text-muted-foreground/50 mt-1">{timeAgo}</p>
      </div>
    </div>
  );
}

/** Strip seconds from time strings like "14:00:00" → "14:00" */
function formatTime(value: unknown): string {
  const str = String(value || "");
  return str.replace(/^(\d{1,2}:\d{2}):\d{2}$/, "$1");
}

function ActivityMetadata({
  activityType,
  metadata,
}: {
  activityType: string;
  metadata: Record<string, unknown>;
}) {
  const meta = metadata as Record<string, Record<string, unknown> | string | undefined>;

  // Render specific metadata based on activity type
  if (activityType === "setlist_updated" && meta.changes) {
    const changes = meta.changes as Record<string, unknown>;
    const changesList: string[] = [];
    if (changes.title_changed) changesList.push("title");
    if (changes.key_changed) changesList.push("key");
    if (changes.bpm_changed) changesList.push("tempo");

    if (changesList.length > 0) {
      return (
        <p className="text-xs text-muted-foreground mt-0.5">
          Changed: {changesList.join(", ")}
        </p>
      );
    }
  }

  if (activityType === "gig_updated" && meta.changes) {
    const changes = meta.changes as Record<string, unknown>;
    const parts: string[] = [];
    if (changes.title_changed && meta.title) {
      parts.push(`Title changed: ${meta.title}`);
    }
    if (changes.date_changed && meta.date) {
      parts.push(`Date changed: ${meta.date}`);
    }

    if (parts.length > 0) {
      return (
        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
          {parts.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
    }
  }

  if (
    activityType === "role_status_changed" &&
    meta.new_status
  ) {
    return (
      <p className="text-xs text-muted-foreground mt-0.5">
        Status changed: {String(meta.new_status)}
      </p>
    );
  }

  if (activityType === "gig_status_changed" && meta.new_status) {
    return (
      <p className="text-xs text-muted-foreground mt-0.5">
        Status changed: {String(meta.new_status)}
      </p>
    );
  }

  if (activityType === "gig_times_changed") {
    const changes = meta.changes as Record<string, unknown> | undefined;
    const parts: string[] = [];
    if (changes?.call_time_changed && meta.new_call_time) {
      parts.push(`Call time changed: ${formatTime(meta.new_call_time)}`);
    }
    if (changes?.on_stage_time_changed && meta.new_on_stage_time) {
      parts.push(`On stage changed: ${formatTime(meta.new_on_stage_time)}`);
    }
    if (changes?.start_time_changed && meta.new_start_time) {
      parts.push(`Start time changed: ${formatTime(meta.new_start_time)}`);
    }
    if (changes?.end_time_changed && meta.new_end_time) {
      parts.push(`End time changed: ${formatTime(meta.new_end_time)}`);
    }
    if (parts.length > 0) {
      return (
        <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
          {parts.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      );
    }
  }

  if (activityType === "gig_venue_changed") {
    const newVenue = String(meta.new_venue_name || "");
    if (newVenue) {
      return (
        <p className="text-xs text-muted-foreground mt-0.5">
          Location changed: {newVenue}
        </p>
      );
    }
  }

  if (activityType === "gig_fee_changed") {
    const newFee = meta.new_fee != null ? String(meta.new_fee) : null;
    const currency = String(meta.new_currency || meta.old_currency || "");
    if (newFee) {
      return (
        <p className="text-xs text-muted-foreground mt-0.5">
          Fee changed: {currency} {newFee}
        </p>
      );
    }
  }

  if (activityType === "gig_logistics_changed") {
    const changes = meta.changes as Record<string, unknown> | undefined;
    const parts: string[] = [];
    if (changes?.dress_code_changed) parts.push("dress code");
    if (changes?.backline_notes_changed) parts.push("gear/backline");
    if (changes?.parking_notes_changed) parts.push("parking");
    if (parts.length > 0) {
      return (
        <p className="text-xs text-muted-foreground mt-0.5">
          Updated: {parts.join(", ")}
        </p>
      );
    }
  }

  return null;
}

/**
 * Compact version for dashboard previews
 */
export function GigActivityCompact({
  gigId,
  limit = 5,
  className = "",
}: {
  gigId: string;
  limit?: number;
  className?: string;
}) {
  const [activities, setActivities] = useState<GigActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        setLoading(true);
        const data = await fetchGigActivity(gigId, { limit });
        setActivities(data);
      } catch (err) {
        console.error("Failed to fetch activity:", err);
      } finally {
        setLoading(false);
      }
    }

    loadActivity();
  }, [gigId, limit]);

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground text-center py-4 ${className}`}>
        No recent activity
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activities.map((activity) => {
        const icon = getActivityIcon(activity.activity_type);
        const colorClass = getActivityColor(activity.activity_type);
        const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
          addSuffix: true,
        });

        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 text-sm hover:bg-accent/50 rounded-md p-2 transition-colors"
          >
            <span className={`text-base ${colorClass}`}>{icon}</span>
            <span className="flex-1 truncate">{activity.description}</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>
        );
      })}
    </div>
  );
}

