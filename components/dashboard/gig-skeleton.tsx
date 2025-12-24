import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton loader for dashboard gig items
 * Shows while gigs are loading to improve perceived performance
 */
export function DashboardGigSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-4">
        {/* Date Badge Skeleton */}
        <div className="flex flex-col items-center bg-primary/10 rounded-lg p-2 min-w-[60px]">
          <Skeleton className="h-3 w-8 mb-1" />
          <Skeleton className="h-7 w-8" />
        </div>

        {/* Gig Details Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1">
              {/* Title */}
              <Skeleton className="h-5 w-48" />
              {/* Project name */}
              <Skeleton className="h-4 w-32" />
            </div>
            {/* Badges */}
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16" />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-1">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-10" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * Skeleton loader for grid view gig items
 */
export function DashboardGigGridSkeleton() {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        {/* Date badge */}
        <Skeleton className="h-6 w-24" />
        
        {/* Title */}
        <Skeleton className="h-5 w-full" />
        
        {/* Project */}
        <Skeleton className="h-4 w-32" />
        
        {/* Metadata */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        
        {/* Actions */}
        <div className="flex justify-between pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Renders multiple gig skeletons for loading states
 * Use this while fetching dashboard gigs
 */
export function DashboardGigListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardGigSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Renders multiple gig skeletons in grid layout
 */
export function DashboardGigGridListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardGigGridSkeleton key={i} />
      ))}
    </div>
  );
}

