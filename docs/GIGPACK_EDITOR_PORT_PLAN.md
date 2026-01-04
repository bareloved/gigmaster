# GigPack Editor Port Plan

## Status: ✅ COMPLETE

This document outlines the plan to port the GigPack gig creator/editor UI into Ensemble while maintaining the exact GigPack design and user experience.

### Implementation Summary
- ✅ Editor copied to `components/gigpack/editor/gig-editor-panel.tsx`
- ✅ Server actions created at `app/(app)/gigs/actions.ts` (saveGigPack, getGig)
- ✅ Routes implemented: `/gigs/new` (create) and `/gigs/[id]/edit` (edit)
- ✅ Wrapper component at `app/(app)/gigs/editor-wrapper.tsx`
- ✅ Pack view at `/gigs/[id]/pack` for viewing saved gigs

---

## 1. GigPack Editor Entrypoints in `vendor/gigpack/`

### Primary Components

| Component | Path | Purpose |
|-----------|------|---------|
| **GigEditorPanel** | `vendor/gigpack/components/gig-editor-panel.tsx` | **Main editor** - Sheet-based slide-out panel for create/edit |
| **GigPackForm** | `vendor/gigpack/components/gigpack-form.tsx` | Full-page form alternative (older design) |
| **Client Page** | `vendor/gigpack/app/[locale]/gigpacks/client-page.tsx` | List view + editor integration |

### Supporting Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SaveAsTemplateDialog` | `vendor/gigpack/components/save-as-template-dialog.tsx` | Save gig as reusable template |
| `PasteScheduleDialog` | `vendor/gigpack/components/paste-schedule-dialog.tsx` | Paste text schedule and parse |
| `SetlistEditor` | `vendor/gigpack/components/setlist-editor.tsx` | Structured setlist editor |
| `PackingChecklistEditor` | `vendor/gigpack/components/packing-checklist-editor.tsx` | Packing list editor |
| `GigPackTemplateChooser` | `vendor/gigpack/components/gigpack-template-chooser.tsx` | Template selection UI |

### UI Primitives (Already in Ensemble or need copying)

| Component | GigPack Path | Ensemble Equivalent |
|-----------|--------------|---------------------|
| `TimePicker` | `vendor/gigpack/components/ui/time-picker.tsx` | ✅ `components/ui/time-picker.tsx` (verify) |
| `VenueAutocomplete` | `vendor/gigpack/components/ui/venue-autocomplete.tsx` | ✅ `components/ui/venue-autocomplete.tsx` (verify) |
| `RoleSelect` | `vendor/gigpack/components/ui/role-select.tsx` | ⚠️ May need copying |
| `Calendar` | `vendor/gigpack/components/ui/calendar.tsx` | ✅ shadcn/ui standard |
| `CollapsibleSection` | `vendor/gigpack/components/ui/collapsible-section.tsx` | ⚠️ May need copying |

---

## 2. Dependencies for Exact Look

### Fonts

| Font | GigPack Usage | Ensemble Status |
|------|---------------|-----------------|
| Anton SC | Poster skins, headers | ✅ `public/fonts/anton-sc-400.woff2` exists |
| Noto Sans Hebrew | RTL support | ✅ `public/fonts/noto-sans-hebrew-800.woff2` exists |

### CSS Variables

GigPack uses these theme-specific CSS variables in poster skins:

```css
/* From vendor/gigpack/app/globals.css */
--poster-accent: var(--accent-color, hsl(var(--primary)));
--poster-bg: paper texture or solid depending on skin
```

**Action:** Verify Ensemble's `app/globals.css` includes equivalent variables or add them.

### Icons

- Uses `lucide-react` throughout - ✅ Already in Ensemble
- Some custom SVG accents in `components/hand-drawn/` - ✅ Already copied to Ensemble

### Gig Fallback Images

- `public/gig-fallbacks/*.jpeg` - ✅ Already present in Ensemble

---

## 3. Editor Data Contract

### Fields the GigEditorPanel Expects

The editor works with a `GigPack` type. For Ensemble integration, we need to map these to the canonical `gigs` table.

#### Core Gig Fields

| GigPack Field | Type | Maps to Ensemble Column |
|---------------|------|-------------------------|
| `id` | UUID | `gigs.id` |
| `owner_id` | UUID | `gigs.owner_id` |
| `title` | string | `gigs.title` |
| `date` | string (YYYY-MM-DD) | `gigs.date` (timestamptz) |
| `call_time` | string (HH:mm) | `gigs.call_time` (text) |
| `on_stage_time` | string (HH:mm) | `gigs.on_stage_time` (text) |
| `venue_name` | string | `gigs.venue_name` OR `gigs.location_name` |
| `venue_address` | string | `gigs.venue_address` OR `gigs.location_address` |
| `venue_maps_url` | string | `gigs.venue_maps_url` |
| `gig_type` | string | `gigs.gig_type` |
| `theme` | GigPackTheme | `gigs.theme` |
| `poster_skin` | PosterSkin | `gigs.poster_skin` |
| `accent_color` | string | `gigs.accent_color` |
| `band_name` | string | `gigs.band_name` |
| `band_logo_url` | string | `gigs.band_logo_url` |
| `hero_image_url` | string | `gigs.hero_image_url` |
| `dress_code` | string | `gigs.dress_code` |
| `backline_notes` | string | `gigs.backline_notes` |
| `parking_notes` | string | `gigs.parking_notes` |
| `setlist` | string (text) | `gigs.setlist` |

#### Nested Arrays (Separate Tables)

| GigPack Field | Type | Ensemble Table |
|---------------|------|----------------|
| `schedule` | `GigScheduleItem[]` | `gig_schedule_items` |
| `lineup` | `LineupMember[]` | `gig_roles` (partially - see mapping) |
| `materials` | `GigMaterial[]` | `gig_materials` |
| `packing_checklist` | `PackingChecklistItem[]` | `gig_packing_items` |
| `setlist_structured` | `SetlistSection[]` | `setlist_sections` + `setlist_items` |

#### GigPack-specific Fields (Not in Original Ensemble)

| Field | Required? | Action |
|-------|-----------|--------|
| `band_id` | Optional | Add as FK to `projects` (GigPack uses "bands", Ensemble uses "projects") |
| `internal_notes` | Optional | Add column to `gigs` if not present |
| `payment_notes` | Optional | Add column to `gigs` if not present |
| `public_slug` | Required for shares | Use `gig_shares.token` instead |

---

## 4. Data Contract Type Definitions

### GigPack Types (from `vendor/gigpack/lib/types.ts`)

```typescript
// Schedule Item
interface GigScheduleItem {
  id: string;
  time: string | null;  // "HH:mm"
  label: string;
}

// Lineup Member (GigPack simplified model)
interface LineupMember {
  role: string;
  name?: string;
  notes?: string;
}

// Material Link
interface GigMaterial {
  id: string;
  label: string;
  url: string;
  kind: "rehearsal" | "performance" | "charts" | "reference" | "other";
}

// Packing Item
interface PackingChecklistItem {
  id: string;
  label: string;
}

// Setlist Section
interface SetlistSection {
  id: string;
  name: string;  // "Set 1", "Encore"
  songs: SetlistSong[];
}

interface SetlistSong {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: string;
  notes?: string;
  referenceUrl?: string;
}
```

### Mapping to Ensemble Database

#### `lineup` → `gig_roles` Mapping Challenge

GigPack's `lineup` is a **simple JSON array** stored inline (for display purposes).
Ensemble's `gig_roles` is a **full table** with:
- `musician_id` (linked user)
- `invitation_status` (pending/invited/accepted/declined)
- `payment_status` (unpaid/paid)
- `agreed_fee`

**Resolution Options:**

1. **Hybrid approach (recommended):**
   - Store GigPack-style `lineup` as JSON column for display
   - Use `gig_roles` table for actual musician assignments and invitations
   - Editor shows both: lineup for display names, roles for real players

2. **Convert on save:**
   - Parse `lineup` array into `gig_roles` entries
   - `musician_name` (no user) → create role with `musician_name` only
   - Linked user → create role with `musician_id`

---

## 5. Route Structure for Ensemble

### Proposed Routes

| Route | Purpose | Component |
|-------|---------|-----------|
| `/gigs` | Gig list (existing) | Keep current |
| `/gigs/new` | **Create new gig** | `GigEditorPanel` in full-page wrapper |
| `/gigs/[id]` | Gig detail (existing) | Keep current |
| `/gigs/[id]/edit` | **Edit existing gig** | `GigEditorPanel` in full-page wrapper |
| `/gigs/[id]/pack` | GigPack view (existing) | Keep current |
| `/p/[token]` | Public share (existing) | Keep current |

### Alternative: Sheet-based Editor (Preferred)

Instead of dedicated pages, use `GigEditorPanel` as a **Sheet** that can be opened from:
- Dashboard "Create Gig" button
- Gig detail page "Edit" button
- Gig list "+" button

This preserves the GigPack UX pattern.

---

## 6. API Layer Integration

### New API Functions Needed

Create `lib/api/gigpack-editor.ts`:

```typescript
// Fetch gig with all nested data for editor
export async function fetchGigForEditor(gigId: string): Promise<GigPackEditorData>

// Save gig with all nested data (transactional-ish)
export async function saveGigFromEditor(data: GigPackEditorData): Promise<{ id: string }>

// Create public share token
export async function createGigShare(gigId: string): Promise<{ token: string }>
```

### Data Loading Pattern

```typescript
interface GigPackEditorData {
  // Core gig fields
  id?: string;  // undefined for create
  title: string;
  date: string;
  // ... other gig fields
  
  // Nested arrays (fetched separately)
  schedule: GigScheduleItem[];
  roles: GigRole[];  // Ensemble format
  lineup: LineupMember[];  // GigPack display format
  materials: GigMaterial[];
  packingItems: PackingChecklistItem[];
  setlistSections: SetlistSection[];
  
  // Share info
  shareToken?: string;
}
```

### Save Operation Flow

```
1. Validate required fields (title, date)
2. Begin transaction (via service role if needed)
3. Upsert gigs row
4. Delete + re-insert schedule items
5. Delete + re-insert materials
6. Delete + re-insert packing items
7. Handle setlist sections + items
8. Optionally sync to gig_roles
9. Return gig ID
```

---

## 7. Component Porting Strategy

### Phase 1: Copy Core Editor

1. Copy `vendor/gigpack/components/gig-editor-panel.tsx` → `components/gigpack/editor/gig-editor-panel.tsx`
2. Copy supporting dialogs:
   - `save-as-template-dialog.tsx`
   - `paste-schedule-dialog.tsx`
3. Copy UI primitives if missing:
   - `role-select.tsx`
   - `collapsible-section.tsx`

### Phase 2: Create Adapters

1. Create `lib/api/gigpack-editor.ts` with fetch/save functions
2. Modify copied editor to use Ensemble Supabase client
3. Replace `next-intl` translation calls with Ensemble pattern OR keep them (if adding i18n later)

### Phase 3: Integrate Routes

1. Create `app/(app)/gigs/new/page.tsx` - render editor for create
2. Create `app/(app)/gigs/[id]/edit/page.tsx` - render editor for edit
3. Add "Create Gig" button to dashboard that opens editor

### Phase 4: Handle i18n

GigPack editor uses `next-intl` with locale-based routing (`/[locale]/...`).
Ensemble currently doesn't use `next-intl`.

**Options:**
1. **Remove i18n from editor** - hardcode English strings
2. **Add minimal i18n** - use Ensemble's own translation approach
3. **Keep next-intl** - add the library and translation files

Recommended: **Option 1** for MVP, refactor later if needed.

---

## 8. Database Migration Requirements

### Columns to Add to `gigs` Table

```sql
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS internal_notes TEXT,
ADD COLUMN IF NOT EXISTS payment_notes TEXT;
```

### Verify Existing Columns

These should already exist after fix migrations:
- `call_time`
- `on_stage_time`
- `venue_name`, `venue_address`, `venue_maps_url`
- `theme`, `poster_skin`, `accent_color`
- `band_name`, `band_logo_url`, `hero_image_url`
- `gig_type`
- `dress_code`, `backline_notes`, `parking_notes`
- `setlist` (text fallback)

### Tables That Already Exist

- `gig_schedule_items` ✅
- `gig_materials` ✅
- `gig_packing_items` ✅
- `gig_shares` ✅
- `setlist_sections` ✅
- `setlist_items` ✅

---

## 9. Implementation Checklist

### Phase 1: Pre-requisites
- [ ] Fix `gig_readiness` schema (see ENSEMBLE_DB_COMPAT_FIX.md)
- [ ] Verify all required gig columns exist
- [ ] Add missing columns (`internal_notes`, `payment_notes`)

### Phase 2: Port Components
- [ ] Copy `gig-editor-panel.tsx` to `components/gigpack/editor/`
- [ ] Copy supporting dialogs
- [ ] Copy missing UI primitives (`role-select.tsx`)
- [ ] Remove/replace `next-intl` calls with hardcoded strings

### Phase 3: Create API Layer
- [ ] Create `lib/api/gigpack-editor.ts`
- [ ] Implement `fetchGigForEditor()`
- [ ] Implement `saveGigFromEditor()` with nested data handling
- [ ] Implement `createGigShare()` / `getGigShare()`

### Phase 4: Create Routes
- [ ] Create `/gigs/new/page.tsx`
- [ ] Create `/gigs/[id]/edit/page.tsx`
- [ ] Update dashboard "Create Gig" to use new editor
- [ ] Update gig detail page "Edit" button

### Phase 5: Testing
- [ ] Create gig with all fields
- [ ] Edit existing gig
- [ ] Add/remove schedule items
- [ ] Add/remove materials
- [ ] Add/remove packing items
- [ ] Create public share link
- [ ] Verify public share page works

---

## 10. Files to Create/Modify

### New Files

```
components/gigpack/editor/
├── gig-editor-panel.tsx       # Main editor (copied + adapted)
├── save-as-template-dialog.tsx
├── paste-schedule-dialog.tsx
└── index.ts                   # Exports

lib/api/
└── gigpack-editor.ts          # CRUD operations for editor

app/(app)/gigs/
├── new/
│   └── page.tsx               # Create gig page
└── [id]/
    └── edit/
        └── page.tsx           # Edit gig page
```

### Modified Files

```
components/gigs/dialogs/create-gig-dialog.tsx  # Maybe replace with editor
app/(app)/dashboard/page.tsx                    # Update create gig action
app/(app)/gigs/[id]/page.tsx                    # Add edit button linking to editor
```

---

## 11. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| i18n removal breaks RTL | Medium | Test Hebrew layout after removing next-intl |
| Save operation fails mid-transaction | High | Use service role for atomic operations |
| GigPack types don't match Ensemble | Medium | Create adapter types |
| Editor styling conflicts with Ensemble theme | Low | Editor uses isolated shadcn classes |

---

## Appendix: GigEditorPanel Props Interface

```typescript
interface GigEditorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigPack?: GigPack;  // Existing gig for editing
  onCreateSuccess?: (gigPack: GigPack) => void;
  onUpdateSuccess?: (gigPack: GigPack) => void;
  onDelete?: (gigPackId: string) => void;
  onTemplateSaved?: () => void;
  userTemplates?: UserTemplate[];
  onUserTemplatesChange?: () => void;
}
```

This interface will need adaptation to use Ensemble's gig type instead of GigPack.
