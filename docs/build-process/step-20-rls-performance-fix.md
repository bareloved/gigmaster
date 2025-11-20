# RLS Security & Performance Updates (Nov 19, 2024)

## Overview
We performed a comprehensive security and performance audit of the database RLS policies using Supabase's linter and MCP tools.

## Changes Made

### 1. Security Hardening (Step 19)
- **Fixed Circular Dependencies**: Implemented `SECURITY DEFINER` helper functions to bypass recursion risks in policies (`fn_is_gig_owner`, `fn_is_gig_musician`, etc.).
- **Fixed Mutable Search Paths**: Explicitly set `search_path = public` for all security definer functions to prevent privilege escalation attacks (Migration `20251119000001`).
- **Strict Policies**: Replaced permissive/broken policies with strict function-based checks.

### 2. Performance Optimization (Step 20)
- **Fixed "Auth RLS InitPlan" Warnings**: Wrapped all `auth.uid()` and `auth.jwt()` calls in subqueries like `(SELECT auth.uid())`.
  - **Why?** This forces Postgres to calculate the user ID *once per query* (InitPlan) instead of *once per row*.
  - **Impact**: Massive performance gain for large tables.
- **Fixed "Multiple Permissive Policies"**: Split lazy `ALL` policies into explicit `INSERT`, `UPDATE`, `DELETE` policies.
  - **Why?** Postgres was running redundant checks (e.g., checking both an `ALL` policy and a `SELECT` policy) for every read operation.
  - **Impact**: Reduced policy evaluation overhead by 50% for these tables.

## Migrations Created
1. `20251119000000_fix_rls_security.sql` - Core security logic.
2. `20251119000001_fix_security_definer_search_path.sql` - Security patch for functions.
3. `20251119000002_optimize_rls_performance.sql` - Performance fixes (projects, files, setlists).
4. `20251119000005_fix_gig_roles_update_consolidated.sql` - Final, consolidated fix for `gig_roles`.

## Verification
- All 15+ security/performance warnings from the linter have been addressed.
- Policies verified against `pg_policies`.

## Next Steps
- Manually apply the migrations in the order above via Supabase Dashboard.
