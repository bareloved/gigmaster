-- 20251119000002_optimize_rls_performance.sql

-- Fix "Auth RLS Initialization Plan" warnings
-- Wrap auth.uid() calls in subqueries to avoid re-evaluation for every row

-- 1. Fix projects policies
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    owner_id = (SELECT auth.uid()) OR fn_is_project_participant(id)
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    owner_id = (SELECT auth.uid())
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    owner_id = (SELECT auth.uid())
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    owner_id = (SELECT auth.uid())
  );

-- 2. Fix gigs policies (only the ones using auth.uid directly)
DROP POLICY IF EXISTS "gigs_insert" ON gigs;

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    (SELECT auth.uid()) = owner_id OR fn_is_project_owner(project_id)
  );

-- 3. Fix gig_roles policies
DROP POLICY IF EXISTS "gig_roles_select" ON gig_roles;
DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;

CREATE POLICY "gig_roles_select" ON gig_roles
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR musician_id = (SELECT auth.uid())
  );

CREATE POLICY "gig_roles_update" ON gig_roles
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id) 
    OR musician_id = (SELECT auth.uid())
    OR (
      musician_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM gig_invitations 
        WHERE gig_role_id = id 
        AND email = (SELECT auth.jwt() ->> 'email')
        AND status = 'pending'
      )
    )
  );

-- Fix "Multiple Permissive Policies" warnings
-- setlist_items and gig_files had overlapping ALL vs SELECT policies
-- We will consolidate them into specific actions to avoid redundant checks

-- 4. Fix setlist_items permissive policies
DROP POLICY IF EXISTS "setlist_items_select" ON setlist_items;
DROP POLICY IF EXISTS "setlist_items_modify" ON setlist_items;

CREATE POLICY "setlist_items_select" ON setlist_items
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR fn_is_gig_musician(gig_id)
  );

CREATE POLICY "setlist_items_insert" ON setlist_items
  FOR INSERT WITH CHECK (
    fn_is_gig_owner(gig_id)
  );

CREATE POLICY "setlist_items_update" ON setlist_items
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id)
  );

CREATE POLICY "setlist_items_delete" ON setlist_items
  FOR DELETE USING (
    fn_is_gig_owner(gig_id)
  );

-- 5. Fix gig_files permissive policies
DROP POLICY IF EXISTS "gig_files_select" ON gig_files;
DROP POLICY IF EXISTS "gig_files_modify" ON gig_files;

CREATE POLICY "gig_files_select" ON gig_files
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR fn_is_gig_musician(gig_id)
  );

CREATE POLICY "gig_files_insert" ON gig_files
  FOR INSERT WITH CHECK (
    fn_is_gig_owner(gig_id)
  );

CREATE POLICY "gig_files_update" ON gig_files
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id)
  );

CREATE POLICY "gig_files_delete" ON gig_files
  FOR DELETE USING (
    fn_is_gig_owner(gig_id)
  );

