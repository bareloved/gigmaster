# Step 5: GigRoles (Players, Status, Fee)

**Status**: ✅ Complete  
**Date**: November 14, 2025  
**Goal**: Enable band leaders to assign musicians to roles for each gig, track their status (invited/confirmed/declined), and manage fees.

---

## Overview

This step implements the **lineup management** feature, which is core to the app's value proposition. Band leaders need to:
- Define roles for each gig (keys, drums, bass, etc.)
- Assign musicians to those roles
- Track invitation status (invited, confirmed, declined, needs sub)
- Set agreed fees per musician
- Track payment status

We took a pragmatic approach: musicians are currently stored as **text names** (not user accounts), with a nullable `musician_id` field ready for future linking when we implement the full musician accounts system.

We also built a **quick-add autocomplete** that suggests musicians you've worked with before, dramatically reducing friction when building lineups.

---

## What We Built

### 1. Database Schema - `gig_roles` Table

**Migration**: `supabase/migrations/20241113_gig_roles.sql`

Created a comprehensive table to track role assignments per gig:

- `id` - UUID primary key
- `gig_id` - Foreign key to gigs table (CASCADE delete)
- `role_name` - Text field (e.g., "Keys", "MD / Keys", "Drums")
- `musician_name` - Text field for musician's name (nullable)
- `musician_id` - UUID foreign key to profiles (nullable, for future linking)
- `invitation_status` - Text enum (invited | accepted | declined | needs_sub | replaced)
- `agreed_fee` - Numeric(10, 2) for payment amount
- `is_paid` - Boolean flag
- `paid_at` - Timestamp for payment date
- `notes` - Text field for role-specific notes
- `created_at` / `updated_at` - Standard timestamps

**Indexes**:
- `idx_gig_roles_gig_id` - For fast lookup by gig
- `idx_gig_roles_musician_id` - For future "my gigs as player" queries
- `idx_gig_roles_status` - For filtering by status

**RLS Policies**:
- Users can only view/insert/update/delete roles for gigs in projects they own
- Policies use nested EXISTS queries to check ownership through gigs → projects

### 2. API Layer - `lib/api/gig-roles.ts`

**Functions**:

```typescript
listRolesForGig(gigId: string): Promise<GigRole[]>
// Fetches all roles for a gig, ordered by creation date

addRoleToGig(data: GigRoleInsert): Promise<GigRole>
// Creates a new role assignment

updateRole(roleId: string, data: GigRoleUpdate): Promise<GigRole>
// Updates an existing role (status, fee, musician, etc.)

deleteRole(roleId: string): Promise<void>
// Removes a role from the gig

searchMusicianNames(query?: string): Promise<MusicianSuggestion[]>
// Returns musician suggestions based on past gigs
// Aggregates: name, count (# of gigs), roles played, last used date
// Sorted by frequency then recency
```

**Type Safety**: All functions use TypeScript types generated from the database schema.

### 3. UI Components

#### `components/add-role-dialog.tsx`

A comprehensive dialog for adding roles with:
- **Role selection**: Dropdown with common roles (Keys, Drums, Bass, etc.) + "Other" for custom
- **Musician autocomplete**: Command-based search with suggestions from past gigs
- **Status selection**: Invited, Confirmed, Declined, Needs Sub
- **Fee input**: Optional numeric field
- **Notes textarea**: For role-specific instructions
- **Form validation**: Ensures role name and musician name are provided

Features:
- Pre-fills musician name when opened from quick-add search
- Shows musician history (roles played, # of gigs)
- Allows adding new musicians on the fly
- 5-minute cache for musician suggestions

#### `components/role-status-badge.tsx`

Color-coded status badges:
- **Confirmed** (accepted): Default variant (green)
- **Invited**: Secondary variant (gray)
- **Declined**: Destructive variant (red)
- **Needs Sub**: Yellow variant
- **Replaced**: Outline variant

#### `app/(app)/gigs/[id]/page.tsx` - People Section

Enhanced the Gig Detail page with a comprehensive lineup management section:

**Layout**:
- Card header with "People" title on left
- Quick-add search box (400px) + icon button on right
- Description below
- Table below with full role listing

**Quick-Add Flow**:
1. Type musician name in search box
2. See suggestions from past gigs with context (roles played, # of gigs)
3. Click suggestion → opens AddRoleDialog pre-filled
4. Or click "+" button for blank dialog

**Table Columns**:
- Role name
- Musician name (or "Not assigned")
- Status badge (color-coded)
- Fee (or "-")
- Delete button

**Empty State**:
- Icon + message when no roles yet
- Encourages using quick-add or "+" button

---

## Technical Decisions

### Why Text-Based Musician Names (Not User Accounts Yet)?

**Decision**: Store musician names as simple text fields, not requiring them to have user accounts.

**Reasoning**:
1. **Reduced friction**: Band leaders can quickly build lineups without waiting for musicians to sign up
2. **Real-world workflow**: Leaders often book musicians who aren't tech-savvy or don't need app access
3. **Incremental complexity**: We can add user linking later without breaking existing data
4. **MVP speed**: Gets core feature working faster

**Future path**: The `musician_id` field is ready for linking when we implement musician accounts.

### Why Command Component for Autocomplete?

**Decision**: Use shadcn's `Command` component wrapped in a `Popover` for musician search.

**Reasoning**:
1. **Keyboard navigation**: Built-in arrow keys, enter to select
2. **Search filtering**: Automatic fuzzy matching
3. **Grouping support**: Can categorize suggestions (e.g., "Previous Musicians")
4. **Accessibility**: ARIA attributes out of the box
5. **Consistent UX**: Matches other autocomplete patterns in shadcn

### Why Separate Quick-Add + Button?

**Decision**: Provide both a search box and a "+" button in the header.

**Reasoning**:
1. **Quick-add**: For the common case (adding someone you've worked with)
2. **Button**: For adding new musicians or when you want full dialog first
3. **Discoverability**: Two entry points make the feature more obvious
4. **Flexibility**: Power users use search, others use button

### Why Cache Musician Suggestions?

**Decision**: Cache suggestions for 5 minutes with TanStack Query, including user.id in the key.

**Reasoning**:
1. **Performance**: Avoids re-fetching on every dialog open
2. **Cost**: Reduces database queries
3. **User isolation**: The user.id in the cache key prevents cross-user data leaks
4. **Reasonable freshness**: 5 minutes is fresh enough for this use case

---

## Files Created/Modified

### New Files
```
supabase/migrations/20241113_gig_roles.sql       - Database schema for gig_roles table
lib/api/gig-roles.ts                             - API functions for CRUD + musician search
components/add-role-dialog.tsx                    - Dialog for adding roles to gigs
components/role-status-badge.tsx                  - Color-coded status badges
```

### Modified Files
```
lib/types/database.ts                            - Added gig_roles table types
app/(app)/gigs/[id]/page.tsx                     - Added People section with lineup table
```

---

## Code Snippets

### Musician Search with Aggregation

```typescript
export async function searchMusicianNames(query: string = ""): Promise<MusicianSuggestion[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch all roles for user's gigs (via projects they own)
  const { data: roles, error } = await supabase
    .from("gig_roles")
    .select(`
      musician_name,
      role_name,
      created_at,
      gigs!inner(
        project_id,
        projects!inner(
          owner_id
        )
      )
    `)
    .not("musician_name", "is", null)
    .order("created_at", { ascending: false });

  // Group by musician name and aggregate data
  const musicianMap = new Map<string, MusicianSuggestion>();

  roles?.forEach((role: any) => {
    const name = role.musician_name?.trim();
    if (!name) return;
    if (query && !name.toLowerCase().includes(query.toLowerCase())) return;

    if (musicianMap.has(name)) {
      const existing = musicianMap.get(name)!;
      existing.count++;
      if (!existing.roles.includes(role.role_name)) {
        existing.roles.push(role.role_name);
      }
      if (new Date(role.created_at) > new Date(existing.lastUsed)) {
        existing.lastUsed = role.created_at;
      }
    } else {
      musicianMap.set(name, {
        name,
        count: 1,
        roles: [role.role_name],
        lastUsed: role.created_at,
      });
    }
  });

  // Sort by frequency then recency
  return Array.from(musicianMap.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
}
```

### Quick-Add Musician UI

```typescript
<Popover open={musicianSearchOpen} onOpenChange={setMusicianSearchOpen}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={musicianSearchOpen}
      className="w-[400px] justify-between font-normal"
    >
      {musicianSearchValue || "Quick add musician..."}
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0" align="end">
    <Command>
      <CommandInput
        placeholder="Type musician name..."
        value={musicianSearchValue}
        onValueChange={setMusicianSearchValue}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-2 text-center text-sm">
            <p className="text-muted-foreground mb-2">No musician found</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMusicianSelect(musicianSearchValue)}
            >
              Add "{musicianSearchValue}" as new musician
            </Button>
          </div>
        </CommandEmpty>
        {musicianSuggestions.length > 0 && (
          <CommandGroup heading="Previous Musicians">
            {musicianSuggestions.map((musician) => (
              <CommandItem
                key={musician.name}
                value={musician.name}
                onSelect={handleMusicianSelect}
              >
                <div className="flex items-center justify-between flex-1">
                  <div className="flex flex-col">
                    <span className="font-medium">{musician.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {musician.roles.slice(0, 2).join(", ")}
                      {musician.roles.length > 2 && `, +${musician.roles.length - 2} more`}
                    </span>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {musician.count} {musician.count === 1 ? "gig" : "gigs"}
                  </Badge>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

---

## How to Test

### 1. Add Roles to a Gig

1. Navigate to a project and click on a gig
2. Scroll to the "People" section
3. Click the "+" button
4. Select a role (e.g., "Keys")
5. Type a musician name (e.g., "John Smith")
6. Select a status (e.g., "Confirmed")
7. Enter a fee (e.g., "150.00")
8. Click "Add Role"
9. Expected: Role appears in the table with correct status badge and fee

### 2. Quick-Add Flow

1. In the People section header, click the search box
2. Start typing a musician's name from a previous gig
3. See the autocomplete suggestion with their history
4. Click the suggestion
5. Expected: AddRoleDialog opens with musician name pre-filled
6. Select role and submit
7. Expected: Role added to table

### 3. Delete Role

1. In the People section table, find a role
2. Click the trash icon
3. Confirm deletion
4. Expected: Role removed from table

### 4. Role Status Display

1. Add multiple roles with different statuses
2. Expected status badge colors:
   - Confirmed: Green (default)
   - Invited: Gray (secondary)
   - Declined: Red (destructive)
   - Needs Sub: Yellow

### 5. Empty State

1. Navigate to a gig with no roles yet
2. Expected: See empty state with icon and message
3. Try both quick-add and "+" button
4. Expected: Both open appropriate UIs

---

## Key Dependencies Added/Changed

No new npm packages were added. This step used existing dependencies:
- `@supabase/supabase-js` (database queries)
- `@tanstack/react-query` (caching)
- `shadcn/ui` components: Command, Popover, Badge, Table, Dialog

---

## Known Limitations

### Current State
- ❌ Musician names are text-only (not linked to user accounts)
- ❌ No notification system when musicians are invited
- ❌ No musician view (they can't see gigs they're invited to)
- ❌ No email/contact info for musicians
- ❌ Can't filter/sort roles in the table
- ❌ No bulk invite functionality

### Future Enhancements Needed
- Link musicians to user accounts (use musician_id field)
- Build "My Gigs as Player" view
- Add musician contact database (see `docs/future-enhancements/musician-contacts-system.md`)
- Implement invitation notifications (email/SMS)
- Add roster templates per project (see `docs/future-enhancements/roster-automation.md`)
- Allow musicians to accept/decline invites

---

## Performance Considerations

### What We Did Right ✅
- **Query keys include user.id**: Prevents cross-user cache pollution
- **Indexed queries**: All lookups use indexed columns (gig_id, musician_id, status)
- **Cached suggestions**: Musician autocomplete cached for 5 minutes
- **Efficient aggregation**: Musician search groups in client (not DB) to avoid complex query
- **Lazy loading**: Roles only fetched when gig detail page loads

### Future Improvements ⚠️
- Could paginate roles table for gigs with 50+ roles (unlikely but possible)
- Could add server-side aggregation for musician suggestions if dataset grows large
- Could preload roles when prefetching gig data

---

## Security Considerations

### What We Implemented ✅
- **RLS policies**: Users can only view/edit roles for gigs in projects they own
- **Nested security**: Policies check ownership through gigs → projects chain
- **Query key isolation**: user.id in cache keys prevents data leakage
- **Authenticated queries**: All API functions check auth before fetching

### RLS Policy Example
```sql
CREATE POLICY "Users can view gig roles for their projects"
  ON public.gig_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.gigs
      INNER JOIN public.projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );
```

### Future Security TODOs
- Add audit logging for role changes (especially fee/payment updates)
- Implement musician-side permissions (when they can see their own roles)
- Add rate limiting on musician search to prevent scraping

---

## Next Steps

With role management complete, the logical next steps are:

1. **Step 6: Setlist Basics** - Add songs/order to each gig
2. **Step 7: Files & Materials** - Attach charts, audio refs, etc.
3. **Step 8: Dashboard Views** - "My Gigs as Player" and "My Gigs as Manager"
4. **Step 10: Money/Payments** - Build on the fee tracking we started here

---

**Completion Criteria Met**: ✅

- ✅ Can create roles for a gig
- ✅ Can assign musicians to roles
- ✅ Can track invitation status
- ✅ Can set and view fees
- ✅ Quick-add autocomplete works
- ✅ Status badges display correctly
- ✅ Can delete roles
- ✅ RLS policies enforce security
- ✅ Performance is snappy (cached queries)

---

*Last updated: November 14, 2025*

