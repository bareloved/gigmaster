"use client";

import { isSameDay, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DashboardGig } from "@/lib/types/shared";
import { eventBgColor, eventTextColor } from "@/lib/utils/calendar-helpers";
import { useTheme } from "@/lib/providers/theme-provider";

interface WeekViewAllDayProps {
  days: Date[];
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
}

/**
 * All-day bar shown above the time grid for gigs with no start_time.
 */
export function WeekViewAllDay({
  days,
  gigs,
  getGigColor,
  onEventClick,
}: WeekViewAllDayProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  // Only show gigs with no start_time
  const allDayGigs = gigs.filter((g) => !g.startTime);
  if (allDayGigs.length === 0) return null;

  return (
    <div className="flex border-b border-border min-h-[28px]">
      {/* Spacer matching the time gutter width */}
      <div className="w-10 sm:w-14 flex-shrink-0 border-r border-border" />

      {/* Day columns */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map((day) => {
          const dayGigs = allDayGigs.filter((g) =>
            isSameDay(new Date(g.date.slice(0, 10) + "T00:00:00"), day)
          );

          const isWeekend = getDay(day) === 5 || getDay(day) === 6;
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-border last:border-r-0 px-0.5 py-0.5 space-y-0.5",
                isWeekend && "bg-black/[0.02] dark:bg-white/[0.03]"
              )}
            >
              {dayGigs.map((gig) => {
                const color = getGigColor(gig.bandId);
                const needsResponse = gig.isPlayer && (gig.invitationStatus === 'invited' || gig.invitationStatus === 'pending');
                return (
                  <button
                    key={gig.gigId}
                    className={`block w-full rounded px-1 py-0.5 text-left text-[10px] font-medium truncate cursor-pointer hover:opacity-80 ${needsResponse ? 'opacity-60' : ''}`}
                    style={{
                      backgroundColor: eventBgColor(color, isDark),
                      color: eventTextColor(color, isDark),
                    }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onEventClick(gig, rect);
                    }}
                  >
                    {gig.gigTitle}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
