"use client";

import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { PERSONAL_GIG_COLOR } from "@/lib/constants/calendar-colors";
import type { CalendarBand } from "@/hooks/use-calendar-bands";
import type { DashboardGig } from "@/lib/types/shared";

interface CalendarSidebarProps {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  bands: CalendarBand[];
  gigs: DashboardGig[];
  search: string;
  onSearchChange: (value: string) => void;
  hiddenBandIds: Set<string>;
  onToggleBand: (bandId: string) => void;
  isPersonalHidden: boolean;
  onTogglePersonal: () => void;
}

export function CalendarSidebar({
  currentDate,
  onDateSelect,
  bands,
  gigs,
  search,
  onSearchChange,
  hiddenBandIds,
  onToggleBand,
  isPersonalHidden,
  onTogglePersonal,
}: CalendarSidebarProps) {
  // Dates that have gigs (for dot indicators on mini calendar)
  const gigDates = useMemo(() => {
    const dates = new Set<string>();
    for (const gig of gigs) {
      dates.add(gig.date);
    }
    return dates;
  }, [gigs]);

  // Check if any personal (no-band) gigs exist
  const hasPersonalGigs = useMemo(
    () => gigs.some((g) => !g.bandId),
    [gigs]
  );

  return (
    <div className="space-y-4">
      {/* Mini calendar */}
      <Calendar
        mode="single"
        selected={currentDate}
        onSelect={(date) => date && onDateSelect(date)}
        modifiers={{
          hasGig: (date) => gigDates.has(date.toISOString().split("T")[0]),
        }}
        modifiersClassNames={{
          hasGig: "after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
        }}
        className="w-full"
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search gigs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Band filters */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
          Bands
        </p>
        <div className="space-y-0.5">
          {bands.map((band) => (
            <label
              key={band.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
            >
              <input
                type="checkbox"
                checked={!hiddenBandIds.has(band.id)}
                onChange={() => onToggleBand(band.id)}
                className="sr-only"
              />
              <span
                className="h-3 w-3 rounded-sm border flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: hiddenBandIds.has(band.id) ? "transparent" : band.color,
                  borderColor: band.color,
                }}
              >
                {!hiddenBandIds.has(band.id) && (
                  <svg viewBox="0 0 12 12" className="h-2 w-2 text-white">
                    <path
                      d="M2 6l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="truncate">{band.name}</span>
            </label>
          ))}

          {/* Personal gigs filter */}
          {hasPersonalGigs && (
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!isPersonalHidden}
                onChange={onTogglePersonal}
                className="sr-only"
              />
              <span
                className="h-3 w-3 rounded-sm border flex-shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: isPersonalHidden ? "transparent" : PERSONAL_GIG_COLOR,
                  borderColor: PERSONAL_GIG_COLOR,
                }}
              >
                {!isPersonalHidden && (
                  <svg viewBox="0 0 12 12" className="h-2 w-2 text-white">
                    <path
                      d="M2 6l3 3 5-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              <span className="truncate text-muted-foreground">Personal</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
