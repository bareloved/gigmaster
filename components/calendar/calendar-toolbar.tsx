"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, Menu } from "lucide-react";
import { format, addWeeks, subWeeks, addMonths, subMonths } from "date-fns";

export type CalendarViewType = "week" | "month";

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
      viewType === "week"
        ? subWeeks(currentDate, 1)
        : subMonths(currentDate, 1)
    );
  }

  function goNext() {
    onDateChange(
      viewType === "week"
        ? addWeeks(currentDate, 1)
        : addMonths(currentDate, 1)
    );
  }

  const title =
    viewType === "week"
      ? format(currentDate, "MMMM yyyy")
      : format(currentDate, "MMMM yyyy");

  return (
    <div className="relative flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-2">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <h2 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold pointer-events-none">
        {title}
      </h2>

      <div className="flex items-center gap-2">
        {onImport && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onImport}
          >
            <Download className="h-3.5 w-3.5" />
            Import
          </Button>
        )}
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <Button
            variant={viewType === "week" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewChange("week")}
          >
            Week
          </Button>
          <Button
            variant={viewType === "month" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => onViewChange("month")}
          >
            Month
          </Button>
        </div>
      </div>
    </div>
  );
}
