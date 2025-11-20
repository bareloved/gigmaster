# Step 4: Gigs Basic CRUD

## Overview & Goals
This step implements full CRUD functionality for Gigs within Projects. Gigs are the core events that musicians need to manage - they contain date, time, location, and status information, and will eventually hold lineup, setlist, and payment details.

**Specific Goals:**
1. Create API functions for gig management
2. Build "Create Gig" dialog with form validation
3. Display gigs list within project detail page
4. Create comprehensive gig detail page
5. Maintain performance with TanStack Query caching
6. Prepare structure for future features (People, Setlist, Files, Money)

## What We Built

### 1. Gigs API Layer (`lib/api/gigs.ts`)
Created a centralized module for all gig-related database operations:

**Functions implemented:**
- `createGig(data)` - Creates a new gig for a project
- `listGigsForProject(projectId)` - Fetches all gigs for a specific project, sorted by date
- `getGig(gigId)` - Fetches a single gig with project details (joined query)
- `updateGig(gigId, data)` - Updates gig details
- `deleteGig(gigId)` - Deletes a gig

**Type exports:**
- `Gig` - Full gig row type
- `GigInsert` - Type for inserting new gigs
- `GigUpdate` - Type for updating gigs

**Key implementation details:**
- Uses Supabase client-side SDK
- `getGig` includes project data via join (`select("*, projects(*)")`)
- Gigs sorted by date in ascending order
- Proper error handling with descriptive messages

### 2. Create Gig Dialog (`components/create-gig-dialog.tsx`)
A modal dialog component for creating new gigs within a project:

**Form fields:**
- **Title** (required) - e.g., "Dana's Wedding", "Ibiza Rooftop Set"
- **Date** (required) - HTML5 date picker
- **Start Time** (optional) - HTML5 time picker
- **End Time** (optional) - HTML5 time picker
- **Venue Name** (optional) - e.g., "Blue Note Jazz Club"
- **Address** (optional) - Full address textarea

**Features:**
- Client-side validation (title & date required)
- Responsive grid layout for date/time fields
- Error handling with user-friendly messages
- Form reset after successful creation
- Auto-closes and triggers parent refresh
- All gigs default to `status: "draft"`

### 3. Enhanced Project Detail Page (`/projects/[id]`)
Updated the project detail page to include gig management:

**Gigs Tab Updates:**
- **Empty state**: When no gigs exist, shows icon + "Create Gig" CTA
- **Gigs list**: When gigs exist, shows:
  - Gig title (clickable card)
  - Date formatted nicely ("Nov 12, 2025")
  - Start time (if set)
  - Location/venue name (if set)
  - Status badge (color-coded: confirmed = primary, draft = secondary)
  - Hover effect on cards
  - Click navigates to gig detail

**Overview Tab Updates:**
- **Total Gigs**: Shows actual count from database
- **Upcoming**: Dynamically counts gigs with `date >= today`
- Revenue still placeholder (will implement in Step 10)

**TanStack Query integration:**
- Separate queries for project and gigs
- Gigs query only runs after project loads (`enabled: !!project`)
- Query keys: `["project", projectId]` and `["gigs", projectId]`
- Invalidates gigs query after creating new gig

### 4. Gig Detail Page (`/gigs/[id]`)
A comprehensive detail view for individual gigs:

**Header:**
- Back button (navigates to parent project)
- Gig title (large, prominent)
- Status badge
- Project name (subtext)

**Main Info Card:**
- **Date**: Full formatted date with weekday
- **Time**: Start and end time (if provided)
- **Location**: Venue name + full address
- "Upcoming" vs "Past" gig indicator

**Placeholder Feature Cards:**
Ready for future implementation:
1. **People** (Step 5) - Lineup and roles
2. **Money** (Step 10) - Fees and payments
3. **Setlist** (Step 6) - Songs and order
4. **Files** (Step 7) - Charts and materials

**Features:**
- TanStack Query for data fetching
- Joined query includes project details
- Loading skeletons
- Error handling
- Clean, card-based layout

## Technical Decisions & Why

### Using TanStack Query for Gigs
**Decision**: Used TanStack Query for both project and gig data fetching  
**Why**:
- **Caching**: Navigating back to project doesn't refetch
- **Invalidation**: Easy to refresh gigs after mutations
- **Loading states**: Built-in `isLoading` flag
- **Performance**: Prevents duplicate fetches
- **Consistency**: Same pattern as projects (Step 3)

### Joined Query for Gig Detail
**Decision**: `getGig()` fetches gig + project data in one query  
**Why**:
- Shows project name in gig detail header
- Avoids second query for project data
- Postgres handles joins efficiently
- Single round-trip to database

### Gigs Sorted by Date (Ascending)
**Decision**: Sort gigs by date, oldest to newest  
**Why**:
- Shows upcoming gigs first (most relevant)
- Chronological order makes sense for events
- Can add filter later for past vs future gigs

### Status Default: "draft"
**Decision**: All new gigs start with `status: "draft"`  
**Why**:
- Explicit workflow: draft → confirmed
- Prevents accidental "confirmed" gigs
- Users must actively confirm gigs
- Matches real-world process

### Placeholder Cards vs. Empty Page
**Decision**: Show placeholder cards for future features  
**Why**:
- Sets expectations for what's coming
- Better UX than completely empty page
- Guides users on app structure
- Easy to replace with real implementation

### Separate Routes for Projects and Gigs
**Decision**: `/projects/[id]` and `/gigs/[id]` (not `/projects/[id]/gigs/[id]`)  
**Why**:
- Simpler URLs
- Gigs might be accessed from multiple places later (dashboard, calendar)
- No nested routing complexity
- Back button can navigate to project using `project_id`

## Files Created/Modified

### Created Files
- ✅ `lib/api/gigs.ts` - Gig CRUD API functions
- ✅ `components/create-gig-dialog.tsx` - Gig creation modal
- ✅ `app/(app)/gigs/[id]/page.tsx` - Gig detail page
- ✅ `docs/build-process/step-4-gigs-crud.md` - This documentation

### Modified Files
- ✅ `app/(app)/projects/[id]/page.tsx` - Added gig list, TanStack Query, stats
- ✅ `app/(app)/projects/page.tsx` - Updated gig count placeholder text
- ✅ `BUILD_STEPS.md` - Marked Step 4 as complete

### New Component Installed
- ✅ `components/ui/badge.tsx` - shadcn Badge for status display

## Code Snippets

### Gig Card in List
```typescript
<Card 
  key={gig.id}
  className="hover:border-primary transition-colors cursor-pointer"
  onClick={() => router.push(`/gigs/${gig.id}`)}
>
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <CardTitle className="text-lg">{gig.title}</CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(gig.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          {gig.start_time && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {gig.start_time}
            </div>
          )}
          {gig.location_name && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {gig.location_name}
            </div>
          )}
        </div>
      </div>
      <Badge variant={gig.status === 'confirmed' ? 'default' : 'secondary'}>
        {gig.status}
      </Badge>
    </div>
  </CardHeader>
</Card>
```

### TanStack Query for Gigs
```typescript
const {
  data: gigs = [],
  isLoading: isGigsLoading,
} = useQuery({
  queryKey: ["gigs", projectId],
  queryFn: () => listGigsForProject(projectId),
  enabled: !!project, // Only fetch after project loads
});

const handleGigCreated = () => {
  queryClient.invalidateQueries({ queryKey: ["gigs", projectId] });
  setIsCreateGigDialogOpen(false);
};
```

### Joined Query in API
```typescript
export async function getGig(gigId: string) {
  const supabase = createClient();

  const { data: gig, error } = await supabase
    .from("gigs")
    .select("*, projects(*)")
    .eq("id", gigId)
    .single();

  if (error) throw new Error(error.message || "Failed to fetch gig");
  return gig;
}
```

## How to Test

With the dev server running:

### Test 1: Create a Gig
1. Navigate to any **Project**
2. Click "**New Gig**" button (in header)
3. Fill in form:
   - Title: "Dana's Wedding"
   - Date: Pick a future date
   - Start time: "18:00"
   - Venue: "Grand Ballroom"
   - Address: "123 Main St"
4. Click "**Create Gig**"
5. Dialog should close
6. Gig should appear in the **Gigs tab**

### Test 2: View Gig List
1. Create multiple gigs with different dates
2. Verify they're sorted by date (oldest first)
3. Check that date, time, location show correctly
4. Verify status badge shows "draft"
5. Hover over cards - border should change

### Test 3: Gig Detail Page
1. Click on any gig card
2. Should navigate to `/gigs/[id]`
3. Verify all information displays:
   - Title and status badge
   - Project name (subtitle)
   - Full formatted date
   - Time range
   - Venue + address
4. Check placeholder cards show
5. Click back button → returns to project

### Test 4: Stats Update
1. In **Overview tab**, check "Total Gigs" count
2. Create a new gig
3. Return to **Overview tab**
4. "Total Gigs" should increment
5. "Upcoming" count should update

### Test 5: Performance
1. Navigate to Projects list
2. Click a project (loads gigs)
3. Click a gig (loads gig detail)
4. Navigate back to project
5. Navigate back to Projects list
6. Click same project again → **Should be instant** (cached)

### Test 6: Database Check
1. Open Supabase dashboard → Table Editor
2. View `gigs` table
3. Verify:
   - Gigs have correct `project_id`
   - Dates are stored correctly
   - `status` defaults to "draft"
   - Timestamps are set

## Performance Considerations

### Current Performance:
- ✅ TanStack Query caching for projects and gigs
- ✅ Separate queries allow fine-grained invalidation
- ✅ Gigs query doesn't run until project loads
- ✅ Joined query for gig detail (1 query vs 2)
- ✅ No over-fetching (only needed columns)
- ✅ Indexed on `project_id` and `date` (from Step 1)

### Future Optimizations (when needed):
- Add pagination if a project has 100+ gigs
- Filter gigs by date range (upcoming vs past)
- Virtualized list for very long gig lists
- Prefetch gig details on hover

## Security Considerations

- ✅ RLS policies from Step 1 ensure users only see gigs from their projects
- ✅ Foreign key constraint ensures gigs can't be created for non-existent projects
- ✅ Cascading delete: deleting a project deletes its gigs
- ✅ `project_id` validated at database level
- ✅ No manual authorization checks needed (RLS handles it)

## Known Limitations

1. **No edit functionality yet** - Can't update gig details after creation
2. **No delete button** - Delete API exists but no UI
3. **Status can't be changed** - Always "draft" for now
4. **No pagination** - Will need it eventually
5. **People, Setlist, Files, Money tabs** - Empty placeholders (Steps 5-7, 10)
6. **No gig duplication** - Can't copy a gig as template
7. **No bulk operations** - Can't delete/update multiple gigs

## Next Steps

**Immediate Next:**
- **Step 5: GigRoles (People/Lineup)** - Add musician roles to gigs

**Eventually:**
- **Step 6: Setlist** - Add songs to gigs
- **Step 7: Files & Materials** - Attach charts/audio to gigs
- **Step 10: Money** - Track client fees and musician payouts

**Feature Enhancements:**
- Edit gig details
- Delete gig (with confirmation)
- Change gig status (draft → confirmed)
- Filter gigs (upcoming/past, by status)
- Gig templates

---

**Step 4 is complete! 🎉** Users can now create projects, add gigs to projects, and view detailed gig information. The app is starting to feel like a real gig management tool!

