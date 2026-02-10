"use client";

import type { DashboardGig } from "@/lib/types/shared";
import { eventBgColor, eventTextColor } from "@/lib/utils/calendar-helpers";
import { useTheme } from "@/lib/providers/theme-provider";
import { startMarquee, stopMarquee } from "@/lib/utils/marquee";

interface MonthViewEventPillProps {
  gig: DashboardGig;
  color: string;
  onClick: (gig: DashboardGig, rect: DOMRect) => void;
}

export function MonthViewEventPill({ gig, color, onClick }: MonthViewEventPillProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      data-calendar-event
      className="flex items-center gap-1.5 w-full rounded px-1.5 py-2 text-left hover:opacity-80 cursor-pointer"
      style={{ backgroundColor: eventBgColor(color, isDark) }}
      onMouseEnter={(e) => startMarquee(e.currentTarget)}
      onMouseLeave={(e) => stopMarquee(e.currentTarget)}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onClick(gig, rect);
      }}
    >
      <span
        className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="overflow-hidden min-w-0 flex-1">
        <span
          data-scroll
          className="block text-xs font-medium leading-tight whitespace-nowrap"
          style={{ color: eventTextColor(color, isDark) }}
        >
          {gig.gigTitle}
        </span>
      </span>
    </button>
  );
}
