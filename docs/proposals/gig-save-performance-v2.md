# Gig Save Performance Optimization v2

## Overview

This is a revised plan based on the original proposal and feedback from 3 independent AI agents.

## Problem

Saving a gig takes **250-400ms** (after Phase 1 optimization). This still feels sluggish, especially for users in Israel connecting to a Sydney database.

## Solution: Single Atomic RPC

Create **one stored procedure** that handles everything: the main gig AND all related tables in a single database call.

### Key Changes from Original Proposal

| Original | Revised | Why |
|----------|---------|-----|
| 2 calls (gig + related items) | **1 call (everything)** | Prevents "zombie gigs" if second call fails |
| Security mode unspecified | **SECURITY INVOKER explicit** | Ensures RLS policies are respected |
| Basic error handling | **BEGIN...EXCEPTION blocks** | SQL errors are cryptic; need clear messages |
| No timing measurement | **Instrumentation before/after** | Know exactly what we gained |
| No concurrency protection | **Advisory lock per gig** | Prevents race conditions on double-save |

---

## Implementation Plan

### Phase 1: Measure Current State (Before anything else)

Add timing logs to the current save flow so we have real numbers:

```typescript
// In saveGigPack()
const startTime = performance.now();
console.log('[GIG_SAVE] Starting save...');

// ... existing code ...

console.log(`[GIG_SAVE] Total time: ${performance.now() - startTime}ms`);
```

**Why:** All agents emphasized measuring first. "We shipped a big refactor and it only saved 80ms" surprises are preventable.

---

### Phase 2: Create the Stored Procedure

#### Function Signature

```sql
CREATE OR REPLACE FUNCTION save_gig_pack(
  p_gig JSONB,              -- Main gig fields
  p_schedule JSONB,         -- Array of schedule items
  p_materials JSONB,        -- Array of materials
  p_packing JSONB,          -- Array of packing items
  p_setlist JSONB,          -- Sections + songs
  p_roles JSONB,            -- Array of roles
  p_share_token TEXT,       -- Optional share token
  p_is_editing BOOLEAN      -- Create vs update mode
) RETURNS UUID              -- Returns the gig ID
LANGUAGE plpgsql
SECURITY INVOKER            -- CRITICAL: Respects RLS policies
AS $$
```

#### Structure

```sql
DECLARE
  v_gig_id UUID;
  v_lock_acquired BOOLEAN;
BEGIN
  -- 1. Acquire advisory lock (concurrency protection)
  --    Prevents race conditions if user double-clicks save

  -- 2. Upsert main gig row
  --    INSERT...ON CONFLICT DO UPDATE
  --    RETURNING id INTO v_gig_id

  -- 3. Smart merge schedule items (BULK operations, not loops)
  --    DELETE removed items in ONE statement
  --    UPSERT kept/changed items in ONE statement

  -- 4. Smart merge materials (same pattern)

  -- 5. Smart merge packing items (same pattern)

  -- 6. Handle setlist (delete old sections, insert new)

  -- 7. Handle roles (complex merge logic)

  -- 8. Handle share token

  RETURN v_gig_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Clear error messages for debugging
    RAISE EXCEPTION 'save_gig_pack failed at step X: %', SQLERRM;
END;
$$;
```

#### Critical Implementation Details

**1. SECURITY INVOKER (All agents emphasized this)**
- Function runs with caller's permissions
- RLS policies are automatically enforced
- Do NOT use SECURITY DEFINER unless absolutely necessary

**2. Bulk Operations (Reply 1)**
```sql
-- GOOD: Set-based (one statement)
DELETE FROM gig_schedule_items
WHERE gig_id = v_gig_id
  AND id NOT IN (SELECT (item->>'id')::uuid FROM jsonb_array_elements(p_schedule) AS item);

-- BAD: Row-by-row loop
FOR item IN SELECT * FROM jsonb_array_elements(p_schedule) LOOP
  DELETE FROM gig_schedule_items WHERE id = item->>'id';
END LOOP;
```

**3. Advisory Lock (Reply 1)**
```sql
-- Prevent concurrent saves to same gig
PERFORM pg_advisory_xact_lock(hashtext(v_gig_id::text));
```

**4. Error Handling (Reply 2)**
```sql
BEGIN
  -- Step 1: Upsert gig
  -- ...
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Gig with this ID already exists (step 1)';
  WHEN foreign_key_violation THEN
    RAISE EXCEPTION 'Invalid project reference (step 1)';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'save_gig_pack failed at gig upsert: %', SQLERRM;
END;
```

---

### Phase 3: Update TypeScript Code

#### New Save Flow

```typescript
export async function saveGigPack(data: GigPack): Promise<string> {
  const supabase = createClient();
  const startTime = performance.now();

  // Single RPC call - everything happens server-side
  const { data: gigId, error } = await supabase.rpc('save_gig_pack', {
    p_gig: data.gig,
    p_schedule: data.schedule,
    p_materials: data.materials,
    p_packing: data.packing,
    p_setlist: data.setlist,
    p_roles: data.roles,
    p_share_token: data.shareToken,
    p_is_editing: data.isEditing,
  });

  console.log(`[GIG_SAVE] Completed in ${performance.now() - startTime}ms`);

  if (error) throw error;
  return gigId;
}
```

#### Client-Side Protection (Reply 1)

```typescript
// In the save button component
const [isSaving, setIsSaving] = useState(false);

const handleSave = useDebouncedCallback(async () => {
  if (isSaving) return; // Prevent double-save
  setIsSaving(true);
  try {
    await saveGigPack(data);
    toast.success('Gig saved!');
  } catch (error) {
    toast.error('Failed to save gig');
  } finally {
    setIsSaving(false);
  }
}, 300); // 300ms debounce
```

---

### Phase 4: Add Optimistic UI (Reply 2)

Use TanStack Query's optimistic updates for perceived instant saves:

```typescript
const mutation = useMutation({
  mutationFn: saveGigPack,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['gig', gigId] });

    // Snapshot previous value
    const previous = queryClient.getQueryData(['gig', gigId]);

    // Optimistically update cache
    queryClient.setQueryData(['gig', gigId], newData);

    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['gig', gigId], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['gig', gigId] });
  },
});
```

**Result:** User sees instant update. If server fails, UI rolls back.

---

### Phase 5: Keep Fallback

Do NOT delete the current TypeScript save functions. Add a feature flag:

```typescript
const USE_RPC_SAVE = true; // Flip to false if RPC has issues

export async function saveGigPack(data: GigPack): Promise<string> {
  if (USE_RPC_SAVE) {
    return saveGigPackRPC(data);     // New stored procedure
  } else {
    return saveGigPackLegacy(data);  // Current TypeScript code
  }
}
```

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Network calls | 18+ | 1 |
| Actual save time | 250-400ms | ~80-120ms |
| Perceived save time | 250-400ms | ~0ms (optimistic UI) |
| Data integrity risk | Partial saves possible | Fully atomic |

---

## Rollout Checklist

- [ ] Add timing instrumentation to current code
- [ ] Run 10 saves, record baseline times
- [ ] Create stored procedure migration
- [ ] Test on Supabase branch first
- [ ] Update TypeScript to use RPC
- [ ] Add debounce and save-in-progress protection
- [ ] Add optimistic UI
- [ ] Run 10 saves, compare to baseline
- [ ] Monitor for errors in production
- [ ] Remove fallback after 1 week of stability

---

## Alternative Considered: Edge Functions

Reply 3 suggested Edge Functions as a middle-ground:
- Deploy a function in the same region as the database
- Still makes multiple DB calls, but with ~1-2ms latency each instead of 50ms

**Why we're not doing this:**
- Stored procedure is more efficient (same transaction, no serialization overhead)
- Edge Functions add another layer of infrastructure
- We want the atomic transaction guarantee

---

## Long-Term: Database Region

Reply 1 noted that even with 1 RPC call, Sydney → Israel latency is significant.

**Future consideration:** If most users are in Israel/Europe, migrate to `eu-central-1` (Frankfurt) or `eu-west-1` (Dublin). This would cut base RTT from ~200-300ms to ~30-50ms.

Not doing this now because:
- Requires data migration
- Project is early stage
- RPC optimization will help significantly first

---

## Files Affected

1. `supabase/migrations/XXXXXX_save_gig_pack.sql` (new)
2. `app/(app)/gigs/actions.ts` (modify saveGigPack)
3. `lib/types/database.ts` (add RPC type)
4. Save button component (add debounce/loading state)

---

*Created: January 2025*
*Status: IMPLEMENTED*
*Based on: Original proposal + 3 agent reviews*

---

## Implementation Summary

**Completed on: January 7, 2026**

### What was implemented:
1. ✅ Timing instrumentation added to `saveGigPack` function
2. ✅ Stored procedure `save_gig_pack` created and deployed
3. ✅ TypeScript updated to use single RPC call
4. ✅ Feature flag `USE_RPC_SAVE` for easy rollback
5. ✅ Legacy code preserved as fallback

### Files changed:
- `supabase/migrations/20260107000000_save_gig_pack_rpc.sql` - New stored procedure
- `app/(app)/gigs/actions.ts` - Updated to use RPC with fallback
- `lib/types/database.ts` - Added RPC type definition

### Existing protections kept:
- Optimistic UI updates (already in `useSaveGigPack` hook)
- Button disabled during save (already in `gig-editor-panel.tsx`)
- TanStack Query cache invalidation (already implemented)

### To test:
1. Open the app and create/edit a gig
2. Check server console for `[GIG_SAVE_RPC]` timing logs
3. Compare times with legacy method by setting `USE_RPC_SAVE = false`
