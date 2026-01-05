-- Fix RLS policies for gig_roles table
-- This fixes the infinite recursion error when querying gigs with gig_roles

-- ============================================
-- Drop existing gig_roles policies
-- ============================================
DROP POLICY IF EXISTS "Users can view gig_roles for their gigs" ON gig_roles;
DROP POLICY IF EXISTS "Users can view roles they have access to" ON gig_roles;
DROP POLICY IF EXISTS "Users can view gig roles" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_select_policy" ON gig_roles;
DROP POLICY IF EXISTS "Users can insert gig_roles" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_insert_policy" ON gig_roles;
DROP POLICY IF EXISTS "Users can update gig_roles" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update_policy" ON gig_roles;
DROP POLICY IF EXISTS "Users can delete gig_roles" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_delete_policy" ON gig_roles;

-- ============================================
-- Create simple, non-recursive policies
-- ============================================

-- SELECT: View gig_roles
-- Users can view roles if they own the project OR are the musician assigned to the role
-- IMPORTANT: Do NOT reference gig_roles again to avoid recursion
CREATE POLICY "gig_roles_select_policy" ON gig_roles
  FOR SELECT
  USING (
    -- User is the musician assigned to this role
    musician_id = auth.uid()
    OR
    -- User owns the project (if gig has a project)
    EXISTS (
      SELECT 1 FROM gigs
      INNER JOIN projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- INSERT: Create gig_roles
-- Users can create roles if they own the project
-- For standalone gigs: user can only add themselves initially
CREATE POLICY "gig_roles_insert_policy" ON gig_roles
  FOR INSERT
  WITH CHECK (
    -- User owns the project
    EXISTS (
      SELECT 1 FROM gigs
      INNER JOIN projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Standalone gig: user is adding themselves as a role
    (
      musician_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM gigs
        WHERE gigs.id = gig_roles.gig_id
        AND gigs.project_id IS NULL
      )
    )
  );

-- UPDATE: Update gig_roles
-- Users can update roles if they own the project OR are the musician assigned to the role
CREATE POLICY "gig_roles_update_policy" ON gig_roles
  FOR UPDATE
  USING (
    -- User is the musician (can update their own role status)
    musician_id = auth.uid()
    OR
    -- User owns the project
    EXISTS (
      SELECT 1 FROM gigs
      INNER JOIN projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- DELETE: Delete gig_roles
-- Only project owners can delete roles
CREATE POLICY "gig_roles_delete_policy" ON gig_roles
  FOR DELETE
  USING (
    -- User owns the project
    EXISTS (
      SELECT 1 FROM gigs
      INNER JOIN projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_roles.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- ============================================
-- Performance note
-- ============================================
-- These policies use INNER JOIN for project checks to avoid circular dependencies.
-- They do NOT reference gig_roles -> gigs -> gig_roles, which would cause recursion.

