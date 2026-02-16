"use client";

import { format, isSameDay, getDay } from "date-fns";
import { cn } from "@/lib/utils";

interface WeekViewHeaderProps {
  days: Date[];
}

export function WeekViewHeader({ days }: WeekViewHeaderProps) {
  const today = new Date();

  return (
    <div className="flex border-b border-border">
      {/* Spacer matching the time gutter width */}
      <div className="w-10 sm:w-14 flex-shrink-0 border-r border-border" />

      {/* Day columns */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map((day) => {
          const dayIsToday = isSameDay(day, today);
          const dow = getDay(day);
          const dayIsWeekend = dow === 5 || dow === 6; // Fri + Sat
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "py-2 text-center border-r border-border last:border-r-0",
                dayIsWeekend && "bg-black/[0.02] dark:bg-white/[0.03]",
                dayIsToday && "bg-primary/5"
              )}
            >
              <p
                className={cn(
                  "text-xs uppercase",
                  dayIsWeekend
                    ? "text-red-400 dark:text-red-500 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {format(day, "EEE")}
              </p>
              <p
                className={cn(
                  "text-lg sm:text-2xl font-light mt-0.5",
                  dayIsWeekend && !dayIsToday && "text-red-400 dark:text-red-500",
                  dayIsToday &&
                    "bg-primary text-primary-foreground rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center mx-auto text-sm sm:text-base font-medium"
                )}
              >
                {format(day, "d")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
