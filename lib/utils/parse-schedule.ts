/**
 * Parse schedule information from calendar event descriptions
 * Supports both English and Hebrew
 */

// English schedule terms
const ENGLISH_TERMS = [
  'arrival',
  'load-in',
  'load in',
  'loadIn',
  'soundcheck',
  'sound check',
  'doors',
  'doors open',
  'showtime',
  'show time',
  'set time',
  'performance',
  'start',
  'food',
  'dinner',
  'lunch',
  'meal',
  'break',
  'setup',
  'tear down',
  'teardown',
];

// Hebrew schedule terms
const HEBREW_TERMS = [
  'הגעה', // arrival
  'טעינה', // load-in
  'סאונדצ\'ק', // soundcheck
  'סאונד צ\'ק',
  'פתיחת דלתות', // doors open
  'דלתות', // doors
  'מופע', // show/performance
  'הופעה',
  'התחלה', // start
  'אוכל', // food
  'ארוחה', // meal
  'ארוחת ערב', // dinner
  'ארוחת צהריים', // lunch
  'הפסקה', // break
  'סט', // set
  'בניה', // setup
  'פירוק', // tear down
];

// Time patterns - comprehensive list to catch all formats
const TIME_PATTERNS = [
  // 24-hour with colon: 18:00, 09:30, 9:00, 00:00
  /\b(\d{1,2}):(\d{2})\b/,
  
  // 12-hour with am/pm (various formats):
  // 6pm, 6:30pm, 6 pm, 6:30 pm, 6PM, 6:30PM, 6 PM, 6:30 PM
  /\b(\d{1,2}):?(\d{2})?\s?(am|pm|AM|PM|Am|Pm)\b/,
  
  // Hebrew-style with prefix: בשעה 18:00
  /בשעה\s+(\d{1,2}):(\d{2})/,
  
  // With dot separator: 18.00, 9.30
  /\b(\d{1,2})\.(\d{2})\b/,
  
  // With dash/hyphen: 18-00, 9-30 (less common but seen)
  /\b(\d{1,2})-(\d{2})\b/,
];

export interface ScheduleParseResult {
  schedule: string | null; // Extracted schedule lines
  remainingText: string; // Description without schedule
}

/**
 * Parse schedule information from event description
 * Extracts lines containing schedule terms and times
 */
export function parseScheduleFromDescription(description: string | undefined): ScheduleParseResult {
  if (!description || description.trim() === '') {
    return {
      schedule: null,
      remainingText: '',
    };
  }

  const lines = description.split('\n').map(line => line.trim());
  const scheduleLines: string[] = [];
  const remainingLines: string[] = [];

  for (const line of lines) {
    if (isScheduleLine(line)) {
      scheduleLines.push(line);
    } else {
      remainingLines.push(line);
    }
  }

  return {
    schedule: scheduleLines.length > 0 ? scheduleLines.join('\n') : null,
    remainingText: remainingLines.join('\n').trim(),
  };
}

/**
 * Check if a line contains schedule information
 * NEW APPROACH: Any line with a time is considered a schedule line
 */
function isScheduleLine(line: string): boolean {
  if (!line || line.trim() === '') {
    return false;
  }

  // Check if line contains any time pattern
  const hasTime = TIME_PATTERNS.some(pattern => pattern.test(line));
  
  // If it has a time, it's a schedule line - that's it!
  // We don't require specific keywords anymore
  return hasTime;
}

/**
 * Format schedule for display
 * Groups related schedule items together
 */
export function formatSchedule(schedule: string | null): string {
  if (!schedule) {
    return '';
  }

  const lines = schedule.split('\n').filter(line => line.trim());
  
  // Just return lines as-is, properly formatted
  return lines.join('\n');
}

/**
 * Extract individual schedule items with times
 * Useful for displaying schedule in a structured format
 */
export interface ScheduleItem {
  term: string; // e.g., "Load-in", "הגעה"
  time: string; // e.g., "6:00 PM", "18:00"
  rawLine: string; // Original line
}

export function extractScheduleItems(schedule: string | null): ScheduleItem[] {
  if (!schedule) {
    return [];
  }

  const lines = schedule.split('\n').filter(line => line.trim());
  const items: ScheduleItem[] = [];

  for (const line of lines) {
    // Try to extract term and time
    const timeMatch = TIME_PATTERNS.map(pattern => line.match(pattern)).find(m => m);
    
    if (timeMatch) {
      // Extract the time string
      const time = timeMatch[0];
      
      // The rest is the term (remove the time part)
      let term = line.replace(time, '').trim();
      
      // Clean up common separators
      term = term.replace(/^[-:]\s*/, '').replace(/\s*[-:]\s*$/, '');
      
      items.push({
        term,
        time,
        rawLine: line,
      });
    }
  }

  return items;
}

