-- Fix RLS policies for optional project_id
-- This migration fixes the infinite recursion issue in the previous migration
-- 
-- Context: The initial optional project_id migration (20241118104500) had overly complex
-- RLS policies that caused infinite recursion. This migration replaces them with simpler,
-- more efficient policies.

-- ============================================
-- Drop existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view gigs they have access to" ON gigs;
DROP POLICY IF EXISTS "Users can view gigs" ON gigs;
DROP POLICY IF EXISTS "Users can create gigs in their projects or standalone" ON gigs;
DROP POLICY IF EXISTS "Users can create gigs" ON gigs;
DROP POLICY IF EXISTS "Users can update gigs in their projects or standalone" ON gigs;
DROP POLICY IF EXISTS "Users can update gigs" ON gigs;
DROP POLICY IF EXISTS "Users can delete gigs in their projects or standalone" ON gigs;
DROP POLICY IF EXISTS "Users can delete gigs" ON gigs;
DROP POLICY IF EXISTS "gigs_select_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_insert_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_update_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_delete_policy" ON gigs;

-- ============================================
-- Create simple, non-recursive policies
-- ============================================

-- SELECT: View gigs
-- Users can view gigs if they own the project OR have a gig_role on the gig
CREATE POLICY "gigs_select_policy" ON gigs
  FOR SELECT
  USING (
    -- User owns the project (if it exists)
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- User has a role on this gig
    EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    )
  );

-- INSERT: Create gigs
-- Users can create gigs in owned projects OR standalone gigs (project_id IS NULL)
CREATE POLICY "gigs_insert_policy" ON gigs
  FOR INSERT
  WITH CHECK (
    -- Can create in owned projects
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Can create standalone gigs
    project_id IS NULL
  );

-- UPDATE: Update gigs
-- Users can update gigs if they own the project OR have a role on the gig
CREATE POLICY "gigs_update_policy" ON gigs
  FOR UPDATE
  USING (
    -- Can update gigs in owned projects
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Can update gigs where user has a role
    EXISTS (
      SELECT 1 FROM gig_roles
      WHERE gig_roles.gig_id = gigs.id
      AND gig_roles.musician_id = auth.uid()
    )
  );

-- DELETE: Delete gigs
-- Users can delete gigs if they own the project
CREATE POLICY "gigs_delete_policy" ON gigs
  FOR DELETE
  USING (
    -- Can delete gigs in owned projects
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = gigs.project_id
      AND projects.owner_id = auth.uid()
    )
    OR
    -- Can delete standalone gigs where user has a role
    (
      project_id IS NULL
      AND EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

-- ============================================
-- Performance note
-- ============================================
-- These policies use simple EXISTS subqueries that Postgres can optimize efficiently.
-- They avoid circular dependencies and work correctly with LEFT JOINs in application code.

