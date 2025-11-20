"use client";

import { useEffect, useState } from "react";

/**
 * Displays a keyboard shortcut hint for form submission
 * Shows "⌘ Enter" on Mac or "Ctrl Enter" on Windows/Linux
 */
export function KeyboardShortcutHint() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detect if user is on Mac
    setIsMac(/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform));
  }, []);

  return (
    <p className="text-xs text-muted-foreground">
      {isMac ? "⌘" : "Ctrl"} + Enter to submit
    </p>
  );
}

