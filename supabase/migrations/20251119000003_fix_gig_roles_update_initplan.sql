-- 20251119000003_fix_gig_roles_update_initplan.sql

-- Fix lingering "Auth RLS Initialization Plan" warning for gig_roles_update
-- The issue is specifically in the nested subquery where auth.jwt() was not fully isolated

DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;

CREATE POLICY "gig_roles_update" ON gig_roles
  FOR UPDATE USING (
    fn_is_gig_owner(gig_id) 
    OR musician_id = (SELECT auth.uid())
    OR (
      musician_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM gig_invitations 
        WHERE gig_role_id = id 
        -- The fix: Wrap the auth.jwt() call in its own subquery comparison
        AND email = (SELECT (auth.jwt() ->> 'email')::text)
        AND status = 'pending'
      )
    )
  );

