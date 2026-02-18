# Manager Payment Dialog — Design

## Problem

Managers have no UI to set payment info for musicians on a gig. The `gig_roles` table has `agreed_fee`, `currency`, `is_paid`, `paid_at`, `payment_method`, and `expected_payment_date` columns, but no manager-facing form exposes them. Players can see and track their own earnings, but the manager-set side is empty.

## Solution

A `$` button on each lineup member row in the gig editor opens a payment dialog. The dialog saves directly to `gig_roles` via API (not through the gig save RPC). Three shortcuts reduce repetitive data entry: band-level defaults, copy from last gig, and bulk set for all musicians.

## UI Design

### Payment Button on Lineup Rows

- A small `Banknote` icon button appears on each `LineupMemberRow` in the Lineup tab
- Only visible to the gig owner
- If the role already has an `agreed_fee` set, the button shows a subtle filled/colored state
- Clicking opens the Role Payment Dialog

### Role Payment Dialog

**Header:** Musician name + role (read-only display)

**Fields:**
- **Agreed Fee** — number input + currency select (ILS, USD, EUR, GBP, CAD, AUD, JPY, CHF)
- **Payment Method** — select: Cash, Bank Transfer, Bit, PayBox, Check, PayPal, Other
- **Expected Payment Date** — date input
- **Paid** — toggle switch. When toggled on, reveals a "Paid Date" input (defaults to today)

**Footer:** Cancel + Save button

**Auto-fill priority** (highest wins):
1. Existing data on this role (if editing a previously set payment)
2. Last gig with same musician + same band
3. Band default fee/method (if configured on the band)
4. User's default currency (fallback: ILS)

### Bulk Set Button

A "Set Payment for All" button in the Lineup tab header area (near the musician search input). Opens the same payment dialog but without a specific musician — header says "Set for all musicians". On save, applies the values to all roles on this gig that don't already have an `agreed_fee` set. Roles with existing payment data are left untouched.

### Band Payment Defaults

A small "Payment Defaults" section in the band editor (existing `band-editor-panel.tsx`). Three fields:
- Default fee (number)
- Default currency (select)
- Default payment method (select)

These values auto-fill when opening the payment dialog for any role under this band.

## Data Model

### Schema Changes

**`bands` table — add 3 columns:**
| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `default_fee` | numeric | null | Default agreed fee for musicians |
| `default_currency` | text | null | Default currency code (falls back to ILS) |
| `default_payment_method` | text | null | Default payment method |

No changes to `gig_roles` — all payment columns already exist.

### API Functions

**`getRolePaymentDefaults(roleId: string, bandId: string | null)`**
Returns a merged object with auto-fill data:
1. Fetches existing payment data on the role
2. If no existing fee, queries last gig with same musician + same band for history
3. If no history, fetches band defaults
Returns `{ current, lastGig, bandDefaults }` so the UI can show where the auto-fill came from.

**`updateRolePayment(roleId: string, data)`**
Updates payment fields on a single `gig_roles` row:
- `agreed_fee`, `currency`, `payment_method`, `expected_payment_date`, `is_paid`, `paid_at`

**`bulkSetPayment(gigId: string, data)`**
Updates payment fields on all `gig_roles` for the given gig where `agreed_fee IS NULL`.

**`updateBandDefaults(bandId: string, data)`**
Updates `default_fee`, `default_currency`, `default_payment_method` on the `bands` row.

## Auto-Fill Logic

When the dialog opens for a specific musician:

```
1. Fetch role's current payment data
2. If agreed_fee is already set → use it (user is editing)
3. Else, query last gig: SELECT agreed_fee, currency, payment_method
   FROM gig_roles JOIN gigs ON gigs.id = gig_roles.gig_id
   WHERE musician_id = ? AND gigs.band_id = ? AND agreed_fee IS NOT NULL
   ORDER BY gigs.date DESC LIMIT 1
4. If found → auto-fill from last gig
5. Else, fetch band defaults → auto-fill from band
6. Currency always falls back to ILS if nothing is set
```

The dialog shows a subtle hint when auto-filling: "From last gig" or "Band default" next to the pre-filled values.

## Component Structure

```
components/
  roles/
    role-payment-dialog.tsx    — The payment form dialog
  gigs/
    lineup-member-row.tsx      — Add $ button (existing file)
    lineup-builder.tsx         — Add "Set for all" button (existing file)
  bands/
    band-editor-panel.tsx      — Add payment defaults section (existing file)

lib/api/
    role-payment.ts            — New: getRolePaymentDefaults, updateRolePayment, bulkSetPayment
    bands.ts                   — Extend: updateBandDefaults (existing file)
```

## Scope Boundaries

**In scope:**
- Payment dialog with all 5 fields
- Auto-fill from band defaults, last gig history
- Bulk set for all musicians
- Band default settings in band editor

**Out of scope (future):**
- Per-musician default fee (stored on contacts)
- Payment reminders/notifications
- Export payment report (CSV/PDF)
- Payment history log
