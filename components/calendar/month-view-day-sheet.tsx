"use client";

import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DashboardGig } from "@/lib/types/shared";
import { eventBgColor, eventTextColor } from "@/lib/utils/calendar-helpers";
import { useTheme } from "@/lib/providers/theme-provider";
import { useRouter } from "next/navigation";
import { MapPin, Clock } from "lucide-react";

interface MonthViewDaySheetProps {
  day: Date | null;
  gigs: DashboardGig[];
  getGigColor: (bandId: string | null | undefined) => string;
  onEventClick: (gig: DashboardGig, rect: DOMRect) => void;
  onClose: () => void;
}

export function MonthViewDaySheet({
  day,
  gigs,
  getGigColor,
  onEventClick,
  onClose,
}: MonthViewDaySheetProps) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();

  const dayGigs = useMemo(() => {
    if (!day) return [];
    return gigs.filter((g) =>
      isSameDay(new Date(g.date.slice(0, 10) + "T00:00:00"), day)
    );
  }, [day, gigs]);

  function formatTime(time: string | null) {
    if (!time) return null;
    const [h, m] = time.split(":");
    const hour = parseInt(h, 10);
    const suffix = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${suffix}`;
  }

  return (
    <Sheet open={!!day} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-h-[60vh] rounded-t-xl px-4 pb-8 pt-6">
        <SheetHeader className="mb-3">
          <SheetTitle className="text-base">
            {day ? format(day, "EEEE, MMMM d") : ""}
          </SheetTitle>
          <SheetDescription className="sr-only">Events for this day</SheetDescription>
        </SheetHeader>

        {dayGigs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No events this day
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {dayGigs.map((gig) => {
              const color = getGigColor(gig.bandId);
              return (
                <button
                  key={gig.gigId}
                  className="flex items-start gap-3 w-full rounded-lg px-3 py-2.5 text-left hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: eventBgColor(color, isDark) }}
                  onClick={() => router.push(`/gigs/${gig.gigId}`)}
                >
                  <span
                    className="h-3 w-3 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: eventTextColor(color, isDark) }}
                    >
                      {gig.gigTitle}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {gig.startTime && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatTime(gig.startTime)}
                          {gig.endTime && ` - ${formatTime(gig.endTime)}`}
                        </span>
                      )}
                      {gig.locationName && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {gig.locationName}
                        </span>
                      )}
                    </div>
                    {gig.bandName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {gig.bandName}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
