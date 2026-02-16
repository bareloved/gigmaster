"use client";

import { useEffect, useRef } from "react";
import { isSameDay, getDay } from "date-fns";
import type { DashboardGig } from "@/lib/types/shared";
import { WeekViewHeader } from "./week-view-header";
import { WeekViewAllDay } from "./week-view-all-day";
import { WeekViewColumn } from "./week-view-column";
import { WeekViewTimeIndicator } from "./week-view-time-indicator";
import {
  getTimeSlots,
  HOUR_HEIGHT,
  GRID_HEIGHT,
  isToday,
} from "@/lib/utils/calendar-helpers";
import type { CalendarPlaceholder } from "./calendar-view";

interface WeekViewTimeGridProps {
  days: Date[];
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  selectedGigId: string | null;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onSlotClick: (date: Date, time: string) => void;
  onSlotDrag?: (date: Date, startTime: string, endTime: string, rect: DOMRect) => void;
  placeholder?: CalendarPlaceholder | null;
  onPlaceholderRect?: (rect: DOMRect) => void;
}

export function WeekViewTimeGrid({
  days,
  gigs,
  getGigColor,
  selectedGigId,
  onEventClick,
  onSlotClick,
  onSlotDrag,
  placeholder,
  onPlaceholderRect,
}: WeekViewTimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeSlots = getTimeSlots();

  // Always show all 7 days (swipe navigates full weeks)
  const visibleDays = days;
  const colCount = visibleDays.length;

  // Auto-scroll to 8 AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = HOUR_HEIGHT * 8;
    }
  }, []);

  // Group gigs by day
  function gigsForDay(day: Date): DashboardGig[] {
    return gigs.filter((g) =>
      isSameDay(new Date(g.date + "T00:00:00"), day)
    );
  }

  // Check if any day in the week is today (for the time indicator)
  const todayIndex = visibleDays.findIndex((d) => isToday(d));

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto overflow-x-hidden"
    >
      {/* Sticky header — stays pinned inside the scroll container */}
      <div className="sticky top-0 z-20 bg-background">
        <WeekViewHeader days={visibleDays} />
        <WeekViewAllDay
          days={visibleDays}
          gigs={gigs}
          getGigColor={getGigColor}
          onEventClick={onEventClick}
        />
      </div>

      {/* Time grid body */}
      <div className="flex" style={{ minHeight: GRID_HEIGHT }}>
        {/* Time gutter */}
        <div className="w-10 sm:w-14 flex-shrink-0 border-r border-border">
          {timeSlots.map((slot, i) => (
            <div
              key={i}
              className="relative"
              style={{ height: HOUR_HEIGHT / 2 }}
            >
              {slot.label && (
                <span className="absolute -top-2 right-2 text-[10px] text-muted-foreground select-none">
                  {slot.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}>
          {visibleDays.map((day, i) => (
            <div
              key={day.toISOString()}
              className="relative border-r border-border last:border-r-0"
            >
              <WeekViewColumn
                date={day}
                gigs={gigsForDay(day)}
                getGigColor={getGigColor}
                selectedGigId={selectedGigId}
                onEventClick={onEventClick}
                onSlotClick={onSlotClick}
                onSlotDrag={onSlotDrag}
                isWeekend={getDay(day) === 5 || getDay(day) === 6}
                placeholder={placeholder && isSameDay(placeholder.date, day) ? placeholder : null}
                onPlaceholderRect={onPlaceholderRect}
              />
              {/* Time indicator only on today's column */}
              {i === todayIndex && <WeekViewTimeIndicator />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
