# Step 16 – Calendar Import Enhancements (Phase 1.6)

**Status:** ✅ COMPLETE  
**Date:** November 18, 2025  
**Dependencies:** Step 15 (Calendar Integration Phase 1.5)

---

## Overview & Goals

Enhance the Google Calendar import functionality to extract richer information from calendar events, making imported gigs immediately useful with minimal manual editing. This phase focuses on intelligent parsing and data extraction.

### Key Objectives

1. **Parse Schedule from Event Description**
   - Automatically extract lines with times (load-in, soundcheck, doors, etc.)
   - Support multiple time formats (12h/24h, various separators)
   - Support English and Hebrew text
   
2. **Separate Notes from Schedule**
   - Split event descriptions into structured schedule vs general notes
   - Preserve both for display and editing

3. **Import Attendees as People**
   - Extract attendees from calendar events
   - Match to existing Ensemble users by email
   - Create gig roles for each attendee
   - Map response status (accepted/declined/tentative)

4. **Flexible Date Range Selection**
   - Remove 30-day limit
   - Allow users to import past or future events
   - Provide preset date ranges for convenience

5. **Enhanced UI for Review**
   - Collapsible event details before import
   - Show parsed schedule, notes, and attendees
   - Debug info for transparency

---

## What We Built

### 1. Enhanced Schedule Parsing (`lib/utils/parse-schedule.ts`)

**Flexible Time Recognition:**
- `18:00`, `9:00`, `09:30` (24-hour with colon)
- `6pm`, `6:30 PM`, `6 PM` (12-hour with am/pm)
- `18.00`, `9.30` (dot separator)
- `18-00`, `9-30` (dash separator)
- `בשעה 18:00` (Hebrew prefix)

**Parsing Logic:**
```typescript
// NEW APPROACH: Any line with a time = schedule line
function isScheduleLine(line: string): boolean {
  // Check if line contains any time pattern
  const hasTime = TIME_PATTERNS.some(pattern => pattern.test(line));
  return hasTime; // No keywords required!
}
```

**Key Functions:**
- `parseScheduleFromDescription()` - Splits description into schedule + notes
- `extractScheduleItems()` - Extracts structured schedule items with terms and times
- `formatSchedule()` - Formats schedule for display

### 2. Attendee Matching (`lib/utils/match-attendees.ts`)

**Automatic User Matching:**
- Queries `profiles` table by email
- Links attendees to existing Ensemble users
- Preserves response status from Google Calendar
- **Does NOT automatically add to My Circle** (user decides manually)

**Key Functions:**
- `matchAttendeesToUsers()` - Matches attendees to Ensemble users
- `mapResponseStatus()` - Maps Google Calendar status to Ensemble status

```typescript
export function mapResponseStatus(
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction'
): 'confirmed' | 'declined' | 'invited' {
  switch (responseStatus) {
    case 'accepted':
      return 'confirmed';
    case 'declined':
      return 'declined';
    default:
      return 'invited';
  }
}
```

### 3. Database Changes

**Migration:** `supabase/migrations/20241118103935_add_gig_notes_schedule.sql`

```sql
-- Add notes and schedule columns to gigs table
ALTER TABLE gigs ADD COLUMN notes TEXT;
ALTER TABLE gigs ADD COLUMN schedule TEXT;

-- Add index for searching notes
CREATE INDEX idx_gigs_notes ON gigs 
  USING gin(to_tsvector('english', notes)) 
  WHERE notes IS NOT NULL;
```

### 4. Enhanced Import API (`lib/api/calendar-google.ts`)

**Updated `importCalendarEventAsGig()`:**
- Parses event description for schedule/notes
- Creates gig with notes and schedule fields populated
- Imports attendees as `gig_roles` with default "Player" role
- Links attendees to existing users (if found)
- Maps Google Calendar response status to Ensemble invitation status

```typescript
// Parse schedule from description
const { schedule, remainingText } = parseScheduleFromDescription(event.description);

// Create gig with notes and schedule
const { data: gig } = await supabase
  .from("gigs")
  .insert({
    // ...
    notes: remainingText || null,
    schedule: schedule || null,
    // ...
  });

// Import attendees as GigRoles
if (event.attendees) {
  const matchedAttendees = await matchAttendeesToUsers(event.attendees);
  const roleInserts = matchedAttendees.map(attendee => ({
    gig_id: gig.id,
    role_name: "Player",
    musician_name: attendee.displayName || attendee.email,
    musician_id: attendee.userId || null,
    invitation_status: mapResponseStatus(attendee.responseStatus),
  }));
  await supabase.from("gig_roles").insert(roleInserts);
}
```

### 5. Import UI Enhancements (`app/(app)/calendar/import/page.tsx`)

**Date Range Picker:**
- Preset buttons: Next 7/30/90 days, Next year, Past 30/90 days
- Custom date range with dual calendars
- No hardcoded limits

**Collapsible Event Details:**
- "Show Details" / "Hide Details" button per event
- Displays:
  - **Attendees** with response status badges
  - **Schedule** (parsed items with times)
  - **Description/Notes** (remaining text)
  - **Debug Info** (temporary, for testing)

```tsx
{isExpanded && (
  <div className="px-4 pb-4 space-y-4 border-t pt-4 bg-gray-50/50">
    {/* Attendees */}
    {event.attendees && (
      <div>
        <p className="text-sm font-semibold">Attendees ({event.attendees.length})</p>
        {event.attendees.map(attendee => (
          <div>
            <span>{attendee.displayName || attendee.email}</span>
            <Badge>{attendee.responseStatus}</Badge>
          </div>
        ))}
      </div>
    )}
    
    {/* Schedule */}
    {scheduleItems.length > 0 && (
      <div>
        <p className="text-sm font-semibold">Schedule</p>
        {scheduleItems.map(item => (
          <div>
            <span className="font-mono">{item.time}</span>
            <span>{item.term}</span>
          </div>
        ))}
      </div>
    )}
    
    {/* Description/Notes */}
    {parsedSchedule?.remainingText && (
      <div>
        <p className="text-sm font-semibold">Description</p>
        <p>{parsedSchedule.remainingText}</p>
      </div>
    )}
  </div>
)}
```

### 6. Display on Gig Pages

**Gig Detail Page** (`app/(app)/gigs/[id]/page.tsx`):
- Schedule section with monospace display
- Notes section with formatted text
- Icons: `ClipboardList` for schedule, `FileText` for notes

**Gig Pack Page** (`app/(app)/gigs/[id]/pack/page.tsx`):
- Schedule and notes in Logistics card
- Same display format as detail page

### 7. Gig Forms (`components/create-gig-dialog.tsx`, `edit-gig-dialog.tsx`)

**Added Fields:**
- **Schedule textarea:**
  - Monospace font for readability
  - Placeholder with example format
  - Helper text: "Any line with a time will be recognized"
  - 4 rows
  
- **Notes textarea:**
  - Regular textarea
  - Placeholder: "Additional notes, instructions..."
  - 4 rows

**Form Integration:**
- Both create and edit forms now include schedule and notes
- Values saved/updated through `createGig()` and `updateGig()` APIs
- Edit form pre-populates with existing values

---

## Technical Decisions

### 1. Schedule Parsing Approach

**Decision:** Any line with a time = schedule line (no keywords required)

**Why:**
- More flexible than requiring specific keywords
- Works with any language/format
- Catches user-defined terms ("Call time", "Start", etc.)
- Reduces false negatives

**Alternative Considered:** Require both time AND keyword
- Would miss custom terms
- Language-dependent
- More maintenance

### 2. Attendee Handling

**Decision:** Import attendees but don't auto-add to My Circle

**Why:**
- Events often have many invitees user doesn't work with regularly
- Prevents My Circle bloat
- User maintains control over their contacts
- Still creates gig roles for visibility

**Alternative Considered:** Auto-add all attendees
- Would spam My Circle
- User would need to clean up after every import

### 3. Schedule Display Format

**Decision:** Preserve original formatting (monospace `<pre>`)

**Why:**
- Shows exactly what was parsed
- Maintains line breaks and spacing
- Readable for various formats
- Easy to edit if needed

**Alternative Considered:** Restructure into table
- Too opinionated
- Would lose original formatting
- More complex

---

## Files Created

### New Files

- `lib/utils/parse-schedule.ts` — Schedule parsing with English + Hebrew support
- `lib/utils/match-attendees.ts` — Attendee matching to Ensemble users
- `supabase/migrations/20241118103935_add_gig_notes_schedule.sql` — Database migration

### Modified Files

**API Layer:**
- `lib/api/calendar-google.ts` — Enhanced import with attendees, schedule, notes
- `lib/api/gig-pack.ts` — Added notes and schedule to query/response
- `lib/integrations/google-calendar.ts` — Added attendees to event type

**Types:**
- `lib/types/database.ts` — Added notes, schedule columns to gigs table
- `lib/types/shared.ts` — Added notes, schedule to GigPackData interface

**UI Components:**
- `app/(app)/calendar/import/page.tsx` — Date range picker, collapsible details, debug info
- `app/(app)/gigs/[id]/page.tsx` — Display schedule and notes, cache invalidation fix
- `app/(app)/gigs/[id]/pack/page.tsx` — Display schedule and notes
- `components/create-gig-dialog.tsx` — Added schedule and notes fields
- `components/edit-gig-dialog.tsx` — Added schedule and notes fields

---

## How to Test

### 1. Apply Database Migration

In Supabase SQL Editor:
```sql
-- Copy contents from:
-- supabase/migrations/20241118103935_add_gig_notes_schedule.sql

-- Verify columns exist:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'gigs' AND column_name IN ('notes', 'schedule');
```

### 2. Test Schedule Parsing

Create a test calendar event with description:
```
Load-in: 6:00 PM
Soundcheck: 7:00 PM
Doors: 8:00 PM
Showtime: 9:00 PM

This is a wedding gig at the Grand Plaza.
Bring your formal attire.
```

Expected result:
- **Schedule:** All 4 lines with times
- **Notes:** Last 2 lines (without times)

### 3. Test Hebrew Support

Create event with Hebrew description:
```
הגעה: 18:00
סאונדצ'ק: 19:00
מופע: 20:00

זה אירוע חתונה.
```

Expected result:
- **Schedule:** All 3 lines with times (Hebrew text preserved)
- **Notes:** Last line

### 4. Test Attendee Import

Create event with 3 attendees (1 existing Ensemble user, 2 new):
1. Import event
2. Check gig People section
3. Verify:
   - All 3 attendees appear as gig roles
   - Existing user is linked (shows profile)
   - New users show name/email only
   - Response statuses mapped correctly

### 5. Test Date Range Selection

1. **Past Events:**
   - Click "Past 30 Days"
   - Fetch events
   - Verify past events load

2. **Future Events:**
   - Click "Next 90 Days"
   - Fetch events
   - Verify future events load

3. **Custom Range:**
   - Select custom from/to dates
   - Verify events in range load

### 6. Test UI Display

1. **Import Page:**
   - Click "Show Details" on event
   - Verify attendees, schedule, notes sections appear
   - Expand "Debug Info"
   - Check parsed values

2. **Gig Detail:**
   - Import event
   - Navigate to gig detail page
   - Verify Schedule and Notes sections display

3. **Gig Pack:**
   - Click "Gig Pack" button
   - Verify Schedule and Notes appear in Logistics card

4. **Edit Gig:**
   - Click "Edit" on imported gig
   - Verify schedule and notes are pre-filled
   - Modify and save
   - Verify changes appear immediately (no manual refresh)

### 7. Test Manual Gig Creation

1. Create new gig from scratch
2. Add schedule (with times)
3. Add notes
4. Save and verify both fields appear

---

## Performance Considerations

### Schedule Parsing

- Runs client-side during import preview
- Fast (regex-based, line-by-line)
- No server round-trips

### Attendee Matching

- Single database query (batch `SELECT ... IN`)
- Indexed on email column
- O(n) where n = number of attendees (typically < 20)

### Date Range Queries

- Filtered server-side in Google Calendar API
- No unnecessary data transfer
- Uses Google's efficient event filtering

### Cache Invalidation

- Surgical invalidation after edits
- Only invalidates affected queries:
  - `['gig', gigId]`
  - `['gig-pack', gigId]`
  - `['gigs']` (lists)
  - `['dashboard-gigs']`

---

## Security Considerations

### Attendee Data

- Only emails and display names imported
- No automatic My Circle addition (prevents spam)
- RLS policies still apply to gig_roles table
- User can only see gigs they have access to

### Schedule/Notes Parsing

- Client-side parsing (no eval/exec)
- Pure text extraction (no code execution)
- Regex patterns validated and safe

### Google Calendar API

- Read-only access (no calendar modifications)
- OAuth tokens stored securely in database
- Token refresh handled automatically
- Connection can be revoked anytime

---

## Known Limitations

### Schedule Parsing

1. **Time Format Required:**
   - Must have a recognizable time pattern
   - Lines like "Arrive early" won't be detected without a time

2. **Multi-line Schedule Items:**
   - Each line parsed independently
   - No grouping of related items

3. **Time Range Detection:**
   - "6-8 PM" detected as schedule (time with dash)
   - Might catch some non-schedule content

### Attendee Matching

1. **Email-Based Only:**
   - Can't match by name alone
   - Different emails for same person = separate entries

2. **No Automatic Circle Addition:**
   - User must manually add to My Circle
   - No bulk "Add All" option yet

3. **Default Role:**
   - All attendees imported as "Player" role
   - User must manually edit roles if needed

### Date Range

1. **No Recurring Event Expansion:**
   - Google Calendar API returns individual instances
   - Might hit API limits for very large date ranges

---

## Future Enhancements

### Short Term (Phase 1.7)

1. **Edit Schedule/Notes in Place:**
   - Rich text editor for notes
   - Structured schedule editor (add/remove/reorder items)

2. **Bulk Attendee Actions:**
   - "Add All to My Circle" option
   - Bulk assign roles (e.g., all "Strings")

3. **Smart Role Detection:**
   - Parse attendee names/emails for role hints
   - "John (Keys)" → assign Keys role

### Medium Term (Phase 2)

1. **Two-Way Sync:**
   - Update calendar event when gig changes
   - Keep schedule, location, attendees in sync

2. **Other Calendar Providers:**
   - Outlook/Office 365
   - Apple Calendar (iCloud)

3. **Advanced Schedule Parsing:**
   - Multi-line item support
   - Time ranges ("6-8 PM Setup")
   - Natural language ("One hour before showtime")

### Long Term (Phase 3)

1. **AI-Powered Parsing:**
   - Use LLM to extract structured data
   - Handle freeform descriptions better
   - Multi-language support (automatic translation)

2. **Calendar Integration Hub:**
   - Manage multiple calendar connections
   - Selective sync (only certain calendars)
   - Conflict resolution preferences

---

## Dependencies & Related Features

**Depends On:**
- Step 15: Calendar Integration Phase 1.5 (Google OAuth, import base)
- Step 5: GigRoles (for attendee import)
- Step 4: Gigs CRUD (for schedule/notes fields)

**Enables:**
- More useful imported gigs (less manual editing)
- Better gig information density
- Easier transition from external calendars

**Related Docs:**
- [Calendar Integration Roadmap](../future-enhancements/calendar-integration-roadmap.md)
- [Google Calendar OAuth Setup](../setup/google-calendar-oauth-setup.md)
- [Step 15: Calendar Phase 1.5](./step-15-calendar-integration-phase-1.5.md)

---

## Lessons Learned

### What Went Well

1. **Flexible Parsing Approach:**
   - "Any line with time" works better than keyword matching
   - Handles various formats and languages

2. **Debug UI:**
   - Temporary debug section helped verify parsing
   - Users can see what was extracted before import

3. **Incremental Development:**
   - Built on existing Phase 1.5 foundation
   - Each piece tested independently

### What Could Be Improved

1. **Schedule Editor:**
   - Current textarea editing is basic
   - Would benefit from structured editor

2. **Attendee Workflow:**
   - Import → manual role assignment is clunky
   - Could use smarter defaults or bulk actions

3. **Documentation:**
   - Time format examples needed upfront
   - User guide for best practices

---

**Last Updated:** November 18, 2025  
**Status:** ✅ Production Ready  
**Next Step:** User testing & feedback collection

