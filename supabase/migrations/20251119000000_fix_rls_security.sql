-- 20251119000000_fix_rls_security.sql

-- Enable RLS on all tables
ALTER TABLE gig_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_files ENABLE ROW LEVEL SECURITY;

-- 1. Helper Functions (Security Definer to bypass RLS recursion)

CREATE OR REPLACE FUNCTION public.fn_is_gig_owner(check_gig_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user owns the gig directly OR owns the project the gig belongs to
  RETURN EXISTS (
    SELECT 1 FROM gigs
    LEFT JOIN projects ON gigs.project_id = projects.id
    WHERE gigs.id = check_gig_id
    AND (gigs.owner_id = auth.uid() OR projects.owner_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_is_gig_musician(check_gig_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user is assigned to a role in the gig
  RETURN EXISTS (
    SELECT 1 FROM gig_roles
    WHERE gig_roles.gig_id = check_gig_id
    AND gig_roles.musician_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_is_project_owner(check_project_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = check_project_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_is_project_participant(check_project_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if user is a musician in ANY gig for this project
  RETURN EXISTS (
    SELECT 1 FROM gigs
    JOIN gig_roles ON gigs.id = gig_roles.gig_id
    WHERE gigs.project_id = check_project_id
    AND gig_roles.musician_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop Existing Policies (using exact names found)
DROP POLICY IF EXISTS "gig_roles_allow_authenticated" ON gig_roles;

DROP POLICY IF EXISTS "gigs_delete_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_insert_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_select_policy" ON gigs;
DROP POLICY IF EXISTS "gigs_update_policy" ON gigs;

DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;

DROP POLICY IF EXISTS "Users can view setlist items for their gigs" ON setlist_items;
DROP POLICY IF EXISTS "Users can delete setlist items for their gigs" ON setlist_items;
DROP POLICY IF EXISTS "Users can insert setlist items for their gigs" ON setlist_items;
DROP POLICY IF EXISTS "Users can update setlist items for their gigs" ON setlist_items;

DROP POLICY IF EXISTS "Users can view gig files" ON gig_files;
DROP POLICY IF EXISTS "Users can delete gig files" ON gig_files;
DROP POLICY IF EXISTS "Users can insert gig files" ON gig_files;
DROP POLICY IF EXISTS "Users can update gig files" ON gig_files;

-- 3. Create New Policies

-- GIGS
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    fn_is_gig_owner(id) OR fn_is_gig_musician(id)
  );

CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR fn_is_project_owner(project_id)
  );

CREATE POLICY "gigs_update" ON gigs
  FOR UPDATE USING (
    fn_is_gig_owner(id)
  );

CREATE POLICY "gigs_delete" ON gigs
  FOR DELETE USING (
    fn_is_gig_owner(id)
  );

-- PROJECTS
CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (
    owner_id = auth.uid() OR fn_is_project_participant(id)
  );

CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
  );

CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (
    owner_id = auth.uid()
  );

-- GIG_ROLES
CREATE POLICY "gig_roles_select" ON gig_roles
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR musician_id = auth.uid()
  );

CREATE POLICY "gig_roles_insert" ON gig_roles
  FOR INSERT WITH CHECK (
    fn_is_gig_owner(gig_id)
  );

CREATE POLICY "gig_roles_delete" ON gig_roles
  FOR DELETE USING (
    fn_is_gig_owner(gig_id)
  );

-- Allow updates by owner, OR by the musician themselves (to accept invite/update notes)
-- Also allow update if the role is empty AND the user has a pending invitation for it
CREATE POLICY "gig_roles_update" ON gig_roles
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id) 
    OR musician_id = auth.uid()
    OR (
      musician_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM gig_invitations 
        WHERE gig_role_id = id 
        AND email = (auth.jwt() ->> 'email')
        AND status = 'pending'
      )
    )
  );

-- SETLIST_ITEMS
CREATE POLICY "setlist_items_select" ON setlist_items
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR fn_is_gig_musician(gig_id)
  );

CREATE POLICY "setlist_items_modify" ON setlist_items
  FOR ALL USING (
    fn_is_gig_owner(gig_id)
  );

-- GIG_FILES
CREATE POLICY "gig_files_select" ON gig_files
  FOR SELECT USING (
    fn_is_gig_owner(gig_id) OR fn_is_gig_musician(gig_id)
  );

CREATE POLICY "gig_files_modify" ON gig_files
  FOR ALL USING (
    fn_is_gig_owner(gig_id)
  );

