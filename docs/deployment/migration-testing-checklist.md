# Migration Testing Checklist

This checklist provides a comprehensive testing protocol for database migrations, particularly those that affect core data structures like the gig ownership model.

---

## ⚠️ Pre-Migration Checklist

Before running ANY migration:

- [ ] **Backup database** - Create a snapshot/backup point
- [ ] **Read migration file** - Understand what will change
- [ ] **Check migration order** - Ensure it comes after dependencies
- [ ] **Review RLS policies** - Check if migration affects security
- [ ] **Verify test environment** - Run in staging/dev first

---

## 🔍 Migration Categories

### Category A: Schema Changes (Low Risk)
- Adding new columns (nullable)
- Adding new tables
- Adding indexes
- Adding functions/triggers

**Testing Required:** Basic functional testing

### Category B: Data Migrations (Medium Risk)
- Updating existing data
- Backfilling columns
- Changing column types
- Moving data between tables

**Testing Required:** Data integrity verification + functional testing

### Category C: Breaking Changes (High Risk)
- Dropping columns
- Making columns NOT NULL
- Changing foreign key relationships
- Major RLS policy changes

**Testing Required:** Full regression testing suite

---

## 📋 Universal Testing Checklist

After applying ANY migration:

### 1. Database Schema Verification

```sql
-- Check migration was applied
SELECT version FROM supabase_migrations.schema_migrations 
WHERE version = 'YOUR_MIGRATION_VERSION';

-- Check column exists/removed as expected
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'your_table';

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'your_table';
```

### 2. Data Integrity Checks

```sql
-- Check for NULL values in NOT NULL columns
SELECT COUNT(*) FROM your_table WHERE important_column IS NULL;

-- Check foreign key relationships
SELECT COUNT(*) FROM child_table c
LEFT JOIN parent_table p ON c.parent_id = p.id
WHERE p.id IS NULL;

-- Check for orphaned records
-- (depends on your specific schema)
```

### 3. RLS Policy Verification

```sql
-- List all policies for affected tables
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('table1', 'table2');

-- Test query as authenticated user
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims.sub = 'test-user-id';
SELECT * FROM your_table LIMIT 1;
```

### 4. Index Performance

```sql
-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'your_table';

-- Explain query plans
EXPLAIN ANALYZE
SELECT * FROM your_table WHERE indexed_column = 'value';
```

---

## 🧪 UI Testing Checklist

### Core CRUD Operations

For each affected entity, test:

- [ ] **Create** - Can create new records?
- [ ] **Read** - Can view existing records?
- [ ] **Update** - Can modify records?
- [ ] **Delete** - Can remove records?

### User Flows

Test the main user journeys:

- [ ] Dashboard loads without errors
- [ ] List views display data correctly
- [ ] Detail pages show complete information
- [ ] Forms submit successfully
- [ ] Navigation works between pages
- [ ] Search/filter functionality works
- [ ] No console errors in browser

### Multi-User Scenarios

- [ ] User A creates data
- [ ] User B can/cannot see it (based on permissions)
- [ ] Ownership changes work correctly
- [ ] Notifications sent to correct users

---

## 🎯 Specific: Ownership Migration Testing

Use this section for migrations that change ownership models (like the gig ownership unification).

### Database Checks

```sql
-- Check all records have required parent
SELECT COUNT(*) as total_records, 
       COUNT(parent_id) as records_with_parent
FROM child_table;
-- Expected: Both counts should match

-- Check orphaned records
SELECT c.* FROM child_table c
LEFT JOIN parent_table p ON c.parent_id = p.id
WHERE p.id IS NULL;
-- Expected: No results

-- Check ownership is consistent
SELECT c.*, p.owner_id 
FROM child_table c
JOIN parent_table p ON c.parent_id = p.id
LIMIT 10;
-- Expected: All rows have owner_id
```

### UI Verification

- [ ] All list views show owner/host names (no nulls)
- [ ] Creating records auto-assigns ownership
- [ ] Edit/delete permissions respect ownership
- [ ] Filtering by owner works correctly

---

## ⚡ Performance Testing

### Before Migration Benchmarks

```bash
# Record query times before migration
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.com/api/gigs
```

### After Migration Benchmarks

```bash
# Compare query times after migration
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.com/api/gigs
```

### Database Query Performance

```sql
-- Check slow queries
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%your_table%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Browser Performance

- [ ] Check Network tab - no extra queries
- [ ] Check Console - no performance warnings
- [ ] Measure page load times
- [ ] Test with realistic data volume (100+ records)

---

## 🚨 Rollback Plan

If critical issues found:

### Option 1: Revert Migration (If Recent)

```sql
-- Check if migration can be safely reverted
-- Only if no data was modified!
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = 'MIGRATION_VERSION';

-- Run rollback SQL (if you have one)
```

### Option 2: Restore from Backup

1. Stop accepting new data (maintenance mode)
2. Restore database from pre-migration backup
3. Verify backup restoration
4. Resume normal operations
5. Fix migration issues before re-applying

### Option 3: Forward Fix

1. Identify specific issue
2. Create new migration to fix
3. Apply and test thoroughly
4. Document the fix

---

## ✅ Sign-Off Checklist

Before declaring migration complete:

- [ ] All database schema changes verified
- [ ] Data integrity checks passed
- [ ] RLS policies tested
- [ ] UI functionality tested
- [ ] Performance benchmarks acceptable
- [ ] No console errors
- [ ] Multi-user scenarios tested
- [ ] Rollback plan documented
- [ ] Migration documented in build-process
- [ ] Team notified of changes

---

## 📝 Documentation Template

After successful migration, document:

```markdown
# Migration: [Name]

**Date:** YYYY-MM-DD
**Migration File:** XXXXXXXXXXXXXX_description.sql
**Risk Level:** Low/Medium/High

## What Changed
- Schema changes
- Data migrations
- RLS policy updates

## Testing Performed
- [ ] Database verification
- [ ] UI testing
- [ ] Performance testing

## Results
- All tests passed
- Performance: [Better/Same/Worse]
- Issues found: [None/List]

## Rollback Plan
- [Describe how to rollback if needed]
```

---

## 🔗 Related Documentation

- [Database Safety Protocol](../agent-protocols/database-safety.md)
- [RLS Debugging Guide](../troubleshooting/rls-debugging-saga.md)
- [Build Process README](../build-process/README.md)

---

**Last Updated:** November 20, 2025

