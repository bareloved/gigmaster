-- Migration: Optimize Public Profiles Search Policy
-- Created: 2024-11-19
-- Purpose: Fix RLS performance warning for profiles table
--
-- ISSUE: The "Authenticated users can view all profiles" policy calls auth.role()
-- without wrapping it in a subquery, causing it to be re-evaluated for every row.
--
-- SOLUTION: Wrap auth.role() in (select auth.role()) to cache the result.

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- Recreate with optimized auth function call
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING ((select auth.role()) = 'authenticated');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Profiles search policy optimized!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changed:';
  RAISE NOTICE '  Before: auth.role() = ''authenticated'' (re-evaluated per row)';
  RAISE NOTICE '  After:  (select auth.role()) = ''authenticated'' (cached)';
  RAISE NOTICE '';
  RAISE NOTICE 'Performance Impact: Queries checking profile access will be much faster';
  RAISE NOTICE 'Check Supabase dashboard to verify the warning is resolved.';
END $$;

SELECT 'Migration complete - Profiles search policy optimized!' AS status;

