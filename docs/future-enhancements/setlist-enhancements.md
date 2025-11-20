# Setlist Enhancements

## Overview

Future enhancements for the setlist feature to make it more powerful and user-friendly for gigging musicians.

## Planned Enhancements

### 1. Drag-and-Drop Reordering (✅ Implemented)

**Problem:**
Users need a quick and intuitive way to reorder songs in the setlist.

**Solution:**
- ✅ Implemented drag-and-drop using `@dnd-kit/core` and `@dnd-kit/sortable`
- ✅ Visual drag handle (⋮⋮) on each song item
- ✅ Smooth animations during reordering
- ✅ Optimistic UI updates for immediate feedback
- ✅ Automatic position number updates in the background
- ✅ Touch-friendly for mobile devices

**Technical Implementation:**
- Uses `DndContext` and `SortableContext` wrappers
- `arrayMove` for optimistic reordering
- Batch position updates with `Promise.all`
- Error handling with UI revert on failure

---

### 2. Bulk Import from Text/CSV

**Problem:**
Manually entering a 20-30 song setlist one-by-one is time-consuming.

**Current State (Step 6.5 - ✅ Implemented):**
- Text parsing with regex handles common formats:
  - "Song Title - Key" or "Song Title – Key" (em-dash)
  - "Song Title + Another Song - Key" (medleys)
  - "Song Title" (without key)
  - "1. Song Title - Key" (with leading numbers)
- Preview table with editable fields (title, key, BPM)
- Ability to remove songs before importing
- Parallel batch insert for performance (20-30 songs in seconds)

**Future Enhancements:**

#### AI-Powered Smart Parse
For complex or unstructured setlist formats, use AI (OpenAI/Anthropic) to parse intelligently.

**When to Use:**
- Complex formats (tables, bullets, multi-column layouts)
- Existing setlist PDFs (after text extraction)
- Unstructured notes with embedded song info
- When regex parsing fails or is incomplete

**Implementation Approach:**
1. Add "Smart Parse" button alongside "Parse Setlist"
2. Send text to AI with structured prompt:
   ```
   Extract a list of songs from this setlist. For each song, identify:
   - Song title (required)
   - Musical key (if mentioned)
   - BPM/tempo (if mentioned)
   
   Return as JSON array: [{ title: string, key: string | null, bpm: number | null }]
   
   Setlist:
   ${text}
   ```
3. Parse AI JSON response into `ParsedSong[]`
4. Show in same preview table for review/editing
5. Fallback to regex if AI fails or returns invalid data

**Benefits:**
- Handles varied formats without regex updates
- Extracts BPM, notes, and metadata automatically
- Can parse PDF text content (after OCR/extraction)
- Understands context (e.g., "verse in Dm" vs "song in Dm")

**Challenges:**
- Requires API key (OpenAI/Anthropic) - costs per parse
- Slower than regex (2-5 seconds vs instant)
- May need validation/correction UI for edge cases
- Rate limiting considerations

**Placeholder Code:**
Already added in `lib/utils/setlist-parser.ts`:
```typescript
export async function parseSetlistWithAI(text: string): Promise<ParsedSong[]>
```

#### CSV Import
- Upload CSV file with columns: title, key, BPM, notes
- Use a parser library (e.g., `papaparse`)
- Provide column mapping UI if headers don't match
- Preview before confirming import

---

### 3. Song Library / Templates

**Problem:**
Musicians often play the same songs across multiple gigs and have to re-enter details each time.

**Solution:**
- Create a global "Song Library" for each user
- Store commonly played songs with their typical key, BPM, and notes
- When adding a song to a setlist, autocomplete from the library
- "Save to Library" option when adding a new song

**Data Model:**
```sql
CREATE TABLE song_library (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  default_key TEXT,
  default_bpm INTEGER,
  default_notes TEXT,
  times_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Technical Considerations:**
- Separate table for library vs. setlist items
- Update `times_used` counter when a song is added to a setlist
- Allow editing library entries without affecting past setlists

---

### 4. Duplicate Song Detection

**Problem:**
Users might accidentally add the same song twice to a setlist.

**Solution:**
- When adding a song, check if a similar title already exists in the current setlist
- Use fuzzy matching (e.g., Levenshtein distance) to catch typos
- Show a warning: "Similar song already in setlist: [Song Name]. Add anyway?"

**Technical Considerations:**
- Implement client-side fuzzy matching (e.g., `fuse.js`)
- Configurable sensitivity threshold
- Allow users to proceed if they genuinely want duplicates (e.g., same song in different keys)

---

### 5. Set Sections (Opener, Main Set, Encore)

**Problem:**
Long setlists often have logical sections (Set 1, Set 2, Encore) that aren't visually distinguished.

**Solution:**
- Add a `section` field to `setlist_items` table
- Allow users to group songs into sections:
  - Set 1
  - Set 2
  - Encore
  - Custom sections
- Display sections as collapsible/expandable groups in the UI
- Show section durations (sum of estimated song lengths)

**Data Model:**
```sql
ALTER TABLE setlist_items ADD COLUMN section TEXT DEFAULT 'Main Set';
ALTER TABLE setlist_items ADD COLUMN estimated_duration_minutes INTEGER;
```

**UI Considerations:**
- Section headers with visual separators
- Ability to move songs between sections via drag-and-drop
- Display total time per section

---

### 6. Integration with Music Notation Services

**Problem:**
Musicians often have charts stored in external services (Google Drive, Dropbox, OnSong, forScore).

**Solution:**
- Allow attaching external links to each song in the setlist
- Support common services:
  - Google Drive
  - Dropbox
  - OnSong (if API available)
  - forScore (if API available)
- Display quick preview/thumbnail if possible

**Technical Considerations:**
- Store links in a separate `setlist_attachments` table
- Respect authentication and permissions for external services
- Consider OAuth flow for authorized access

---

### 7. Automatic Music Streaming Links

**Problem:**
Musicians often want to reference recordings of songs for rehearsal or to share with band members, but manually searching for each song on YouTube or Spotify is tedious.

**Solution:**
- Automatically search and attach YouTube/Spotify links for each song
- Display icons next to each song with direct links to streaming services
- Allow users to override with custom links if needed
- Cache links to avoid repeated API calls

**Implementation Approach:**
1. Use YouTube Data API v3 or Spotify Web API
2. Search query format: `"{song title}" {artist name (if available)}`
3. Store links in `setlist_items` table:
   ```sql
   ALTER TABLE setlist_items ADD COLUMN youtube_url TEXT;
   ALTER TABLE setlist_items ADD COLUMN spotify_url TEXT;
   ALTER TABLE setlist_items ADD COLUMN artist_name TEXT;
   ```
4. Display small icons (YouTube/Spotify logos) next to each song
5. Click icon → open link in new tab

**Technical Considerations:**
- Rate limiting on API calls
- Cache results in database to avoid re-fetching
- Provide manual link override option
- Handle cases where no results found
- Privacy: Only fetch when user explicitly requests

**UI Design:**
```
🎵 Song Title  •  C♯  •  120  [▶️ YouTube] [🎵 Spotify] [Edit] [Delete]
```

---

### 8. PDF Export

**Problem:**
Musicians need a printable/shareable version of the setlist for physical reference on stage or to share with venues/band members.

**Solution:**
- Generate a clean, printable PDF of the setlist
- Include gig details (date, venue, time)
- Professional formatting with clear typography
- Option to include or exclude notes/keys/BPM

**Implementation Approach:**
1. Use a PDF generation library (e.g., `jsPDF`, `pdfmake`, or `react-pdf`)
2. Create PDF export button in setlist section
3. Template options:
   - **Compact**: Just song titles and keys
   - **Detailed**: Includes keys, BPM, notes
   - **Stage View**: Large text, high contrast
4. Include gig metadata:
   - Project/Band name
   - Date and venue
   - Set times (if applicable)

**PDF Layout Example:**
```
[Band Name] - [Venue Name]
[Date] | Load-in: [time] | Showtime: [time]

SET 1
1. Song Title (C♯) - 120 BPM
2. Another Song (Dm)
3. Third Song (G) - 140 BPM
...

SET 2
...
```

**Technical Considerations:**
- Generate on server or client-side
- Allow downloading or opening in new tab
- Save/cache generated PDFs (optional)
- Mobile-friendly PDF viewing

---

### 9. Stage View Mode

**Problem:**
The standard setlist view is optimized for editing and management, but on stage, musicians need a simplified, large-text, high-contrast view that's easy to read at a glance.

**Solution:**
- Create a dedicated "Stage View" mode for the setlist
- Full-screen, distraction-free layout
- Large text for easy reading from a distance
- High contrast colors
- Minimal UI (no edit/delete buttons)
- Optional dark mode for dark stages

**Features:**
- **Large text**: Song titles in 24-32px font
- **Clear numbering**: Visual position indicators
- **Key/BPM visible**: Easy-to-scan musical info
- **Swipe/scroll**: Simple navigation between songs
- **Current song highlight**: Visual indicator of what's playing now
- **Touch-friendly**: Large touch targets for mobile/tablet

**Implementation Approach:**
1. Add "Stage View" button in setlist header
2. Create new route or modal for stage view: `/gigs/[id]/stage`
3. Simplified layout:
   ```
   ┌─────────────────────────────┐
   │  [Band Name] - [Venue]      │
   │  [Date]                     │
   ├─────────────────────────────┤
   │                             │
   │  1. Song Title              │
   │     C♯  •  120              │
   │                             │
   │  2. Another Song            │
   │     Dm  •  110              │
   │                             │
   │  3. Third Song              │
   │     G   •  140              │
   │                             │
   └─────────────────────────────┘
   ```
4. Features:
   - Tap a song to mark as "current"
   - Swipe gestures for quick navigation
   - Exit button to return to normal view
   - Optional: Auto-advance timer

**Technical Considerations:**
- Responsive design for tablets/phones
- Prevent screen sleep during performance
- Optional offline mode (cache setlist)
- Simple URL sharing for other band members

**UI/UX:**
- Minimal distractions
- High contrast (white on black or black on white)
- Optional: Color-coded sections (Set 1, Set 2, Encore)
- Quick-access exit button (small, top-left corner)

---

## Implementation Priority

**Completed:**
1. ✅ **Drag-and-Drop Reordering** - Smooth, intuitive reordering with visual feedback
2. ✅ **Bulk Import from Text** - Regex-based parsing with smart formatting

**High Priority:**
3. **Stage View Mode** - Critical for live performance, easy to implement
4. **PDF Export** - High value, commonly requested for sharing/printing
5. **Song Library / Templates** - Saves significant time for repeat songs

**Medium Priority:**
6. **Automatic Music Streaming Links** - Useful for rehearsal, requires API integration
7. **Set Sections** - Helpful for complex shows with multiple sets
8. **AI-Powered Smart Parse** - Enhanced bulk import for complex formats

**Low Priority:**
9. **Duplicate Detection** - Nice-to-have, prevents occasional errors
10. **Music Notation Integration** - Requires external API integrations, higher complexity

---

## Related Documents

- [Musician Contacts System](./musician-contacts-system.md)
- [Multi-Step Gig Wizard](./multi-step-gig-wizard.md)

