-- ============================================================================
-- FIX NOTIFICATIONS RLS PERFORMANCE
-- ============================================================================
-- 
-- Optimize RLS policies to avoid re-evaluating auth.uid() for each row.
-- Wraps auth.uid() in a subquery so it's evaluated once per query.
--
-- This fixes the "auth_rls_initplan" warnings from Supabase database linter.
--
-- Created: 2024-11-18
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Recreate with optimized auth.uid() calls wrapped in subquery
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify policies are in place
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'notifications' 
ORDER BY policyname;

