# Step 11: Gig Pack View (Mobile-Friendly)

**Status:** ✅ Complete

**Date:** November 15, 2024

**Branch/Commit:** Main development

---

## Overview

Implemented the **Gig Pack View** - a mobile-friendly, consolidated page where musicians can see everything they need for a gig in one place. This is the "command center" for musicians on the go, providing quick access to all gig essentials without navigating through multiple pages.

---

## Goals

✅ **Primary Goals:**
1. Create a single-page view with all essential gig information
2. Optimize for mobile (vertical layout, max-w-2xl container)
3. Display: Logistics, Setlist, Resources, Lineup, and personal Money info
4. Make it accessible from Dashboard and Gig Detail pages
5. Fast loading with optimized data fetching (single API call)
6. Clean, card-based UI using shadcn components

---

## What Was Built

### 1. Gig Pack API

**File:** `lib/api/gig-pack.ts`

Created a single comprehensive API function that fetches all data needed for the Gig Pack view:

**Function:** `getGigPack(gigId, userId)`

Fetches (in parallel where possible):
- Gig basic info (title, date, times, location, status)
- Project info (name, cover image)
- Setlist items (ordered by position)
- Resources/files (charts, tracks, materials)
- People/lineup (all roles and musicians)
- Current user's role & money (if they're playing)

**Data Structure:**
```typescript
interface GigPackData {
  // Basic gig info
  id, title, date, startTime, endTime, 
  locationName, locationAddress, status
  
  // Project
  project: { id, name, coverImageUrl }
  
  // Setlist
  setlist: [ { id, position, title, key, bpm, notes } ]
  
  // Resources
  resources: [ { id, label, url, type } ]
  
  // People
  people: [ { id, roleName, musicianName, invitationStatus } ]
  
  // User's role & money (if applicable)
  userRole: {
    roleName, agreedFee, isPaid, paidAt, 
    currency, notes
  } | null
}
```

**Performance:**
- Single page load = 5 database queries (fetched in parallel)
- All queries filtered by `gig_id`
- User role query uses `.maybeSingle()` (doesn't throw if not found)
- Estimated total query time: ~150-300ms

### 2. Gig Pack Page

**File:** `app/(app)/gigs/[id]/pack/page.tsx`

Mobile-first, vertical layout page with all sections in cards.

**Layout Characteristics:**
- `max-w-2xl mx-auto` - Centered, max 672px width (optimal for mobile)
- `space-y-4 p-4 pb-20` - Vertical spacing, bottom padding for mobile navigation
- Card-based sections (shadcn Card components)
- Responsive padding and spacing

**Sections (in order):**

#### Header
- Back button (to Gig Detail)
- Gig title + status badge
- Project name

#### 1. Logistics Card
- Date (formatted: "Monday, November 15, 2024")
- Time (start/end times with icon)
- Location name and address

#### 2. User's Role & Payment Card (conditional)
- Only shown if user has a role in this gig
- Role name
- Agreed fee (formatted with currency)
- Payment status badge (green for paid, gray for unpaid)
- Paid date (if paid)
- Notes for the user

#### 3. Setlist Card (conditional)
- Song count in description
- Numbered list of songs
- Each song shows: title, key (monospace), BPM
- Notes displayed if present
- Compact, scannable format

#### 4. Resources Card (conditional)
- File count in description
- Clickable file items (open in new tab)
- File type icon on the left
- File label (truncated if long)
- Entire item is a link (no separate button)

#### 5. Lineup Card (conditional)
- Role count in description
- List of roles with musician names
- Invitation status badges (colored by status)

**Conditional Rendering:**
- Sections only show if they have data
- User's Role card only for musicians playing this gig
- Empty states handled gracefully (no card shown)

### 3. Navigation Buttons

Added "Gig Pack" buttons to two locations:

#### Dashboard Gig Items
**File:** `components/dashboard-gig-item.tsx`

- Added "Gig Pack" button at bottom-right of each gig card
- Icon: Package (lucide-react)
- Size: small (`size="sm"`)
- Variant: outline
- Click stops propagation (doesn't trigger card click)

**Changes:**
- Added Button and Package icon imports
- Restructured card layout (removed outer Link, added Link per section)
- Added action button section at bottom

#### Gig Detail Page Header
**File:** `app/(app)/gigs/[id]/page.tsx`

- Added "Gig Pack" button in header (top-right)
- Positioned between title and edit/delete buttons
- Icon: Package
- Variant: default (primary button)
- Full button with label (not icon-only)

**Changes:**
- Added Link import
- Added Package icon import
- Added button in header flex container

---

## Technical Decisions

### 1. Single API Function vs Multiple Calls
**Decision:** One `getGigPack()` function that fetches all data.

**Rationale:**
- Simpler to use (one query key, one loading state)
- Fewer round trips to database
- All data needed is known upfront
- Easier to cache as a unit
- User role query doesn't fail if user has no role

### 2. Conditional Sections
**Decision:** Don't show empty sections (setlist, resources, etc.).

**Rationale:**
- Cleaner UI (no clutter)
- Less scrolling on mobile
- Clear visual indication of what's available
- No need for "No items yet" messages

### 3. User Role Query with `.maybeSingle()`
**Decision:** Use `.maybeSingle()` instead of `.single()` for user role.

**Rationale:**
- Managers viewing gig pack might not have a role
- Prevents query from throwing error
- Returns `null` gracefully
- Card doesn't render if null

### 4. All-in-One Page vs Sub-Components
**Decision:** Build all sections inline in the page component.

**Rationale:**
- Sections are simple (no complex logic)
- Not reused elsewhere
- Easier to see entire layout at once
- Avoid over-abstraction

### 5. Read-Only Setlist
**Decision:** Setlist is read-only in Gig Pack (no edit/delete buttons).

**Rationale:**
- Gig Pack is for viewing, not editing
- Musicians don't need to edit setlist (manager does)
- Keeps UI clean and focused
- Edit functionality available on Gig Detail page

### 6. Mobile-First Layout
**Decision:** `max-w-2xl` (672px) centered container, vertical stacking.

**Rationale:**
- Optimized for phones (most common use case)
- Still looks good on tablets/desktop
- No horizontal scrolling
- Easy one-thumb scrolling
- Prepared for React Native companion app (similar layout)

---

## Files Created

### API
- `lib/api/gig-pack.ts` (171 lines)

### Pages
- `app/(app)/gigs/[id]/pack/page.tsx` (263 lines)

### Modified Components
- `components/dashboard-gig-item.tsx` (updated navigation structure, added Gig Pack button)
- `app/(app)/gigs/[id]/page.tsx` (added Gig Pack button to header)

### Documentation
- `docs/build-process/step-11-gig-pack.md` (this file)

**Total New Code:** ~434 lines

---

## Code Examples

### Fetching Gig Pack Data

```typescript
const { data: pack, isLoading, error } = useQuery({
  queryKey: ['gig-pack', gigId, user?.id],
  queryFn: () => getGigPack(gigId, user!.id),
  enabled: !!user?.id && !!gigId,
  staleTime: 1 * 60 * 1000, // 1 minute
});
```

### Conditional Section Rendering

```typescript
{pack.userRole && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <DollarSign className="h-5 w-5" />
        Your Role & Payment
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Role and payment info */}
    </CardContent>
  </Card>
)}
```

### Clickable Resource Item

```typescript
<a
  href={resource.url}
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
>
  <FileTypeIcon type={resource.type} className="h-5 w-5" />
  <span className="flex-1 truncate font-medium">{resource.label}</span>
</a>
```

---

## Performance Optimizations

### API Layer

**Parallel Queries:**
All 5 database queries run in parallel (not sequential):
```typescript
const [gig, setlist, resources, people, userRole] = await Promise.all([
  fetchGig(),
  fetchSetlist(),
  fetchResources(),
  fetchPeople(),
  fetchUserRole()
]);
```

**Query Optimization:**
- All queries filtered by `gig_id` (indexed)
- SELECT only needed fields (no SELECT *)
- Setlist ordered by position
- Resources ordered by created_at
- People ordered by created_at

**Estimated Query Times:**
- Gig + project: ~50ms (1 join)
- Setlist: ~20ms (simple filter + order)
- Resources: ~20ms (simple filter + order)
- People: ~30ms (simple filter + order)
- User role: ~30ms (filter by gig_id + musician_id)
- **Total: ~150ms** (parallel, not 150ms each)

### Client-Side Caching

```typescript
staleTime: 1 * 60 * 1000 // 1 minute
```

**Rationale:**
- Gig data doesn't change frequently
- 1 minute is reasonable for cached view
- User can refresh if needed
- Balances freshness and performance

### Cache Invalidation

Should invalidate when:
- Gig is updated (title, date, location)
- Setlist is modified
- Resources are added/removed
- People/roles change
- User's role/payment is updated

**Implementation (future):**
```typescript
queryClient.invalidateQueries(['gig-pack', gigId]);
```

---

## Security Considerations

### Row Level Security (RLS)

All data is protected by existing RLS policies:

**Gigs:**
- User must own the project to view gig

**Setlist, Resources, People:**
- Accessible if user owns the project

**User Role (personal money):**
- Only fetches current user's role
- No exposure of other musicians' fees

**Future Enhancement:**
- When invite system is built, invited musicians should be able to view Gig Pack
- RLS policies will need to allow: `musician_id = auth.uid()` OR `project.owner_id = auth.uid()`

### Data Privacy

- User only sees their own fee (not others' fees)
- User role query filtered by `musician_id = userId`
- No sensitive data exposed in URLs
- Resources open in new tab (safe external links)

---

## User Experience

### Mobile UX

**Optimizations:**
- Large touch targets (entire resource item is clickable)
- No horizontal scrolling
- Generous spacing between sections
- Bottom padding for mobile nav bars
- Readable font sizes (text-lg for important info)
- Icons for visual hierarchy

### Navigation Flow

1. **From Dashboard:**
   - User sees "Gig Pack" button on gig card
   - Click opens `/gigs/[id]/pack`
   - All info immediately visible

2. **From Gig Detail:**
   - User clicks "Gig Pack" button in header
   - Same route `/gigs/[id]/pack`
   - Can return via "Back to Gig Detail" button

3. **Within Gig Pack:**
   - Scroll vertically to see all sections
   - Click resources to open in new tab
   - Click "Back" to return to Gig Detail

### Loading States

- Skeleton loaders while fetching
- 4 skeleton cards shown (header + 3 sections)
- Smooth transition to actual content
- Error state with retry option

### Empty States

- No empty state messages (sections just don't render)
- If user has no role: no "Your Role" card
- If no setlist: no Setlist card
- Cleaner than showing "No items" messages

---

## Testing

### Manual Testing Checklist

✅ **Page Load:**
- [x] Gig Pack page loads without errors
- [x] Data fetches correctly for owned gigs
- [x] Loading skeletons display

✅ **Sections Display:**
- [x] Logistics shows date, time, location
- [x] User's role card shows if user has a role
- [x] User's role card hidden if user has no role
- [x] Setlist shows all songs in order
- [x] Resources show with correct icons
- [x] Lineup shows all people with status badges

✅ **Formatting:**
- [x] Date formatted correctly (long format)
- [x] Time formatted correctly (12-hour with am/pm)
- [x] Currency formatted with symbol
- [x] Payment status badge color-coded
- [x] Setlist numbers, key, BPM display

✅ **Navigation:**
- [x] "Gig Pack" button works from Dashboard
- [x] "Gig Pack" button works from Gig Detail
- [x] "Back to Gig Detail" button works
- [x] Resource links open in new tab

✅ **Responsive:**
- [x] Layout works on mobile (320px width)
- [x] Layout works on tablet (768px width)
- [x] Layout works on desktop (1024px+ width)
- [x] Max width constraint (672px) applied
- [x] Centered on large screens

✅ **Edge Cases:**
- [x] Empty setlist (card doesn't show)
- [x] No resources (card doesn't show)
- [x] User has no role (money card doesn't show)
- [x] Gig with minimal info (only logistics shows)

### Test Scenarios

**Scenario 1: Musician with Role**
- User: Musician assigned to gig
- Expected: All cards show (Logistics, Role/Money, Setlist, Resources, Lineup)
- Result: ✅ Pass

**Scenario 2: Manager Viewing Pack**
- User: Project owner (not playing)
- Expected: Logistics, Setlist, Resources, Lineup (no Role/Money card)
- Result: ✅ Pass

**Scenario 3: Minimal Gig**
- Gig: Only title, date, no setlist/resources
- Expected: Just header + Logistics card
- Result: ✅ Pass

**Scenario 4: Mobile View**
- Device: iPhone (375px width)
- Expected: Vertical stack, no horizontal scroll, readable text
- Result: ✅ Pass

---

## Known Limitations

### 1. No Edit Capabilities
**Limitation:** Cannot edit anything from Gig Pack.

**Impact:** User must go to Gig Detail to make changes.

**Future:** Could add quick actions (mark as paid, add notes).

### 2. No Offline Support
**Limitation:** Requires network connection to load.

**Impact:** Can't view on the go without internet.

**Future:** Add service worker for offline caching (PWA).

### 3. No Share/Export
**Limitation:** Cannot share Gig Pack with others or export as PDF.

**Impact:** Can't easily send to musicians who aren't in the system.

**Future:** Add share link or PDF export functionality.

### 4. No Push Notifications
**Limitation:** No reminders or updates pushed to user.

**Impact:** User must check manually for gig details.

**Future:** Add push notifications for gig reminders.

### 5. Manager View Same as Player
**Limitation:** Managers see the same view (minus their role if not playing).

**Impact:** No manager-specific actions or data.

**Future:** Could show manager tools (edit inline, message musicians).

### 6. Single Currency Display
**Limitation:** If multiple currencies in gig, only shows user's role currency.

**Impact:** Can't see full financial picture if mixed currencies.

**Future:** Handle multi-currency gigs better (see Step 10 docs).

---

## Future Enhancements

### Short-Term (1-2 sprints)

1. **Quick Actions**
   - Mark self as paid (musician)
   - Add personal notes to gig
   - Download setlist as PDF

2. **Enhanced Logistics**
   - Add load-in, soundcheck times
   - Map integration (open in Apple/Google Maps)
   - Weather forecast for gig day

3. **Social Features**
   - See who's viewed the Gig Pack
   - Message other musicians
   - Confirm attendance

### Medium-Term (3-5 sprints)

1. **Offline Support**
   - PWA with service worker
   - Cache Gig Pack for offline viewing
   - Sync changes when back online

2. **Share Functionality**
   - Generate shareable link (with expiry)
   - Export as PDF (setlist, logistics)
   - Send via email/SMS

3. **Customization**
   - User can choose which sections to show
   - Reorder sections (drag & drop)
   - Pin favorite gigs for quick access

### Long-Term (6+ sprints)

1. **React Native Mobile App**
   - Reuse exact same data structure
   - Similar card-based layout
   - Native feel (bottom sheet, gestures)
   - Push notifications

2. **Smart Features**
   - Directions to venue (turn-by-turn)
   - Weather alerts for outdoor gigs
   - Traffic updates before gig
   - Parking info and reminders

3. **Advanced Integrations**
   - Apple Wallet/Google Pay pass
   - Calendar integration (auto-add to calendar)
   - Spotify playlist from setlist
   - YouTube links for songs

---

## Lessons Learned

### What Went Well
✅ Single API function simplifies data fetching
✅ Conditional rendering keeps UI clean
✅ Mobile-first design translates well to all screens
✅ Card-based layout is scannable and organized
✅ Package icon is clear and recognizable

### Challenges
⚠️ Balancing information density vs. readability
⚠️ Deciding which sections to show vs. hide when empty

### Improvements for Next Time
📝 Could add loading state per section (not just whole page)
📝 Consider sticky header for long gigs (easy scroll back to top)
📝 Add quick filter/search for long setlists (10+ songs)

---

## Architecture Notes

### Preparation for Mobile App

This implementation is intentionally designed to work well with a React Native companion app:

**Reusable:**
- `getGigPack()` API function (same data structure)
- TypeScript interfaces (can be shared)
- Section-based layout (maps to native components)

**Mobile-Ready:**
- Vertical scroll (native FlatList)
- Card-based design (native Card components)
- Touch-friendly (large tap targets)
- No hover states (works on touch)

**Next Steps for Mobile:**
1. Create Expo app with TypeScript
2. Reuse `GigPackData` interface
3. Call same Supabase endpoints
4. Build native cards (similar to web)
5. Add native features (maps, calendar, notifications)

### Data Flow

```
User clicks "Gig Pack"
  ↓
Page loads with gigId
  ↓
useQuery fetches getGigPack()
  ↓
API makes 5 parallel DB queries
  ↓
Data returned as GigPackData object
  ↓
Page renders conditional sections
  ↓
User scrolls/clicks resources
```

---

## Related Documentation

- **Step 5:** GigRoles basics (lineup/people section)
  - `docs/build-process/step-5-gigroles-lineup.md`
- **Step 6:** Setlist basics (setlist section)
  - `docs/build-process/step-6-setlist-basics.md`
- **Step 7:** Files/Resources (resources section)
  - `docs/build-process/step-7-files-materials.md`
- **Step 10:** Player Money View (money section)
  - `docs/build-process/step-10-player-money-view.md`

---

## Summary

✅ **Gig Pack View is complete and ready for musicians!**

The Gig Pack provides a clean, mobile-friendly view where musicians can see:
- When and where the gig is
- What they're playing (setlist)
- What materials they need (resources)
- Who they're playing with (lineup)
- How much they're getting paid (money)

All in one scrollable page, optimized for phones, accessible from Dashboard and Gig Detail.

**Step 11: Gig Pack View is done.** 🎉

**Next:** Step 12 - Prep for Mobile Companion App (extract shared types, clean endpoints).


