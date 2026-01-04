"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to enable keyboard shortcuts on the dashboard.
 * 
 * Shortcuts:
 * - G: Go to gig details
 * - P: Open gig pack
 * - S: Open setlist (gig details, setlist tab)
 * - F: Open files (gig details, resources tab)
 * 
 * Only triggers when NOT typing in inputs/textareas and when a gig is available.
 * 
 * @param gigId - The gig ID to navigate to (typically the next gig)
 * @param enabled - Whether shortcuts should be active (default: true)
 */
export function useDashboardKeyboardShortcuts(
  gigId: string | undefined,
  enabled: boolean = true
) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || !gigId) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Don't trigger if modifier keys are pressed (Cmd, Ctrl, Alt)
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case "g":
          // G key - Go to gig details
          e.preventDefault();
          router.push(`/gigs/${gigId}`);
          break;
        case "p":
          // P key - Open gig pack
          e.preventDefault();
          router.push(`/gigs/${gigId}/pack`);
          break;
        case "s":
          // S key - Open setlist (gig details, setlist tab)
          e.preventDefault();
          router.push(`/gigs/${gigId}?tab=setlist`);
          break;
        case "f":
          // F key - Open files/resources (gig details, resources tab)
          e.preventDefault();
          router.push(`/gigs/${gigId}?tab=resources`);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [gigId, enabled, router]);
}

