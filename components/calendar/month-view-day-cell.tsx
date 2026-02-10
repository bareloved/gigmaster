"use client";

import { isSameDay, isSameMonth, getDay } from "date-fns";
import { cn } from "@/lib/utils";
import type { DashboardGig } from "@/lib/types/shared";
import { MonthViewEventPill } from "./month-view-event-pill";

const MAX_VISIBLE_EVENTS = 3;

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
  const today = new Date();
  const isCurrentMonth = isSameMonth(date, currentMonth);
  const isToday = isSameDay(date, today);
  const isWeekend = getDay(date) === 5 || getDay(date) === 6;
  const dayGigs = gigs.filter((g) =>
    isSameDay(new Date(g.date + "T00:00:00"), date)
  );
  const visibleGigs = dayGigs.slice(0, MAX_VISIBLE_EVENTS);
  const overflowCount = dayGigs.length - MAX_VISIBLE_EVENTS;

  return (
    <div
      className={cn(
        "border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/50",
        !isCurrentMonth && "bg-muted/30 text-muted-foreground",
        isCurrentMonth && isWeekend && "bg-black/[0.02] dark:bg-white/[0.03]"
      )}
      onClick={() => onDayClick(date)}
    >
      <div className="flex items-center justify-center mb-0.5">
        <span
          className={cn(
            "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
            isToday && "bg-primary text-primary-foreground"
          )}
        >
          {date.getDate()}
        </span>
      </div>
      <div className="space-y-1">
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
