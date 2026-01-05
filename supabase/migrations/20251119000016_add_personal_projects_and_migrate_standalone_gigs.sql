-- Migration: Add Personal Projects and Migrate Standalone Gigs
-- Purpose: Unify gig ownership model by eliminating standalone gigs
-- All gigs must belong to a project. Personal projects are auto-created for users.

-- Step 1: Add is_personal flag to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_personal BOOLEAN DEFAULT false;

-- Step 2: Create personal projects for all users who don't have one
INSERT INTO projects (owner_id, name, description, is_personal, created_at, updated_at)
SELECT 
  p.id, 
  p.name || '''s Personal Gigs', 
  'Auto-created personal project for standalone gigs',
  true,
  NOW(),
  NOW()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM projects 
  WHERE projects.owner_id = p.id 
  AND projects.is_personal = true
);

-- Step 3: Migrate standalone gigs to their owner's personal project
UPDATE gigs
SET project_id = (
  SELECT projects.id 
  FROM projects 
  WHERE projects.owner_id = gigs.owner_id 
  AND projects.is_personal = true
  LIMIT 1
)
WHERE project_id IS NULL AND owner_id IS NOT NULL;

-- Step 3.5: Handle orphaned gigs (no project_id AND no owner_id)
-- Delete orphaned gigs that have no owner and no roles
DELETE FROM gigs
WHERE project_id IS NULL 
AND owner_id IS NULL
AND NOT EXISTS (
  SELECT 1 FROM gig_roles WHERE gig_roles.gig_id = gigs.id
);

-- Step 3.6: For orphaned gigs that DO have roles, assign to first role's musician's personal project
-- This shouldn't happen in normal operation but handles edge case
UPDATE gigs
SET project_id = (
  SELECT projects.id
  FROM gig_roles
  JOIN projects ON projects.owner_id = gig_roles.musician_id AND projects.is_personal = true
  WHERE gig_roles.gig_id = gigs.id
  LIMIT 1
)
WHERE project_id IS NULL AND owner_id IS NULL
AND EXISTS (
  SELECT 1 FROM gig_roles WHERE gig_roles.gig_id = gigs.id
);

-- Step 4: Make project_id required (all gigs must have a project now)
ALTER TABLE gigs ALTER COLUMN project_id SET NOT NULL;

-- Step 5: Drop policies that depend on gigs.owner_id before dropping the column
DROP POLICY IF EXISTS "Users can view gig invitations" ON gig_invitations;
DROP POLICY IF EXISTS "Users can create gig invitations" ON gig_invitations;
DROP POLICY IF EXISTS "Users can view status history for accessible roles" ON gig_role_status_history;
DROP POLICY IF EXISTS gigs_insert ON gigs;
DROP POLICY IF EXISTS gigs_select ON gigs;
DROP POLICY IF EXISTS gigs_update ON gigs;
DROP POLICY IF EXISTS gigs_delete ON gigs;

-- Step 5.5: Drop owner_id column (no longer needed - ownership is through projects)
ALTER TABLE gigs DROP COLUMN IF EXISTS owner_id;

-- Step 6: Recreate policies that were dropped (now without owner_id references)

-- Recreate gig_invitations policies without owner_id checks
CREATE POLICY "Users can view gig invitations" ON gig_invitations
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- User is the invitee
      email = (SELECT email FROM auth.users WHERE id = auth.uid())
      -- OR user owns the project
      OR EXISTS (
        SELECT 1 FROM gigs
        JOIN projects ON gigs.project_id = projects.id
        WHERE gigs.id = gig_invitations.gig_id
        AND projects.owner_id = auth.uid()
      )
      -- OR user has a role in the gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gig_invitations.gig_id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create gig invitations" ON gig_invitations
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM gigs
      JOIN projects ON gigs.project_id = projects.id
      WHERE gigs.id = gig_invitations.gig_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Recreate gig_role_status_history policy without owner_id check
CREATE POLICY "Users can view status history for accessible roles" ON gig_role_status_history
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- User owns the project
      EXISTS (
        SELECT 1 FROM gig_roles
        JOIN gigs ON gig_roles.gig_id = gigs.id
        JOIN projects ON gigs.project_id = projects.id
        WHERE gig_roles.id = gig_role_status_history.gig_role_id
        AND projects.owner_id = auth.uid()
      )
      -- OR it's the user's own role
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.id = gig_role_status_history.gig_role_id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

-- Step 7: Update RLS policies for gigs table

-- Update fn_is_gig_owner function to only check project ownership
CREATE OR REPLACE FUNCTION public.fn_is_gig_owner(check_gig_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user owns the project that the gig belongs to
  RETURN EXISTS (
    SELECT 1 FROM gigs
    INNER JOIN projects ON gigs.project_id = projects.id
    WHERE gigs.id = check_gig_id
    AND projects.owner_id = auth.uid()
  );
END;
$function$;

-- Recreate gigs_insert policy (without owner_id check)
CREATE POLICY gigs_insert ON gigs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND fn_is_project_owner(project_id)
  );

-- Recreate gigs_select policy (without owner_id check)
CREATE POLICY gigs_select ON gigs
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      -- User owns the project
      EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = gigs.project_id
        AND projects.owner_id = auth.uid()
      )
      -- OR user has a role in the gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

-- Recreate gigs_update policy (project-based ownership)
CREATE POLICY gigs_update ON gigs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND fn_is_gig_owner(id)
  );

-- Recreate gigs_delete policy (project-based ownership)
CREATE POLICY gigs_delete ON gigs
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND fn_is_gig_owner(id)
  );

