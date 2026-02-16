"use client";

import { useState, useCallback, useMemo } from "react";
import { addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarToolbar, type CalendarViewType } from "./calendar-toolbar";
import { useSwipe } from "@/hooks/use-swipe";
import { CalendarSidebar } from "./calendar-sidebar";
import { CalendarSidebarSheet } from "./calendar-sidebar-sheet";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { EventPreviewPopover } from "./event-preview-popover";
import { QuickCreatePopover } from "./quick-create-popover";
import { useCalendarGigs } from "@/hooks/use-calendar-gigs";
import { useCalendarBands } from "@/hooks/use-calendar-bands";
import { useCalendarFilters } from "@/hooks/use-calendar-filters";
import { addHoursToTime } from "@/lib/utils/calendar-helpers";

export interface CalendarPlaceholder {
  date: Date;
  startTime: string;
  endTime: string;
}
import { CalendarImportSheet } from "./calendar-import-sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DashboardGig } from "@/lib/types/shared";

export function CalendarView() {
  const isMobile = useIsMobile();

  // View state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<CalendarViewType>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "3day" : "week"
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importSheetOpen, setImportSheetOpen] = useState(false);

  // Popover state
  const [selectedGig, setSelectedGig] = useState<{
    gig: DashboardGig;
    rect: DOMRect;
  } | null>(null);
  const [quickCreate, setQuickCreate] = useState<{
    date: Date;
    time: string;
    endTime?: string;
    rect: DOMRect | null;
  } | null>(null);

  // Placeholder block state (shown during click-to-create)
  const [placeholder, setPlaceholder] = useState<CalendarPlaceholder | null>(null);

  // Data hooks
  const { data: gigs, isLoading: gigsLoading } = useCalendarGigs(
    currentDate,
    viewType
  );
  const { calendarBands, getGigColor, isLoading: bandsLoading } =
    useCalendarBands();
  const {
    search,
    setSearch,
    hiddenBandIds,
    toggleBand,
    togglePersonal,
    isPersonalHidden,
    filterGigs,
  } = useCalendarFilters();

  // Swipe navigation (mobile)
  const swipeHandlers = useSwipe({
    onSwipeLeft: () =>
      setCurrentDate((d) =>
        viewType === "3day"
          ? addDays(d, 3)
          : viewType === "week"
            ? addWeeks(d, 1)
            : addMonths(d, 1)
      ),
    onSwipeRight: () =>
      setCurrentDate((d) =>
        viewType === "3day"
          ? subDays(d, 3)
          : viewType === "week"
            ? subWeeks(d, 1)
            : subMonths(d, 1)
      ),
  });

  // Filtered gigs
  const filteredGigs = useMemo(
    () => filterGigs(gigs || []),
    [gigs, filterGigs]
  );

  // Handlers
  const handleEventClick = useCallback(
    (gig: DashboardGig, rect: DOMRect) => {
      setQuickCreate(null);
      setPlaceholder(null);
      // Toggle: click same event again to close
      setSelectedGig((prev) =>
        prev && prev.gig.gigId === gig.gigId ? null : { gig, rect }
      );
    },
    []
  );

  const handleSlotClick = useCallback(
    (date: Date, time: string) => {
      setSelectedGig(null);
      const endTime = addHoursToTime(time, 4);
      setPlaceholder({ date, startTime: time, endTime });
      // Anchor rect will be provided by the placeholder block via callback
      setQuickCreate({ date, time, endTime, rect: null });
    },
    []
  );

  const handleSlotDrag = useCallback(
    (date: Date, startTime: string, endTime: string, rect: DOMRect) => {
      setSelectedGig(null);
      setPlaceholder({ date, startTime, endTime });
      setQuickCreate({ date, time: startTime, endTime, rect });
    },
    []
  );

  // Called by WeekViewColumn to provide the placeholder's DOMRect for popover positioning
  const handlePlaceholderRect = useCallback(
    (rect: DOMRect) => {
      setQuickCreate((prev) => prev ? { ...prev, rect } : prev);
    },
    []
  );

  const handleDayClick = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      setViewType("week");
    },
    []
  );

  const handleDateSelectFromSidebar = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      // Close mobile sidebar after selection
      if (isMobile) setSidebarOpen(false);
    },
    [isMobile]
  );

  const closePopovers = useCallback(() => {
    setSelectedGig(null);
    setQuickCreate(null);
    setPlaceholder(null);
  }, []);

  const isLoading = gigsLoading || bandsLoading;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-4 px-4 py-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex-1 flex gap-4">
          <Skeleton className="hidden md:block w-[240px] h-[500px]" />
          <Skeleton className="flex-1 h-[500px]" />
        </div>
      </div>
    );
  }

  // Shared sidebar props
  const sidebarProps = {
    currentDate,
    onDateSelect: handleDateSelectFromSidebar,
    bands: calendarBands,
    gigs: gigs || [],
    search,
    onSearchChange: setSearch,
    hiddenBandIds,
    onToggleBand: toggleBand,
    isPersonalHidden,
    onTogglePersonal: togglePersonal,
  };

  return (
    <div className="h-full flex flex-col px-4 py-3 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Desktop sidebar — pt offsets it below the toolbar so it aligns with the calendar grid */}
        <div className="hidden md:block w-[240px] flex-shrink-0 pt-[48px]">
          <CalendarSidebar {...sidebarProps} />
        </div>

        {/* Mobile sidebar (sheet) */}
        {isMobile && (
          <CalendarSidebarSheet
            open={sidebarOpen}
            onOpenChange={setSidebarOpen}
            viewType={viewType}
            onViewChange={setViewType}
            onImport={() => setImportSheetOpen(true)}
            {...sidebarProps}
          />
        )}

        {/* Calendar column: toolbar + grid */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Toolbar — aligned with the calendar grid */}
          <CalendarToolbar
            currentDate={currentDate}
            viewType={viewType}
            onDateChange={setCurrentDate}
            onViewChange={setViewType}
            onToggleSidebar={() => setSidebarOpen(true)}
            showSidebarToggle={isMobile}
            onImport={() => setImportSheetOpen(true)}
          />

          <div
            className="flex-1 min-h-0"
            onTouchStart={swipeHandlers.onTouchStart}
            onTouchEnd={swipeHandlers.onTouchEnd}
          >
            {viewType === "week" || viewType === "3day" ? (
            <WeekView
              currentDate={currentDate}
              viewType={viewType}
              gigs={filteredGigs}
              getGigColor={getGigColor}
              selectedGigId={selectedGig?.gig.gigId ?? null}
              onEventClick={handleEventClick}
              onSlotClick={handleSlotClick}
              onSlotDrag={handleSlotDrag}
              placeholder={placeholder}
              onPlaceholderRect={handlePlaceholderRect}
            />
          ) : (
            <MonthView
              currentDate={currentDate}
              gigs={filteredGigs}
              getGigColor={getGigColor}
              onEventClick={handleEventClick}
              onDayClick={handleDayClick}
            />
          )}
        </div>
        </div>
      </div>

      {/* Event preview popover */}
      {selectedGig && (
        <EventPreviewPopover
          gig={selectedGig.gig}
          color={getGigColor(selectedGig.gig.bandId)}
          anchorRect={selectedGig.rect}
          onClose={closePopovers}
        />
      )}

      {/* Quick create popover */}
      {quickCreate && (
        <QuickCreatePopover
          date={quickCreate.date}
          time={quickCreate.time}
          endTime={quickCreate.endTime}
          anchorRect={quickCreate.rect}
          bands={calendarBands}
          onClose={closePopovers}
        />
      )}

      {/* Calendar Import Sheet */}
      <CalendarImportSheet
        open={importSheetOpen}
        onOpenChange={setImportSheetOpen}
      />
    </div>
  );
}
