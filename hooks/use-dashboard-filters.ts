"use client";

import { useState, useEffect } from "react";

type RoleFilter = "all" | "hosted" | "playing" | "subbing" | "md";

/**
 * Hook to manage dashboard filter state with localStorage persistence.
 * 
 * Saves the user's preferred role filter (All, Hosted, Playing, etc.)
 * to localStorage so it persists across sessions.
 * 
 * @param userId - The current user's ID for localStorage key
 * @returns [roleFilter, setRoleFilter] - State and setter
 */
export function useDashboardFilters(userId: string | undefined) {
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!userId) return;

    const storageKey = `dashboard_role_filter_${userId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved && isValidRoleFilter(saved)) {
      setRoleFilter(saved as RoleFilter);
    }

    setIsLoaded(true);
  }, [userId]);

  // Save to localStorage when changed
  useEffect(() => {
    if (!userId || !isLoaded) return;

    const storageKey = `dashboard_role_filter_${userId}`;
    localStorage.setItem(storageKey, roleFilter);
  }, [roleFilter, userId, isLoaded]);

  return [roleFilter, setRoleFilter] as const;
}

function isValidRoleFilter(value: string): boolean {
  return ["all", "hosted", "playing", "subbing", "md"].includes(value);
}

