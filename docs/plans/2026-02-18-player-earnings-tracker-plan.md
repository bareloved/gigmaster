# Player Earnings Tracker Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let musicians see what they earn per gig (on cards, in gig pack) and view monthly/yearly totals with per-band breakdowns on a /money dashboard page.

**Architecture:** Extends the existing `gig_roles` table with 2 new columns (manager-set: `payment_method`, `expected_payment_date`). Reuses existing `agreed_fee`, `is_paid`, `paid_at`, `currency` columns. Adds payment fields to the `list_dashboard_gigs` RPC and fallback queries. Creates a new `/money` page with aggregation queries and a dashboard widget.

**Tech Stack:** Supabase (Postgres), TanStack Query, React, Tailwind CSS, shadcn/ui

---

## Task 1: Database Migration — Add payment_method and expected_payment_date

**Files:**
- Create: `supabase/migrations/20260218100000_add_payment_tracking_fields.sql`

**Step 1: Write migration SQL**

```sql
-- Add payment tracking fields to gig_roles
-- These are manager-set fields visible to the musician whose role it is

ALTER TABLE public.gig_roles
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS expected_payment_date date;

COMMENT ON COLUMN public.gig_roles.payment_method IS 'Payment method set by manager: Cash, Bank Transfer, Bit, PayBox, Check, PayPal, Other';
COMMENT ON COLUMN public.gig_roles.expected_payment_date IS 'Expected payment date set by manager';
```

**Step 2: Apply migration via Supabase MCP**

Use `apply_migration` with project_id `doqngbugrnlruzegdvyd`, name `add_payment_tracking_fields`.

**Step 3: Verify migration applied**

Run SQL: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'gig_roles' AND column_name IN ('payment_method', 'expected_payment_date');`

Expected: 2 rows returned.

**Step 4: Commit**

```bash
git add supabase/migrations/20260218100000_add_payment_tracking_fields.sql
git commit -m "feat: add payment_method and expected_payment_date to gig_roles"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `lib/types/database.ts` — add new columns to `gig_roles` Row/Insert/Update types
- Modify: `lib/types/shared.ts` — add `PlayerPaymentInfo` type and extend `DashboardGig`

**Step 1: Update database.ts gig_roles types**

In `lib/types/database.ts`, find the `gig_roles` table Row type and add:
```typescript
payment_method: string | null
expected_payment_date: string | null
```

Add the same to the Insert and Update types (as optional).

**Step 2: Add PlayerPaymentInfo type to shared.ts**

Add after the existing `PersonalEarnings` interface (around line 420):

```typescript
/**
 * Combined payment info for a player on a gig
 * Merges manager-set fields with player-recorded earnings
 */
export interface PlayerPaymentInfo {
  // Manager-set (read-only for player)
  agreedFee: number | null;
  currency: string;
  isPaid: boolean;
  paidAt: string | null;
  paymentMethod: string | null;
  expectedPaymentDate: string | null;
  // Player-recorded (editable by player)
  personalEarnings: PersonalEarnings;
}
```

**Step 3: Extend DashboardGig with payment fields**

In `lib/types/shared.ts`, add to the `DashboardGig` interface (around line 361):

```typescript
// Payment info (player's own role data, private)
playerAgreedFee?: number | null;
playerCurrency?: string | null;
playerIsPaid?: boolean | null;
playerPaidAt?: string | null;
playerPaymentMethod?: string | null;
playerExpectedPaymentDate?: string | null;
playerPersonalEarningsAmount?: number | null;
playerPersonalEarningsCurrency?: string | null;
```

**Step 4: Commit**

```bash
git add lib/types/database.ts lib/types/shared.ts
git commit -m "feat: add payment tracking types for player earnings"
```

---

## Task 3: Update Dashboard RPC and Fallback Queries

This task adds the payment fields to dashboard gig queries so gig cards can display payment info.

**Files:**
- Create: `supabase/migrations/20260218110000_update_dashboard_rpc_with_payment.sql`
- Modify: `lib/api/dashboard-gigs.ts` — add payment fields to RPC row type, mapping, and fallback queries

**Step 1: Write new RPC migration**

Create `supabase/migrations/20260218110000_update_dashboard_rpc_with_payment.sql`.

This replaces both `list_dashboard_gigs` and `list_past_gigs` to add these return columns:
- `call_time TIME` (was missing from RPC but used in dashboard)
- `band_id UUID` (was missing from past gigs RPC)
- `band_name TEXT` (was missing from past gigs RPC)
- `agreed_fee NUMERIC`
- `player_currency TEXT`
- `is_paid BOOLEAN`
- `paid_at TIMESTAMPTZ`
- `payment_method TEXT`
- `expected_payment_date DATE`
- `personal_earnings_amount NUMERIC`
- `personal_earnings_currency TEXT`
- `is_external BOOLEAN`

Add these to the SELECT in both the `user_gigs` CTE and the final RETURN QUERY.

**IMPORTANT:** Reference the existing RPC at `supabase/migrations/20260128100000_add_dashboard_gigs_rpc_functions.sql` for the base structure. Do NOT reference any migration with `project_id` — that column is DEAD.

**Step 2: Apply migration via Supabase MCP**

Use `apply_migration` with project_id `doqngbugrnlruzegdvyd`.

**Step 3: Update DashboardRpcRow interface in dashboard-gigs.ts**

In `lib/api/dashboard-gigs.ts`, add to the `DashboardRpcRow` interface (around line 5):

```typescript
agreed_fee: number | null;
player_currency: string | null;
is_paid: boolean | null;
paid_at: string | null;
payment_method: string | null;
expected_payment_date: string | null;
personal_earnings_amount: number | null;
personal_earnings_currency: string | null;
is_external: boolean;
```

**Step 4: Update RPC row mapping in listDashboardGigs**

In the `.map((row) => ({...}))` block (around line 92), add:

```typescript
bandName: row.band_name,
isExternal: row.is_external ?? false,
playerAgreedFee: row.agreed_fee,
playerCurrency: row.player_currency,
playerIsPaid: row.is_paid,
playerPaidAt: row.paid_at,
playerPaymentMethod: row.payment_method,
playerExpectedPaymentDate: row.expected_payment_date,
playerPersonalEarningsAmount: row.personal_earnings_amount,
playerPersonalEarningsCurrency: row.personal_earnings_currency,
```

Do the same for `listAllPastGigs` RPC mapping (around line 409).

**Step 5: Update fallback query selects**

In `listDashboardGigsFallback` (around line 174), add to the `gig_roles` select:

```
agreed_fee,
currency,
is_paid,
paid_at,
payment_method,
expected_payment_date,
personal_earnings_amount,
personal_earnings_currency
```

Then in the `gigMap.set()` call (around line 231), add the new fields:

```typescript
playerAgreedFee: userRole?.agreed_fee || null,
playerCurrency: userRole?.currency || null,
playerIsPaid: userRole?.is_paid || null,
playerPaidAt: userRole?.paid_at || null,
playerPaymentMethod: userRole?.payment_method || null,
playerExpectedPaymentDate: userRole?.expected_payment_date || null,
playerPersonalEarningsAmount: userRole?.personal_earnings_amount || null,
playerPersonalEarningsCurrency: userRole?.personal_earnings_currency || null,
```

Do the same for `listRecentPastGigs` and `listAllPastGigsFallback`.

**Step 6: Run lint and type check**

```bash
npm run check
```

**Step 7: Commit**

```bash
git add supabase/migrations/20260218110000_update_dashboard_rpc_with_payment.sql lib/api/dashboard-gigs.ts
git commit -m "feat: add payment fields to dashboard gig queries"
```

---

## Task 4: Gig Card Payment Line

Add a small, muted, color-coded text on the right side of gig cards.

**Files:**
- Modify: `components/dashboard/gig-item.tsx` — add payment text in desktop right column
- Create: `components/shared/gig-payment-text.tsx` — shared payment display logic

**Step 1: Create GigPaymentText component**

Create `components/shared/gig-payment-text.tsx`:

```typescript
'use client';

import { formatCurrency } from '@/lib/utils/currency';

interface GigPaymentTextProps {
  agreedFee: number | null | undefined;
  currency: string | null | undefined;
  isPaid: boolean | null | undefined;
  paidAt: string | null | undefined;
  expectedPaymentDate: string | null | undefined;
  personalEarningsAmount: number | null | undefined;
  personalEarningsCurrency: string | null | undefined;
  className?: string;
}

export function GigPaymentText({
  agreedFee,
  currency,
  isPaid,
  expectedPaymentDate,
  personalEarningsAmount,
  personalEarningsCurrency,
  className = '',
}: GigPaymentTextProps) {
  // Determine amount and currency to display
  const amount = agreedFee ?? personalEarningsAmount;
  const displayCurrency = agreedFee != null
    ? (currency || 'ILS')
    : (personalEarningsCurrency || 'ILS');

  if (amount == null) return null;

  const formattedAmount = formatCurrency(amount, displayCurrency);

  // Determine status and color
  let statusText: string;
  let colorClass: string;

  if (agreedFee != null) {
    // Manager-set fee — use manager payment status
    if (isPaid) {
      statusText = 'Paid';
      colorClass = 'text-green-600 dark:text-green-400';
    } else if (expectedPaymentDate) {
      const dueDate = new Date(expectedPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        statusText = 'Overdue';
        colorClass = 'text-red-600 dark:text-red-400';
      } else {
        const formatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        statusText = `Due ${formatted}`;
        colorClass = 'text-amber-600 dark:text-amber-400';
      }
    } else {
      statusText = 'Pending';
      colorClass = 'text-amber-600 dark:text-amber-400';
    }
  } else {
    // Player-recorded only
    statusText = 'Recorded';
    colorClass = 'text-muted-foreground';
  }

  return (
    <span className={`text-xs whitespace-nowrap ${colorClass} ${className}`}>
      {formattedAmount} · {statusText}
    </span>
  );
}
```

**Step 2: Add to gig-item.tsx (desktop right column)**

In `components/dashboard/gig-item.tsx`, import `GigPaymentText` and add it in the desktop right column div (line 310, `className="hidden sm:flex sm:flex-col ..."`).

Add the payment text between the badges row (Row 1, line 312) and the buttons row (Row 2, line 336). It should appear right-aligned:

```tsx
{/* Payment info (private to this player) */}
{gig.isPlayer && (
  <GigPaymentText
    agreedFee={gig.playerAgreedFee}
    currency={gig.playerCurrency}
    isPaid={gig.playerIsPaid}
    paidAt={gig.playerPaidAt}
    expectedPaymentDate={gig.playerExpectedPaymentDate}
    personalEarningsAmount={gig.playerPersonalEarningsAmount}
    personalEarningsCurrency={gig.playerPersonalEarningsCurrency}
  />
)}
```

**Step 3: Add to gig-item.tsx (mobile layout)**

In the mobile layout section (around line 59), add after the time display (line 93) but inside the existing height — use absolute positioning or flex to place it on the right:

Add it next to the status dot and crown/mail icons (around line 67):
```tsx
{gig.isPlayer && gig.playerAgreedFee != null && (
  <GigPaymentText
    agreedFee={gig.playerAgreedFee}
    currency={gig.playerCurrency}
    isPaid={gig.playerIsPaid}
    paidAt={gig.playerPaidAt}
    expectedPaymentDate={gig.playerExpectedPaymentDate}
    personalEarningsAmount={gig.playerPersonalEarningsAmount}
    personalEarningsCurrency={gig.playerPersonalEarningsCurrency}
    className="text-[10px]"
  />
)}
```

**Step 4: Run dev server and visually verify**

```bash
npm run dev
```

Open the gigs list page and verify:
- Cards with `agreed_fee` data show the payment text on the right
- Cards without data show nothing (no empty space)
- Colors are correct (green/amber/red)

**Step 5: Commit**

```bash
git add components/shared/gig-payment-text.tsx components/dashboard/gig-item.tsx
git commit -m "feat: add payment info text to gig cards"
```

---

## Task 5: Combined Payment Section in Gig Pack

**Files:**
- Create: `components/gigpack/payment-section.tsx` — combined payment + earnings section
- Modify: `components/gigpack/layouts/gigpack-layout.tsx` — add payment section to sidebar
- Modify: `app/(app)/gigs/[id]/pack/page.tsx` — pass payment data, move personal earnings into layout
- Modify: `lib/api/gig-pack.ts` — include payment fields in gig pack query
- Modify: `lib/api/personal-earnings.ts` — extend to fetch full payment info

**Step 1: Update getGigPackFull to include payment fields**

In `lib/api/gig-pack.ts`, find the `gig_roles` select in `getGigPackFull()` and add:
```
agreed_fee,
currency,
is_paid,
paid_at,
payment_method,
expected_payment_date,
personal_earnings_amount,
personal_earnings_currency,
personal_earnings_notes,
personal_earnings_paid_at
```

**Step 2: Create getPlayerPaymentInfo API function**

Add to `lib/api/personal-earnings.ts`:

```typescript
/**
 * Get full payment info for current user's role on a gig
 * Combines manager-set payment fields with player-recorded earnings
 */
export async function getPlayerPaymentInfo(gigId: string): Promise<{
  roleId: string;
  payment: PlayerPaymentInfo;
} | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: role, error } = await supabase
    .from('gig_roles')
    .select(`
      id,
      agreed_fee,
      currency,
      is_paid,
      paid_at,
      payment_method,
      expected_payment_date,
      personal_earnings_amount,
      personal_earnings_currency,
      personal_earnings_notes,
      personal_earnings_paid_at
    `)
    .eq('gig_id', gigId)
    .eq('musician_id', user.id)
    .maybeSingle();

  if (error || !role) return null;

  return {
    roleId: role.id,
    payment: {
      agreedFee: role.agreed_fee,
      currency: role.currency || 'ILS',
      isPaid: role.is_paid ?? false,
      paidAt: role.paid_at,
      paymentMethod: role.payment_method,
      expectedPaymentDate: role.expected_payment_date,
      personalEarnings: {
        amount: role.personal_earnings_amount,
        currency: role.personal_earnings_currency || 'ILS',
        notes: role.personal_earnings_notes,
        paidAt: role.personal_earnings_paid_at,
      },
    },
  };
}
```

**Step 3: Create PaymentSection component**

Create `components/gigpack/payment-section.tsx`:

A bordered section with:
- Header: "Payment" + lock icon + "Only visible to you" muted text
- Top half (read-only): Agreed Fee, Method, Expected Date, Status
- Divider with "My Tracking" label
- Bottom half (editable form): amount, currency, payment date, notes, save button
- The form reuses the existing `updatePersonalEarnings` API
- Gray border using `border border-border/50 rounded-xl p-5`
- Only renders if the user has a role on this gig

**Step 4: Add to GigPackLayout sidebar**

In `components/gigpack/layouts/gigpack-layout.tsx`, add a new prop `paymentSection` (React node) to `GigPackLayoutProps`.

In the sidebar column (line 715, `lg:col-span-2`), add the payment section after the Schedule card (line 743) but before the Contact card (line 746):

```tsx
{/* Payment section — desktop (right column, after schedule) */}
{paymentSection}
```

In the mobile main column, add after Materials section (line 710):

```tsx
{/* Payment section — mobile (after materials) */}
<div className="lg:hidden">
  {paymentSection}
</div>
```

And hide the desktop version on mobile:
```tsx
<div className="hidden lg:block">
  {paymentSection}
</div>
```

**Step 5: Wire up in pack/page.tsx**

In `app/(app)/gigs/[id]/pack/page.tsx`:
- Import `PaymentSection`
- Remove the existing `PersonalEarningsForm` block (lines 337-344)
- Pass `<PaymentSection gigId={gigId} />` as the `paymentSection` prop to `GigPackLayout`
- Show it for ALL gigs (not just external), since managers can set payment info on any gig

**Step 6: Run dev, verify layout**

- Desktop: payment section appears in right column under schedule
- Mobile: payment section appears at bottom after materials
- Gray border and lock icon visible
- Form saves correctly

**Step 7: Commit**

```bash
git add components/gigpack/payment-section.tsx components/gigpack/layouts/gigpack-layout.tsx app/(app)/gigs/[id]/pack/page.tsx lib/api/personal-earnings.ts lib/api/gig-pack.ts
git commit -m "feat: add combined payment section to gig pack"
```

---

## Task 6: Player Earnings API for /money Page

**Files:**
- Create: `lib/api/player-earnings.ts` — aggregation queries for earnings dashboard

**Step 1: Create player-earnings.ts**

Create `lib/api/player-earnings.ts` with these functions:

```typescript
/**
 * Get earnings summary for a player
 * Returns totals for this month, last month, this year, last year
 */
export async function getEarningsSummary(userId: string): Promise<EarningsSummary>

/**
 * Get earnings breakdown by band
 * Groups earnings by band for the given period
 */
export async function getEarningsByBand(
  userId: string,
  period: 'this-month' | 'last-month' | 'this-year' | 'last-year'
): Promise<BandEarnings[]>

/**
 * Get earnings gig list for a period
 * Returns all gigs with payment info for the selected period
 */
export async function getEarningsGigList(
  userId: string,
  period: 'this-month' | 'last-month' | 'this-year' | 'last-year'
): Promise<EarningsGig[]>
```

Each function queries `gig_roles` joined with `gigs` and `bands`, filtering by `musician_id = userId` and date range based on period.

**Amount logic:** Use `COALESCE(agreed_fee, personal_earnings_amount)` as the display amount.

**Types to add to shared.ts:**

```typescript
export interface EarningsSummary {
  thisMonth: { total: number; gigCount: number; currency: string; pending: number };
  lastMonth: { total: number; gigCount: number; currency: string };
  thisYear: { total: number; gigCount: number; currency: string };
  lastYear: { total: number; gigCount: number; currency: string };
}

export interface BandEarnings {
  bandId: string | null;
  bandName: string | null;
  total: number;
  gigCount: number;
  currency: string;
}

export interface EarningsGig {
  gigId: string;
  gigTitle: string;
  date: string;
  bandName: string | null;
  amount: number | null;
  currency: string;
  isPaid: boolean;
  paidAt: string | null;
  expectedPaymentDate: string | null;
  paymentMethod: string | null;
  hasEarningsData: boolean; // true if either agreed_fee or personal_earnings_amount is set
}
```

**Step 2: Run type check**

```bash
npm run check
```

**Step 3: Commit**

```bash
git add lib/api/player-earnings.ts lib/types/shared.ts
git commit -m "feat: add player earnings aggregation API"
```

---

## Task 7: Create /money Page

**Files:**
- Create: `app/(app)/money/page.tsx` — earnings dashboard page

**Step 1: Create the /money page**

Create `app/(app)/money/page.tsx` as a `'use client'` component with:

**Summary cards row** (3 cards):
- "This Month" — total amount + gig count
- "Last Month" — total amount + gig count
- "This Year" — total amount + gig count

Use `useQuery` with key `['earnings-summary', user?.id]` calling `getEarningsSummary`.

**Period toggle** — segmented control or tabs: This Month | Last Month | This Year | Last Year

**Per-band breakdown** (collapsible):
- List of bands with total + gig count
- "Solo / No band" for standalone gigs
- Use `useQuery` with key `['earnings-by-band', user?.id, period]`

**Gig list** (scrollable):
- Table/list of all gigs for selected period
- Columns: Date, Title, Band, Amount, Status
- Rows without earnings highlighted with amber "Not recorded" text
- Use `useQuery` with key `['earnings-gigs', user?.id, period]`

**Patterns to follow:**
- Use `useUser()` for auth, `enabled: !!user` on all queries
- Include `user?.id` in all query keys
- Use `formatCurrency` from `lib/utils/currency.ts`
- Use shadcn Card, Badge, Tabs components
- Skeleton loading states
- Empty state with CTA to go to gigs

**Step 2: Run dev, verify page**

```bash
npm run dev
```

Navigate to `/money` and verify:
- Summary cards show correct totals
- Period toggle switches data
- Band breakdown groups correctly
- Gig list shows all gigs with correct status colors
- "Not recorded" gigs are highlighted

**Step 3: Run lint and type check**

```bash
npm run check
```

**Step 4: Commit**

```bash
git add app/(app)/money/page.tsx
git commit -m "feat: create /money earnings dashboard page"
```

---

## Task 8: Dashboard Earnings Widget

**Files:**
- Create: `components/dashboard/earnings-widget.tsx`
- Modify: `app/(app)/dashboard/page.tsx` — add widget to right column

**Step 1: Create earnings widget component**

Create `components/dashboard/earnings-widget.tsx`:

A compact Card showing:
- Title: "Earnings This Month"
- Main line: formatted total + gig count (e.g., "₪3,200 · 6 gigs")
- Second line: pending amount if any (e.g., "₪800 pending")
- Click/Link navigates to `/money`
- Empty state: "Start tracking your earnings →"
- Uses `useQuery` with key `['earnings-summary', user?.id]` calling `getEarningsSummary`

**Step 2: Add to dashboard right column**

In `app/(app)/dashboard/page.tsx`, import `EarningsWidget` and add it to the right column (line 541, `<div className="space-y-6">`), before the `GigActivityWidget`:

```tsx
{/* Earnings Widget */}
<EarningsWidget />

{/* Band & Changes Activity Feed */}
<GigActivityWidget limit={10} showViewAll={true} />
```

**Step 3: Run dev, verify widget**

- Widget shows on dashboard right column
- Click navigates to /money
- Shows correct monthly total
- Empty state works when no earnings

**Step 4: Run lint and type check**

```bash
npm run check
```

**Step 5: Commit**

```bash
git add components/dashboard/earnings-widget.tsx app/(app)/dashboard/page.tsx
git commit -m "feat: add earnings widget to dashboard"
```

---

## Task 9: Add /money to Navigation

**Files:**
- Modify: whichever file contains the app navigation/sidebar (find via grep for existing nav items like "Dashboard", "Calendar", etc.)

**Step 1: Find and update navigation**

Search for the navigation component that lists Dashboard, Gigs, Calendar, etc. Add a "Money" or "Earnings" item linking to `/money` with a Banknote or Wallet icon from lucide-react.

**Step 2: Commit**

```bash
git add [nav file]
git commit -m "feat: add Money link to app navigation"
```

---

## Task 10: Final Verification and Cleanup

**Step 1: Run full lint + type check**

```bash
npm run check
```

Fix any issues.

**Step 2: Run build**

```bash
npm run build
```

Fix any build errors.

**Step 3: Run tests**

```bash
npm run test:run
```

Fix any broken tests.

**Step 4: Manual testing checklist**

- [ ] Gig cards show payment text (right side, correct colors)
- [ ] Gig cards without payment data show no text (no empty space)
- [ ] Gig pack shows combined payment section (desktop: right column, mobile: bottom)
- [ ] Payment section has gray border + "Only visible to you" label
- [ ] Personal earnings form still saves correctly
- [ ] /money page loads with correct summary cards
- [ ] Period toggle switches data correctly
- [ ] Per-band breakdown shows correct groupings
- [ ] Gig list highlights "Not recorded" gigs
- [ ] Dashboard widget shows monthly total
- [ ] Dashboard widget links to /money
- [ ] Navigation includes Money link

**Step 5: Run Supabase advisors**

Check for any security or performance issues after the schema changes.

**Step 6: Update CHANGELOG.md**

Add under `## [Unreleased]`:

```markdown
### Added
- Player earnings dashboard at /money with monthly/yearly totals
- Per-band earnings breakdown
- Payment info display on gig cards (amount + status)
- Combined payment section in gig pack (manager-set + personal tracking)
- Earnings widget on dashboard
- payment_method and expected_payment_date fields for gig roles
```

**Step 7: Final commit**

```bash
git add CHANGELOG.md
git commit -m "docs: update changelog with player earnings tracker"
```
