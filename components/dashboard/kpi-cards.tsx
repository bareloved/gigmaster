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
          <Card key={i}>
            <CardContent className="pt-6 pb-5">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Gigs This Week */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-2xl font-bold">{kpis.gigsThisWeek.total}</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Gigs this week</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis.gigsThisWeek.hosted > 0 && `${kpis.gigsThisWeek.hosted} hosted`}
            {kpis.gigsThisWeek.hosted > 0 && kpis.gigsThisWeek.playing > 0 && " • "}
            {kpis.gigsThisWeek.playing > 0 && `${kpis.gigsThisWeek.playing} playing`}
            {kpis.gigsThisWeek.total === 0 && "No gigs scheduled"}
          </div>
        </CardContent>
      </Card>

      {/* Songs to Learn */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Music2 className="h-5 w-5 text-blue-500" />
            <div className="text-2xl font-bold">{kpis.songsToLearn.total}</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Songs to learn</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis.songsToLearn.acrossGigs > 0
              ? `across ${kpis.songsToLearn.acrossGigs} gig${kpis.songsToLearn.acrossGigs !== 1 ? "s" : ""}`
              : "all caught up"}
          </div>
        </CardContent>
      </Card>

      {/* Changes Since Last Visit */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <div className="text-2xl font-bold">{kpis.changesSinceLastVisit.total}</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Changes since last visit</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis.changesSinceLastVisit.total > 0 ? (
              <>
                {kpis.changesSinceLastVisit.breakdown.setlists > 0 &&
                  `${kpis.changesSinceLastVisit.breakdown.setlists} setlist`}
                {kpis.changesSinceLastVisit.breakdown.setlists > 0 &&
                  kpis.changesSinceLastVisit.breakdown.notes > 0 &&
                  " • "}
                {kpis.changesSinceLastVisit.breakdown.notes > 0 &&
                  `${kpis.changesSinceLastVisit.breakdown.notes} notes`}
              </>
            ) : (
              "no updates"
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-5 w-5 text-purple-500" />
            <div className="text-2xl font-bold">{kpis.pendingInvitations.total}</div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">Pending invitations</div>
          <div className="text-xs text-muted-foreground mt-1">
            {kpis.pendingInvitations.total > 0
              ? "action required"
              : "all responded"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

