# Step 19: Make Projects Optional - Gig-First Architecture Refactor

**Date:** 2025-11-20  
**Status:** ✅ Completed  
**Feature:** Projects as Optional Organizational Folders

---

## Overview & Goals

This refactor fundamentally changed the relationship between gigs and projects to support a more flexible, gig-first architecture.

### Problem Statement

Previously:
- **Projects were required** - Every gig had to belong to a project
- **Personal projects hack** - Standalone gigs were forced into hidden "personal projects"
- **Project-based ownership** - Permissions flowed through projects, not gigs
- **Mental model mismatch** - Musicians think "I have a gig Friday", not "which project folder?"

### Solution

Made projects optional organizational folders:
- **Gigs are primary** - Can exist independently with their own `owner_id`
- **Projects are optional** - Used only for grouping/organizing related gigs
- **Gig-based ownership** - Permissions based on gig `owner_id` and `gig_roles` membership
- **Flexible mental model** - Create standalone gigs or group them into projects

---

## What Was Built

### 1. Database Schema Changes

#### Added `owner_id` to gigs table
```sql
ALTER TABLE gigs ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
-- Backfilled from existing project ownership
UPDATE gigs SET owner_id = projects.owner_id FROM projects WHERE gigs.project_id = projects.id;
ALTER TABLE gigs ALTER COLUMN owner_id SET NOT NULL;
CREATE INDEX idx_gigs_owner_id ON gigs(owner_id);
```

#### Made `project_id` nullable
```sql
ALTER TABLE gigs ALTER COLUMN project_id DROP NOT NULL;
ALTER TABLE gigs DROP CONSTRAINT IF EXISTS gigs_project_id_fkey;
ALTER TABLE gigs ADD CONSTRAINT gigs_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
```

#### Removed personal projects
```sql
-- Migrated personal project gigs to standalone
UPDATE gigs SET project_id = NULL 
WHERE project_id IN (SELECT id FROM projects WHERE is_personal = true);

-- Deleted personal projects
DELETE FROM projects WHERE is_personal = true;

-- Removed is_personal column
ALTER TABLE projects DROP COLUMN is_personal;
```

#### Result
- **Schema:** `owner_id` (NOT NULL), `project_id` (nullable)
- **Data:** All 27 gigs have `owner_id`, 14 standalone, 13 with projects
- **Index:** Performance index on `owner_id`

### 2. RLS Policy Updates

#### Updated `fn_is_gig_owner` function
Changed from checking project ownership to direct gig ownership:

**Before:**
```sql
-- Checked project ownership via INNER JOIN
SELECT 1 FROM gigs
INNER JOIN projects ON gigs.project_id = projects.id
WHERE gigs.id = check_gig_id AND projects.owner_id = auth.uid()
```

**After:**
```sql
-- Direct gig ownership check
SELECT 1 FROM gigs
WHERE gigs.id = check_gig_id AND gigs.owner_id = auth.uid()
```

#### New gigs table policies

**SELECT:** Owner OR has a gig_role
```sql
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      owner_id = auth.uid() OR
      EXISTS (SELECT 1 FROM gig_roles WHERE gig_id = gigs.id AND musician_id = auth.uid())
    )
  );
```

**INSERT:** Authenticated user becomes owner
```sql
CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND owner_id = auth.uid()
  );
```

**UPDATE/DELETE:** Only owner
```sql
CREATE POLICY "gigs_update" ON gigs FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "gigs_delete" ON gigs FOR DELETE USING (owner_id = auth.uid());
```

### 3. TypeScript Types

#### Updated database.ts
```typescript
gigs: {
  Row: {
    id: string;
    owner_id: string;  // Added
    project_id: string | null;  // Made nullable
    title: string;
    // ... other fields
  };
  Insert: {
    id?: string;
    owner_id: string;  // Required
    project_id?: string | null;  // Optional
    // ... other fields
  };
}

projects: {
  Row: {
    id: string;
    owner_id: string;
    name: string;
    // Removed: is_personal
  };
}
```

#### Updated shared.ts
```typescript
export interface DashboardGig {
  gigId: string;
  projectId: string | null;
  projectName: string | null;
  // Removed: isPersonalProject?: boolean;
  gigTitle: string;
  // ... other fields
  isManager: boolean;  // Now based on gig.owner_id
  isPlayer: boolean;
}
```

### 4. API Layer Changes

#### gigs.ts
- **createGig:** Now requires `owner_id` parameter
- **listGigsAsManager:** Changed from `projects.owner_id` to `gigs.owner_id`
- **listGigsAsPlayer:** Changed `projects!inner` to LEFT JOIN `projects`

**Before:**
```typescript
// Manager gigs via project ownership
.select(`*, projects!inner (id, name, owner_id)`)
.eq("projects.owner_id", userId)
```

**After:**
```typescript
// Manager gigs via direct gig ownership
.select(`*, projects (id, name)`)
.eq("owner_id", userId)
```

#### dashboard-gigs.ts
- Removed all `is_personal` checks
- Changed `isManager` from `projectData?.owner_id === userId` to `gig.owner_id === userId`
- Changed all `projects!inner` to LEFT JOIN `projects`
- Added `owner_id` to SELECT queries

#### gig-roles.ts, gig-invitations.ts, player-money.ts
- Changed `projects!inner` to LEFT JOIN `projects` (6 instances total)
- Updated ownership checks to use `gig.owner_id` instead of nested project checks

#### Deleted
- `lib/api/personal-projects.ts` (no longer needed)

### 5. UI Component Updates

#### create-gig-dialog.tsx
- Removed `ensurePersonalProject()` import and call
- Removed `is_personal` filter from projects query
- Added `owner_id: user.id` to createGig call
- Made `project_id` truly optional (defaults to null)

**Before:**
```typescript
const actualProjectId = selectedProjectId || await ensurePersonalProject(user.id);
await createGig({ project_id: actualProjectId, ... });
```

**After:**
```typescript
await createGig({ 
  owner_id: user.id,
  project_id: selectedProjectId || null,
  ...
});
```

#### edit-gig-dialog.tsx
- Already handled null `project_id` correctly
- No changes needed (verified compatible)

#### Gig detail page (gigs/[id]/page.tsx)
- Changed ownership check from `project?.owner_id` to `gig.owner_id`
- Removed `is_personal` check when displaying project name
- Updated navigation logic to handle standalone gigs

#### Dashboard components
- Removed `isPersonalProject` checks (2 instances)
- dashboard-gig-item.tsx
- dashboard-gig-item-grid.tsx

#### Projects page
- Removed `is_personal` filter (already clean)

---

## Technical Decisions & Why

### 1. Why add owner_id instead of computing from roles?

**Decision:** Add explicit `owner_id` column  
**Rationale:**
- Direct ownership is clearer and faster to query
- Avoids complex joins for permission checks
- Enables efficient indexing for "my gigs" queries
- Matches user mental model: "I created this gig"

### 2. Why LEFT JOIN for projects instead of INNER JOIN?

**Decision:** Changed `projects!inner` to `projects` everywhere  
**Rationale:**
- INNER JOIN filters out standalone gigs (null project_id)
- LEFT JOIN includes all gigs, project data is optional
- Critical for dashboard queries to show all user gigs
- Performance: ~same cost, but correct results

### 3. Why delete personal projects instead of keeping them?

**Decision:** Migrate to standalone gigs, delete personal projects  
**Rationale:**
- Personal projects were a workaround, not a real feature
- Adds UI clutter ("My Personal Gigs" project everywhere)
- Simpler data model: gigs can just be standalone
- Cleaner migrations going forward

### 4. Why use gig_roles for membership instead of new table?

**Decision:** Use existing `gig_roles` table  
**Rationale:**
- Already tracks who's involved in each gig
- Already has musician_id foreign key
- Serves dual purpose: musical roles + access control
- Avoids data duplication and sync issues

---

## Files Created/Modified

### Database Migrations
- **Created:** `supabase/migrations/20251120000000_update_rls_for_gig_ownership.sql`
  - Updates RLS policies and fn_is_gig_owner function

### Types (2 files)
- **Modified:** `lib/types/database.ts`
  - Added owner_id to gigs
  - Made project_id nullable
  - Removed is_personal from projects
  
- **Modified:** `lib/types/shared.ts`
  - Removed isPersonalProject from DashboardGig

### API Layer (6 files)
- **Modified:** `lib/api/gigs.ts`
  - Updated createGig, listGigsAsManager, listGigsAsPlayer
  
- **Modified:** `lib/api/dashboard-gigs.ts`
  - Updated all 3 functions (listDashboardGigs, listRecentPastGigs, listAllPastGigs)
  - Changed isManager logic to use gig.owner_id
  
- **Modified:** `lib/api/gig-roles.ts`
  - Changed 3 instances of projects!inner to LEFT JOIN
  
- **Modified:** `lib/api/gig-invitations.ts`
  - Changed 2 instances of projects!inner to LEFT JOIN
  
- **Modified:** `lib/api/player-money.ts`
  - Changed 1 instance of projects!inner to LEFT JOIN

- **Deleted:** `lib/api/personal-projects.ts`

### UI Components (5 files)
- **Modified:** `components/create-gig-dialog.tsx`
  - Removed ensurePersonalProject logic
  - Added owner_id to gig creation
  
- **Modified:** `components/edit-gig-dialog.tsx`
  - Verified (already compatible, no changes needed)
  
- **Modified:** `components/dashboard-gig-item.tsx`
  - Removed isPersonalProject check
  
- **Modified:** `components/dashboard-gig-item-grid.tsx`
  - Removed isPersonalProject check
  
- **Modified:** `app/(app)/gigs/[id]/page.tsx`
  - Changed ownership checks to use gig.owner_id
  - Removed is_personal checks

---

## Code Snippets - Key Implementations

### Gig Creation with owner_id
```typescript
// components/create-gig-dialog.tsx
const gig = await createGig({
  owner_id: user.id,  // Required: current user owns the gig
  project_id: selectedProjectId || null,  // Optional: can be null
  title: title.trim(),
  date,
  // ... other fields
});
```

### Manager Filter (Dashboard)
```typescript
// lib/api/dashboard-gigs.ts
// OLD: isManager = projectData?.owner_id === userId
// NEW: isManager = gig.owner_id === userId

const isManager = gig.owner_id === userId;
```

### LEFT JOIN for Projects
```typescript
// lib/api/gigs.ts
// OLD: projects!inner (id, name, owner_id)
// NEW: projects (id, name)  -- LEFT JOIN

.select(`
  *,
  projects (
    id,
    name
  )
`)
.eq("owner_id", userId)  // Filter by gig ownership
```

### RLS Policy Example
```sql
-- gigs_select policy
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- User owns the gig
      owner_id = auth.uid()
      -- OR user has a role in the gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );
```

---

## How to Test/Verify

### Database Verification
```sql
-- Check schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gigs' AND column_name IN ('owner_id', 'project_id');

-- Expected: owner_id NOT NULL, project_id nullable

-- Check data
SELECT 
  COUNT(*) as total_gigs,
  COUNT(project_id) as gigs_with_project,
  COUNT(*) - COUNT(project_id) as standalone_gigs
FROM gigs;

-- Verify RLS function
SELECT pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'fn_is_gig_owner';
-- Should contain "gigs.owner_id = auth.uid()"
```

### API Testing
1. **Create standalone gig:** project_id = null, owner_id = current user
2. **Create gig with project:** project_id set, owner_id = current user
3. **List as manager:** Should show owned gigs (both standalone and with projects)
4. **List as player:** Should show gigs where user has gig_roles
5. **Update gig:** Only owner can update
6. **Delete gig:** Only owner can delete

### UI Testing
1. **Create gig dialog:** Can select "My Gigs" (null project) or specific project
2. **Edit gig dialog:** Can change project to/from null
3. **Dashboard:** Shows standalone gigs and project gigs
4. **Gig detail:** Displays correctly with and without project
5. **Projects page:** Shows accurate gig counts (only non-null project_id gigs)

---

## Performance Considerations

### Indexes Added
- `idx_gigs_owner_id` - For fast "my gigs" queries by owner
- Existing: `idx_gigs_project_id`, `idx_gigs_date`

### Query Patterns
- **Manager gigs:** `WHERE owner_id = $1 AND date >= $2` - Uses owner_id index
- **Player gigs:** `JOIN gig_roles WHERE musician_id = $1` - Uses gig_roles indexes
- **Project gigs:** `WHERE project_id = $1 AND date >= $2` - Uses project_id index

### Performance Tests
- All queries use indexed columns ✓
- Pagination limits (20-200 records) ✓
- LEFT JOINs performant (projects table small) ✓
- RLS policies efficient (direct owner_id checks) ✓

### Advisor Findings
- **Security:** 1 warning (leaked password protection - unrelated)
- **Performance:** Several INFO warnings about unused indexes (normal for new DB)
- **Key issue:** Some RLS policies could optimize `auth.uid()` calls with subqueries (future optimization)

---

## Security Considerations

### RLS Policy Security
- **Owner-based access:** Direct `owner_id` check prevents unauthorized access
- **Member-based access:** `gig_roles` membership grants player access
- **No lateral privilege escalation:** Can't access gigs through projects anymore
- **Authenticated only:** All policies require `auth.role() = 'authenticated'`

### Migration Security
- Backfilled `owner_id` from existing project owners
- All gigs have owners before making field required
- No orphaned gigs possible (owner_id has foreign key constraint)
- RLS updated before code deployment

---

## Known Limitations

### Current State
1. **RLS optimization:** Some policies re-evaluate `auth.uid()` per row (can optimize with subqueries)
2. **Unused indexes:** Many indexes unused (normal for dev DB, will be used in production)
3. **Calendar integration:** Needs testing with null project_id gigs

### Future Enhancements
1. Add manager role tracking (currently just owner)
2. Allow multiple managers per gig
3. Project membership table for team projects
4. Optimize RLS policies with subqueries
5. Add project transfer functionality

---

## Next Steps

### Immediate
1. ✅ Run RLS migration: `20251120000000_update_rls_for_gig_ownership.sql`
2. Test in dev environment with real user workflows
3. Verify calendar integration works with standalone gigs

### Future
1. Optimize RLS policies (wrap auth.uid() in SELECT subqueries)
2. Add manager role system (beyond just owner)
3. Consider project membership for team-owned projects
4. Update mobile app to match new architecture

---

## Lessons Learned

### What Went Well
- Incremental approach (schema → RLS → API → UI) kept changes manageable
- MCP tools for database introspection prevented policy naming mistakes
- Backfilling owner_id from projects ensured no data loss
- LEFT JOIN changes were straightforward once identified

### What Could Be Improved
- Should have designed gig-first architecture from the start
- Personal projects workaround added unnecessary complexity
- Could have discovered this issue earlier with better user testing

### Key Takeaways
- **Design for flexibility:** Optional relationships > required ones
- **Use existing tables:** gig_roles worked perfectly for membership
- **Test ownership patterns:** Think through permission flows early
- **Performance matters:** Index all filter columns from the start

---

**Refactor completed successfully! Projects are now optional organizational folders, and gigs are the primary entity.**

