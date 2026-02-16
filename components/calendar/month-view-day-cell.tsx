"use client";

import { isSameDay, isSameMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DashboardGig } from "@/lib/types/shared";
import { MonthViewEventPill } from "./month-view-event-pill";
import { eventBgColor, eventTextColor } from "@/lib/utils/calendar-helpers";
import { useTheme } from "@/lib/providers/theme-provider";

const MAX_VISIBLE_EVENTS = 3;
const MAX_VISIBLE_EVENTS_MOBILE = 4;

interface MonthViewDayCellProps {
  date: Date;
  currentMonth: Date;
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onDayClick: (date: Date) => void;
}

export function MonthViewDayCell({
  date,
  currentMonth,
  gigs,
  getGigColor,
  onEventClick,
  onDayClick,
}: MonthViewDayCellProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const today = new Date();
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isToday = isSameDay(date, today);
  const isWeekend = getDay(date) === 5 || getDay(date) === 6;
  const dayGigs = gigs.filter((g) =>
    isSameDay(new Date(g.date + "T00:00:00"), date)
  );
  const visibleGigs = dayGigs.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = dayGigs.length - MAX_VISIBLE_EVENTS;
  const mobileOverflow = dayGigs.length - MAX_VISIBLE_EVENTS_MOBILE;

  return (
    <div
      className={cn(
        "border-b border-r border-border p-0.5 sm:p-1 cursor-pointer transition-colors hover:bg-muted/50 min-h-0 overflow-hidden",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentMonth && isWeekend && "bg-black/[0.02] dark:bg-white/[0.03]"
      )}
      onClick={() => onDayClick(date)}
    >
      {/* Day number — left-aligned on mobile, centered on desktop */}
      <div className="flex sm:justify-center mb-0.5">
        <span
          className={cn(
            "text-[11px] sm:text-sm font-medium h-5 w-5 sm:h-7 sm:w-7 flex items-center justify-center rounded-full",
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Mobile: compact colored pills (like Google Calendar) */}
      <div className="sm:hidden space-y-px">
        {dayGigs.slice(0, MAX_VISIBLE_EVENTS_MOBILE).map((gig) => {
          const color = getGigColor(gig.bandId);
          return (
            <div
              key={gig.gigId}
              className="rounded-[3px] px-0.5 text-[9px] font-medium leading-[14px] truncate"
              style={{
                backgroundColor: eventBgColor(color, isDark),
                color: eventTextColor(color, isDark),
              }}
            >
              {gig.gigTitle}
            </div>
          );
        })}
        {mobileOverflow > 0 && (
          <p className="text-[9px] leading-[14px] text-muted-foreground font-medium px-0.5">
            &bull;&bull;&bull;
          </p>
        )}
      </div>

      {/* Desktop: event pills */}
      <div className="hidden sm:block space-y-1">
        {visibleGigs.map((gig) => (
          <MonthViewEventPill
            key={gig.gigId}
            gig={gig}
            color={getGigColor(gig.bandId)}
            onClick={onEventClick}
          />
        ))}
        {overflowCount > 0 && (
          <p className="text-xs text-muted-foreground text-center font-medium">
            +{overflowCount} more
          </p>
        )}
      </div>
    </div>
  );
}
