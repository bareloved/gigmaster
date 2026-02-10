/**
 * Calendar layout helpers for the custom week/month views.
 */
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
  format,
  addMinutes,
} from "date-fns";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Pixels per hour in the week time grid */
export const HOUR_HEIGHT = 60;

/** First visible hour (inclusive) */
export const DAY_START_HOUR = 0;

/** Last visible hour (exclusive) — grid shows 0:00–24:00 */
export const DAY_END_HOUR = 24;

/** Total grid height in px */
export const GRID_HEIGHT = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

/** Minimum event block height in px */
export const MIN_EVENT_HEIGHT = 24;

// ============================================================================
// EVENT POSITIONING (week view)
// ============================================================================

export interface EventPosition {
  top: number;
  height: number;
  isAllDay: boolean;
}

/**
 * Calculate the top offset and height of an event block in the week time grid.
 * Times are "HH:mm" strings (24h format).
 */
export function getEventPosition(
  startTime: string | null,
  endTime: string | null
): EventPosition {
  // No start time → all-day event
  if (!startTime) {
    return { top: 0, height: 0, isAllDay: true };
  }

  const [startH, startM] = startTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;

  let endMinutes: number;
  if (endTime) {
    const [endH, endM] = endTime.split(":").map(Number);
    endMinutes = endH * 60 + endM;
  } else {
    // Default: 2-hour duration
    endMinutes = startMinutes + 120;
  }

  // Clamp to visible range
  const visibleStart = DAY_START_HOUR * 60;
  const visibleEnd = DAY_END_HOUR * 60;
  const clampedStart = Math.max(startMinutes, visibleStart);
  const clampedEnd = Math.min(endMinutes, visibleEnd);

  const top = ((clampedStart - visibleStart) / 60) * HOUR_HEIGHT;
  const height = Math.max(
    ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT,
    MIN_EVENT_HEIGHT
  );

  return { top, height, isAllDay: false };
}

/**
 * Convert a y-position click into hours/minutes (inverse of getEventPosition).
 */
export function yPositionToTime(y: number): { hours: number; minutes: number } {
  const totalMinutes = (y / HOUR_HEIGHT) * 60 + DAY_START_HOUR * 60;
  // Round to nearest 30 minutes
  const rounded = Math.round(totalMinutes / 30) * 30;
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  return { hours: Math.min(hours, DAY_END_HOUR - 1), minutes };
}

/**
 * Convert a y-position to hours/minutes snapped to 15-min increments.
 * Used by drag-to-create for finer granularity than the 30-min click snap.
 */
export function yPositionToTime15(y: number): { hours: number; minutes: number } {
  const totalMinutes = (y / HOUR_HEIGHT) * 60 + DAY_START_HOUR * 60;
  const rounded = Math.round(totalMinutes / 15) * 15;
  const clamped = Math.max(0, Math.min(rounded, DAY_END_HOUR * 60));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return { hours: Math.min(hours, DAY_END_HOUR), minutes };
}

/**
 * Get the current time position (px from top of grid) for the red "now" line.
 * Returns null if current time is outside visible range.
 */
export function getCurrentTimePosition(): number | null {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const visibleStart = DAY_START_HOUR * 60;
  const visibleEnd = DAY_END_HOUR * 60;

  if (minutes < visibleStart || minutes > visibleEnd) return null;

  return ((minutes - visibleStart) / 60) * HOUR_HEIGHT;
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get the 7 days of the week containing `date` (Sun–Sat).
 */
export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 });
  const end = endOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

/**
 * Get all dates in the month grid (includes leading/trailing days from adjacent months
 * to fill complete weeks). Returns 35 or 42 cells.
 */
export function getMonthGridDates(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: gridStart, end: gridEnd });
}

/**
 * Generate half-hour time slot labels for the time gutter.
 */
export function getTimeSlots(): { label: string; hour: number; minute: number }[] {
  const slots: { label: string; hour: number; minute: number }[] = [];
  let current = new Date(2000, 0, 1, DAY_START_HOUR, 0);
  const end = new Date(2000, 0, 1, DAY_END_HOUR, 0);

  while (current < end) {
    const hour = current.getHours();
    const minute = current.getMinutes();
    slots.push({
      label: minute === 0 ? format(current, "HH:mm") : "",
      hour,
      minute,
    });
    current = addMinutes(current, 30);
  }

  return slots;
}

// ============================================================================
// OVERLAP LAYOUT ALGORITHM
// ============================================================================

export interface LayoutSlot {
  column: number;
  totalColumns: number;
}

/**
 * Given a list of events with start/end minutes, compute their column placement
 * so overlapping events share horizontal space. Simple greedy approach.
 */
export function computeOverlapLayout(
  events: { startMinutes: number; endMinutes: number }[]
): LayoutSlot[] {
  if (events.length === 0) return [];

  // Sort by start time, then by longer duration first
  const indexed = events.map((e, i) => ({ ...e, index: i }));
  indexed.sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // Greedy column assignment
  const columns: number[] = new Array(events.length).fill(0);
  const columnEnds: number[] = []; // End time of each column

  for (const event of indexed) {
    // Find first column where the event fits
    let placed = false;
    for (let col = 0; col < columnEnds.length; col++) {
      if (event.startMinutes >= columnEnds[col]) {
        columns[event.index] = col;
        columnEnds[col] = event.endMinutes;
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns[event.index] = columnEnds.length;
      columnEnds.push(event.endMinutes);
    }
  }

  const totalColumns = columnEnds.length;
  return events.map((_, i) => ({
    column: columns[i],
    totalColumns,
  }));
}

/**
 * Add hours to a "HH:mm" time string. Clamps result to 23:59.
 * Example: addHoursToTime("14:00", 4) → "18:00"
 */
export function addHoursToTime(time: string, hours: number): string {
  const totalMinutes = timeToMinutes(time) + hours * 60;
  const clamped = Math.min(totalMinutes, 23 * 60 + 59);
  return formatTimeHHMM(Math.floor(clamped / 60), clamped % 60);
}

/**
 * Parse "HH:mm" time string to total minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Format hours/minutes as "HH:mm" string.
 */
export function formatTimeHHMM(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/**
 * Darken a hex color by mixing it toward black.
 * `amount` 0 = no change, 1 = fully black. 0.35 is a good default for readable text.
 */
export function darkenColor(hex: string, amount = 0.25): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - amount));
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - amount));
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Create a solid light tint of a color by mixing it toward white.
 * Returns an opaque color (no transparency) so it fully covers grid lines.
 * `amount` 0 = original color, 1 = pure white. 0.85 gives a soft pastel.
 */
export function lightenColor(hex: string, amount = 0.85): string {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * amount);
  const g = Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * amount);
  const b = Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * Theme-aware event background color.
 * Light mode: soft pastel (85% toward white).
 * Dark mode: deep muted tone (70% toward black).
 */
export function eventBgColor(hex: string, isDark: boolean): string {
  return isDark ? darkenColor(hex, 0.7) : lightenColor(hex, 0.85);
}

/**
 * Theme-aware event text color.
 * Light mode: darkened color for contrast on pastel background.
 * Dark mode: lightened color for contrast on deep background.
 */
export function eventTextColor(hex: string, isDark: boolean): string {
  return isDark ? lightenColor(hex, 0.5) : darkenColor(hex, 0.25);
}
