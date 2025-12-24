import { GigScheduleItem } from "@/lib/types";

// Types for parsing results
export interface ParsedScheduleItem {
  time: string; // HH:MM format
  endTime?: string; // Optional end time
  label: string;
  originalText: string; // The original line text for fallback
}

export interface ParsingError {
  originalText: string;
  hint: string;
}

// Time regex patterns - support HH:MM and H:MM formats
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/;

// Dash/colon separators - support various Unicode dashes and colons
const SEPARATOR_PATTERN = /[-–—:]\s*/;

/**
 * Parses a single line of schedule text
 * Returns ParsedScheduleItem if valid, or ParsingError if invalid
 */
export function parseScheduleLine(line: string): ParsedScheduleItem | ParsingError {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      originalText: line,
      hint: "Empty line"
    };
  }

  // Check if line starts with a time
  const timeMatch = trimmed.match(TIME_PATTERN);
  if (!timeMatch) {
    return {
      originalText: line,
      hint: "Line must start with time in HH:MM format"
    };
  }

  const hours = parseInt(timeMatch[1], 10);
  const minutes = parseInt(timeMatch[2], 10);

  // Validate time
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return {
      originalText: line,
      hint: "Invalid time format"
    };
  }

  // Format time consistently (add leading zero if needed)
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Remove time from the beginning
  let remaining = trimmed.substring(timeMatch[0].length).trim();

  // Check if there's a time range (end time)
  let endTime: string | undefined;
  const rangeMatch = remaining.match(/^(\d{1,2}):(\d{2})\s*[-–—]\s*/);
  if (rangeMatch) {
    const endHours = parseInt(rangeMatch[1], 10);
    const endMinutes = parseInt(rangeMatch[2], 10);

    if (endHours >= 0 && endHours <= 23 && endMinutes >= 0 && endMinutes <= 59) {
      endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
      // Remove the end time from remaining text
      remaining = remaining.substring(rangeMatch[0].length).trim();
    }
  }

  // Split by separator and get the description
  const separatorMatch = remaining.match(SEPARATOR_PATTERN);
  let label = remaining;

  if (separatorMatch) {
    // Remove the separator and everything before it
    label = remaining.substring(separatorMatch[0].length).trim();
  }

  // If no separator found, the remaining text after time is the label
  // But if there's no actual description, it's invalid
  if (!label) {
    return {
      originalText: line,
      hint: "Missing description after time"
    };
  }

  return {
    time: timeString,
    endTime,
    label,
    originalText: line
  };
}

/**
 * Parses multiple lines of schedule text
 * Returns object with valid items and errors
 */
export function parseScheduleText(text: string): {
  items: ParsedScheduleItem[];
  errors: ParsingError[];
} {
  const lines = text.split('\n');
  const items: ParsedScheduleItem[] = [];
  const errors: ParsingError[] = [];

  for (const line of lines) {
    const result = parseScheduleLine(line);
    if ('time' in result) {
      items.push(result);
    } else {
      errors.push(result);
    }
  }

  return { items, errors };
}

/**
 * Checks if a parsed item would create a duplicate in the existing schedule
 */
export function isDuplicateItem(
  parsedItem: ParsedScheduleItem,
  existingSchedule: GigScheduleItem[]
): boolean {
  return existingSchedule.some(existing =>
    existing.time === parsedItem.time &&
    existing.label.trim().toLowerCase() === parsedItem.label.trim().toLowerCase()
  );
}

/**
 * Converts parsed items to GigScheduleItem format
 * Generates unique IDs and handles duplicates
 */
export function createScheduleItems(
  parsedItems: ParsedScheduleItem[],
  existingSchedule: GigScheduleItem[] = []
): {
  items: GigScheduleItem[];
  duplicates: ParsedScheduleItem[];
} {
  const items: GigScheduleItem[] = [];
  const duplicates: ParsedScheduleItem[] = [];

  for (const parsed of parsedItems) {
    if (isDuplicateItem(parsed, existingSchedule)) {
      duplicates.push(parsed);
    } else {
      items.push({
        id: crypto.randomUUID(),
        time: parsed.time,
        label: parsed.label
      });
    }
  }

  return { items, duplicates };
}
