"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { DashboardGig } from "@/lib/types/shared";

const STORAGE_KEY = "gigmaster-calendar-hidden-bands";

/**
 * Manages calendar filter state: search text + hidden band IDs.
 * Hidden bands are persisted to localStorage.
 */
export function useCalendarFilters() {
  const [search, setSearch] = useState("");
  const [hiddenBandIds, setHiddenBandIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setHiddenBandIds(new Set(ids));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage whenever hidden bands change
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(hiddenBandIds))
      );
    } catch {
      // ignore
    }
  }, [hiddenBandIds, loaded]);

  const toggleBand = useCallback((bandId: string) => {
    setHiddenBandIds((prev) => {
      const next = new Set(prev);
      if (next.has(bandId)) {
        next.delete(bandId);
      } else {
        next.add(bandId);
      }
      return next;
    });
  }, []);

  /** Special key for "personal" (no-band) gigs */
  const isPersonalHidden = hiddenBandIds.has("__personal__");
  const togglePersonal = useCallback(() => {
    toggleBand("__personal__");
  }, [toggleBand]);

  const isBandVisible = useCallback(
    (bandId: string | null | undefined): boolean => {
      if (!bandId) return !isPersonalHidden;
      return !hiddenBandIds.has(bandId);
    },
    [hiddenBandIds, isPersonalHidden]
  );

  /** Filter gigs by search text and band visibility */
  const filterGigs = useCallback(
    (gigs: DashboardGig[]): DashboardGig[] => {
      return gigs.filter((gig) => {
        // Band visibility
        if (!isBandVisible(gig.bandId)) return false;

        // Search text
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchesTitle = gig.gigTitle.toLowerCase().includes(q);
          const matchesVenue = gig.locationName?.toLowerCase().includes(q);
          const matchesBand = gig.projectName?.toLowerCase().includes(q);
          if (!matchesTitle && !matchesVenue && !matchesBand) return false;
        }

        return true;
      });
    },
    [search, isBandVisible]
  );

  return {
    search,
    setSearch,
    hiddenBandIds,
    toggleBand,
    togglePersonal,
    isPersonalHidden,
    isBandVisible,
    filterGigs,
  };
}
