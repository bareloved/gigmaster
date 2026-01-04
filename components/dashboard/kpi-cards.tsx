"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardKPIs } from "@/lib/types/shared";
import { Music2, Calendar, Bell, Mail } from "lucide-react";

interface DashboardKPICardsProps {
  kpis: DashboardKPIs | null;
  isLoading?: boolean;
}

/**
 * Dashboard KPI Cards
 * 
 * Displays 4 key metrics in a responsive grid:
 * - Gigs this week (with hosted/playing breakdown)
 * - Songs to learn (across X gigs)
 * - Changes since last visit (activity summary)
 * - Pending invitations (action required)
 * 
 * Used in the artistry-focused dashboard for quick musician overview.
 */
export function DashboardKPICards({ kpis, isLoading }: DashboardKPICardsProps) {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="min-h-[112px]">
            <CardContent className="p-4 flex flex-col justify-between h-full min-h-[112px]">
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-7 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Gigs This Week */}
      {/* Gigs This Week */}
      <Card className="hover:shadow-md transition-shadow min-h-[112px]">
        <CardContent className="p-4 min-h-[112px]">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Gigs This Week</div>
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-bold">{kpis.gigsThisWeek.total}</div>
            <div className="text-xs text-muted-foreground truncate">
              {kpis.gigsThisWeek.hosted > 0 && `${kpis.gigsThisWeek.hosted} hosted`}
              {kpis.gigsThisWeek.hosted > 0 && kpis.gigsThisWeek.playing > 0 && " • "}
              {kpis.gigsThisWeek.playing > 0 && `${kpis.gigsThisWeek.playing} playing`}
              {kpis.gigsThisWeek.total === 0 && "scheduled"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Songs to Learn */}
      {/* Songs to Learn */}
      <Card className="hover:shadow-md transition-shadow min-h-[112px]">
        <CardContent className="p-4 min-h-[112px]">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Songs to Learn</div>
            <Music2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-bold">{kpis.songsToLearn.total}</div>
            <div className="text-xs text-muted-foreground truncate">
              {kpis.songsToLearn.acrossGigs > 0
                ? `in ${kpis.songsToLearn.acrossGigs} gig${kpis.songsToLearn.acrossGigs !== 1 ? "s" : ""}`
                : "to learn"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changes Since Last Visit */}
      {/* Changes Since Last Visit */}
      <Card className="hover:shadow-md transition-shadow min-h-[112px]">
        <CardContent className="p-4 min-h-[112px]">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">New Activity</div>
            <Bell className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-bold">{kpis.changesSinceLastVisit.total}</div>
            <div className="text-xs text-muted-foreground truncate">
              {kpis.changesSinceLastVisit.total > 0 ? (
                <>
                  {kpis.changesSinceLastVisit.breakdown.setlists > 0 &&
                    `${kpis.changesSinceLastVisit.breakdown.setlists} setlists`}
                  {kpis.changesSinceLastVisit.breakdown.setlists > 0 &&
                    kpis.changesSinceLastVisit.breakdown.notes > 0 &&
                    ", "}
                  {kpis.changesSinceLastVisit.breakdown.notes > 0 &&
                    `${kpis.changesSinceLastVisit.breakdown.notes} notes`}
                </>
              ) : (
                "updates"
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {/* Pending Invitations */}
      <Card className="hover:shadow-md transition-shadow min-h-[112px]">
        <CardContent className="p-4 min-h-[112px]">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="text-sm font-medium text-muted-foreground">Invitations</div>
            <Mail className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-2xl font-bold">{kpis.pendingInvitations.total}</div>
            <div className="text-xs text-muted-foreground truncate">
              {kpis.pendingInvitations.total > 0
                ? "pending"
                : "pending"}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

