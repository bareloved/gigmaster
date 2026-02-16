"use client";

import { useMemo, useState, useCallback } from "react";
import type { DashboardGig } from "@/lib/types/shared";
import { getMonthGridDates } from "@/lib/utils/calendar-helpers";
import { MonthViewDayCell } from "./month-view-day-cell";
import { MonthViewDaySheet } from "./month-view-day-sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const WEEKDAY_LABELS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_LABELS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

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
  const isMobile = useIsMobile();
  const [sheetDay, setSheetDay] = useState<Date | null>(null);

  const gridDates = useMemo(
    () => getMonthGridDates(currentDate),
    [currentDate]
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      if (isMobile) {
        setSheetDay(date);
      } else {
        onDayClick(date);
      }
    },
    [isMobile, onDayClick]
  );

  return (
    <div className="h-full flex flex-col border border-border rounded-lg overflow-hidden bg-background">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {WEEKDAY_LABELS_FULL.map((label, i) => (
          <div
            key={label + i}
            className="py-1.5 sm:py-2 text-center text-xs sm:text-sm font-medium text-muted-foreground uppercase border-r border-border last:border-r-0"
          >
            <span className="sm:hidden">{WEEKDAY_LABELS_SHORT[i]}</span>
            <span className="hidden sm:inline">{label}</span>
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
            onDayClick={handleDayClick}
          />
        ))}
      </div>

      {/* Mobile day detail sheet */}
      <MonthViewDaySheet
        day={sheetDay}
        gigs={gigs}
        getGigColor={getGigColor}
        onEventClick={onEventClick}
        onClose={() => setSheetDay(null)}
      />
    </div>
  );
}
