# Future Enhancement: Manager Money View

**Status:** Planned (Player view complete, Manager view placeholder)

**Prerequisites:**
- ✅ Step 10: Player Money View (complete)
- ✅ Step 5: GigRoles system (complete)
- Possibly Step 11-12: Enhanced financial tracking

---

## Overview

The Manager Money View will provide project owners/managers with a comprehensive financial dashboard to track revenue, payouts, and profitability across their projects and gigs.

### Current State (Step 10)
- ✅ Player Money View: Musicians can see their earnings, unpaid amounts, and payment history
- ✅ Database schema supports `agreed_fee`, `is_paid`, `paid_at` on gig_roles
- ✅ Currency field added to gigs table
- ❌ No manager-specific financial views yet
- ❌ No client fee tracking on gigs
- ❌ No profit calculations per project/gig

---

## Goals

1. **Track Client Fees:** Allow managers to record how much clients are paying for each gig
2. **Calculate Total Payouts:** Sum up all musician fees per gig
3. **Profit Analysis:** Calculate profit = client_fee - total_payouts
4. **Project-Level Reporting:** View financials rolled up by project
5. **Date Range Filtering:** See revenue/profit for specific time periods
6. **Payment Status Tracking:** Track whether clients have paid and whether musicians have been paid

---

## Features

### 1. Manager Money Dashboard
**Location:** `/money` page, "As Manager" tab

**Summary Cards:**
- Total Revenue (sum of client fees)
- Total Payouts (sum of musician fees)
- Total Profit (revenue - payouts)
- Number of gigs

**Filters:**
- Date range picker (this month, last month, custom range, all time)
- Project dropdown (filter by specific project)
- Status filter (unpaid, partially paid, fully paid)

### 2. Gigs Financial Table
**Columns:**
- Date
- Project
- Gig Title
- Client Fee
- Total Payouts (sum of musician fees)
- Profit
- Payment Status (badge: unpaid, partial, paid)

**Actions:**
- Click row to view gig detail
- Quick edit client fee inline
- Mark client payment as received

### 3. Project Financial Summary
**Show per project:**
- Total gigs
- Total revenue
- Total payouts
- Average profit per gig
- Unpaid amounts

**Chart/Graph (optional):**
- Revenue over time
- Profit trend
- Top projects by revenue

---

## Database Schema Requirements

### Extend `gigs` Table

```sql
-- Add financial tracking fields to gigs
ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS client_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS client_payment_status TEXT DEFAULT 'unpaid' NOT NULL;

-- Constraint for valid payment status
ALTER TABLE public.gigs
ADD CONSTRAINT valid_client_payment_status 
CHECK (client_payment_status IN ('unpaid', 'partial', 'paid'));
```

**Fields:**
- `client_fee`: How much the client is paying for this gig
- `client_payment_status`: Whether the client has paid ('unpaid', 'partial', 'paid')
- `currency`: Already added in Step 10

### Existing Fields (Already Available)
- `gig_roles.agreed_fee`: Musician fees per role
- `gig_roles.is_paid`: Whether musician has been paid
- `gig_roles.paid_at`: When musician was paid

---

## API Functions

**File:** `lib/api/manager-money.ts`

### `getManagerMoneySummary(userId, projectId?, dateRange?)`
Returns summary statistics for manager:
- Total revenue (sum of client_fee for user's projects)
- Total payouts (sum of gig_role agreed_fee for user's projects)
- Total profit (revenue - payouts)
- Gig count

**Performance:**
- Join: `gigs → projects → gig_roles`
- Filter: `projects.owner_id = userId`
- Aggregate: SUM, COUNT
- Optional filters: projectId, date range

### `getManagerMoneyGigs(userId, projectId?, dateRange?, limit?)`
Returns list of gigs with financial details:
- Gig info (date, title, project name)
- Client fee
- Total payouts (calculated from gig_roles)
- Profit (client_fee - total_payouts)
- Client payment status
- Musicians payment status (how many paid/unpaid)

**Performance:**
- Use subquery or join to calculate total_payouts per gig
- Limit results (default: 50)
- Order by date DESC

### `getProjectFinancials(projectId, dateRange?)`
Returns financial summary for a specific project:
- Total gigs
- Total revenue
- Total payouts
- Total profit
- Average per gig
- Outstanding payments (unpaid client fees + unpaid musician fees)

---

## UI Components

### `components/manager-money-summary-cards.tsx`
Display summary stats for manager view (similar to player summary cards)

### `components/manager-money-table.tsx`
Table showing gigs with financial columns

### `app/(app)/money/page.tsx`
Update the "As Manager" tab to show:
- Summary cards
- Filters (date range, project selector)
- Gigs financial table
- Empty state if no projects/gigs

---

## Performance Considerations

### Indexes
Add composite indexes for efficient manager queries:

```sql
-- Index for manager money queries
CREATE INDEX IF NOT EXISTS idx_gigs_project_date 
ON public.gigs(project_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_gig_roles_gig_agreed_fee 
ON public.gig_roles(gig_id, agreed_fee);
```

### Query Optimization
- Calculate `total_payouts` efficiently using subquery:
  ```sql
  SELECT 
    g.id,
    g.client_fee,
    COALESCE(SUM(gr.agreed_fee), 0) as total_payouts,
    (g.client_fee - COALESCE(SUM(gr.agreed_fee), 0)) as profit
  FROM gigs g
  LEFT JOIN gig_roles gr ON gr.gig_id = g.id
  GROUP BY g.id, g.client_fee
  ```
- Always filter by date range to avoid querying all historical data
- Use pagination for large datasets

### Caching
- Cache summary data for 2-5 minutes (using TanStack Query staleTime)
- Invalidate cache when:
  - Gig is created/updated
  - GigRole fee is updated
  - Client fee is updated
  - Payment status changes

---

## User Experience

### Manager Flow
1. Navigate to Money page
2. Switch to "As Manager" tab
3. See summary cards with totals
4. Apply filters (date range, project)
5. Review gigs table with profit per gig
6. Click gig to view details / edit fees
7. Mark client payments as received
8. View project-level financials

### Mobile Considerations
- Summary cards stack vertically
- Table becomes scrollable or cards on mobile
- Filters collapse into dropdown menu

---

## Multi-Currency Support

### Current Implementation (Step 10)
- `currency` field added to `gigs` table
- Supports 8 major currencies: USD, EUR, GBP, CAD, AUD, JPY, CHF, ILS
- Default currency: **ILS** (Israeli New Shekel)
- Each gig can have its own currency
- Currency symbols displayed correctly in UI

### Player View Currency Handling
- Summary cards show totals in most common currency used by musician
- Each gig in table displays its own currency
- Currency symbols: $, €, £, CA$, A$, ¥, CHF, ₪

### Manager View Currency Requirements

#### Basic Multi-Currency Support (Phase 1)
**Gig-Level:**
- Each gig has its own currency (already implemented in DB)
- Client fee stored in gig's currency
- Musician payouts stored in their agreed currency
- Display proper currency symbol per gig

**Summary Cards:**
- Option 1: Show totals in default currency (ILS) only
  - Simple, no conversion needed
  - Clear "All amounts in ILS" note
- Option 2: Show totals per currency
  - Separate cards for each currency used
  - Example: "Total Revenue (ILS): ₪50,000" + "Total Revenue (USD): $10,000"
  - More accurate, no conversion errors

**Table Display:**
- Each row shows amounts in their native currency
- Currency column or symbol prefix
- No conversion in table (show actual values)

#### Advanced Multi-Currency Support (Phase 2+)
**Currency Conversion:**
- Real-time exchange rates (API integration)
- Convert all amounts to base currency for aggregation
- Base currency setting per user (default: ILS)
- Exchange rate API options:
  - [Open Exchange Rates](https://openexchangerates.org/)
  - [CurrencyAPI](https://currencyapi.com/)
  - [Fixer.io](https://fixer.io/)

**Features:**
1. **Base Currency Setting:**
   - User selects preferred base currency
   - All summaries convert to base currency
   - Original currency still shown per gig

2. **Exchange Rate Display:**
   - Show exchange rates used for conversion
   - Timestamp of last rate update
   - Historical rates for past gigs

3. **Mixed Currency Alerts:**
   - Warn when calculating totals across currencies
   - Show converted values with disclaimer
   - "Exchange rates as of [date]"

4. **Currency-Specific Reports:**
   - Filter/group by currency
   - See totals per currency without conversion
   - Useful for tax reporting in specific currencies

**Database Schema for Currency Conversion:**
```sql
-- Exchange rates cache table (optional, for advanced implementation)
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC(10, 6) NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(from_currency, to_currency, fetched_at::date)
);

-- Index for quick lookups
CREATE INDEX idx_exchange_rates_currencies_date 
ON public.exchange_rates(from_currency, to_currency, fetched_at DESC);
```

**Implementation Considerations:**
- Cache exchange rates (update daily or hourly)
- Handle API failures gracefully (use cached rates)
- Store conversion rates with transactions for audit trail
- Allow manual rate override for specific calculations

---

## Future Extensions (Beyond MVP)

### Advanced Features
- **Invoicing:** Generate invoices for clients (multi-currency support)
- **Expense Tracking:** Track gig-related expenses (travel, equipment rental) in any currency
- **Tax Reports:** Generate tax summaries by year/quarter, grouped by currency
- **Payment Integration:** Stripe/PayPal integration for collecting client payments (auto-detect currency)
- **Automated Payouts:** Pay musicians directly through the app (handle currency conversion)
- **Currency Conversion History:** Track historical exchange rates for accurate reporting
- **Budgeting:** Set budget per gig in any currency, alert if payouts exceed budget
- **Multi-Currency Profit Analysis:** Compare profit across currencies with conversion

### Reporting
- Export to CSV/PDF (include currency columns)
- Charts and graphs (revenue over time, per currency or converted)
- Compare projects side-by-side (normalize to base currency)
- Year-over-year comparisons (adjust for exchange rate changes)

---

## Implementation Timeline

### Phase 1: Basic Manager View
- Extend database schema (client_fee, payment_status)
- Create manager money API functions
- Build summary cards and table
- Add filters (date range, project)

**Estimated Effort:** 4-6 hours

### Phase 2: Enhanced Features
- Project-level financial summary
- Quick edit client fee
- Payment status management
- Charts/graphs

**Estimated Effort:** 3-4 hours

### Phase 3: Advanced Features
- Invoicing
- Expense tracking
- Tax reports

**Estimated Effort:** 8-12 hours

---

## Acceptance Criteria

✅ **Manager view is complete when:**
1. Manager can see total revenue, payouts, and profit across all projects
2. Manager can filter by date range and project
3. Manager can view a table of gigs with financial details
4. Manager can see profit per gig (client_fee - total_payouts)
5. Manager can track client payment status
6. All queries are performant (< 500ms for 100+ gigs)
7. UI is responsive and matches Player view design patterns
8. Data updates in real-time after edits
9. Empty states and loading states are handled gracefully
10. Documentation is complete

---

## Related Files

**Current Implementation:**
- `lib/api/player-money.ts` (Player view API - reference for Manager API)
- `components/money-summary-cards.tsx` (Can be reused/extended for Manager)
- `app/(app)/money/page.tsx` (Manager tab placeholder exists)

**New Files to Create:**
- `lib/api/manager-money.ts` (Manager money API functions)
- `components/manager-money-summary-cards.tsx` (Manager summary cards)
- `components/manager-money-table.tsx` (Gigs financial table)
- `supabase/migrations/[timestamp]_add_client_fee_to_gigs.sql` (Schema update)

---

## Notes

- Manager Money View is intentionally deferred to keep Step 10 focused on Player view
- Player view is higher priority because it serves all musicians, not just managers
- Database schema is ready to support manager features (just need to add client_fee field)
- This enhancement builds on existing Step 10 infrastructure (API patterns, UI components)
- Consider adding this feature after Steps 11-12 are complete, or when managers request it


