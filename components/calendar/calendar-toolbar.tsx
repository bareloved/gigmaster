"use client";

import { useRef, useEffect, useState } from "react";
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
  onPrev?: () => void;
  onNext?: () => void;
}

export function CalendarToolbar({
  currentDate,
  viewType,
  onDateChange,
  onViewChange,
  onToggleSidebar,
  showSidebarToggle,
  onImport,
  onPrev,
  onNext,
}: CalendarToolbarProps) {
  function goToday() {
    onDateChange(new Date());
  }

  function goPrev() {
    if (onPrev) {
      onPrev();
    } else {
      onDateChange(
        viewType === "3day"
          ? subDays(currentDate, 3)
          : viewType === "week"
            ? subWeeks(currentDate, 1)
            : subMonths(currentDate, 1)
      );
    }
  }

  function goNext() {
    if (onNext) {
      onNext();
    } else {
      onDateChange(
        viewType === "3day"
          ? addDays(currentDate, 3)
          : viewType === "week"
            ? addWeeks(currentDate, 1)
            : addMonths(currentDate, 1)
      );
    }
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
        <ViewToggle viewType={viewType} onViewChange={onViewChange} />
      </div>
    </div>
    </>
  );
}

/* ── Animated view toggle with sliding pill ── */

const VIEW_OPTIONS: { value: CalendarViewType; label: string; shortLabel: string }[] = [
  { value: "3day", label: "3 Day", shortLabel: "3D" },
  { value: "week", label: "Week", shortLabel: "W" },
  { value: "month", label: "Month", shortLabel: "M" },
];

export function ViewToggle({
  viewType,
  onViewChange,
}: {
  viewType: CalendarViewType;
  onViewChange: (v: CalendarViewType) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<CalendarViewType, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  // Measure active button and position the pill
  useEffect(() => {
    const btn = btnRefs.current.get(viewType);
    const container = containerRef.current;
    if (!btn || !container) return;

    const cRect = container.getBoundingClientRect();
    const bRect = btn.getBoundingClientRect();
    setPill({
      left: bRect.left - cRect.left,
      width: bRect.width,
    });
  }, [viewType]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center rounded-lg border bg-muted p-0.5"
    >
      {/* Sliding pill */}
      {pill && (
        <div
          className="absolute top-0.5 bottom-0.5 rounded-md bg-primary shadow-sm transition-all duration-200 ease-out"
          style={{ left: pill.left, width: pill.width }}
        />
      )}

      {VIEW_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => {
            if (el) btnRefs.current.set(opt.value, el);
          }}
          onClick={() => onViewChange(opt.value)}
          className={`relative z-10 h-7 text-xs px-2 lg:px-3 rounded-md font-medium transition-colors duration-200 ${
            viewType === opt.value
              ? "text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="lg:hidden">{opt.shortLabel}</span>
          <span className="hidden lg:inline">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
