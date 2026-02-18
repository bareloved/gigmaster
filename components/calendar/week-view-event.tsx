"use client";

import { format, parse } from "date-fns";
import type { DashboardGig } from "@/lib/types/shared";
import { eventBgColor, eventTextColor } from "@/lib/utils/calendar-helpers";
import { useTheme } from "@/lib/providers/theme-provider";
import { startMarquee, stopMarquee } from "@/lib/utils/marquee";

interface WeekViewEventProps {
  gig: DashboardGig;
  color: string;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
  isSelected: boolean;
  onClick: (gig: DashboardGig, rect: DOMRect) => void;
}

function formatTime24(time: string): string {
  try {
    const d = parse(time, "HH:mm:ss", new Date());
    return format(d, "HH:mm");
  } catch {
    try {
      const d = parse(time, "HH:mm", new Date());
      return format(d, "HH:mm");
    } catch {
      return time;
    }
  }
}

export function WeekViewEvent({
  gig,
  color,
  top,
  height,
  column,
  totalColumns,
  isSelected,
  onClick,
}: WeekViewEventProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const isCompact = height < 40;
  const needsResponse = gig.isPlayer && (gig.invitationStatus === 'invited' || gig.invitationStatus === 'pending');
  const widthPercent = 100 / totalColumns;
  const leftPercent = column * widthPercent;

  const textColor = isSelected ? "#fff" : eventTextColor(color, isDark);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onClick(gig, rect);
  }

  return (
    <button
      data-calendar-event
      className={`absolute z-10 cursor-pointer overflow-hidden rounded-md border text-left transition-all hover:shadow-md ${needsResponse ? 'opacity-60' : ''}`}
      onMouseEnter={(e) => startMarquee(e.currentTarget)}
      onMouseLeave={(e) => stopMarquee(e.currentTarget)}
      style={{
        top,
        height,
        left: `calc(${leftPercent}% + 2px)`,
        width: `calc(${widthPercent}% - 4px)`,
        backgroundColor: isSelected ? color : eventBgColor(color, isDark),
        borderColor: isSelected ? color : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
      }}
      onClick={handleClick}
    >
      {/* Left accent stripe — hidden when selected (whole block is colored) */}
      {!isSelected && (
        <div
          className="absolute inset-y-0 left-0 w-1 rounded-l-md"
          style={{ backgroundColor: color }}
        />
      )}

      <div className={isSelected ? "pl-2 pr-1 py-1 h-full" : "pl-2.5 pr-1 py-1 h-full"}>
        {isCompact ? (
          <div className="overflow-hidden">
            <p data-scroll className="whitespace-nowrap text-xs font-medium" style={{ color: textColor }}>
              {gig.startTime && (
                <span className="opacity-90">{formatTime24(gig.startTime)} </span>
              )}
              {gig.gigTitle}
            </p>
          </div>
        ) : (
          <>
            {gig.startTime && (
              <p className="text-[10px] leading-tight opacity-90" style={{ color: textColor }}>
                {formatTime24(gig.startTime)}
                {gig.endTime && ` - ${formatTime24(gig.endTime)}`}
              </p>
            )}
            <div className="overflow-hidden mt-0.5">
              <p
                data-scroll
                className="whitespace-nowrap text-xs font-semibold leading-tight"
                style={{ color: textColor }}
              >
                {gig.gigTitle}
              </p>
            </div>
            {!isCompact && gig.locationName && (
              <div className="overflow-hidden mt-0.5">
                <p
                  data-scroll
                  className="whitespace-nowrap text-[10px] leading-tight opacity-90"
                  style={{ color: textColor }}
                >
                  {gig.locationName}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </button>
  );
}
