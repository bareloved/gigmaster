# Database Safety Protocol for AI Agents

**Version**: 1.0  
**Last Updated**: November 19, 2024  
**Status**: MANDATORY - All agents must follow this protocol

## Overview

This document outlines the **mandatory protocol** for AI agents working with the Ensemble database. Following this protocol prevents the multi-hour RLS debugging nightmares we experienced before.

**Key Principle**: We work **DIRECTLY with Supabase (remote database)**. We do NOT use local SQL migrations or local Supabase instances.

## Critical Context: What Went Wrong Before

In our previous development sessions, we spent 2+ hours debugging RLS policy issues because:

1. ❌ **Assumed policy names** instead of checking what actually exists
2. ❌ **Tried to drop policies** that didn't exist with wrong names
3. ❌ **The REAL buggy policies** kept running because we never dropped them
4. ❌ **Got the same error** 7+ times in a row

**What finally fixed it**:
1. ✅ Queried `pg_policies` to see **actual policy names** in the database
2. ✅ Dropped the **CORRECT policies** using exact names from the query
3. ✅ Fixed immediately

**See**: `docs/troubleshooting/rls-debugging-saga.md` for the full story.

## How MCP Tools Prevent This

With the read-only Supabase MCP server, agents can now:
- Query the database **directly** before suggesting changes
- See **actual policy names**, not assumed names
- Verify schema state, indexes, constraints
- Run security/performance advisors proactively

**This is the difference between 2 hours of frustration and 2 minutes of proper debugging.**

---

## Supabase MCP Tools Reference

### Read-Only Query Tools

#### `mcp_supabase_READ-ONLY_execute_sql`
Execute raw SQL queries against the Supabase database.

**Use for**:
- Checking RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'X'`
- Checking indexes: `SELECT * FROM pg_indexes WHERE schemaname = 'public'`
- Checking constraints: `SELECT * FROM information_schema.table_constraints`
- Any custom introspection query

**Example**:
```typescript
mcp_supabase_READ-ONLY_execute_sql({
  query: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'gigs' ORDER BY policyname;"
})
```

#### `mcp_supabase_READ-ONLY_list_tables`
Lists all tables in specified schemas.

**Use for**:
- Verifying table structure before migrations
- Checking what tables exist in a schema
- Understanding current schema state

**Example**:
```typescript
mcp_supabase_READ-ONLY_list_tables({
  schemas: ["public"]
})
```

#### `mcp_supabase_READ-ONLY_list_migrations`
Lists all applied migrations in the database.

**Use for**:
- Checking migration history before creating new migration
- Verifying a migration was applied
- Understanding database evolution

**Example**:
```typescript
mcp_supabase_READ-ONLY_list_migrations()
```

#### `mcp_supabase_READ-ONLY_list_extensions`
Lists all database extensions.

**Use for**:
- Checking if an extension (e.g., `pgcrypto`, `uuid-ossp`) is installed
- Verifying extension versions

**Example**:
```typescript
mcp_supabase_READ-ONLY_list_extensions()
```

#### `mcp_supabase_READ-ONLY_get_advisors`
Gets security or performance advisory notices for the project.

**Use for**:
- **MANDATORY**: Before every migration
- Catching missing RLS policies
- Identifying performance issues (missing indexes, slow queries)
- Finding security vulnerabilities

**Example**:
```typescript
// Check security issues
mcp_supabase_READ-ONLY_get_advisors({
  type: "security"
})

// Check performance issues
mcp_supabase_READ-ONLY_get_advisors({
  type: "performance"
})
```

### Write Tool (Use with Caution)

#### `mcp_supabase_READ-ONLY_apply_migration`
Applies a migration to the Supabase database.

**Use for**:
- DDL operations (CREATE, ALTER, DROP)
- Schema changes
- RLS policy changes

**NEVER use for**:
- DML operations (INSERT, UPDATE, DELETE) in migrations
- Hardcoded references to generated IDs

**Example**:
```typescript
mcp_supabase_READ-ONLY_apply_migration({
  name: "add_gig_status_index",
  query: "CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);"
})
```

---

## Supabase Workflow: Remote, Not Local

### ✅ What We DO

- Work **directly with Supabase (remote database)**
- Use **MCP tools** to query and modify the database
- Use `mcp_supabase_READ-ONLY_apply_migration` for schema changes
- Keep migration files in `supabase/migrations/` for version control

### ❌ What We DON'T Do

- ❌ Run local SQL migrations (`psql`, `supabase db`, etc.)
- ❌ Use a local Supabase instance
- ❌ Run `supabase db reset` or `supabase db push` 
- ❌ Execute SQL files directly with shell commands

**Why**: We maintain a single source of truth (Supabase remote) and avoid sync issues between local and remote databases.

---

## Pre-Migration Checklist (MANDATORY)

Before creating ANY migration, you **MUST** complete these steps:

### 1. Run Security Advisors
```typescript
mcp_supabase_READ-ONLY_get_advisors({ type: "security" })
```

**Check for**:
- Missing RLS policies
- Publicly accessible tables
- Security vulnerabilities

**Action**: Fix any issues found before proceeding.

### 2. Run Performance Advisors
```typescript
mcp_supabase_READ-ONLY_get_advisors({ type: "performance" })
```

**Check for**:
- Missing indexes on frequently queried columns
- Slow queries
- Optimization opportunities

**Action**: Note issues and address in your migration if relevant.

### 3. Verify Current Schema
```typescript
mcp_supabase_READ-ONLY_list_tables({ schemas: ["public"] })
```

**Check for**:
- Tables you'll be modifying exist
- Table names are correct (no typos)
- Schema structure matches your assumptions

### 4. Check Migration History
```typescript
mcp_supabase_READ-ONLY_list_migrations()
```

**Check for**:
- What migrations have already been applied
- Naming patterns for new migration
- Whether your change might conflict with recent migrations

### 5. If Touching RLS, Query Policies
```typescript
mcp_supabase_READ-ONLY_execute_sql({
  query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'your_table' ORDER BY policyname;"
})
```

**Check for**:
- Actual policy names (NEVER assume!)
- Existing policies that might conflict
- Policy logic that might have circular dependencies

### 6. Create Migration with Descriptive Name

Use snake_case naming:
- `add_[feature]_table`
- `add_[column]_to_[table]`
- `create_[index]_on_[table]`
- `fix_[issue]_in_[table]_rls`

### 7. Apply and Verify

```typescript
// Apply
mcp_supabase_READ-ONLY_apply_migration({
  name: "your_migration_name",
  query: "YOUR SQL HERE;"
})

// Verify
mcp_supabase_READ-ONLY_execute_sql({
  query: "SELECT * FROM your_table LIMIT 1;" // or relevant check
})
```

---

## RLS Policy Protocol (CRITICAL)

### Step 1: ALWAYS Check What Exists First ⚠️

Before attempting to drop or modify ANY RLS policy, you MUST use MCP:

```typescript
mcp_supabase_READ-ONLY_execute_sql({
  query: `
    SELECT 
      policyname,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE tablename = 'your_table'
    ORDER BY policyname;
  `
})
```

### Step 2: Use EXACT Policy Names

**NEVER ASSUME POLICY NAMES!**

Policy names might be:
- ❌ `gig_roles_select_policy` (what you expect)
- ✅ `Users can view gig roles for their projects` (what actually exists)

Use the **EXACT** names from the query above:

```sql
DROP POLICY IF EXISTS "Actual Policy Name From Database" ON table_name;
```

### Step 3: Watch for Circular Dependencies

If you see "infinite recursion detected in policy" errors:

1. **Identify the cycle**: Table A policy checks Table B, Table B policy checks Table A
2. **Break the cycle**: Make ONE table's policies permissive
3. **Common pattern**: 
   - `gigs` ↔ `gig_roles` circular dependency
   - Solution: Make `gig_roles` permissive, keep `gigs` strict

**Example Fix**:
```sql
-- Make gig_roles permissive (don't query gigs table in the policy)
CREATE POLICY "permissive_select" ON gig_roles
FOR SELECT USING (true); -- or use auth.uid() directly without joins

-- Keep gigs strict
CREATE POLICY "strict_select" ON gigs
FOR SELECT USING (
  owner_id = auth.uid() 
  OR EXISTS (SELECT 1 FROM gig_roles WHERE gig_id = gigs.id AND musician_id = auth.uid())
);
```

### Step 4: Verify After Changes

```typescript
// Check policies were actually dropped/created
mcp_supabase_READ-ONLY_execute_sql({
  query: "SELECT policyname, cmd FROM pg_policies WHERE tablename = 'your_table';"
})

// Test a query works
mcp_supabase_READ-ONLY_execute_sql({
  query: "SELECT * FROM your_table LIMIT 1;"
})
```

### Mandatory RLS Checklist

Before providing ANY RLS fix, verify:

- [ ] Have you used `execute_sql` to query `pg_policies` for actual policy names?
- [ ] Are you using the EXACT names from the database (not assumed names)?
- [ ] Have you checked for circular dependencies between tables?
- [ ] Have you provided verification queries to confirm changes?

**If you answer NO to any of these, STOP and get the information first!**

---

## Common Query Patterns

### Check RLS Policies
```sql
SELECT policyname, tablename, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'your_table'
ORDER BY tablename, policyname;
```

### Check All Policies (Overview)
```sql
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### Check Indexes
```sql
SELECT tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename = 'your_table';
```

### Check Foreign Keys
```sql
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'your_table';
```

### Check Table Columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'your_table'
ORDER BY ordinal_position;
```

### Check if Index Exists (Before Creating)
```sql
SELECT 1 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename = 'your_table'
  AND indexname = 'your_index_name';
```

---

## Never Assume - Always Check

### ❌ Never Assume

- Policy names exist or follow a pattern
- Table structure matches your expectations
- Indexes exist on certain columns
- Migrations have been applied in a certain order
- Foreign keys are set up as expected

### ✅ Always Check

- Query `pg_policies` before touching RLS
- Query `pg_indexes` before creating indexes
- Query `information_schema` before modifying schema
- Run `list_tables` to verify structure
- Run `list_migrations` to check history
- Run `get_advisors` before migrations

---

## Integration with Agent Workflow

### Before Starting Any Database Work

1. Read this protocol document
2. Run security advisors
3. Run performance advisors
4. Query relevant database state

### During Migration Development

1. Use MCP tools to verify assumptions
2. Check actual policy/table names
3. Test queries before putting them in migrations

### After Applying Migration

1. Verify with MCP queries
2. Test relevant queries work
3. Re-run advisors to check for new issues

### When Debugging Issues

1. Query actual database state first
2. Don't guess or assume
3. Use exact names from queries
4. Check for circular dependencies in RLS

---

## Summary: The Golden Rules

1. **MCP First**: Use MCP tools to check database state before suggesting changes
2. **No Local Workflow**: Work directly with Supabase remote, not local migrations
3. **Advisors Required**: Run security/performance checks before every migration
4. **Never Assume**: Query actual state, don't guess policy names or schema
5. **Verify Always**: Check that changes actually applied with verification queries
6. **Exact Names**: Use exact policy names from `pg_policies`, never assumed names
7. **Break Cycles**: Watch for and break circular RLS dependencies
8. **Descriptive Migrations**: Use clear, descriptive migration names in snake_case

---

## Related Documentation

- **RLS Debugging Saga**: `docs/troubleshooting/rls-debugging-saga.md`
- **AI Agent Workflow**: `docs/AI_AGENT_WORKFLOW_GUIDE.md`
- **Safety Rules**: `.cursorrules` (Database Operations section)
- **Agent Protocols Index**: `docs/agent-protocols/README.md`

---

**This protocol is MANDATORY. Failure to follow it will result in the same multi-hour debugging sessions we want to avoid.**

