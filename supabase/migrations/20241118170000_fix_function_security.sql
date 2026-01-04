-- Migration: Fix Function Security Issues
-- Created: 2024-11-18
-- Purpose: Add search_path configuration to all functions to prevent SQL injection vulnerabilities
-- 
-- This migration addresses Supabase security warnings by setting search_path = '' 
-- on all database functions, forcing fully-qualified table names.

-- ============================================================================
-- 1. FIX handle_updated_at FUNCTION
-- ============================================================================
-- Generic trigger function for automatically updating updated_at timestamps
-- Used by: profiles, gigs, projects, and other tables

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Trigger function to automatically update updated_at timestamp. Security hardened with search_path.';

-- ============================================================================
-- 2. FIX update_gig_roles_updated_at FUNCTION
-- ============================================================================
-- Specific trigger function for gig_roles table updated_at timestamps

CREATE OR REPLACE FUNCTION public.update_gig_roles_updated_at()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_gig_roles_updated_at() IS 'Trigger function for gig_roles updated_at. Security hardened with search_path.';

-- ============================================================================
-- 3. FIX expire_old_invitations FUNCTION
-- ============================================================================
-- Cron job function to automatically expire pending invitations past their expiry date
-- Called by pg_cron or scheduled job

CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.gig_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;

COMMENT ON FUNCTION public.expire_old_invitations() IS 'Expires old pending invitations. SECURITY DEFINER - search_path hardened.';

-- ============================================================================
-- 4. FIX handle_new_user FUNCTION
-- ============================================================================
-- Auth trigger to automatically create profile when new user signs up
-- Syncs data from auth.users to public.profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

COMMENT ON FUNCTION public.handle_new_user() IS 'Creates/updates profile on user signup. SECURITY DEFINER - search_path hardened.';

-- ============================================================================
-- 5. FIX sync_user_email FUNCTION
-- ============================================================================
-- Auth trigger to sync email changes from auth.users to public.profiles
-- Ensures profile email stays in sync with auth email

CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
SET search_path = ''
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_user_email() IS 'Syncs email changes from auth.users to profiles. SECURITY DEFINER - search_path hardened.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Security hardening complete for 5 functions:';
  RAISE NOTICE '  - handle_updated_at';
  RAISE NOTICE '  - update_gig_roles_updated_at';
  RAISE NOTICE '  - expire_old_invitations';
  RAISE NOTICE '  - handle_new_user';
  RAISE NOTICE '  - sync_user_email';
  RAISE NOTICE '';
  RAISE NOTICE 'All functions now have search_path = '''' to prevent SQL injection.';
  RAISE NOTICE 'Check Supabase dashboard to verify security warnings are resolved.';
END $$;

SELECT 'Migration complete - Function security issues fixed!' AS status;

