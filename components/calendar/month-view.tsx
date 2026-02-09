"use client";

import { useMemo } from "react";
import type { DashboardGig } from "@/lib/types/shared";
import { getMonthGridDates } from "@/lib/utils/calendar-helpers";
import { MonthViewDayCell } from "./month-view-day-cell";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface MonthViewProps {
  currentDate: Date;
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({
  currentDate,
  gigs,
  getGigColor,
  onEventClick,
  onDayClick,
}: MonthViewProps) {
  const gridDates = useMemo(
    () => getMonthGridDates(currentDate),
    [currentDate]
  );

  return (
    <div className="h-full flex flex-col border border-border rounded-lg overflow-hidden bg-background">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-2 text-center text-sm font-medium text-muted-foreground uppercase border-r border-border last:border-r-0"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells — rows stretch to fill available height */}
      <div
        className="grid grid-cols-7 flex-1"
        style={{ gridAutoRows: "1fr" }}
      >
        {gridDates.map((date) => (
          <MonthViewDayCell
            key={date.toISOString()}
            date={date}
            currentMonth={currentDate}
            gigs={gigs}
            getGigColor={getGigColor}
            onEventClick={onEventClick}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  );
}
