# Manager Payment Dialog — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let managers set payment info (agreed fee, method, expected date, paid status) for each musician on a gig via a `$` button on lineup rows, with auto-fill from band defaults and last-gig history.

**Architecture:** Standalone dialog with direct API save (Approach A from design). Payment changes save independently of the main gig form. Three new API functions handle fetching defaults, updating single roles, and bulk updates. Band-level defaults stored as 3 new columns on `bands`.

**Tech Stack:** React 19, shadcn/ui Dialog, TanStack Query v5, Supabase client queries

---

## Task 1: Database Migration — Add band payment defaults

**Files:**
- Create: `supabase/migrations/20260218120000_add_band_payment_defaults.sql`
- Modify: `lib/types/database.ts` — add columns to bands Row/Insert/Update

**Step 1: Create migration SQL**

```sql
-- Add default payment fields to bands table
ALTER TABLE public.bands
  ADD COLUMN IF NOT EXISTS default_fee numeric,
  ADD COLUMN IF NOT EXISTS default_currency text,
  ADD COLUMN IF NOT EXISTS default_payment_method text;
```

**Step 2: Apply migration via Supabase MCP**

Use `apply_migration` with project_id `doqngbugrnlruzegdvyd`.

**Step 3: Update database.ts**

In `lib/types/database.ts`, add to the `bands` Row type (after `description`):

```typescript
default_currency: string | null
default_fee: number | null
default_payment_method: string | null
```

Add the same to Insert (as optional) and Update (as optional).

**Step 4: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "bands"
```

Should return 0 (no new errors from bands).

**Step 5: Commit**

```bash
git add supabase/migrations/20260218120000_add_band_payment_defaults.sql lib/types/database.ts
git commit -m "feat: add band payment default columns"
```

---

## Task 2: Role Payment API Functions

**Files:**
- Create: `lib/api/role-payment.ts`

**Step 1: Create role-payment.ts**

```typescript
import { createClient } from '@/lib/supabase/client';

export interface RolePaymentData {
  agreedFee: number | null;
  currency: string;
  paymentMethod: string | null;
  expectedPaymentDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
}

export interface RolePaymentDefaults {
  current: RolePaymentData | null;
  lastGig: { agreedFee: number; currency: string; paymentMethod: string | null } | null;
  bandDefaults: { defaultFee: number | null; defaultCurrency: string | null; defaultPaymentMethod: string | null } | null;
}

/**
 * Fetch payment defaults for a role: existing data, last-gig history, band defaults.
 */
export async function getRolePaymentDefaults(
  roleId: string,
  bandId: string | null
): Promise<RolePaymentDefaults> {
  const supabase = createClient();

  // 1. Current role payment data
  const { data: role } = await supabase
    .from('gig_roles')
    .select('agreed_fee, currency, payment_method, expected_payment_date, is_paid, paid_at, musician_id, gig_id')
    .eq('id', roleId)
    .single();

  const current: RolePaymentData | null = role?.agreed_fee != null
    ? {
        agreedFee: role.agreed_fee,
        currency: role.currency || 'ILS',
        paymentMethod: role.payment_method,
        expectedPaymentDate: role.expected_payment_date,
        isPaid: role.is_paid ?? false,
        paidAt: role.paid_at,
      }
    : null;

  // 2. Last gig with same musician + same band
  let lastGig: RolePaymentDefaults['lastGig'] = null;
  if (!current && role?.musician_id && bandId) {
    const { data: history } = await supabase
      .from('gig_roles')
      .select('agreed_fee, currency, payment_method, gigs!inner(date, band_id)')
      .eq('musician_id', role.musician_id)
      .not('agreed_fee', 'is', null)
      .neq('gig_id', role.gig_id)
      .order('gigs(date)', { ascending: false })
      .limit(10);

    // Filter client-side for matching band_id (Supabase can't filter nested joins easily)
    const match = (history || []).find(
      (r: any) => r.gigs?.band_id === bandId
    );
    if (match) {
      lastGig = {
        agreedFee: match.agreed_fee!,
        currency: match.currency || 'ILS',
        paymentMethod: match.payment_method,
      };
    }
  }

  // 3. Band defaults
  let bandDefaults: RolePaymentDefaults['bandDefaults'] = null;
  if (!current && !lastGig && bandId) {
    const { data: band } = await supabase
      .from('bands')
      .select('default_fee, default_currency, default_payment_method')
      .eq('id', bandId)
      .single();

    if (band && (band.default_fee != null || band.default_payment_method != null)) {
      bandDefaults = {
        defaultFee: band.default_fee,
        defaultCurrency: band.default_currency,
        defaultPaymentMethod: band.default_payment_method,
      };
    }
  }

  return { current, lastGig, bandDefaults };
}

/**
 * Update payment fields on a single gig_role.
 */
export async function updateRolePayment(
  roleId: string,
  data: RolePaymentData
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('gig_roles')
    .update({
      agreed_fee: data.agreedFee,
      currency: data.currency,
      payment_method: data.paymentMethod,
      expected_payment_date: data.expectedPaymentDate,
      is_paid: data.isPaid,
      paid_at: data.paidAt,
    })
    .eq('id', roleId);

  if (error) throw error;
}

/**
 * Bulk set payment on all roles for a gig that don't already have agreed_fee.
 */
export async function bulkSetPayment(
  gigId: string,
  data: Omit<RolePaymentData, 'isPaid' | 'paidAt'>
): Promise<number> {
  const supabase = createClient();

  // Get roles without payment data
  const { data: roles, error: fetchError } = await supabase
    .from('gig_roles')
    .select('id')
    .eq('gig_id', gigId)
    .is('agreed_fee', null);

  if (fetchError) throw fetchError;
  if (!roles || roles.length === 0) return 0;

  const { error } = await supabase
    .from('gig_roles')
    .update({
      agreed_fee: data.agreedFee,
      currency: data.currency,
      payment_method: data.paymentMethod,
      expected_payment_date: data.expectedPaymentDate,
    })
    .eq('gig_id', gigId)
    .is('agreed_fee', null);

  if (error) throw error;
  return roles.length;
}
```

**Step 2: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "role-payment"
```

Should return 0 matches (no errors).

**Step 3: Commit**

```bash
git add lib/api/role-payment.ts
git commit -m "feat: add role payment API functions"
```

---

## Task 3: Role Payment Dialog Component

**Files:**
- Create: `components/roles/role-payment-dialog.tsx`

**Step 1: Create the dialog component**

A `Dialog` component that:
- Accepts `roleId`, `musicianName`, `roleName`, `bandId`, `open`, `onOpenChange`, `onSaved`
- Fetches defaults via `getRolePaymentDefaults` using `useQuery`
- Shows form: agreed fee (number) + currency (select), payment method (select), expected date (date input), paid toggle + paid date
- Shows a hint badge when auto-filling ("From last gig" or "Band default")
- Saves via `updateRolePayment` using `useMutation`
- Calls `onSaved()` after successful save

**Payment method options:**
`Cash`, `Bank Transfer`, `Bit`, `PayBox`, `Check`, `PayPal`, `Other`

**Currency options (reuse from payment-section.tsx):**
`ILS`, `USD`, `EUR`, `GBP`, `CAD`, `AUD`, `JPY`, `CHF`

**Form submit must use `e.stopPropagation()` alongside `e.preventDefault()`** (portal bubbling fix — see MEMORY.md).

**Step 2: Run type check**

```bash
npx tsc --noEmit 2>&1 | grep "role-payment-dialog"
```

**Step 3: Commit**

```bash
git add components/roles/role-payment-dialog.tsx
git commit -m "feat: create role payment dialog component"
```

---

## Task 4: Add Payment Button to Lineup Member Row

**Files:**
- Modify: `components/gigpack/ui/lineup-member-row.tsx` — add `$` button + dialog trigger
- Modify: `components/gigpack/ui/lineup-builder.tsx` — pass `gigRoleId` and `bandId` through

**Step 1: Update LineupMemberRowProps**

In `lineup-member-row.tsx`, add to the props interface:

```typescript
gigRoleId?: string;
bandId?: string | null;
onPaymentSaved?: () => void;
```

**Step 2: Add payment button and dialog**

Import `RolePaymentDialog` and `Banknote` icon. Add state for dialog open/close. Add a `Banknote` icon button between the role dropdown and the remove button. Only render the button when `gigRoleId` exists (role is saved to DB). Give the button a subtle color change when the role already has payment data (pass `hasPayment` as a new optional prop).

```tsx
{gigRoleId && (
  <>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setPaymentDialogOpen(true)}
      className={cn(
        "h-8 w-8 shrink-0",
        hasPayment
          ? "text-green-600 dark:text-green-400"
          : "text-muted-foreground hover:text-primary"
      )}
    >
      <Banknote className="h-4 w-4" />
    </Button>
    <RolePaymentDialog
      open={paymentDialogOpen}
      onOpenChange={setPaymentDialogOpen}
      roleId={gigRoleId}
      musicianName={name}
      roleName={role}
      bandId={bandId ?? null}
      onSaved={() => {
        onPaymentSaved?.();
        setPaymentDialogOpen(false);
      }}
    />
  </>
)}
```

**Step 3: Update LineupBuilder**

In `lineup-builder.tsx`, update `LineupMemberBase` to include `agreedFee`:

```typescript
agreedFee?: number | null;
```

Add `bandId` and `onPaymentSaved` to `LineupBuilderProps`:

```typescript
bandId?: string | null;
onPaymentSaved?: () => void;
```

Pass `gigRoleId`, `bandId`, `hasPayment`, and `onPaymentSaved` to each `LineupMemberRow`:

```tsx
<LineupMemberRow
  ...existing props...
  gigRoleId={member.gigRoleId}
  bandId={bandId}
  hasPayment={member.agreedFee != null}
  onPaymentSaved={onPaymentSaved}
/>
```

**Step 4: Update gig-editor-panel.tsx**

Find where `LineupBuilder` is used in the gig editor panel and pass `bandId` (from the gig's band selection) and an `onPaymentSaved` callback that invalidates the gig pack query.

**Step 5: Run type check**

```bash
npm run check
```

**Step 6: Commit**

```bash
git add components/gigpack/ui/lineup-member-row.tsx components/gigpack/ui/lineup-builder.tsx components/gigpack/editor/gig-editor-panel.tsx
git commit -m "feat: add payment button to lineup member rows"
```

---

## Task 5: Bulk Set Payment Button

**Files:**
- Modify: `components/gigpack/ui/lineup-builder.tsx` — add "Set for All" button
- Create: `components/roles/bulk-payment-dialog.tsx` — bulk payment dialog

**Step 1: Create bulk payment dialog**

Similar to `RolePaymentDialog` but without a specific musician. Header says "Set payment for all musicians". On save, calls `bulkSetPayment(gigId, data)`. Shows a confirmation of how many roles will be updated.

Props: `gigId`, `bandId`, `open`, `onOpenChange`, `onSaved`

**Step 2: Add button to LineupBuilder**

Add `gigId` prop to `LineupBuilderProps`. Above the member list (next to or below the search input), add a small button:

```tsx
{lineup.some(m => m.gigRoleId) && (
  <div className="flex justify-end">
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-1.5 text-xs"
      onClick={() => setBulkPaymentOpen(true)}
    >
      <Banknote className="h-3.5 w-3.5" />
      Set Payment for All
    </Button>
  </div>
)}
```

**Step 3: Wire up in gig-editor-panel**

Pass `gigId` to `LineupBuilder`.

**Step 4: Run type check**

```bash
npm run check
```

**Step 5: Commit**

```bash
git add components/roles/bulk-payment-dialog.tsx components/gigpack/ui/lineup-builder.tsx components/gigpack/editor/gig-editor-panel.tsx
git commit -m "feat: add bulk set payment button for all lineup members"
```

---

## Task 6: Band Payment Defaults in Band Editor

**Files:**
- Modify: `components/bands/band-editor-panel.tsx` — add payment defaults section
- Modify: `lib/api/bands.ts` — no changes needed (band save already does `.upsert()` with all fields)

**Step 1: Add state for payment defaults**

In `band-editor-panel.tsx`, add state:

```typescript
const [defaultFee, setDefaultFee] = useState<string>('');
const [defaultCurrency, setDefaultCurrency] = useState<string>('ILS');
const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<string>('');
```

Initialize from `band` prop in the existing `useEffect` that sets form state.

**Step 2: Add Payment Defaults section to the form**

After the existing form sections (name, description, images, lineup), add a new section:

```tsx
{/* Payment Defaults */}
<div className="space-y-3">
  <h3 className="text-sm font-medium flex items-center gap-2">
    <Banknote className="h-4 w-4" />
    Payment Defaults
  </h3>
  <p className="text-xs text-muted-foreground">
    Auto-fill these values when setting payment for musicians in this band.
  </p>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <Label className="text-xs">Default Fee</Label>
      <Input
        type="number"
        step="0.01"
        placeholder="0"
        value={defaultFee}
        onChange={(e) => setDefaultFee(e.target.value)}
        className="h-9"
      />
    </div>
    <div>
      <Label className="text-xs">Currency</Label>
      <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
        ...currency options...
      </Select>
    </div>
  </div>
  <div>
    <Label className="text-xs">Payment Method</Label>
    <Select value={defaultPaymentMethod} onValueChange={setDefaultPaymentMethod}>
      ...method options...
    </Select>
  </div>
</div>
```

**Step 3: Include in save payload**

In the `handleSubmit` function, add to `bandData`:

```typescript
default_fee: defaultFee ? parseFloat(defaultFee) : null,
default_currency: defaultCurrency || null,
default_payment_method: defaultPaymentMethod || null,
```

**Step 4: Run type check and build**

```bash
npm run check
```

**Step 5: Commit**

```bash
git add components/bands/band-editor-panel.tsx
git commit -m "feat: add payment defaults to band editor"
```

---

## Task 7: Final Verification and Cleanup

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

- [ ] `$` button appears on lineup rows for saved roles
- [ ] `$` button does NOT appear for unsaved (newly added) roles
- [ ] Clicking `$` opens payment dialog with correct musician name
- [ ] Auto-fill from last gig works (shows "From last gig" hint)
- [ ] Auto-fill from band defaults works (shows "Band default" hint)
- [ ] Editing existing payment data pre-fills the form
- [ ] Save updates the role and shows success toast
- [ ] `$` button turns green after payment is set
- [ ] "Set Payment for All" button appears when roles exist
- [ ] Bulk set only updates roles without existing payment data
- [ ] Band editor shows Payment Defaults section
- [ ] Band defaults save and load correctly
- [ ] Player payment section still shows manager-set data correctly

**Step 5: Run Supabase advisors**

Check for security/performance issues after schema changes.

**Step 6: Update CHANGELOG.md**

Add under `## [Unreleased]`:

```markdown
### Added
- Manager payment dialog — `$` button on lineup rows to set agreed fee, method, expected date, paid status
- "Set Payment for All" bulk action for lineup
- Band payment defaults (auto-fill fee, currency, method)
- Auto-fill from last gig history when setting per-musician payment
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: final verification and changelog for manager payment dialog"
```
