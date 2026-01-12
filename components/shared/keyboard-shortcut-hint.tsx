"use client";

import { useSyncExternalStore } from "react";

// Check if user is on Mac
function getIsMac() {
  if (typeof navigator === 'undefined') return false;
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

// Subscribe function (never changes)
function subscribe() {
  return () => {};
}

/**
 * Displays a keyboard shortcut hint for form submission
 * Shows "⌘ Enter" on Mac or "Ctrl Enter" on Windows/Linux
 */
export function KeyboardShortcutHint() {
  const isMac = useSyncExternalStore(subscribe, getIsMac, () => false);

  return (
    <p className="text-xs text-muted-foreground">
      {isMac ? "⌘" : "Ctrl"} + Enter to submit
    </p>
  );
}

