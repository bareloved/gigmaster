# Step 22: Database Function Security Hardening

**Date:** November 18, 2024  
**Status:** ✅ Completed  
**Priority:** HIGH - Security Issue

## Overview

Fixed critical security vulnerabilities in 5 database functions flagged by Supabase's security linter. All functions were missing `search_path` configuration, which could allow malicious SQL injection attacks through schema manipulation.

## Problem

Supabase dashboard showed 5 security warnings:
- **Warning Type:** `function_search_path_mutable`
- **Risk Level:** WARN / EXTERNAL
- **Category:** SECURITY

When database functions don't have a fixed `search_path`, attackers could potentially:
1. Manipulate the schema search path
2. Create malicious objects in schemas that would be searched first
3. Execute unintended code or access unauthorized data

This is especially critical for `SECURITY DEFINER` functions which run with elevated privileges.

## Affected Functions

1. **`handle_updated_at`** - Generic updated_at trigger for multiple tables
2. **`update_gig_roles_updated_at`** - Gig roles specific updated_at trigger
3. **`expire_old_invitations`** - Cron job for expiring old invitations (SECURITY DEFINER)
4. **`handle_new_user`** - Auth trigger for user profile creation (SECURITY DEFINER)
5. **`sync_user_email`** - Auth trigger for email synchronization (SECURITY DEFINER)

## Solution

Added `SET search_path = ''` to all functions, which:
- Forces all table references to be fully qualified (e.g., `public.profiles`)
- Prevents schema search path manipulation
- Maintains all existing functionality
- Follows PostgreSQL security best practices

## Technical Implementation

### Migration File
**File:** `supabase/migrations/20241118170000_fix_function_security.sql`

### Key Changes

#### 1. handle_updated_at
```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
SET search_path = ''  -- ✅ Added security configuration
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

**Used by:** profiles, gigs, projects, and other tables with updated_at columns

#### 2. update_gig_roles_updated_at
```sql
CREATE OR REPLACE FUNCTION public.update_gig_roles_updated_at()
RETURNS TRIGGER
SET search_path = ''  -- ✅ Added security configuration
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

**Used by:** gig_roles table

#### 3. expire_old_invitations
```sql
CREATE OR REPLACE FUNCTION public.expire_old_invitations()
RETURNS void
SET search_path = ''  -- ✅ Added security configuration
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Runs with elevated privileges
AS $$
BEGIN
  UPDATE public.gig_invitations  -- ✅ Fully qualified table name
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$;
```

**Used by:** Scheduled cron job to expire pending invitations

#### 4. handle_new_user
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SET search_path = ''  -- ✅ Added security configuration
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Runs with elevated privileges
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, main_instrument, email, phone)  -- ✅ Fully qualified
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
```

**Used by:** Auth trigger on `auth.users` table for new user creation

#### 5. sync_user_email
```sql
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS TRIGGER
SET search_path = ''  -- ✅ Added security configuration
LANGUAGE plpgsql
SECURITY DEFINER  -- ⚠️ Runs with elevated privileges
AS $$
BEGIN
  UPDATE public.profiles  -- ✅ Fully qualified table name
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
```

**Used by:** Auth trigger on `auth.users` table for email updates

## Files Modified

### Created
- `supabase/migrations/20241118170000_fix_function_security.sql` - Security hardening migration

### Documentation
- `docs/build-process/step-22-security-function-fixes.md` - This document

## Security Considerations

### Why This Matters

1. **SECURITY DEFINER Functions Are Critical**
   - 3 of the 5 functions use `SECURITY DEFINER`
   - These run with elevated privileges (bypass RLS)
   - Without `search_path` protection, they're prime targets for exploitation

2. **Search Path Attack Vector**
   ```sql
   -- Attacker could create:
   CREATE SCHEMA malicious;
   CREATE TABLE malicious.profiles (...);
   SET search_path = malicious, public;
   
   -- Then when function runs without fixed search_path:
   -- It might use malicious.profiles instead of public.profiles
   ```

3. **Defense in Depth**
   - Even with RLS policies, functions need their own security
   - Fully qualified names + fixed search_path = double protection
   - Follows PostgreSQL security documentation best practices

### What `SET search_path = ''` Does

- **Empty search path** = no implicit schema search
- Forces all references to be explicit: `public.table_name`
- Compiler will error if you forget the schema prefix
- Cannot be overridden by malicious `SET search_path` commands

## Testing & Verification

### Testing Checklist

- [x] Migration file created with all 5 functions
- [x] All functions include `SET search_path = ''`
- [x] All table references fully qualified with `public.` prefix
- [x] SECURITY DEFINER functions retained their security context
- [ ] Migration applied successfully (requires Docker/Supabase running)
- [ ] New user creation tested (handle_new_user)
- [ ] Updated_at triggers tested (handle_updated_at, update_gig_roles_updated_at)
- [ ] Email sync tested (sync_user_email)
- [ ] Invitation expiry tested (expire_old_invitations)
- [ ] Supabase dashboard checked for resolved warnings

### How to Test Locally

```bash
# Start Supabase (requires Docker)
supabase start

# Apply migration
supabase migration up

# Test new user creation
# (Sign up through the app)

# Test updated_at triggers
# (Update any gig or project)

# Verify in Supabase dashboard
# Settings > Database > Advisors > Security
# Should show 0 warnings for "function_search_path_mutable"
```

### Expected Behavior

**Before:**
- 5 security warnings in Supabase dashboard
- Functions work but vulnerable to search_path manipulation

**After:**
- 0 security warnings in Supabase dashboard  
- Functions work identically but are secure
- Attempts to manipulate search_path are blocked

## Performance Considerations

### Performance Impact
**✅ NONE** - This change has zero performance impact:
- `SET search_path` is a compile-time setting
- Fully qualified names add no runtime overhead
- Functions execute identically fast

### Why No Performance Hit

1. Query planner caches the execution plan
2. Schema qualification happens at parse time, not runtime
3. No additional lookups or searches
4. Modern PostgreSQL optimizes qualified names efficiently

## Deployment

### Local Development
```bash
supabase migration up
```

### Production
Migration will automatically apply on next deployment or manual push:
```bash
supabase db push
```

⚠️ **IMPORTANT:** This is a safe migration that only recreates existing functions with security improvements. No data changes, no breaking changes.

## References

- [Supabase Database Linter - Function Search Path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [PostgreSQL SECURITY DEFINER Best Practices](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)
- [PostgreSQL Search Path Security](https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-PATH)

## Lessons Learned

1. **Always set search_path on functions** - Especially SECURITY DEFINER functions
2. **Supabase linter is valuable** - Regularly check dashboard for security warnings
3. **Security is layered** - RLS + function security + app-level checks
4. **Use fully qualified names** - `public.table_name` is clearer and safer

## Next Steps

1. ✅ Migration created
2. ⏸️ Apply migration when Docker is available
3. ⏸️ Verify security warnings cleared in Supabase dashboard
4. ✅ Document for future function creation
5. 📋 **Future:** Add to PR checklist - "All functions have search_path set"

## Additional Security Item

There was one additional security warning that is **NOT** addressed by this migration:

### Leaked Password Protection Disabled

**Issue:** Auth system not checking passwords against HaveIBeenPwned.org  
**Fix Required:** Enable in Supabase Dashboard  
**Steps:**
1. Go to Supabase Dashboard
2. Authentication > Policies
3. Enable "Leaked Password Protection"

This is a dashboard setting, not a code/migration change.

---

**Status:** Migration created and ready to apply. Waiting for Docker to be running to test locally.

