-- 20251119000001_fix_security_definer_search_path.sql

-- Fix "Function Search Path Mutable" security warnings
-- We must explicitly set the search_path for SECURITY DEFINER functions
-- to prevent potential privilege escalation attacks.

ALTER FUNCTION public.fn_is_gig_owner(uuid) SET search_path = public;
ALTER FUNCTION public.fn_is_gig_musician(uuid) SET search_path = public;
ALTER FUNCTION public.fn_is_project_owner(uuid) SET search_path = public;
ALTER FUNCTION public.fn_is_project_participant(uuid) SET search_path = public;

