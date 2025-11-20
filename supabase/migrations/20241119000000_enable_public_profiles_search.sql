-- Enable public profile search for user discovery
-- This allows any authenticated user to search for other users in the system

-- Add avatar_url column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop the restrictive "Users can view own profile" policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Add public read access for all authenticated users (Facebook-style)
-- This enables user search functionality
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Keep the existing update/insert policies unchanged
-- Users can still only update their own profile

