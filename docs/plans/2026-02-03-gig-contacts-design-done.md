# Gig Contacts Feature Design

**Date:** 2026-02-03
**Status:** Approved
**Author:** Brainstorming session

## Overview

Add the ability for managers to specify contact people for a gig, displayed in a "Need Help?" section of the gig pack so musicians know who to reach out to with questions.

## Requirements

- **Flexible contacts:** Any type (venue contact, MD, booker, production, etc.)
- **Multiple contacts:** Support more than one contact per gig
- **Hybrid adding:** Pick from lineup, My Circle, OR add manually
- **Standard info:** Name, phone, email, and label/role
- **UI placement:** Dedicated "Need Help?" section at the bottom of gig pack

---

## Data Model

### New table: `gig_contacts`

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key (default: `gen_random_uuid()`) |
| `gig_id` | uuid | Foreign key to `gigs` (NOT NULL) |
| `label` | text | Role/type, e.g., "Venue Manager", "MD" (NOT NULL) |
| `name` | text | Contact's name (NOT NULL) |
| `phone` | text | Phone number (nullable) |
| `email` | text | Email address (nullable) |
| `source_type` | text | 'manual', 'lineup', or 'contact' (NOT NULL, default 'manual') |
| `source_id` | uuid | References gig_role or musician_contact if picked (nullable) |
| `sort_order` | int | For ordering multiple contacts (NOT NULL, default 0) |
| `created_at` | timestamptz | Auto-set (default: `now()`) |

### Constraints

- Foreign key: `gig_id` references `gigs(id)` ON DELETE CASCADE
- Check: At least one of `phone` or `email` must be non-null
- Index on `gig_id` for query performance

### RLS Policies

Same pattern as other gig child tables:
- **SELECT:** Anyone who can view the gig can read contacts
- **INSERT/UPDATE/DELETE:** Only gig owner can modify

---

## Manager UI (Edit Page)

### Location
Gig edit page, new "Contacts" section near the bottom (after lineup, before materials)

### Interface Design

```
┌─────────────────────────────────────────────────┐
│ Gig Contacts                                    │
│ Who should musicians contact about this gig?   │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ Venue Manager                         [✕]   │ │
│ │    Sarah Cohen · 054-555-1234              │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ Musical Director                      [✕]   │ │
│ │    David Levi · From lineup                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [+ Add Contact]                                 │
└─────────────────────────────────────────────────┘
```

### "Add Contact" Dialog

**Tabs:** "From Lineup" | "From My Circle" | "New Person"

1. If picking from lineup/circle: auto-fills name, phone, email from source
2. Manager adds/edits the **label** (required)
3. Can override phone/email if needed for this specific gig

### Validation

- Label is required
- At least one of phone or email is required

---

## Gig Pack Display (Player View)

### Location
Bottom of the gig pack, after setlist/materials, before the live status indicator

### Design

```
┌─────────────────────────────────────────────────┐
│ Need Help?                                      │
│ Contact these people about the gig              │
├─────────────────────────────────────────────────┤
│                                                 │
│ Venue Manager                                   │
│    Sarah Cohen                                  │
│    [Phone 054-555-1234]  [Email sarah@...]     │
│                                                 │
│ ─────────────────────────────────────────────── │
│                                                 │
│ Musical Director                                │
│    David Levi                                   │
│    [Phone 052-555-6789]                         │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Interactions

- Phone: tap-to-call link (`tel:`)
- Email: tap-to-email link (`mailto:`)
- Mobile-friendly button sizes
- Section hidden if no contacts (no empty state)

---

## API Layer

### New file: `/lib/api/gig-contacts.ts`

```typescript
// List contacts for a gig
listGigContacts(gigId: string): Promise<GigContact[]>

// Create a new contact
createGigContact(data: GigContactInsert): Promise<GigContact>

// Update an existing contact
updateGigContact(id: string, data: GigContactUpdate): Promise<GigContact>

// Delete a contact
deleteGigContact(id: string): Promise<void>

// Reorder contacts
reorderGigContacts(gigId: string, orderedIds: string[]): Promise<void>
```

### Type definitions in `/lib/types/shared.ts`

```typescript
export interface GigContact {
  id: string;
  gigId: string;
  label: string;
  name: string;
  phone: string | null;
  email: string | null;
  sourceType: 'manual' | 'lineup' | 'contact';
  sourceId: string | null;
  sortOrder: number;
  createdAt: string;
}

export type GigContactInsert = Omit<GigContact, 'id' | 'createdAt'>;
export type GigContactUpdate = Partial<Omit<GigContact, 'id' | 'gigId' | 'createdAt'>>;
```

### Integration points

1. **`getGigPackFull()`** - Add `gig_contacts` to query join
2. **`GigPack` type** - Add `contacts: GigContact[] | null`
3. **`MinimalLayout`** - Render "Need Help?" section
4. **Gig edit page** - Add contacts management section

### Cache invalidation

Mutations invalidate:
- `['gig-pack-full', gigId]`
- `['gig-contacts', gigId]`

---

## Implementation Plan

### Files to create

| File | Purpose |
|------|---------|
| `lib/api/gig-contacts.ts` | API functions for CRUD |
| `components/gig-contacts/gig-contact-form.tsx` | Add/edit contact dialog |
| `components/gig-contacts/gig-contacts-manager.tsx` | Edit page section |
| `components/gigpack/need-help-section.tsx` | Gig pack display |

### Files to modify

| File | Changes |
|------|---------|
| `lib/types/shared.ts` | Add `GigContact` types |
| `lib/types/gigpack.ts` | Add `contacts` to `GigPack` interface |
| `lib/api/gig-pack.ts` | Include contacts in queries |
| `app/(app)/gigs/[id]/edit/page.tsx` | Add contacts section |
| `components/gigpack/layouts/minimal-layout.tsx` | Add Need Help section |

### Database migration

1. Create `gig_contacts` table with all columns
2. Add foreign key constraint to `gigs`
3. Add check constraint for phone/email
4. Add index on `gig_id`
5. Add RLS policies

### Implementation order

1. Database migration (create table, RLS)
2. Types (`shared.ts`, `gigpack.ts`)
3. API functions (`gig-contacts.ts`)
4. Update `gig-pack.ts` to include contacts
5. Create "Need Help?" display component
6. Add to `MinimalLayout`
7. Create contact form component
8. Create contacts manager component
9. Add to gig edit page
10. Test end-to-end

---

## Out of Scope

- Syncing contact info if source (lineup/My Circle) changes later
- Contact-specific notes field
- Contact availability times
- WhatsApp/messaging integration (just phone/email links)
