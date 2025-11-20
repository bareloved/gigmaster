-- Add default country code to profiles
-- This allows users to set their default country code once, 
-- so phone inputs auto-populate with it

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_country_code TEXT DEFAULT '+972';

COMMENT ON COLUMN profiles.default_country_code IS 'Default country code for phone numbers (e.g., +972 for Israel, +1 for USA)';

-- Backfill existing users with +972 (Israel) as default
UPDATE public.profiles
SET default_country_code = '+972'
WHERE default_country_code IS NULL;

