"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarIcon, Music, Briefcase, Filter } from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import { useQuery } from "@tanstack/react-query";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";

// Configure date-fns localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type RoleFilter = "all" | "manager" | "player";

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    gigId: string;
    hostId: string | null;
    hostName: string | null;
    isManager: boolean;
    isPlayer: boolean;
    playerRoleName?: string | null;
    locationName?: string | null;
    status?: string | null;
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const { user } = useUser();
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  // Calculate date range for fetching gigs
  const dateRange = useMemo(() => {
    const start = new Date(date);
    const end = new Date(date);

    if (view === "month") {
      start.setMonth(date.getMonth() - 1);
      end.setMonth(date.getMonth() + 2);
    } else if (view === "week") {
      start.setDate(date.getDate() - 14);
      end.setDate(date.getDate() + 14);
    } else {
      start.setDate(date.getDate() - 7);
      end.setDate(date.getDate() + 7);
    }

    return { from: start, to: end };
  }, [date, view]);

  // Fetch gigs
  // PERFORMANCE: Reduced limit to 20 for calendar view (instant load)
  // Calendar typically shows 1-2 weeks at a time, 20 gigs is plenty
  const { data, isLoading } = useQuery({
    queryKey: ["calendar-gigs", user?.id, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      const result = await listDashboardGigs(user.id, {
        from: dateRange.from,
        to: dateRange.to,
        limit: 20,
        offset: 0,
      });
      return result.gigs;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Transform gigs to calendar events
  const events = useMemo(() => {
    if (!data) return [];

    let filtered = data;
    if (roleFilter === "manager") {
      filtered = data.filter((g) => g.isManager);
    } else if (roleFilter === "player") {
      filtered = data.filter((g) => g.isPlayer);
    }

    return filtered.map((gig): CalendarEvent => {
      const gigDate = new Date(gig.date);
      
      // Parse start and end times
      let start = new Date(gigDate);
      let end = new Date(gigDate);

      if (gig.startTime) {
        const [hours, minutes] = gig.startTime.split(":").map(Number);
        start.setHours(hours, minutes, 0, 0);
      } else {
        start.setHours(0, 0, 0, 0);
      }

      if (gig.endTime) {
        const [hours, minutes] = gig.endTime.split(":").map(Number);
        end.setHours(hours, minutes, 0, 0);
      } else if (gig.startTime) {
        // Default 3-hour duration
        end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      } else {
        // All-day event
        end.setHours(23, 59, 0, 0);
      }

      return {
        id: gig.gigId,
        title: gig.hostName ? `[${gig.hostName}] ${gig.gigTitle}` : gig.gigTitle,
        start,
        end,
        resource: {
          gigId: gig.gigId,
          hostId: gig.hostId,
          hostName: gig.hostName,
          isManager: gig.isManager,
          isPlayer: gig.isPlayer,
          playerRoleName: gig.playerRoleName,
          locationName: gig.locationName,
          status: gig.status,
        },
      };
    });
  }, [data, roleFilter]);

  // Event style getter (color by role)
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const { isManager, isPlayer } = event.resource;

    let backgroundColor = "#3b82f6"; // blue (default)
    if (isManager && isPlayer) {
      backgroundColor = "#8b5cf6"; // purple (both)
    } else if (isManager) {
      backgroundColor = "#10b981"; // green (manager)
    } else if (isPlayer) {
      backgroundColor = "#3b82f6"; // blue (player)
    }

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
      },
    };
  }, []);

  // Handle event click
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      router.push(`/gigs/${event.resource.gigId}/pack?returnUrl=/calendar`);
    },
    [router]
  );

  // Handle navigation
  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  // Handle view change
  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  if (isLoading) {
    return (
      <div className="container max-w-7xl py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-7xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Calendar
          </h1>
          <p className="text-gray-600 mt-1">
            Visual view of all your gigs
          </p>
        </div>

        {/* Role Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {roleFilter === "all" && "All Gigs"}
              {roleFilter === "manager" && "Managing"}
              {roleFilter === "player" && "Playing"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>
              All Gigs
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("manager")}>
              <Briefcase className="h-4 w-4 mr-2" />
              Managing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("player")}>
              <Music className="h-4 w-4 mr-2" />
              Playing
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">Legend:</span>
        <Badge className="bg-blue-500">Playing</Badge>
        <Badge className="bg-green-500">Managing</Badge>
        <Badge className="bg-purple-500">Both</Badge>
      </div>

      {/* Calendar */}
      <Card className="p-6">
        <div className="calendar-wrapper" style={{ height: "700px" }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            views={["month", "week", "day"]}
            popup
            tooltipAccessor={(event) => {
              const { hostName, locationName, playerRoleName, isManager, isPlayer } = event.resource;
              let tooltip = hostName || "";
              if (locationName) {
                if (tooltip) tooltip += ` • ${locationName}`;
                else tooltip = locationName;
              }
              if (isPlayer && playerRoleName) {
                if (tooltip) tooltip += ` • ${playerRoleName}`;
                else tooltip = playerRoleName;
              }
              if (isManager) {
                if (tooltip) tooltip += " • Managing";
                else tooltip = "Managing";
              }
              return tooltip;
            }}
          />
        </div>
      </Card>

      {/* Empty State */}
      {events.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No gigs in this time range</p>
        </div>
      )}

      {/* Custom Styles for Calendar */}
      <style jsx global>{`
        .rbc-calendar {
          font-family: inherit;
        }
        .rbc-header {
          padding: 12px 4px;
          font-weight: 600;
          font-size: 14px;
        }
        .rbc-today {
          background-color: #fef3c7;
        }
        .rbc-off-range-bg {
          background-color: #f9fafb;
        }
        .rbc-event {
          padding: 2px 4px;
          font-size: 13px;
        }
        .rbc-event-label {
          font-size: 11px;
        }
        .rbc-toolbar button {
          color: inherit;
          font-weight: 500;
        }
        .rbc-toolbar button:hover {
          background-color: #f3f4f6;
        }
        .rbc-toolbar button.rbc-active {
          background-color: #e5e7eb;
        }
      `}</style>
    </div>
  );
}

