# Player Earnings Tracker — Design

**Date:** 2026-02-18
**Focus:** Player-side finance features (not manager money view)

## Goal

Let musicians track what they earn per gig, see payment status at a glance, and view monthly/yearly totals with per-band breakdowns.

## Data Model

### New columns on `gig_roles`

| Column | Type | Purpose |
|--------|------|---------|
| `payment_method` | `text` | Dropdown: Cash, Bank Transfer, Bit, PayBox, Check, PayPal, Other |
| `expected_payment_date` | `date` | When the musician should expect payment (manager-set) |

### Existing columns used (no changes needed)

**Manager-set (on `gig_roles`):**
- `agreed_fee` — amount owed to musician
- `currency` — currency for the fee
- `is_paid` / `paid_at` — whether payment was made

**Player-private (on `gig_roles`):**
- `personal_earnings_amount` / `personal_earnings_currency`
- `personal_earnings_notes` / `personal_earnings_paid_at`

### Privacy model

- RLS on `gig_roles`: musicians can only see their own row
- Manager can see all roles for gigs they own
- Public share links never include payment data
- Payment section in gig pack has gray border + "Only visible to you" indicator

## Feature 1: Gig Card Payment Line

Small, muted, color-coded text on the **right side** of the gig card. No extra height — fits into existing card layout.

**Display logic (priority order):**

| Scenario | Text | Color |
|----------|------|-------|
| Manager set fee, marked paid | `₪500 · Paid` | Green |
| Manager set fee, due date passed | `₪500 · Overdue` | Red |
| Manager set fee, due date set | `₪500 · Due Mar 1` | Yellow |
| Manager set fee, no due date | `₪500 · Pending` | Yellow |
| No manager fee, player recorded earnings | `₪500 · Recorded` | Muted/gray |
| No data | Nothing shown | — |

**Amount source:** `agreed_fee` takes precedence over `personal_earnings_amount`.

## Feature 2: Combined Payment Section in Gig Pack

Single section with gray border, placed:
- **Desktop:** right column, under Schedule
- **Mobile:** full width, after Materials (bottom)

Header: "Payment" with lock icon + "Only visible to you"

### Top half — Manager-set info (read-only)

- Agreed Fee (amount + currency)
- Method (payment method)
- Expected date
- Status (paid/pending)

Hidden if manager hasn't set any payment info.

### Bottom half — My Tracking (editable)

- Received amount
- Paid on date
- Notes (free text)
- Edit button

Shows "Add your earnings" prompt if nothing recorded yet.

## Feature 3: /money Page — Earnings Dashboard

### Summary cards (top row)

Three cards: This Month, Last Month, This Year. Each shows total amount + gig count.

### Per-band breakdown

Collapsible section showing earnings grouped by band:
- Band name, total amount, gig count
- "Solo / No band" group for standalone gigs

### Gig list (scrollable)

All gigs for the selected period with columns:
- Date, Gig name, Band, Amount, Status

Rows without earnings highlighted with "Not recorded" nudge.

### Period toggle

Switch between: This Month / Last Month / This Year / Last Year.

### Amount source

Uses `agreed_fee` if set, falls back to `personal_earnings_amount`, shows "Not recorded" if neither.

## Feature 4: Dashboard Widget

Compact card on main dashboard linking to /money:
- Current month total + gig count
- Pending/unpaid amount (second line)
- Click navigates to /money
- Empty state: "Start tracking your earnings"

## Payment Method Options

Dropdown values: Cash, Bank Transfer, Bit, PayBox, Check, PayPal, Other

## Multi-Currency

Keep simple for now — display amounts in their native currency. No conversion. Most users work primarily in one currency.

## Not in scope

- Manager money dashboard (future)
- Client fee tracking (future)
- Charts/graphs (can add later)
- CSV export (can add later)
- Custom date ranges (month/year toggles only)
- Expense tracking
- Invoicing
