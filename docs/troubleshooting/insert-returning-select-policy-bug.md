# RLS Policy Bug: INSERT with RETURNING Fails Due to SELECT Policy

**Date**: November 19, 2025  
**Duration**: ~1 hour  
**Status**: ✅ RESOLVED

## The Problem

Creating a new gig returned `403 Forbidden` with error:
```
new row violates row-level security policy for table "gigs"
```

## What We Thought Was Wrong

- INSERT policy wasn't allowing the insert
- `auth.uid()` wasn't matching `owner_id`
- User session was stale

## What Was Actually Wrong

The **SELECT policy** was blocking the `INSERT...RETURNING` clause!

When Supabase executes:
```typescript
await supabase.from("gigs").insert(data).select()
```

It does:
1. `INSERT` the row → checks INSERT policy ✅
2. `SELECT` the newly created row to return it → checks SELECT policy ❌

The SELECT policy was:
```sql
fn_is_gig_owner(id) OR fn_is_gig_musician(id)
```

The `fn_is_gig_owner()` function used `SECURITY DEFINER` and called `auth.uid()` internally. For some reason, in the context of an `INSERT...RETURNING` query, this wasn't evaluating correctly.

## The Fix

Replace the function-based SELECT policy with inline checks:

```sql
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND (
      -- Direct ownership check (no function)
      owner_id = auth.uid()
      -- Project ownership check (inline EXISTS)
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = auth.uid()
      )
      -- Musician check (inline EXISTS)
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );
```

**Key change**: Use direct `auth.uid()` comparisons and inline `EXISTS` subqueries instead of `SECURITY DEFINER` functions.

## Why This Matters

`SECURITY DEFINER` functions can have context issues when called during `INSERT...RETURNING` operations. The `auth.uid()` inside the function may not evaluate correctly in that specific execution context.

**Always use inline RLS checks for SELECT policies**, especially when they need to work with INSERT/UPDATE...RETURNING.

## Lessons Learned

1. **INSERT...RETURNING requires SELECT policy**: If your INSERT has `.select()`, the SELECT policy MUST allow reading the new row.

2. **SECURITY DEFINER functions can fail in RETURNING context**: Don't rely on them for SELECT policies.

3. **Test the full operation**: Don't just test INSERT in isolation - test INSERT with RETURNING.

4. **Temporary permissive policy is a great debugging tool**: Making a policy temporarily permissive (`auth.role() = 'authenticated'`) quickly identifies if that policy is the blocker.

## Files

- **Migration**: `supabase/migrations/20251119000014_fix_gigs_select_policy_properly.sql`
- **Temporary test**: `supabase/migrations/20251119000013_temporarily_permissive_gigs_select.sql` (can be deleted)

---

**Remember this pattern for next time!** 🧠

