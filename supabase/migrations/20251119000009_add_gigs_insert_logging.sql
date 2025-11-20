-- 20251119000009_add_gigs_insert_logging.sql

-- Temporarily add a more permissive policy for debugging
-- This will help us understand what's happening

-- First, let's create a logging function to see what values we're getting
CREATE OR REPLACE FUNCTION public.debug_gig_insert()
RETURNS trigger AS $$
BEGIN
  RAISE NOTICE 'Attempting to insert gig:';
  RAISE NOTICE '  project_id: %', NEW.project_id;
  RAISE NOTICE '  owner_id: %', NEW.owner_id;
  RAISE NOTICE '  auth.uid(): %', auth.uid();
  RAISE NOTICE '  auth.role(): %', auth.role();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create a trigger to log insert attempts
DROP TRIGGER IF EXISTS debug_gig_insert_trigger ON gigs;
CREATE TRIGGER debug_gig_insert_trigger
  BEFORE INSERT ON gigs
  FOR EACH ROW
  EXECUTE FUNCTION debug_gig_insert();

