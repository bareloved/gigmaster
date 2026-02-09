"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { listDashboardGigs } from "@/lib/api/dashboard-gigs";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
} from "date-fns";

type CalendarViewType = "week" | "month";

/**
 * Fetch gigs for the calendar within a smart date range.
 * Week view: current week +/- 7 days buffer
 * Month view: current month +/- 7 days buffer
 */
export function useCalendarGigs(currentDate: Date, viewType: CalendarViewType) {
  const { user } = useUser();

  const { from, to } = useMemo(() => {
    if (viewType === "week") {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return {
        from: subDays(weekStart, 7),
        to: addDays(weekEnd, 7),
      };
    }
    // month
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return {
      from: subDays(monthStart, 7),
      to: addDays(monthEnd, 7),
    };
  }, [currentDate, viewType]);

  const fromStr = from.toISOString().split("T")[0];
  const toStr = to.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["calendar-gigs", user?.id, fromStr, toStr],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const result = await listDashboardGigs(user.id, {
        from,
        to,
        limit: 200,
        offset: 0,
      });
      return result.gigs;
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
