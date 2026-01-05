-- Migration: Rename Personal Projects to "My Gigs"
-- Purpose: Update all existing personal projects to use the simpler "My Gigs" name
-- instead of "User Name's Personal Gigs"

-- Update all personal projects to use "My Gigs" as the name
UPDATE projects 
SET name = 'My Gigs'
WHERE is_personal = true 
AND (name LIKE '%''s Personal Gigs' OR name LIKE '%Personal Gigs%');

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM projects
  WHERE is_personal = true AND name = 'My Gigs';
  
  RAISE NOTICE 'Updated % personal projects to "My Gigs"', updated_count;
END $$;

