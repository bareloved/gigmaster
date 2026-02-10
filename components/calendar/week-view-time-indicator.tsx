"use client";

import { useEffect, useState } from "react";
import { getCurrentTimePosition } from "@/lib/utils/calendar-helpers";

/**
 * Red horizontal line showing the current time in the week view.
 * Updates every 60 seconds.
 */
export function WeekViewTimeIndicator() {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      setTop(getCurrentTimePosition());
    }
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (top === null) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-20"
      style={{ top }}
    >
      <div className="flex items-center">
        <div className="h-2.5 w-2.5 -ml-1 rounded-full bg-red-500" />
        <div className="h-[2px] flex-1 bg-red-500" />
      </div>
    </div>
  );
}
