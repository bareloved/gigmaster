-- Add foreign key constraint from gigs.owner_id to profiles.id
-- This allows PostgREST to join gigs with profiles and fetch owner names efficiently
-- 
-- Performance: Enables single-query joins instead of multiple round trips
-- Security: Maintains referential integrity at the database level

-- ============================================
-- Add Foreign Key Constraint
-- ============================================
ALTER TABLE gigs
ADD CONSTRAINT gigs_owner_id_fkey 
FOREIGN KEY (owner_id) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- ============================================
-- Create Index for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gigs_owner_id ON gigs(owner_id);

-- ============================================
-- Documentation
-- ============================================
COMMENT ON CONSTRAINT gigs_owner_id_fkey ON gigs IS 
'Links gig owner to their profile for displaying host names in UI';

