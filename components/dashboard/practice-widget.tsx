"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Music, 
  CheckCircle2, 
  Clock, 
  Calendar,
  ChevronRight,
  Headphones
} from "lucide-react";
import { getPracticeItems, toggleSongLearned } from "@/lib/api/setlist-learning";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface PracticeFocusWidgetProps {
  userId: string;
  limit?: number;
  className?: string;
}

export function PracticeFocusWidget({ 
  userId, 
  limit = 5,
  className 
}: PracticeFocusWidgetProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch practice items
  const { data: practiceItems, isLoading } = useQuery({
    queryKey: ['practice-items', userId, limit, priorityFilter],
    queryFn: () => getPracticeItems(userId, limit, priorityFilter),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Mark song as learned mutation
  const markLearnedMutation = useMutation({
    mutationFn: async ({ setlistItemId, learned }: { setlistItemId: string; learned: boolean }) => {
      return toggleSongLearned(setlistItemId, userId, learned);
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['practice-items'] });
      queryClient.invalidateQueries({ queryKey: ['gig-readiness'] });
    },
  });

  const handleMarkLearned = (setlistItemId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking button
    markLearnedMutation.mutate({ setlistItemId, learned: true });
  };

  const handleNavigateToGig = (gigId: string) => {
    router.push(`/gigs/${gigId}`);
  };

  // Priority badge colors
  const getPriorityColor = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  // Urgency color based on days until gig
  const getUrgencyColor = (days: number) => {
    if (days <= 3) return 'text-red-500';
    if (days <= 7) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  if (isLoading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Practice Focus</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!practiceItems || practiceItems.length === 0) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center gap-2 mb-4">
          <Headphones className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Practice Focus</h3>
        </div>
        <div className="text-center py-6">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            You're all caught up! 🎉
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No songs to practice right now
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Headphones className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-base font-semibold">Practice Focus</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {practiceItems.length}
        </Badge>
      </div>

      {/* Priority filter chips */}
      <div className="flex gap-1 mb-3">
        {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
          <Button
            key={priority}
            variant={priorityFilter === priority ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => setPriorityFilter(priority)}
          >
            {priority}
          </Button>
        ))}
      </div>

      <ScrollArea className="h-[300px] -mx-2 px-2">
        <div className="space-y-2">
          {practiceItems.map((item, index) => (
            <div key={item.setlistItemId}>
              <div
                className="group p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleNavigateToGig(item.gigId)}
              >
                {/* Song title and badges */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Music className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {item.songTitle}
                      </span>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px] px-1.5 py-0 h-5", getPriorityColor(item.priority))}
                  >
                    {item.priority}
                  </Badge>
                </div>

                {/* Gig info */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <span className="truncate">
                    {item.hostName ? `${item.hostName} • ${item.gigTitle}` : item.gigTitle}
                  </span>
                </div>

                {/* Days until gig and key/bpm */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Calendar className={cn("h-3 w-3", getUrgencyColor(item.daysUntilGig))} />
                      <span className={getUrgencyColor(item.daysUntilGig)}>
                        {item.daysUntilGig === 0 ? 'Today' :
                         item.daysUntilGig === 1 ? 'Tomorrow' :
                         `${item.daysUntilGig}d`}
                      </span>
                    </div>
                    {(item.key || item.bpm) && (
                      <>
                        {item.key && (
                          <span className="text-muted-foreground">
                            {item.key}
                          </span>
                        )}
                        {item.bpm && (
                          <span className="text-muted-foreground">
                            {item.bpm} BPM
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Mark learned button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleMarkLearned(item.setlistItemId, e)}
                    disabled={markLearnedMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Learned
                  </Button>
                </div>
              </div>

              {index < practiceItems.length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* View all link */}
      {practiceItems.length >= limit && (
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs"
            onClick={() => router.push('/practice')} // Future: dedicated practice page
          >
            View all songs to practice
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </Card>
  );
}

