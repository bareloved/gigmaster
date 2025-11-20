-- 20251119000006_fix_gig_roles_update_definer.sql

-- The "Auth RLS InitPlan" warning persists because the complex OR logic 
-- with the nested EXISTS subquery prevents Postgres from optimizing the auth.jwt() call,
-- even when wrapped in (SELECT ...).

-- Solution: Move the entire invitation check logic into a SECURITY DEFINER function.
-- This forces the logic to be compiled and optimized separately, and the policy 
-- becomes a simple function call which Postgres can handle efficiently.

CREATE OR REPLACE FUNCTION public.fn_can_update_gig_role(check_role_id uuid, check_gig_id uuid, check_musician_id uuid)
RETURNS boolean AS $$
DECLARE
  user_email text;
BEGIN
  -- 1. Check if user owns the gig (using existing optimized function)
  IF fn_is_gig_owner(check_gig_id) THEN
    RETURN true;
  END IF;

  -- 2. Check if user is the assigned musician
  IF check_musician_id = auth.uid() THEN
    RETURN true;
  END IF;

  -- 3. Check if user is an invitee
  -- Only check if no musician is assigned
  IF check_musician_id IS NULL THEN
    -- Get email once
    user_email := (auth.jwt() ->> 'email');
    
    IF EXISTS (
      SELECT 1 FROM gig_invitations 
      WHERE gig_role_id = check_role_id 
      AND status = 'pending'
      AND email = user_email
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Replace the policy with the simple function call
DROP POLICY IF EXISTS "gig_roles_update" ON gig_roles;

CREATE POLICY "gig_roles_update" ON gig_roles
  FOR UPDATE USING (
    fn_can_update_gig_role(id, gig_id, musician_id)
  );

