# Ensemble Database Compatibility Fix

## Status: ✅ ALL PHASES COMPLETE

**Root Cause:** Migration `20241224120000_gigpack_schema.sql` dropped and recreated core Ensemble tables with a GigPack-specific schema, breaking dashboard queries.

### Applied Fixes (in order)
1. ✅ `20251224150000_fix_ensemble_schema.sql` - Restored core tables and added GigPack columns
2. ✅ `20251224160000_restore_ensemble_tables.sql` - Restored setlist_learning_status
3. ✅ `fix_gig_readiness_schema` - Recreated gig_readiness with per-musician tracking columns
4. ✅ `enable_rls_and_add_gig_columns` - Enabled RLS on notifications, added missing gig columns
5. ✅ `fix_payment_status_constraint` - Fixed payment_status check constraint to include 'unpaid'

### Code Updates Applied
1. ✅ `lib/api/dashboard-kpis.ts` - Updated `fetchSongsToLearn` to join through `setlist_sections`
2. ✅ `lib/api/setlist-learning.ts` - Updated `getPracticeItems` for new schema
3. ✅ GigPack Editor fully integrated at `/gigs/new` and `/gigs/[id]/edit`

### Verification (All Passing)
- ✅ All tables accessible and properly structured
- ✅ Setlist join path works (items → sections → gigs)
- ✅ Seed data created successfully (1 gig, 9 schedule items, 5 roles, 5 songs, 3 materials, 6 packing items)

---

## 1. Failing Supabase Endpoints / Tables

### Summary of Schema Conflicts

| Table | Issue | Dashboard Code Expects | Current Schema Has |
|-------|-------|------------------------|-------------------|
| `gig_readiness` | **CRITICAL MISMATCH** | Per-musician tracking with `musician_id`, `songs_total`, `songs_learned`, `charts_ready`, etc. | Simple `is_ready` boolean + `missing_items` array (no `musician_id`) |
| `setlist_items` | FK change | `gig_id` column for direct lookup | `section_id` FK only (requires join through `setlist_sections`) |
| `gig_roles` | OK after fix | `musician_id`, `invitation_status`, `payment_status`, `agreed_fee` | ✅ All columns present |
| `gigs` | OK after fix | `owner_id`, `project_id`, `start_time`, `end_time`, `location_name`, `status`, `client_fee` | ✅ All columns present |
| `setlist_learning_status` | OK after fix | `musician_id`, `setlist_item_id`, `learned` | ✅ Restored correctly |
| `gig_activity_log` | OK after fix | `gig_id`, `user_id`, `activity_type`, `description` | ✅ Restored correctly |
| `notifications` | OK but no RLS | Standard notification columns | ✅ Columns OK, but `rls_enabled = false` |
| `gig_invitations` | OK after fix | Standard invitation columns | ✅ Restored correctly |

---

## 2. Affected Codebase Locations

### Critical: Dashboard & KPI Queries

#### File: `lib/api/dashboard-kpis.ts`

| Function | Query Target | Status | Issue |
|----------|--------------|--------|-------|
| `fetchGigsThisWeek` | `gigs` → `listDashboardGigs` | ✅ Works | Uses dashboard-gigs API which works |
| `fetchSongsToLearn` | `setlist_learning_status` → `setlist_items` → `gigs` | ⚠️ May fail | Requires `setlist_items.gig_id` but schema uses `section_id` |
| `fetchChangesSinceLastVisit` | `gig_activity_log` | ✅ Works | Table restored with correct structure |
| `fetchPendingInvitations` | `gig_roles` → `gigs` | ✅ Works | All required columns present |

#### File: `lib/api/gig-readiness.ts`

| Function | Query Target | Status | Issue |
|----------|--------------|--------|-------|
| `getGigReadiness` | `gig_readiness` | ❌ **FAILS** | Expects `musician_id`, `songs_total`, `songs_learned`, etc. |
| `createGigReadiness` | `gig_readiness` | ❌ **FAILS** | Same - schema mismatch |
| `updateGigReadiness` | `gig_readiness` | ❌ **FAILS** | Same - schema mismatch |

#### File: `lib/api/player-money.ts`

| Function | Query Target | Status | Issue |
|----------|--------------|--------|-------|
| `getPlayerMoneySummary` | `gig_roles` → `gigs` | ✅ Works | Uses `agreed_fee`, `payment_status` (present) |
| `getPlayerMoneyGigs` | `gig_roles` → `gigs` → `profiles` | ✅ Works | All columns present |

#### File: `lib/api/dashboard-gigs.ts`

| Function | Query Target | Status | Issue |
|----------|--------------|--------|-------|
| `listDashboardGigs` | `gigs` → `profiles` → `gig_roles` | ✅ Works | All required columns present |
| `listRecentPastGigs` | `gigs` → `profiles` → `gig_roles` | ✅ Works | Same |
| `listAllPastGigs` | `gigs` → `profiles` → `gig_roles` | ✅ Works | Same |

### Secondary: Practice & Activity Widgets

#### File: `components/dashboard/practice-widget.tsx`

- Queries `setlist_learning_status` joined with `setlist_items` and `gigs`
- **Issue:** `setlist_items` no longer has `gig_id` - requires join through `setlist_sections`

#### File: `components/dashboard/activity-widget.tsx`

- Queries `gig_activity_log`
- **Status:** ✅ Should work - table restored correctly

---

## 3. Remediation Plan

### CRITICAL FIX 1: Restore Proper `gig_readiness` Schema

The `gig_readiness` table needs to match Ensemble's per-musician tracking:

```sql
-- Drop the broken gig_readiness table
DROP TABLE IF EXISTS gig_readiness CASCADE;

-- Recreate with Ensemble-expected schema
CREATE TABLE gig_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  songs_total INTEGER DEFAULT 0,
  songs_learned INTEGER DEFAULT 0,
  charts_ready BOOLEAN DEFAULT FALSE,
  sounds_ready BOOLEAN DEFAULT FALSE,
  travel_checked BOOLEAN DEFAULT FALSE,
  gear_packed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gig_id, musician_id)
);

-- Enable RLS
ALTER TABLE gig_readiness ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Musicians can only see/manage their own readiness
CREATE POLICY "Users can manage own readiness"
  ON gig_readiness FOR ALL
  USING (auth.uid() = musician_id)
  WITH CHECK (auth.uid() = musician_id);
```

### FIX 2: Add `gig_id` to `setlist_items` (Optional - For Backward Compat)

The current schema requires joining through `setlist_sections` to get to gigs. This is correct for GigPack's structured setlists, but breaks Ensemble's direct lookups.

**Options:**
1. **Add denormalized `gig_id`** to `setlist_items` (add column + trigger to sync)
2. **Update queries** to join through `setlist_sections` (recommended - cleaner)

Recommended approach - update `fetchSongsToLearn` in `dashboard-kpis.ts`:

```typescript
// OLD (broken):
.from("setlist_learning_status")
.select(`
  id, learned,
  setlist_items!inner (id, gig_id, gigs!inner (id, date))
`)

// NEW (works with section-based schema):
.from("setlist_learning_status")
.select(`
  id, learned,
  setlist_items!inner (
    id,
    setlist_sections!inner (
      gig_id,
      gigs!inner (id, date)
    )
  )
`)
```

### FIX 3: Enable RLS on Missing Tables

```sql
-- notifications and calendar_sync_log have rls_enabled = false
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_readiness ENABLE ROW LEVEL SECURITY;

-- Add basic policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 4. Migration Strategy

### Recommended Order:

1. **First:** Fix `gig_readiness` schema (critical - blocks dashboard)
2. **Second:** Update `fetchSongsToLearn` query to use section joins
3. **Third:** Enable RLS on `notifications` and `gig_readiness`
4. **Fourth:** Test dashboard end-to-end

### Migration File: `20251225000000_fix_gig_readiness_schema.sql`

This migration will:
- Drop the incorrectly structured `gig_readiness` table
- Recreate with Ensemble-expected columns
- Set up proper RLS

---

## 5. Verification Checklist

After applying fixes, verify:

- [ ] Dashboard loads without console errors
- [ ] "Gigs This Week" KPI shows correct count
- [ ] "Songs to Learn" KPI shows songs from upcoming gigs
- [ ] "Changes Since Last Visit" shows activity
- [ ] "Pending Invitations" shows invitations
- [ ] Readiness checklist on Next Gig card works
- [ ] Money Snapshot shows correct totals
- [ ] Practice Focus widget shows songs

---

## 6. Files to Modify

### Database Migrations (Priority Order)

1. `supabase/migrations/20251225000000_fix_gig_readiness_schema.sql` - **CREATE**
2. `supabase/migrations/20251225000001_fix_setlist_queries.sql` - Optional (if adding gig_id)

### Code Updates

1. `lib/api/dashboard-kpis.ts` - Update `fetchSongsToLearn` to join through sections
2. `components/dashboard/practice-widget.tsx` - Update query if needed

---

## Appendix: Current vs Expected Schema Comparison

### `gig_readiness` Table

| Column | Expected by Ensemble | Current in DB |
|--------|---------------------|---------------|
| `id` | ✅ UUID PK | ❌ Missing (uses gig_id as PK) |
| `gig_id` | ✅ UUID FK | ✅ Present (as PK) |
| `musician_id` | ✅ UUID FK | ❌ **Missing** |
| `songs_total` | ✅ INTEGER | ❌ Missing |
| `songs_learned` | ✅ INTEGER | ❌ Missing |
| `charts_ready` | ✅ BOOLEAN | ❌ Missing |
| `sounds_ready` | ✅ BOOLEAN | ❌ Missing |
| `travel_checked` | ✅ BOOLEAN | ❌ Missing |
| `gear_packed` | ✅ BOOLEAN | ❌ Missing |
| `notes` | ✅ TEXT | ❌ Missing |
| `is_ready` | ❌ Not expected | ✅ Present |
| `missing_items` | ❌ Not expected | ✅ Present |

### `setlist_items` Table

| Column | Original Ensemble | Current (GigPack) |
|--------|-------------------|-------------------|
| `gig_id` | ✅ Direct FK | ❌ Removed |
| `section_id` | ❌ Not used | ✅ Present (FK to setlist_sections) |

This is a valid schema change for structured setlists, but requires query updates.
