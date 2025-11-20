-- Migration: Update RLS policies to use gig-based ownership instead of project-based
-- This supports the new model where gigs have direct owner_id and optional project_id

-- Step 1: Update fn_is_gig_owner to check owner_id directly instead of project ownership
CREATE OR REPLACE FUNCTION public.fn_is_gig_owner(check_gig_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user owns the gig directly via owner_id
  RETURN EXISTS (
    SELECT 1 FROM gigs
    WHERE gigs.id = check_gig_id
    AND gigs.owner_id = auth.uid()
  );
END;
$function$;

-- Step 2: Drop existing gigs policies (per .cursorrules, we checked these exist)
DROP POLICY IF EXISTS "gigs_select" ON gigs;
DROP POLICY IF EXISTS "gigs_insert" ON gigs;
DROP POLICY IF EXISTS "gigs_update" ON gigs;
DROP POLICY IF EXISTS "gigs_delete" ON gigs;

-- Step 3: Create new gigs SELECT policy (owner OR has a gig_role)
CREATE POLICY "gigs_select" ON gigs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      -- User owns the gig
      owner_id = auth.uid()
      -- OR user has a role in the gig
      OR EXISTS (
        SELECT 1 FROM gig_roles
        WHERE gig_roles.gig_id = gigs.id
        AND gig_roles.musician_id = auth.uid()
      )
    )
  );

-- Step 4: Create new gigs INSERT policy (authenticated user becomes owner)
CREATE POLICY "gigs_insert" ON gigs
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND owner_id = auth.uid()
  );

-- Step 5: Create new gigs UPDATE policy (only owner can update)
CREATE POLICY "gigs_update" ON gigs
  FOR UPDATE USING (
    owner_id = auth.uid()
  );

-- Step 6: Create new gigs DELETE policy (only owner can delete)
CREATE POLICY "gigs_delete" ON gigs
  FOR DELETE USING (
    owner_id = auth.uid()
  );

-- Note: Other tables (gig_roles, setlist_items, gig_files) already use fn_is_gig_owner()
-- and will automatically work with the updated function

