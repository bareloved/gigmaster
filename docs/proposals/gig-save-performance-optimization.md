# Gig Save Performance Optimization Proposal

## Problem Statement

Saving a gig (create or edit) takes **600-1000ms**, making the app feel sluggish. Users notice a delay between clicking "Save" and seeing confirmation.

## Root Cause Analysis

### Database Location
Our Supabase instance is in `ap-southeast-2` (Sydney, Australia). Each database call has **~50-100ms network latency**.

### Current Architecture (After Phase 1 Optimization)

When saving a gig, we currently make **18+ database calls**:

```
1. Upsert gig table                          → 1 call

Then IN PARALLEL (Promise.all), each table does 3 calls internally:
2. gig_roles:         SELECT → DELETE → UPSERT  → 3 calls
3. gig_schedule_items: SELECT → DELETE → UPSERT → 3 calls
4. gig_materials:      SELECT → DELETE → UPSERT → 3 calls
5. gig_packing_items:  SELECT → DELETE → UPSERT → 3 calls
6. setlist_sections:   DELETE → INSERT → INSERT  → 3 calls
7. gig_shares:         SELECT → INSERT/UPDATE    → 2 calls

Total: ~18 database round trips
```

Even with parallel execution, we're bottlenecked by:
- Network latency (~50ms per call minimum)
- Sequential calls within each smart merge function
- Promise.all completes when the **slowest** operation finishes

### Timeline of Optimizations

| Phase | What We Did | Result |
|-------|-------------|--------|
| Original | 11 sequential DB calls | ~900ms |
| Phase 1 (completed) | Parallelized with Promise.all + smart merge | ~250-400ms |
| Phase 2 (proposed) | Single stored procedure | ~100-150ms |

## Proposed Solution: Postgres Stored Procedure

Create a database function `save_gig_related_items()` that handles ALL related table operations in a **single database call**.

### How It Works

```sql
-- Pseudocode
CREATE FUNCTION save_gig_related_items(
  p_gig_id UUID,
  p_schedule JSONB,
  p_materials JSONB,
  p_packing JSONB,
  p_setlist JSONB,
  p_roles JSONB,
  p_share_token TEXT,
  p_is_editing BOOLEAN
) RETURNS void AS $$
BEGIN
  -- All operations happen server-side in one transaction

  -- 1. Smart merge schedule items
  DELETE FROM gig_schedule_items WHERE gig_id = p_gig_id AND id NOT IN (select ids from p_schedule);
  INSERT INTO gig_schedule_items ... ON CONFLICT (id) DO UPDATE ...;

  -- 2. Smart merge materials (same pattern)
  -- 3. Smart merge packing items (same pattern)
  -- 4. Handle setlist sections + songs
  -- 5. Handle roles (with special merge logic)
  -- 6. Handle share token

END;
$$ LANGUAGE plpgsql;
```

### New Save Flow

```
BEFORE (18 calls):
┌─────────────────────────────────────────────────────────┐
│ Client                          │ Database              │
├─────────────────────────────────┼───────────────────────┤
│ saveGigPack()                   │                       │
│   → upsert gig                  │ ←→ 1 call (~50ms)    │
│   → Promise.all([               │                       │
│       smartMergeSchedule()      │ ←→ 3 calls (~150ms)  │
│       smartMergeMaterials()     │ ←→ 3 calls (~150ms)  │
│       smartMergePacking()       │ ←→ 3 calls (~150ms)  │
│       handleSetlist()           │ ←→ 3 calls (~150ms)  │
│       handleRoles()             │ ←→ 3 calls (~150ms)  │
│       handleShares()            │ ←→ 2 calls (~100ms)  │
│     ])                          │                       │
│                                 │                       │
│ Total: ~250-400ms               │                       │
└─────────────────────────────────┴───────────────────────┘

AFTER (2 calls):
┌─────────────────────────────────────────────────────────┐
│ Client                          │ Database              │
├─────────────────────────────────┼───────────────────────┤
│ saveGigPack()                   │                       │
│   → upsert gig                  │ ←→ 1 call (~50ms)    │
│   → save_gig_related_items()    │ ←→ 1 call (~50ms)    │
│                                 │   (all logic runs     │
│                                 │    server-side)       │
│                                 │                       │
│ Total: ~100-150ms               │                       │
└─────────────────────────────────┴───────────────────────┘
```

## Pros and Cons

### Pros

| Benefit | Impact |
|---------|--------|
| **~70% faster saves** | 250ms → 100ms |
| **Single network round trip** | Eliminates latency multiplication |
| **Atomic transaction** | All changes succeed or fail together |
| **Less data over the wire** | Only send data once, not in multiple calls |
| **Database-optimized** | Postgres handles JSON operations efficiently |
| **Scales better** | Performance won't degrade as data grows |

### Cons

| Concern | Mitigation |
|---------|------------|
| **Harder to debug** | Add detailed logging in the function |
| **SQL is less familiar** | Document thoroughly, keep TS fallback |
| **Logic split between TS and SQL** | Clear separation: TS handles gig, SQL handles related items |
| **Migration required** | One-time migration, can be tested on branch first |
| **If function breaks, harder to fix** | Keep current TS code as fallback, can switch back |

## Implementation Plan

### Step 1: Create the Stored Procedure
- Write the `save_gig_related_items()` function
- Apply via Supabase migration
- Test on a development branch first

### Step 2: Update TypeScript Code
- Replace 6 helper functions with single RPC call:
```typescript
// Before
await Promise.all([
  smartMergeScheduleItems(...),
  smartMergeMaterials(...),
  // ... 4 more
]);

// After
await supabase.rpc('save_gig_related_items', {
  p_gig_id: finalGigId,
  p_schedule: data.schedule,
  p_materials: data.materials,
  // ... rest of params
});
```

### Step 3: Keep Fallback
- Don't delete the current TS helper functions
- Add feature flag or try/catch to fall back if RPC fails

### Step 4: Monitor & Measure
- Log actual save times before/after
- Monitor for any errors from the stored procedure

## Security Considerations

- RLS policies will still apply (function runs as the calling user)
- No SQL injection risk (using parameterized JSONB inputs)
- Same authentication checks as current code

## Questions for Discussion

1. **Are we comfortable with SQL in the codebase?** The function will be ~100 lines of PL/pgSQL.

2. **Testing strategy?** Should we test on a Supabase branch first?

3. **Rollback plan?** Keep TS code as fallback, or fully commit to SQL approach?

4. **Timeline?** This could be implemented in 2-3 hours.

## Files Affected

- `supabase/migrations/XXXXXX_save_gig_related_items.sql` (new)
- `app/(app)/gigs/actions.ts` (modify saveGigPack function)
- `lib/types/database.ts` (add RPC type if using generated types)

## Decision

- [ ] Proceed with stored procedure
- [ ] Try other optimizations first
- [ ] Need more information

---

*Created: January 2025*
*Author: Claude (AI assistant)*
*Status: Proposal - Awaiting Review*
