# Step 10: Player Money View

**Status:** ✅ Complete

**Date:** November 15, 2024

**Branch/Commit:** Main development

---

## Overview

Implemented the Player Money View, allowing musicians to track their earnings, unpaid amounts, and payment history across all gigs. This feature provides musicians with a clear financial overview and helps them manage their income from multiple projects.

The Manager Money View was intentionally deferred to a future enhancement to keep this step focused and avoid scope creep. A placeholder tab exists in the UI with a "Coming soon" message.

---

## Goals

✅ **Primary Goals:**
1. Allow musicians to see their total earnings (paid gigs)
2. Display unpaid amounts (gigs awaiting payment)
3. Show a detailed list of all gigs with payment information
4. Provide summary statistics (total earned, unpaid, gig count)
5. Support multiple currencies (with default to USD)
6. Maintain performance with proper query optimization

⏸️ **Deferred Goals:**
- Manager Money View (client fees, payouts, profit tracking) → See `docs/future-enhancements/manager-money-view.md`

---

## What Was Built

### 1. Database Schema Update

**Migration:** `supabase/migrations/20241115_add_currency_to_gigs.sql`

Added `currency` field to the `gigs` table:
- Defaults to 'USD'
- Supports 8 major currencies: USD, EUR, GBP, CAD, AUD, JPY, CHF, ILS
- Constraint ensures only valid currency codes are stored

**Rationale:**
- Different projects/clients may pay in different currencies
- Necessary for accurate financial reporting
- Allows future multi-currency support in Manager view

**Existing Schema (No Changes Needed):**
- `gig_roles.agreed_fee` (NUMERIC) - The fee agreed upon for the musician
- `gig_roles.is_paid` (BOOLEAN) - Whether the musician has been paid
- `gig_roles.paid_at` (TIMESTAMPTZ) - When payment was made
- Index on `gig_roles.musician_id` - Already exists from Step 5

### 2. TypeScript Types

**File:** `lib/types/database.ts`

Updated the `gigs` table type to include:
```typescript
Row: {
  // ... other fields
  currency: string;
}
```

This ensures type safety throughout the application when working with gig currency.

### 3. Player Money API

**File:** `lib/api/player-money.ts`

Created two main API functions:

#### `getPlayerMoneySummary(userId, dateRange?)`
Returns aggregate financial statistics for a musician:
- `totalEarned`: Sum of paid fees
- `totalUnpaid`: Sum of unpaid fees
- `gigCount`: Number of gigs with payment info
- `currency`: Most common currency (for display purposes)

**Query Logic:**
- Joins `gig_roles` with `gigs` to get currency info
- Filters by `musician_id = userId`
- Excludes rows where `agreed_fee` is NULL
- Optional date range filtering on `gigs.date`
- Aggregates fees based on `is_paid` status

**Performance Considerations:**
- Uses indexed `musician_id` for fast filtering
- Returns minimal data (just summary stats)
- Stale time: 2 minutes (via TanStack Query)

#### `getPlayerMoneyGigs(userId, dateRange?, limit?)`
Returns detailed list of gigs with payment info:
- Gig details (date, title, project name)
- Role name
- Agreed fee
- Payment status (paid/unpaid)
- Paid date (if applicable)
- Currency

**Query Logic:**
- Three-way join: `gig_roles → gigs → projects`
- Filters by `musician_id = userId`
- Orders by `gigs.date DESC` (most recent first)
- Default limit: 50 gigs (prevents slow queries on large datasets)
- Optional date range filtering

**Performance Considerations:**
- Uses indexes on `musician_id` and `date`
- Limits result set to 50 by default
- Returns flattened data structure (no nested objects)
- Stale time: 2 minutes

### 4. UI Components

#### `components/money-summary-cards.tsx`
Displays three summary cards:
1. **Total Earned** - Paid gigs sum (green emphasis)
2. **Unpaid** - Pending payments sum (yellow/warning emphasis)
3. **Total Gigs** - Count of gigs with payment info

**Features:**
- Uses shadcn `Card` components
- Icons from lucide-react (DollarSign, TrendingUp, Calendar)
- Currency symbol helper function (supports 8 currencies)
- Formatted numbers with 2 decimal places
- Responsive grid layout (3 columns on desktop, stacks on mobile)

**UX Considerations:**
- Clear visual hierarchy (large numbers, small labels)
- Color coding for quick scanning
- Contextual labels ("Paid gigs", "Pending payment")

#### `components/player-money-table.tsx`
Displays detailed table of gigs with payment information:

**Columns:**
- Date (formatted: "MMM d, yyyy")
- Project name
- Gig title (bold/emphasized)
- Role name
- Fee (formatted with currency symbol)
- Status (badge: green "Paid" or gray "Unpaid")

**Features:**
- Uses shadcn `Table` components
- Badge for payment status (visual indicator)
- Entire row is clickable (links to gig detail page)
- Currency symbol helper function
- Empty state if no gigs found
- Proper formatting for NULL fees ("Not set")

**UX Considerations:**
- Hover effect on rows (subtle background change)
- Clear typography hierarchy (title bold, others regular)
- Right-aligned fee column (common accounting pattern)
- Link wraps entire cell content (easy to click)

### 5. Money Page

**File:** `app/(app)/money/page.tsx`

Main page with tabs for Player and Manager views.

**Structure:**
- Page header with title and description
- Tabs component with two tabs:
  1. **As Player** (fully functional)
  2. **As Manager** (placeholder for future)

**As Player Tab:**
- Summary cards at the top
- Payment history table below
- Loading skeletons while fetching data
- Error states with clear messaging
- Empty states if no data

**As Manager Tab:**
- Placeholder card with "Coming soon" message
- Brief description of what the feature will include
- Links to future enhancement documentation (conceptually)

**Data Fetching:**
- Uses TanStack Query for both summary and gigs data
- Parallel queries (both fire at once)
- 2-minute stale time (reasonable for financial data)
- Conditional fetching (only if user is logged in)
- Proper error handling and user feedback

**Authentication:**
- Checks for logged-in user via `useUser()` hook
- Shows message if not authenticated
- User ID used in query keys for caching

### 6. Navigation

**File:** `components/app-sidebar.tsx`

Money link already existed in the sidebar:
- Icon: DollarSign (lucide-react)
- Label: "Money"
- Path: `/money`
- Active state highlighting when on money page

No changes needed - navigation was already in place from earlier sidebar work.

---

## Technical Decisions

### 1. Player First, Manager Later
**Decision:** Implement only Player Money View in Step 10, defer Manager view to future enhancement.

**Rationale:**
- Player view serves ALL musicians (broader impact)
- Manager view is more complex (client fees, profit calculations)
- Avoids scope creep in Step 10
- Database schema already supports both views
- Easy to add Manager view later without major refactoring

### 2. Currency as String Field
**Decision:** Store currency as a TEXT field with CHECK constraint, not an ENUM.

**Rationale:**
- TEXT with constraint is more flexible than ENUM in Postgres
- Easy to add new currencies without migration
- Constraint still ensures data integrity
- Common pattern in Supabase applications

### 3. Default Limit of 50 Gigs
**Decision:** Cap `getPlayerMoneyGigs` at 50 results by default.

**Rationale:**
- Prevents slow queries for musicians with 100+ gigs
- 50 gigs is ~6-12 months of gigging for most musicians
- User can add date range filtering if needed (future feature)
- Maintains fast page load times

### 4. No Date Range Filter (Yet)
**Decision:** No date range picker in MVP, but API supports it.

**Rationale:**
- Keeps UI simple for v1
- API already accepts `dateRange` parameter
- Easy to add UI filter later without backend changes
- Most musicians want "all time" view first

### 5. Summary and List as Separate Queries
**Decision:** Two separate API functions instead of one combined query.

**Rationale:**
- Summary is lightweight (just aggregates)
- List is heavier (detailed gig data)
- Allows independent caching strategies
- Parallel fetching improves perceived performance
- Follows single-responsibility principle

### 6. Currency Symbol Helper Function
**Decision:** Client-side helper function for currency symbols, not database-driven.

**Rationale:**
- Simple mapping (8 currencies)
- No need for database table
- Fast lookup (JavaScript object)
- Easy to extend if needed
- Reduces database queries

---

## Files Created

### Database
- `supabase/migrations/20241115_add_currency_to_gigs.sql` (19 lines)

### Types
- `lib/types/database.ts` (updated, +1 field in Gigs table)

### API
- `lib/api/player-money.ts` (158 lines)

### Components
- `components/money-summary-cards.tsx` (74 lines)
- `components/player-money-table.tsx` (103 lines)

### Pages
- `app/(app)/money/page.tsx` (121 lines)

### Documentation
- `docs/future-enhancements/manager-money-view.md` (420 lines - comprehensive spec)
- `docs/future-enhancements/README.md` (updated with Manager Money entry)
- `docs/build-process/step-10-player-money-view.md` (this file)

**Total New Code:** ~495 lines (excluding docs)

---

## Code Examples

### Summary Cards Usage

```typescript
<MoneySummaryCards
  totalEarned={summary.totalEarned}
  totalUnpaid={summary.totalUnpaid}
  gigCount={summary.gigCount}
  currency={summary.currency}
/>
```

### Player Money Table Usage

```typescript
<PlayerMoneyTable gigs={gigs} />
```

### Fetching Player Money Data

```typescript
const { data: summary } = useQuery({
  queryKey: ['player-money-summary', user?.id],
  queryFn: () => getPlayerMoneySummary(user!.id),
  enabled: !!user?.id,
  staleTime: 2 * 60 * 1000,
});

const { data: gigs } = useQuery({
  queryKey: ['player-money-gigs', user?.id],
  queryFn: () => getPlayerMoneyGigs(user!.id),
  enabled: !!user?.id,
  staleTime: 2 * 60 * 1000,
});
```

### Currency Symbol Helper

```typescript
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'CA$',
    AUD: 'A$',
    JPY: '¥',
    CHF: 'CHF ',
    ILS: '₪',
  };
  return symbols[currency] || currency + ' ';
}
```

---

## Performance Optimizations

### Database Indexes (Already Exist from Previous Steps)
```sql
-- From Step 5 (gig_roles migration)
CREATE INDEX idx_gig_roles_musician_id ON public.gig_roles(musician_id);
CREATE INDEX idx_gig_roles_gig_id ON public.gig_roles(gig_id);

-- From Step 1 (initial schema)
CREATE INDEX idx_gigs_date ON public.gigs(date);
CREATE INDEX idx_gigs_project_id ON public.gigs(project_id);
```

These indexes ensure fast queries for:
- Finding all gigs for a specific musician
- Joining gig_roles with gigs
- Filtering by date range

### Query Optimization

**Summary Query:**
- Single query with aggregation (SUM, COUNT)
- Filters on indexed `musician_id`
- Returns minimal data (4 fields)

**Gigs List Query:**
- Three-way join with explicit field selection (no SELECT *)
- Filtered on indexed `musician_id`
- Ordered by indexed `date` field
- Limited to 50 results

**Estimated Query Times (100+ gigs in DB):**
- Summary: ~50-150ms
- Gigs list: ~100-300ms

### Client-Side Caching
```typescript
staleTime: 2 * 60 * 1000 // 2 minutes
```

**Rationale:**
- Financial data doesn't change frequently minute-to-minute
- 2 minutes balances freshness and performance
- Reduces database load
- Improves perceived speed on repeat visits

### Cache Invalidation Strategy
Queries should be invalidated when:
- A gig role is updated (fee, payment status changes)
- A new gig role is added for the user
- A gig role is deleted

**Implementation (Future):**
```typescript
// After updating a gig role
queryClient.invalidateQueries(['player-money-summary', userId]);
queryClient.invalidateQueries(['player-money-gigs', userId]);
```

---

## Security Considerations

### Row Level Security (RLS)
All data access is protected by existing RLS policies:

**Gig Roles:**
- Users can only see gig roles for gigs in their own projects (as project owner)
- In the future, musicians will see roles where they are assigned (via `musician_id`)

**Gigs:**
- Users can only see gigs for projects they own
- Future: musicians will see gigs where they have a role

**Current Limitation:**
- Right now, only project owners can see financial data
- When invite system is built (future steps), musicians will be able to see their own roles and fees

### SQL Injection Prevention
- All queries use Supabase client with parameterized queries
- No raw SQL with string concatenation
- TypeScript types ensure correct parameter types

### Data Privacy
- Musician can only see their own financial data (filtered by `musician_id`)
- No exposure of other musicians' fees
- Manager view (future) will show payouts but only for their own projects

---

## Testing

### Manual Testing Checklist

✅ **Page Load:**
- [x] Money page loads without errors
- [x] Summary cards display correctly
- [x] Table renders with data

✅ **Data Display:**
- [x] Correct sum for total earned (paid gigs)
- [x] Correct sum for unpaid gigs
- [x] Gig count matches table row count
- [x] Currency symbols display correctly

✅ **Table Functionality:**
- [x] Table shows all gigs with payment info
- [x] Date formatted correctly (MMM d, yyyy)
- [x] Project and gig names display
- [x] Role name displays
- [x] Fee formatted with correct currency and decimals
- [x] Status badge shows green for paid, gray for unpaid
- [x] Clicking row navigates to gig detail page

✅ **Edge Cases:**
- [x] No gigs - shows empty state
- [x] Fee is NULL - shows "Not set"
- [x] Loading states - skeletons display
- [x] Error states - error message displays

✅ **Responsive:**
- [x] Summary cards stack on mobile
- [x] Table scrolls horizontally on mobile (if needed)
- [x] Touch targets are large enough

✅ **Tabs:**
- [x] As Player tab loads and displays data
- [x] As Manager tab shows placeholder message
- [x] Tabs switch correctly

### Test Data

**Scenario 1: Happy Path**
- User: Musician with 5 gigs
- 3 gigs paid, 2 unpaid
- Total earned: $1,500
- Total unpaid: $800
- Expected: Summary shows correct totals, table shows 5 rows

**Scenario 2: No Payment Info**
- User: Musician with 2 gigs but no fees set
- Expected: Empty state or "Not set" for fees

**Scenario 3: Multiple Currencies**
- User: Gigs in USD and EUR
- Expected: Summary uses most common currency, table shows each gig's currency

---

## Known Limitations

### 1. No Date Range Filter
**Limitation:** Cannot filter by date range yet.

**Impact:** Musician sees all gigs ever (up to 50).

**Future:** Add date range picker (this month, last month, custom).

### 2. No Export Feature
**Limitation:** Cannot export to CSV/PDF.

**Impact:** Musician must manually copy data for tax purposes.

**Future:** Add export button with CSV/PDF options.

### 3. No Multi-Currency Aggregation
**Limitation:** If musician has gigs in multiple currencies, totals don't convert.

**Impact:** Summary shows total in "most common" currency, but doesn't convert.

**Future:** Add currency conversion (requires exchange rate API).

### 4. No Payment Date Tracking
**Limitation:** `paid_at` is stored but not displayed in UI.

**Impact:** Musician can't see when they were paid.

**Future:** Add "Paid Date" column to table (optional toggle).

### 5. No Filtering/Sorting
**Limitation:** Cannot filter by project or sort by fee/date.

**Impact:** Large dataset is hard to navigate.

**Future:** Add filter dropdown and sortable columns.

### 6. Project Owners Only
**Limitation:** Only project owners can access money page (RLS limitation).

**Impact:** Invited musicians can't see their money yet.

**Future:** Update RLS policies when invite system is built (Step 11+).

---

## Future Enhancements

### Short-Term (1-2 sprints)
1. **Date Range Filter**
   - Add date range picker to UI
   - Filter summary and table by date range
   - Preset options: This Month, Last Month, This Year

2. **Payment Date Column**
   - Show `paid_at` in table
   - Format: "Paid on MMM d, yyyy" or "Not paid yet"

3. **Sorting and Filtering**
   - Sort by date, fee, status
   - Filter by project, status (paid/unpaid)

### Medium-Term (3-5 sprints)
1. **Manager Money View**
   - See `docs/future-enhancements/manager-money-view.md`
   - Client fees, payouts, profit tracking

2. **Export to CSV/PDF**
   - Generate financial reports
   - Tax-ready format

3. **Charts and Graphs**
   - Earnings over time (line chart)
   - Earnings by project (pie chart)

### Long-Term (6+ sprints)
1. **Multi-Currency Support**
   - Convert all amounts to a base currency
   - Real-time exchange rates (API integration)

2. **Payment Integration**
   - Stripe/PayPal for direct payments
   - Auto-update `is_paid` when payment received

3. **Tax Reports**
   - Generate year-end summaries
   - Categorize income by project/client

---

## Lessons Learned

### What Went Well
✅ API design was straightforward and reusable
✅ Component structure follows existing patterns (shadcn)
✅ Database schema was already 80% ready (from Step 5)
✅ Deferring Manager view kept scope manageable
✅ Performance was addressed early (indexes, limits, caching)

### Challenges
⚠️ Multi-currency aggregation is tricky (punted to future)
⚠️ RLS policies limit access to project owners only (will be addressed with invite system)

### Improvements for Next Time
📝 Could have added date range filter in MVP (API already supports it)
📝 Consider adding export feature earlier (high value, low effort)

---

## Next Steps

After Step 10, continue with:

1. **Step 11-12** (if defined) - Likely invite system, which will enable:
   - Musicians to access their own money page
   - Confirmation/decline workflow
   - Gig Pack view for invitees

2. **Implement Future Enhancements:**
   - Date range filtering (quick win)
   - Export to CSV (quick win)
   - Manager Money View (larger effort)

3. **User Feedback:**
   - Get feedback from musicians using the Player Money View
   - Identify most-requested features
   - Prioritize based on user needs

---

## Related Documentation

- **Step 5:** GigRoles basics (fees, payment status, musician linking)
  - `docs/build-process/step-5-gigroles-lineup.md`
- **Step 8:** Dashboard views (As Player / As Manager pattern)
  - `docs/build-process/step-8-dashboard-views.md`
- **Future:** Manager Money View
  - `docs/future-enhancements/manager-money-view.md`

---

## Summary

✅ **Player Money View is complete and functional.**

Musicians can now:
- See total earned and unpaid amounts at a glance
- View detailed payment history for all gigs
- Track payment status (paid/unpaid) per gig
- Navigate to gig details from the money table

The foundation is solid and performance-optimized. Manager Money View is well-documented and ready to implement when prioritized.

**Step 10: Player Money View is done.** 🎉


