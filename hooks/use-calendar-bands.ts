"use client";

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { listUserBands } from "@/lib/api/bands";
import { getColorForIndex, PERSONAL_GIG_COLOR } from "@/lib/constants/calendar-colors";

export interface CalendarBand {
  id: string;
  name: string;
  color: string;
}

/**
 * Load bands with resolved calendar colors.
 * If a band has `calendar_color` set in the DB, use that.
 * Otherwise auto-assign from the palette by index.
 */
export function useCalendarBands() {
  const { user } = useUser();

  const { data: bands, isLoading } = useQuery({
    queryKey: ["bands", user?.id],
    queryFn: listUserBands,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes — bands don't change often
  });

  const calendarBands: CalendarBand[] = useMemo(() => {
    if (!bands) return [];
    return bands.map((band, index) => ({
      id: band.id,
      name: band.name,
      color: band.calendar_color || getColorForIndex(index),
    }));
  }, [bands]);

  // Build a lookup map: bandId -> color
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const band of calendarBands) {
      map.set(band.id, band.color);
    }
    return map;
  }, [calendarBands]);

  /** Get the calendar color for a gig based on its band. */
  const getGigColor = useCallback(
    (bandId: string | null | undefined): string => {
      if (!bandId) return PERSONAL_GIG_COLOR;
      return colorMap.get(bandId) ?? PERSONAL_GIG_COLOR;
    },
    [colorMap]
  );

  return { calendarBands, getGigColor, isLoading };
}
