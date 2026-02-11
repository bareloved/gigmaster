# Calendar Import Redesign

## Problem

The current calendar import is buried in Settings (connection) and a separate `/calendar/import` page (event browsing). The UI wastes space with 8 date presets across 3 lines, verbose event cards, and only supports the user's primary Google Calendar.

## Design

### Location & Trigger

A **Sheet** (right-side drawer, ~480px desktop / full-width mobile) accessible from:

- `/gigs` page — "Import from Calendar" button in the page header
- `/calendar` page — same button

If Google Calendar isn't connected, the sheet body shows a connect prompt: icon, one-liner, and "Connect Google Calendar" button. No benefit lists.

### Sheet Structure

Three stacked sections:

1. **Header** — "Import from Google Calendar" + close button
2. **Controls bar** — Calendar picker, date range dropdown, fetch button. Single row.
3. **Event list** — Scrollable list with sticky batch-import footer.

### Controls Bar (single row)

**Calendar picker (left)** — Multi-select dropdown showing Google calendars with colored dots and checkboxes.

- First connection: auto-fetch calendar list, all unchecked. User picks calendars. Selections saved to DB.
- Return visits: saved calendars pre-selected, events auto-fetch on sheet open. "Change calendars" option at bottom of dropdown to adjust.

**Date range dropdown (middle)** — Grouped presets:

- Future: Next 7 Days, Next 30 Days (default), Next 90 Days, Next Year
- Past: Past 30 Days, Past 90 Days, Past 6 Months, Past Year
- Custom: reveals inline date range pickers as a second row below controls

**Fetch button (right)** — Only shown when selections change. On return visits with saved preferences, events load automatically.

### Event List

**Event card** — compact row:

- Left: checkbox for multi-select
- Center: title (bold), date + time (muted, same line), location (subtitle)
- Right: colored dot matching source calendar

**Already-imported events:**

- Checkbox disabled, row dimmed
- "Imported" badge instead of calendar dot
- Tap navigates to gig pack (closes sheet)

**Batch import footer** — sticky at bottom:

- Visible when 1+ events checked: "3 selected" + "Import All" button
- Hidden or subtle hint when nothing selected
- "Select All / Deselect All" toggle at top of list with event count

**Empty states:**

- No events: "No events found for this period. Try a different date range."
- No calendars selected: "Pick at least one calendar above to see events."

**Post-import:** Cards animate to dimmed/imported state. Toast: "3 gigs imported" with "Undo" action.

### Data Changes

**Google Calendar API:**

- New `listCalendars()` function — calls `calendarList.list()` to fetch user's calendars (id, name, color, primary flag)
- Update `fetchGoogleCalendarEvents()` to accept an array of calendar IDs instead of hardcoded `"primary"`. Fetch from each, merge, sort by date.

**Database:**

- Add `selected_calendars` JSONB column to `calendar_connections` table. Stores array: `[{id: "abc123", name: "Gigs", color: "#7986cb"}]`
- No new table needed — calendar selections are a user preference read/written as a unit.

**New API routes:**

- `GET /api/calendar/calendars` — returns user's Google Calendar list (for picker UI)
- `POST /api/calendar/import-batch` — accepts array of events, runs existing `importCalendarEventAsGig` per event with duplicate detection

### What Stays the Same

- OAuth connection/disconnect flow (stays in Settings)
- `importCalendarEventAsGig` core logic (schedule parsing, duplicate detection, gig creation)
- Conflict detection system
- Token refresh mechanism
- Calendar tab in Settings for connection management

### Migration Path

1. Add `selected_calendars` JSONB column to `calendar_connections`
2. Build `listCalendars()` integration function
3. Build new Sheet component with controls bar + event list
4. Add batch import API route
5. Wire up triggers on `/gigs` and `/calendar` pages
6. Old `/calendar/import` page can redirect to `/calendar` with sheet auto-open, then be removed
