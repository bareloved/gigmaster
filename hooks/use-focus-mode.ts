"use client";

import { useState, useEffect } from "react";

/**
 * Hook to manage Focus Mode state with localStorage persistence.
 * 
 * Focus Mode shows only the Next Gig card and hides distractions.
 * The preference is saved per user in localStorage.
 * 
 * @param userId - The current user's ID for localStorage key
 * @returns [focusMode, setFocusMode] - State and setter
 */
export function useFocusMode(userId: string | undefined) {
  const [focusMode, setFocusMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!userId) return;

    const storageKey = `dashboard_focus_mode_${userId}`;
    const saved = localStorage.getItem(storageKey);

    if (saved !== null) {
      setFocusMode(saved === "true");
    }

    setIsLoaded(true);
  }, [userId]);

  // Save to localStorage when changed
  useEffect(() => {
    if (!userId || !isLoaded) return;

    const storageKey = `dashboard_focus_mode_${userId}`;
    localStorage.setItem(storageKey, String(focusMode));
  }, [focusMode, userId, isLoaded]);

  return [focusMode, setFocusMode] as const;
}

