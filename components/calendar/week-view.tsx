"use client";

import { useMemo } from "react";
import type { DashboardGig } from "@/lib/types/shared";
import { getWeekDays } from "@/lib/utils/calendar-helpers";
import { WeekViewTimeGrid } from "./week-view-time-grid";
import type { CalendarPlaceholder } from "./calendar-view";

interface WeekViewProps {
  currentDate: Date;
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  selectedGigId: string | null;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onSlotClick: (date: Date, time: string) => void;
  onSlotDrag?: (date: Date, startTime: string, endTime: string, rect: DOMRect) => void;
  placeholder?: CalendarPlaceholder | null;
  onPlaceholderRect?: (rect: DOMRect) => void;
}

export function WeekView({
  currentDate,
  gigs,
  getGigColor,
  selectedGigId,
  onEventClick,
  onSlotClick,
  onSlotDrag,
  placeholder,
  onPlaceholderRect,
}: WeekViewProps) {
  const days = useMemo(() => getWeekDays(currentDate), [currentDate]);

  return (
    <div className="h-full min-h-0 border border-border rounded-lg overflow-hidden bg-background">
      <WeekViewTimeGrid
        days={days}
        gigs={gigs}
        getGigColor={getGigColor}
        selectedGigId={selectedGigId}
        onEventClick={onEventClick}
        onSlotClick={onSlotClick}
        onSlotDrag={onSlotDrag}
        placeholder={placeholder}
        onPlaceholderRect={onPlaceholderRect}
      />
    </div>
  );
}
