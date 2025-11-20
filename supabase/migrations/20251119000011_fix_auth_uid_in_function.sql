-- 20251119000011_fix_auth_uid_in_function.sql

-- The issue is that auth.uid() inside a SECURITY DEFINER function
-- might not have the correct search_path or context
-- Let's make it more explicit and add logging

CREATE OR REPLACE FUNCTION public.fn_can_insert_gig(check_project_id uuid, check_owner_id uuid)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  -- Log for debugging (will show in Supabase logs)
  RAISE LOG 'fn_can_insert_gig called: project_id=%, owner_id=%, auth.uid()=%', 
    check_project_id, check_owner_id, current_user_id;
  
  -- Case 1: Standalone gig (no project)
  IF check_project_id IS NULL THEN
    -- User must be the owner
    IF check_owner_id IS NULL THEN
      RAISE LOG 'Rejecting: owner_id is NULL';
      RETURN false;
    END IF;
    
    IF current_user_id IS NULL THEN
      RAISE LOG 'Rejecting: auth.uid() is NULL';
      RETURN false;
    END IF;
    
    IF check_owner_id = current_user_id THEN
      RAISE LOG 'Allowing: owner_id matches auth.uid()';
      RETURN true;
    ELSE
      RAISE LOG 'Rejecting: owner_id % does not match auth.uid() %', check_owner_id, current_user_id;
      RETURN false;
    END IF;
  END IF;
  
  -- Case 2: Project gig
  -- User must own the project
  RETURN fn_is_project_owner(check_project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

