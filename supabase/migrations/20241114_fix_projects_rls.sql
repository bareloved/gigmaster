-- Fix RLS policies for projects table
-- This migration ensures that users can ONLY see their own projects

-- Drop all existing policies on projects table
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Ensure RLS is enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Recreate policies with correct rules
-- Policy: Users can ONLY view their own projects
CREATE POLICY "Users can view own projects"
  ON public.projects
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can ONLY create projects where they are the owner
CREATE POLICY "Users can insert own projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can ONLY update their own projects
CREATE POLICY "Users can update own projects"
  ON public.projects
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can ONLY delete their own projects
CREATE POLICY "Users can delete own projects"
  ON public.projects
  FOR DELETE
  USING (auth.uid() = owner_id);

