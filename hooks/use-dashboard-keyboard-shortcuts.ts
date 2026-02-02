"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook to enable keyboard shortcuts on the dashboard.
 *
 * Shortcuts:
 * - G: Edit gig details (managers only)
 * - P: Open gig pack (all users)
 *
 * Only triggers when NOT typing in inputs/textareas and when a gig is available.
 *
 * @param gigId - The gig ID to navigate to (typically the next gig)
 * @param enabled - Whether shortcuts should be active (default: true)
 * @param isManager - Whether the user is the gig manager/host
 */
export function useDashboardKeyboardShortcuts(
  gigId: string | undefined,
  enabled: boolean = true,
  isManager: boolean = false
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
          if (isManager) {
            e.preventDefault();
            router.push(`/gigs/${gigId}`);
          }
          break;
        case "p":
          e.preventDefault();
          router.push(`/gigs/${gigId}/pack`);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [gigId, enabled, isManager, router]);
}
