# Step 5.5: Critical Security and Caching Fixes

**Status**: ✅ Complete  
**Date**: November 14, 2025  
**Goal**: Fix two critical bugs discovered during Step 5 testing: cross-user data leakage via RLS and cross-user cache pollution via TanStack Query.

---

## Overview

During testing of Step 5 (GigRoles), we discovered two critical bugs that could expose user data:

1. **RLS Policy Not Applied**: Users could see other users' projects in the database
2. **Cross-User Cache Pollution**: Users saw previous user's data after switching accounts (until page refresh)

Both issues were security vulnerabilities that needed immediate attention. This document details the problems, root causes, and solutions implemented.

---

## Issue 1: RLS Policies Not Applied to Projects Table

### The Problem

When testing with multiple user accounts, we discovered that:
- User A could see User B's projects
- This violated the core security model where users should only see their own data
- The bug was a **security breach** - user data was exposed across accounts

### Root Cause

The RLS policies existed in the initial migration (`supabase/migrations/20241111_initial_schema.sql`), but they may not have been applied correctly to the actual database. This can happen when:
- Migrations are run multiple times with conflicts
- Manual database changes interfere with migrations
- Policies are created but not properly associated with the table

### The Solution

**Migration**: `supabase/migrations/20241114_fix_projects_rls.sql`

Created an idempotent migration that:
1. **Drops all existing policies** using `DROP POLICY IF EXISTS`
2. **Ensures RLS is enabled** on the projects table
3. **Recreates all policies** with proper rules

```sql
-- Fix RLS policies for projects table
-- This migration ensures that users can ONLY see their own projects

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Ensure RLS is enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Recreate policies with correct rules
-- Policy: Users can ONLY view their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can ONLY create projects where they are the owner
CREATE POLICY "Users can insert own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can ONLY update their own projects
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can ONLY delete their own projects
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = owner_id);
```

### Key Points

- **USING clause**: Filters rows for SELECT, UPDATE, DELETE to only show rows where `auth.uid() = owner_id`
- **WITH CHECK clause**: Validates INSERT operations to ensure `auth.uid() = owner_id`
- **Idempotent**: Using `IF EXISTS` allows the migration to run multiple times safely

### Verification

Ran Supabase advisors check after migration:
```bash
mcp_Supabase_get_advisors(project_id, type: "security")
```

Result: No RLS-related warnings (only minor function warnings unrelated to RLS)

---

## Issue 2: Cross-User Cache Pollution via TanStack Query

### The Problem

When switching between user accounts:
1. Sign in as User A → See User A's projects ✅
2. Sign out
3. Sign in as User B → **Still see User A's projects** ❌
4. Refresh page → Now see User B's projects ✅

This created a **terrible UX** and a potential **data leak** if users didn't refresh.

### Root Cause

TanStack Query cache keys did not include the user ID, causing the cache to be shared across users:

```typescript
// ❌ BAD - Same cache key for all users
const { data: projects } = useQuery({
  queryKey: ["projects"], // Same key for User A and User B!
  queryFn: listUserProjects,
});
```

When User B signed in, React Query returned the cached data from User A because the key matched.

### The Solution

**Pattern**: Always include `user?.id` in query keys for user-specific data.

```typescript
// ✅ GOOD - Each user gets their own cache
const { user } = useUser();
const { data: projects } = useQuery({
  queryKey: ["projects", user?.id], // Different key per user
  queryFn: listUserProjects,
  enabled: !!user, // Don't query until user is loaded
});
```

### Files Modified

#### 1. `app/(app)/projects/page.tsx`

**Before**:
```typescript
const { data: projects = [], isLoading } = useQuery({
  queryKey: ["projects"],
  queryFn: listUserProjects,
  staleTime: 1000 * 60 * 5,
});

const handleProjectCreated = () => {
  queryClient.invalidateQueries({ queryKey: ["projects"] });
  setIsCreateDialogOpen(false);
};
```

**After**:
```typescript
const { user } = useUser();
const { data: projects = [], isLoading } = useQuery({
  queryKey: ["projects", user?.id], // ✅ Include user.id
  queryFn: listUserProjects,
  staleTime: 1000 * 60 * 5,
  enabled: !!user, // ✅ Don't query until user loaded
});

const handleProjectCreated = () => {
  queryClient.invalidateQueries({ queryKey: ["projects", user?.id] }); // ✅ Include user.id
  setIsCreateDialogOpen(false);
};
```

#### 2. `app/(app)/layout.tsx`

**Before**:
```typescript
await queryClient.prefetchQuery({
  queryKey: ["projects"],
  queryFn: listUserProjects,
  staleTime: 1000 * 60 * 5,
});
```

**After**:
```typescript
// Reset prefetch flag when user changes
setIsDataPrefetched(false);

await queryClient.prefetchQuery({
  queryKey: ["projects", user.id], // ✅ Include user.id
  queryFn: listUserProjects,
  staleTime: 1000 * 60 * 5,
});

// Dependency changed to user?.id to trigger re-prefetch on user change
}, [isUserLoading, user?.id, queryClient]);
```

#### 3. `app/(app)/gigs/[id]/page.tsx`

**Before**:
```typescript
const { data: musicianSuggestions = [] } = useQuery<MusicianSuggestion[]>({
  queryKey: ["musician-suggestions"],
  queryFn: () => searchMusicianNames(),
  staleTime: 1000 * 60 * 5,
});
```

**After**:
```typescript
const { user } = useUser();
const { data: musicianSuggestions = [] } = useQuery<MusicianSuggestion[]>({
  queryKey: ["musician-suggestions", user?.id], // ✅ Include user.id
  queryFn: () => searchMusicianNames(),
  staleTime: 1000 * 60 * 5,
  enabled: !!user, // ✅ Don't query until user loaded
});
```

#### 4. `components/add-role-dialog.tsx`

**Before**:
```typescript
const { data: musicianSuggestions = [] } = useQuery<MusicianSuggestion[]>({
  queryKey: ["musician-suggestions"],
  queryFn: () => searchMusicianNames(),
  staleTime: 1000 * 60 * 5,
});
```

**After**:
```typescript
const { user } = useUser();
const { data: musicianSuggestions = [] } = useQuery<MusicianSuggestion[]>({
  queryKey: ["musician-suggestions", user?.id], // ✅ Include user.id
  queryFn: () => searchMusicianNames(),
  staleTime: 1000 * 60 * 5,
  enabled: !!user, // ✅ Don't query until user loaded
});
```

### How It Works Now

Each user gets their own cache namespace:
- User A: `["projects", "user-abc-123"]`
- User B: `["projects", "user-def-456"]`

When you switch users:
1. Sign out → User context updates
2. Sign in as different user → New `user.id` in context
3. React Query sees different cache key → Fetches fresh data
4. No stale data from previous user! ✅

### Pattern Documented in BUILD_STEPS.md

Added a prominent section at the top of BUILD_STEPS.md:

```markdown
## 🚨 CRITICAL PATTERNS TO FOLLOW (EVERY STEP!)

### **TanStack Query Cache Keys - ALWAYS Include User ID**

**Problem:** Query keys without user IDs cause cross-user cache pollution.

**Solution:** ALWAYS include `user?.id` in query keys for user-specific data:

// ❌ BAD - Cache shared across all users
const { data } = useQuery({
  queryKey: ["projects"],
  queryFn: listUserProjects,
});

// ✅ GOOD - Each user gets their own cache
const { user } = useUser();
const { data } = useQuery({
  queryKey: ["projects", user?.id],
  queryFn: listUserProjects,
  enabled: !!user,
});
```

This ensures future features (Money, Dashboard, etc.) don't repeat this bug.

---

## Before/After Comparison

### RLS Issue

**Before**:
```
User A logs in → sees Project A, Project B, Project C (all users' projects) ❌
```

**After**:
```
User A logs in → sees only Project A (their own) ✅
User B logs in → sees only Project B (their own) ✅
User C logs in → sees only Project C (their own) ✅
```

### Cache Issue

**Before**:
```
1. User A logs in → sees Project A ✅
2. User A logs out
3. User B logs in → sees Project A (from cache!) ❌
4. User B refreshes → sees Project B ✅
```

**After**:
```
1. User A logs in → sees Project A ✅
2. User A logs out
3. User B logs in → sees Project B immediately ✅
4. No refresh needed!
```

---

## Testing Performed

### RLS Testing

1. Created projects as User A
2. Signed out
3. Signed in as User B
4. Verified User B only sees their own projects
5. Signed back in as User A
6. Verified User A only sees their own projects

**Result**: ✅ Users are fully isolated

### Cache Testing

1. Created projects as User A
2. Noted project names
3. Signed out (no refresh)
4. Signed in as User B
5. Verified User B's projects load immediately (not User A's)
6. Created new project as User B
7. Signed out (no refresh)
8. Signed in as User A
9. Verified User A's projects load immediately (including new ones)

**Result**: ✅ No cross-user cache pollution

---

## When to Apply User ID to Cache Keys

### Always Include user?.id for:
- Projects list
- Gigs list (if filtered by user)
- Money/payments data
- User-specific suggestions/autocomplete (like musician search)
- Dashboard data ("My Gigs as Player", "My Gigs as Manager")
- Any data that varies per user

### Don't Include user?.id for:
- Public data (if we ever have it)
- Data scoped by ID only where RLS already provides security
  - Example: Single gig by `gigId` - RLS policies handle security, cache key can be `["gig", gigId]`
- Static/shared data (themes, app config, etc.)

---

## Key Takeaways

### Defense in Depth

We now have **two layers of security**:

1. **RLS Policies (Backend)**: Prevent unauthorized data access at the database level
2. **Query Keys (Frontend)**: Prevent cache pollution at the UI level

RLS is the **critical security layer** - it prevents actual data breaches.  
Query keys are the **UX layer** - they prevent showing stale data to users.

### The Pattern

For every user-specific query, follow this pattern:

```typescript
const { user } = useUser();
const { data, isLoading } = useQuery({
  queryKey: ["feature-name", user?.id], // Always include user?.id
  queryFn: fetchUserData,
  enabled: !!user, // Don't query until user loaded
  staleTime: 1000 * 60 * 5, // Reasonable cache time
});
```

This pattern is now documented in BUILD_STEPS.md and will be followed for all future features.

---

## Impact on Future Development

### Step 6 (Setlist) - Query keys needed:
- ✅ `["setlist", gigId]` - OK (gig-specific, not user-specific)

### Step 8 (Dashboard) - Query keys needed:
- ⚠️ `["my-gigs-as-player", user?.id]` - MUST include user.id
- ⚠️ `["my-gigs-as-manager", user?.id]` - MUST include user.id

### Step 10 (Money) - Query keys needed:
- ⚠️ `["payments", user?.id]` - MUST include user.id
- ⚠️ `["money-summary", user?.id, dateRange]` - MUST include user.id

This pattern will prevent us from repeating these bugs in future features.

---

**Completion Criteria Met**: ✅

- ✅ RLS policies fixed and verified
- ✅ All user-specific queries include user.id in cache keys
- ✅ Pattern documented in BUILD_STEPS.md
- ✅ Tested with multiple users - no data leakage
- ✅ No browser refresh needed when switching users

---

*Last updated: November 14, 2025*

