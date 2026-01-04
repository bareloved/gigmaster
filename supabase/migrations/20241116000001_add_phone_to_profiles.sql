-- Migration: Add Phone Number to Profiles
-- Created: 2024-11-16
-- Step 13.5: WhatsApp Invitation Option

-- ============================================================================
-- 1. ADD PHONE COLUMN TO PROFILES
-- ============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN public.profiles.phone IS 'User phone number in international format (e.g., +972501234567) for WhatsApp invitations';

-- ============================================================================
-- 2. UPDATE PROFILE TRIGGER TO INCLUDE PHONE
-- ============================================================================

-- Update the trigger function to include phone when creating new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, main_instrument, email, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'main_instrument',
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Check that phone column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    RAISE NOTICE '✓ Phone column added to profiles table';
  ELSE
    RAISE WARNING '✗ Phone column not found';
  END IF;
END $$;

SELECT 'Migration complete - Phone support added!' AS status;

