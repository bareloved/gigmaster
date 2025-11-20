-- Add notes and schedule columns to gigs table
-- Part of Enhanced Calendar Import (Phase 1.6)

-- Add notes column for general event description/notes (skip if exists)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add schedule column for parsed schedule information
-- (arrival, load-in, soundcheck, doors, showtime, etc.)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS schedule TEXT;

-- Add index for searching notes (skip if exists)
CREATE INDEX IF NOT EXISTS idx_gigs_notes ON gigs USING gin(to_tsvector('english', notes)) WHERE notes IS NOT NULL;

-- Comment columns for documentation
COMMENT ON COLUMN gigs.notes IS 'General notes and description text from calendar events or user input';
COMMENT ON COLUMN gigs.schedule IS 'Parsed schedule information (arrival time, soundcheck, doors, showtime, etc.)';

