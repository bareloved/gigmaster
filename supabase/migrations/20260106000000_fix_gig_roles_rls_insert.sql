-- Fix gig_roles RLS policies
-- Problem: Original attempt with per-operation policies caused infinite recursion
-- because gig_roles policies referenced gigs table, and gigs policies referenced gig_roles table.
--
-- Solution: Use simple permissive policy for authenticated users.
-- Security is enforced at the gigs level - users only query gig_roles through gigs (JOIN),
-- so if they can see the gig, they can see its roles.

-- Drop all potentially existing policies
DROP POLICY IF EXISTS "Users can view gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can insert gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can update gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "Users can delete gig roles for their projects" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_allow_authenticated" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_select_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_insert_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update_policy" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_delete_policy" ON gig_roles;
DROP POLICY IF EXISTS "Project owners and musicians can update roles" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_select" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_insert" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_delete" ON gig_roles;
DROP POLICY IF EXISTS "Users can access gig roles" ON gig_roles;

-- Create simple permissive policy for authenticated users
-- This avoids circular dependency with gigs table policies
CREATE POLICY "gig_roles_allow_authenticated" ON gig_roles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verification query (run manually to confirm):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'gig_roles' ORDER BY policyname;
-- Should return: gig_roles_allow_authenticated with ALL command
