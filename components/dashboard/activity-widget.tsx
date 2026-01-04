"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchGigActivity,
  GigActivityLogEntry,
  getActivityIcon,
  getActivityColor,
} from "@/lib/api/gig-activity";
import { formatDistanceToNow } from "date-fns";
import { Activity, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GigActivityWidgetProps {
  gigId: string;
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
        const data = await fetchGigActivity(gigId, { limit });
        setActivities(data);
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activities.length}
            </Badge>
          )}
        </div>
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
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            </ScrollArea>
            {showViewAll && activities.length >= limit && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-sm"
                onClick={() => {
                  // Navigate to full activity log or expand
                  console.log("View all activity");
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

function ActivityItem({ activity }: { activity: GigActivityLogEntry }) {
  const icon = getActivityIcon(activity.activity_type);
  const colorClass = getActivityColor(activity.activity_type);
  const userName = activity.user?.name || "Someone";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <div className="flex gap-3 items-start">
      <Avatar className="h-8 w-8">
        <AvatarImage src={activity.user?.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <span className={`text-lg leading-none ${colorClass}`}>{icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-tight">
              {activity.description}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
          </div>
        </div>
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <ActivityMetadata
            activityType={activity.activity_type}
            metadata={activity.metadata}
          />
        )}
      </div>
    </div>
  );
}

function ActivityMetadata({
  activityType,
  metadata,
}: {
  activityType: string;
  metadata: Record<string, any>;
}) {
  // Render specific metadata based on activity type
  if (activityType === "setlist_updated" && metadata.changes) {
    const changes = metadata.changes;
    const changesList = [];
    if (changes.title_changed) changesList.push("title");
    if (changes.key_changed) changesList.push("key");
    if (changes.bpm_changed) changesList.push("tempo");

    if (changesList.length > 0) {
      return (
        <p className="text-xs text-muted-foreground mt-1 ml-7">
          Changed: {changesList.join(", ")}
        </p>
      );
    }
  }

  if (activityType === "gig_updated" && metadata.changes) {
    const changes = metadata.changes;
    const changesList = [];
    if (changes.title_changed) changesList.push("title");
    if (changes.date_changed) changesList.push("date");
    if (changes.location_changed) changesList.push("location");

    if (changesList.length > 0) {
      return (
        <p className="text-xs text-muted-foreground mt-1 ml-7">
          Updated: {changesList.join(", ")}
        </p>
      );
    }
  }

  if (
    activityType === "role_status_changed" &&
    metadata.old_status &&
    metadata.new_status
  ) {
    return (
      <p className="text-xs text-muted-foreground mt-1 ml-7">
        {metadata.old_status} → {metadata.new_status}
      </p>
    );
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

