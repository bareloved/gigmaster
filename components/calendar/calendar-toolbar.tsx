"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Menu } from "lucide-react";
import { format, addWeeks, subWeeks, addMonths, subMonths, addDays, subDays } from "date-fns";

export type CalendarViewType = "week" | "3day" | "month";

interface CalendarToolbarProps {
  currentDate: Date;
  viewType: CalendarViewType;
  onDateChange: (date: Date) => void;
  onViewChange: (view: CalendarViewType) => void;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  onImport?: () => void;
}

export function CalendarToolbar({
  currentDate,
  viewType,
  onDateChange,
  onViewChange,
  onToggleSidebar,
  showSidebarToggle,
  onImport,
}: CalendarToolbarProps) {
  function goToday() {
    onDateChange(new Date());
  }

  function goPrev() {
    onDateChange(
      viewType === "3day"
        ? subDays(currentDate, 3)
        : viewType === "week"
          ? subWeeks(currentDate, 1)
          : subMonths(currentDate, 1)
    );
  }

  function goNext() {
    onDateChange(
      viewType === "3day"
        ? addDays(currentDate, 3)
        : viewType === "week"
          ? addWeeks(currentDate, 1)
          : addMonths(currentDate, 1)
    );
  }

  const title =
    viewType === "week"
      ? format(currentDate, "MMMM yyyy")
      : format(currentDate, "MMMM yyyy");

  return (
    <>
    {/* ===== MOBILE toolbar (below sm) ===== */}
    <div className="sm:hidden flex items-center px-1 relative">
      {showSidebarToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" onClick={goToday}>
        Today
      </Button>
      <h2 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold whitespace-nowrap pointer-events-none">
        {title}
      </h2>
      <div className="flex items-center gap-0.5 ml-auto">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>

    {/* ===== DESKTOP toolbar (sm and above) ===== */}
    <div className="hidden sm:flex relative items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Button variant="outline" size="sm" className="h-8 text-sm" onClick={goToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold pointer-events-none whitespace-nowrap">
        {title}
      </h2>

      <div className="flex items-center gap-1.5 lg:gap-2">
        {onImport && (
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 lg:w-auto lg:px-2.5 lg:gap-1.5"
            onClick={onImport}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline text-xs">Import</span>
          </Button>
        )}
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <Button
            variant={viewType === "3day" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2 lg:px-3"
            onClick={() => onViewChange("3day")}
          >
            <span className="lg:hidden">3D</span>
            <span className="hidden lg:inline">3 Day</span>
          </Button>
          <Button
            variant={viewType === "week" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2 lg:px-3"
            onClick={() => onViewChange("week")}
          >
            <span className="lg:hidden">W</span>
            <span className="hidden lg:inline">Week</span>
          </Button>
          <Button
            variant={viewType === "month" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2 lg:px-3"
            onClick={() => onViewChange("month")}
          >
            <span className="lg:hidden">M</span>
            <span className="hidden lg:inline">Month</span>
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
