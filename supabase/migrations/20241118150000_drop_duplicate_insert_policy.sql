-- Drop duplicate INSERT policy that doesn't support standalone gigs
-- This old policy was blocking standalone gig creation because it requires a project_id

DROP POLICY IF EXISTS "Users can insert gigs for own projects" ON gigs;

-- Verify only the correct INSERT policy remains
-- The correct policy is "gigs_insert_policy" which supports both:
-- 1. Gigs with projects (user owns the project)
-- 2. Standalone gigs (project_id IS NULL)

