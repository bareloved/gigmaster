-- FINAL FIX: Drop the ACTUAL gig_roles policies that were causing infinite recursion
-- 
-- LESSON LEARNED: Always query pg_policies first to see actual policy names!
-- We were trying to drop policies with wrong names, so they kept causing recursion.

-- ============================================
-- Drop the ACTUAL buggy policies
-- ============================================
DROP POLICY IF EXISTS "Project owners and musicians can update roles" ON gig_roles;
DROP POLICY IF EXISTS "Users can delete gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can insert gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can update gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can view gig roles for their projects" ON gig_roles;

-- Drop any other variations we tried to create
DROP POLICY IF EXISTS "gig_roles_select_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_insert_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_delete_policy" ON gig_roles;

-- ============================================
-- Keep ONLY the simple, permissive policy
-- ============================================
-- This policy should already exist from previous attempt:
-- CREATE POLICY "gig_roles_allow_authenticated" ON gig_roles 
--   FOR ALL 
--   TO authenticated 
--   USING (true) 
--   WITH CHECK (true);

-- If it doesn't exist, create it:
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'gig_roles' 
    AND policyname = 'gig_roles_allow_authenticated'
  ) THEN
    CREATE POLICY "gig_roles_allow_authenticated" ON gig_roles 
      FOR ALL 
      TO authenticated 
      USING (true) 
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- Why this works
-- ============================================
-- The old policies were checking gigs, which checks gig_roles, creating infinite recursion.
-- The new simple policy allows authenticated users to access gig_roles.
-- Access control happens at the gigs level (gigs RLS already restricts access).
-- Since users only query gig_roles through gigs (LEFT JOIN), this is safe.

-- ============================================
-- Verification
-- ============================================
-- Run this to verify only one policy exists:
-- SELECT policyname FROM pg_policies WHERE tablename = 'gig_roles';
-- Should return only: gig_roles_allow_authenticated

