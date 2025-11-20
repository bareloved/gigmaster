-- Calendar Integration Phase 1
-- Add ICS token support for calendar feed subscription

-- Add calendar ICS token to profiles
ALTER TABLE profiles ADD COLUMN calendar_ics_token TEXT UNIQUE;

-- Create index for fast token lookup
CREATE INDEX idx_profiles_calendar_token ON profiles(calendar_ics_token);

-- RLS is already enabled on profiles table
-- Existing policies cover the new column (users can read/update their own profile)

-- Comments for documentation
COMMENT ON COLUMN profiles.calendar_ics_token IS 'Unique token for ICS calendar feed subscription. Used to authenticate /api/calendar.ics endpoint.';

