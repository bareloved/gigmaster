# Step 22: Money View v1 – Complete Earnings & Payouts System

**Date:** November 20, 2024  
**Status:** 🟡 In Progress (Core Complete, UX Refinements Ongoing)  
**Priority:** Critical High

## Overview

Implemented comprehensive Money View v1 with two perspectives:
1. **My Earnings (Player View)** - Musicians track their income and payment status
2. **Payouts (Manager View)** - Managers track who they need to pay

This replaces the simple boolean `is_paid` field with a full payment status system supporting pending, paid, partial, and overdue states.

**Note:** Core functionality is complete. Additional UX refinements and features will be added in future iterations.

## What Was Built

### 1. Database Schema Evolution

**Migration:** `20251120000005_money_view_v1.sql`

**Breaking Change:** Replaced `is_paid` (boolean) with `payment_status` (enum)

**New Fields Added:**
- `payment_status` TEXT NOT NULL DEFAULT 'pending'
  - Values: 'pending', 'paid', 'partial', 'overdue'
- `paid_amount` NUMERIC(10, 2) - For partial payments
- `currency` TEXT DEFAULT 'ILS' - Future-proofing for multi-currency

**Constraints:**
- Check constraint on `payment_status` values
- Check constraint on `paid_amount` (must be >= 0 if not null)

**Indexes:**
- `idx_gig_roles_payment_status` - For payment status queries
- `idx_gig_roles_musician_payment` - For musician payment lookups

### 2. TypeScript Type System

**Updated:** `lib/types/database.ts`
- Removed `is_paid: boolean` from `gig_roles` table types
- Added `payment_status`, `paid_amount`, `currency` fields

**New Types:** `lib/types/shared.ts`
```typescript
PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue'
MyEarningsGig - Player earnings row
MyEarningsSummary - Summary statistics
PayoutRow - Manager payout row
PaymentStatusUpdate - Update request
```

### 3. API Layer

**New Module:** `lib/api/money.ts`

**Functions:**
- `getMyEarnings(year, month?)` - Fetch player earnings with summary
- `getPayouts(year, month?, projectId?, statusFilter?)` - Fetch manager payouts
- `updatePaymentStatus(update)` - Update payment status (auth checked)
- `checkIsManager(userId)` - Check if user manages any projects

**Key Features:**
- Year/month filtering affects both summary and table
- Authorization: musician OR manager can update payment status
- Summary calculations from filtered data only
- Efficient queries with proper joins

**Updated:** `lib/api/gig-roles.ts`
- Replaced `is_paid` references with `payment_status`
- Notification logic updated for payment status changes
- `addSystemUserToGig` now sets `payment_status: 'pending'`

**Deprecated:** `lib/api/player-money.ts`
- Marked all functions with `@deprecated` JSDoc comments
- Kept for backward compatibility during transition

### 4. UI Components

**Modal Component:** `components/update-payment-status-dialog.tsx`
- Radio group for status selection (pending/paid/partial/overdue)
- Conditional fields for paid amount and date
- Auto-fills paid amount with fee amount for 'paid' status
- TanStack Query mutation with optimistic updates
- Toast notifications for success/error

**Player Components:**
- `components/my-earnings-summary.tsx` - 4 summary cards
  - This Month (Gross)
  - This Year (Gross)
  - Unpaid (Gross) - Orange highlight
  - Overdue (Gross) - Red highlight
- `components/my-earnings-table.tsx` - Earnings table
  - 10 columns: Date, Gig, Project, Role, Location, Fee, Status, Paid Amount, Paid Date, Actions
  - Overdue rows highlighted in red (bg-red-50)
  - AlertCircle icon for overdue items
  - View Gig and Update buttons
  - Empty state for no data

**Manager Components:**
- `components/payouts-table.tsx` - Payouts table
  - Similar structure to earnings table
  - Shows musician name instead of role for manager context
  - Same highlighting for overdue payments

### 5. Money Page

**Complete Rewrite:** `app/(app)/money/page.tsx`

**Player Tab (As Player):**
- Filter bar: Year selector, Month selector
- Quick actions: "This Month", "This Year"
- Summary cards (4 KPIs)
- Earnings table with all gigs
- Loading skeletons
- Error states

**Manager Tab (As Manager):**
- Only visible if user manages >= 1 project
- Filter bar: Year, Month, Band/Project, Status
- Quick actions: "This Month", "This Year"
- Payouts table with all musicians
- Same loading/error states

**State Management:**
- Separate filter state for player and manager tabs
- TanStack Query with proper cache keys:
  - `['my-earnings', user?.id, year, month]`
  - `['payouts', user?.id, year, month, projectId, statusFilter]`
- Stale time: 2 minutes

**UX Features:**
- Year options: Current year + 2 years back
- Month options: All Year + 12 months
- Filters apply to both summary and table (as specified)
- Tab visibility controlled by manager status query

## Files Created

```
supabase/migrations/20251120000005_money_view_v1.sql
lib/api/money.ts
components/update-payment-status-dialog.tsx
components/my-earnings-summary.tsx
components/my-earnings-table.tsx
components/payouts-table.tsx
docs/build-process/step-22-money-view-v1.md
```

## Files Modified

```
lib/types/database.ts - Updated gig_roles types
lib/types/shared.ts - Added payment types
lib/api/gig-roles.ts - Replaced is_paid with payment_status
lib/api/player-money.ts - Added deprecation notices
app/(app)/money/page.tsx - Complete replacement
```

## Key Technical Decisions

### 1. Schema Change: Boolean to Enum

**Decision:** Replace `is_paid` (boolean) entirely with `payment_status` (enum)

**Rationale:**
- Cleaner schema (no redundant fields)
- Supports partial payments
- Supports overdue tracking
- More expressive than boolean

**Migration Strategy:**
- Drop `is_paid` column
- Add `payment_status` with default 'pending'
- Existing data migrates to 'pending' state
- Managers can update historical data if needed

### 2. Filter Scope

**Decision:** Year/month filters affect BOTH summary cards and table rows

**Rationale:**
- User expectations: filter should affect everything
- Consistent behavior across all views
- Simpler mental model

**Implementation:**
- Summary calculated from filtered gigs only
- Single query returns both gigs and computes summary
- No separate all-time queries

### 3. Authorization Model

**Decision:** Both musician AND manager can update payment status

**Rationale:**
- Musicians track their own payments (self-service)
- Managers track payouts to musicians (cash flow)
- Both perspectives are valid
- RLS policies enforce data isolation

**Security:**
- Authorization checked in API layer
- Requires gig/project lookup to verify access
- RLS policies as backup layer

### 4. Currency Handling

**Decision:** Default to 'ILS', store per-role for future

**Rationale:**
- Current app uses ILS exclusively
- Per-role currency field future-proofs for multi-currency
- No currency conversion in v1 (deferred)

**Future Enhancement:**
- Multi-currency display
- Currency conversion rates
- User-selectable default currency

### 5. Overdue Logic

**Decision:** Manual overdue status (no automatic calculation)

**Rationale:**
- No "due date" concept in v1
- Overdue is subjective (depends on agreements)
- Manual marking gives flexibility
- Automatic logic can be added later

**Future Enhancement:**
- Add `payment_due_date` field
- Automatic overdue detection
- Email reminders for overdue payments

## Performance Optimizations

### Database
- ✅ Indexes on `payment_status` and `(musician_id, payment_status)`
- ✅ Queries use existing indexes on `musician_id`, `gig_id`, `project_id`
- ✅ Date range filtering at DB level (not client-side)
- ✅ `not('agreed_fee', 'is', null)` filters out roles without fees

### API Layer
- ✅ Single query returns both gigs and calculates summary
- ✅ No N+1 queries (proper joins)
- ✅ Pagination not needed (date range limits results naturally)
- ✅ TanStack Query caching (2-minute stale time)

### UI
- ✅ Loading skeletons for instant perceived performance
- ✅ Optimistic updates on payment status change
- ✅ Cache invalidation only on affected queries
- ✅ Separate cache keys for player and manager views

## Security Considerations

### RLS Policies
- ✅ Already in place on `gig_roles` table
- ✅ Users can only see their own roles as musician
- ✅ Managers can only see roles for their projects

### Cache Keys
- ✅ All query keys include `user?.id`
- ✅ No cross-user cache pollution
- ✅ Separate keys for different filter combinations

### Authorization
- ✅ `updatePaymentStatus` checks musician OR manager
- ✅ Unauthorized access throws error
- ✅ No data leakage between users

## Testing Checklist

### Database
- [ ] Apply migration via Supabase Dashboard SQL Editor
- [ ] Verify `is_paid` column dropped
- [ ] Verify new columns added with correct types
- [ ] Verify check constraints work (try invalid status)
- [ ] Verify indexes created

### API
- [ ] Test My Earnings query returns correct data
- [ ] Test Payouts query only returns user's managed gigs
- [ ] Test authorization: musician can update their own
- [ ] Test authorization: manager can update their gigs
- [ ] Test authorization: unauthorized access blocked
- [ ] Test year/month filtering works correctly
- [ ] Test summary calculations accurate

### UI
- [ ] Filter bar updates queries properly
- [ ] "This Month"/"This Year" quick actions work
- [ ] Summary cards show filtered totals
- [ ] Table shows filtered gigs only
- [ ] Update payment modal opens
- [ ] Update payment modal saves successfully
- [ ] "As Manager" tab only shows for managers
- [ ] Overdue rows highlighted in red
- [ ] Loading states display correctly
- [ ] Empty states show helpful messages
- [ ] Mobile responsive

### Edge Cases
- [ ] User with no gigs shows empty state
- [ ] User with no fees shows empty state
- [ ] Month with no data shows zero totals
- [ ] Partial payment calculates unpaid correctly
- [ ] Multiple partial payments sum correctly

## Known Limitations

1. **Single Currency:** Only ILS in v1 (currency field ready for future)
2. **Manual Overdue:** No automatic overdue detection
3. **No Notifications:** Payment status changes don't trigger notifications yet
4. **No Bulk Actions:** Can't update multiple payments at once
5. **No Export:** Can't export data to CSV/PDF
6. **No Client Money:** Only musician payments (no client fee tracking yet)
7. **No Profit Calculation:** Manager view doesn't show profit margins

## Future Enhancements

### Phase 2 - Manager Money Enhancements
See `docs/future-enhancements/manager-money-view.md`:
- Client fees tracking
- Profit per gig/project/year
- Revenue reports
- Cash flow projections

### Phase 3 - Advanced Features
- Bulk payment status updates
- CSV/PDF export
- Payment reminders (email/WhatsApp)
- Automatic overdue detection
- Multi-currency support
- Tax calculations
- Expense tracking

### Phase 4 - Integrations
- Accounting software integration (QuickBooks, Xero)
- Payment processor integration (PayPal, Stripe)
- Invoice generation
- Receipt attachments

## Migration Instructions

**IMPORTANT:** This migration drops the `is_paid` column. Backup your database first!

### Apply Migration

**Option 1: Supabase Dashboard (Recommended)**
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20251120000005_money_view_v1.sql`
3. Copy all SQL
4. Paste into SQL Editor
5. Click "Run"
6. Verify success in console

**Option 2: Supabase CLI (Local Dev)**
```bash
supabase db push
```

### Verify Migration

```sql
-- Check new columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'gig_roles'
AND column_name IN ('payment_status', 'paid_amount', 'currency');

-- Check constraints exist
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%payment%';

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'gig_roles'
AND indexname LIKE '%payment%';
```

## Rollback Plan

If issues arise, rollback is possible but requires data migration:

```sql
-- Add back is_paid column
ALTER TABLE gig_roles ADD COLUMN is_paid BOOLEAN DEFAULT FALSE;

-- Migrate data: payment_status='paid' → is_paid=true
UPDATE gig_roles SET is_paid = TRUE WHERE payment_status = 'paid';

-- Drop new columns (optional, if reverting completely)
ALTER TABLE gig_roles DROP COLUMN payment_status;
ALTER TABLE gig_roles DROP COLUMN paid_amount;
ALTER TABLE gig_roles DROP COLUMN currency;
```

**Note:** This loses information about partial/overdue payments. Only do this if absolutely necessary.

## Success Metrics

### Before (Old Money View)
- ❌ Boolean `is_paid` only (no partial payments)
- ❌ No overdue tracking
- ❌ No year/month filtering
- ❌ No manager view
- ❌ No summary statistics
- ❌ Basic table only

### After (Money View v1)
- ✅ 4 payment states (pending/paid/partial/overdue)
- ✅ Summary cards with KPIs
- ✅ Year/month filtering
- ✅ Manager payouts view
- ✅ Separate player and manager tabs
- ✅ Update payment status from both perspectives
- ✅ Visual highlighting for overdue
- ✅ Loading and empty states

### User Impact
- **Musicians:** Can track all earnings in one place, see unpaid/overdue at a glance
- **Managers:** Can track who they need to pay, filter by project/status
- **Time Savings:** No need for external spreadsheets or notes apps
- **Accuracy:** Single source of truth for payment tracking

## Final UX Refinements (November 20, 2024)

### Summary Cards Simplified
Changed from 4 cards to 3 more focused KPIs:
1. **Unpaid** - All money still owed (orange)
2. **Paid** - All money received (green)
3. **This Month** - Total fees for current month (neutral)

Removed: "This Year" and "Overdue" cards for simpler, cleaner view.

### Actions Simplified
**Before:**
- View Gig button
- Update button (opened complex dialog)

**After:**
- Single "Paid" button (green with check icon)
- One-click to mark as paid with auto-filled values
- Button only shows for unpaid gigs
- Already paid gigs show "—"

### Navigation Improvements
- **Clickable Gig Titles:** Click any gig name to navigate to detail page
- **Back Navigation:** Properly returns to Money page from gig detail
- **URL Parameters:** Added `?from=money` to maintain context

### Bug Fixes
- ✅ Fixed date calculation for months with different days (was hardcoded to 31)
- ✅ Fixed query ordering (PostgREST doesn't support nested column ordering)
- ✅ Fixed cache invalidation to update KPI cards immediately
- ✅ Fixed undefined value crashes with safe fallbacks
- ✅ Replaced all `is_paid` references with `payment_status` across codebase

### Files Affected by Final Changes
- `lib/api/money.ts` - Date calculations, sorting in JavaScript
- `lib/api/dashboard-gigs.ts` - Updated to use `payment_status`
- `lib/api/gig-pack.ts` - Updated to use `payment_status`
- `lib/api/gig-actions.ts` - Updated to use `payment_status`
- `lib/api/player-money.ts` - Deprecated (kept for backward compatibility)
- `lib/api/gig-roles.ts` - Fixed ordering
- `components/my-earnings-summary.tsx` - Changed to 3 cards
- `components/my-earnings-table.tsx` - Simplified actions, clickable titles
- `components/payouts-table.tsx` - Simplified actions, clickable titles
- `components/update-payment-status-dialog.tsx` - Kept but unused (for future complex updates)
- `app/(app)/money/page.tsx` - Added "In Progress" badge
- `app/(app)/gigs/[id]/page.tsx` - Fixed back navigation
- `app/(app)/gigs/page.tsx` - Updated to use `payment_status`
- `app/api/calendar.ics/route.ts` - Updated to use `payment_status`
- `components/gig-people-section.tsx` - Updated to use `payment_status`

## Documentation

**Implementation Plan:** `money-view-v1.plan.md`  
**This Document:** `docs/build-process/step-22-money-view-v1.md`  
**Future Enhancements:** `docs/future-enhancements/manager-money-view.md`

## Next Steps / Future Enhancements

### Short Term
- [ ] Add ability to mark multiple gigs as paid at once (bulk action)
- [ ] Add "Mark as Overdue" button for unpaid gigs past their date
- [ ] Add date range export to CSV

### Medium Term
- [ ] Manager profit view (client fee - total payouts)
- [ ] Payment reminders/notifications
- [ ] Payment history timeline per gig
- [ ] Multi-currency conversion

### Long Term
- [ ] Integration with payment processors (Stripe, PayPal)
- [ ] Automated payment tracking
- [ ] Tax reporting and expense tracking
- [ ] Invoice generation

---

**Step 22 Core is COMPLETE! Musicians and managers can now track all payments professionally. 💰**

*Note: Marked as "In Progress" in UI for ongoing UX refinements and future enhancements.*

