# GigPack UI Port Plan

**Goal:** Port the high-quality UI from `vendor/gigpack` into `Ensemble` while establishing a clean, secure data foundation.

## Step 0: Source-of-Truth Inventory

### A) GigPack UI Entrypoints

We are extracting these specific UI flows from `vendor/gigpack/`:

1.  **Public Gig Pack View** (The "Share Link" Experience)
    *   **Path:** `vendor/gigpack/app/[locale]/g/[slug]/page.tsx`
    *   **Core Component:** `vendor/gigpack/components/public-gigpack-view.tsx`
    *   **Why:** This is the primary value proposition—a beautiful, read-only view for musicians.
    *   **Dependencies:**
        *   `components/gigpack/layouts/*` (Minimal, Vintage Poster, Social Card layouts)
        *   `components/structured-setlist.tsx` (Setlist rendering)
        *   `components/gigpack/rehearsal-view.tsx` (Rehearsal mode)

2.  **Setlist Print View** (PDF Generation Target)
    *   **Path:** `vendor/gigpack/app/[locale]/setlists/print/page.tsx`
    *   **Core Component:** `vendor/gigpack/components/setlists/setlist-print-auto.tsx`
    *   **Why:** Used by the Playwright API to generate PDFs. Needs specific CSS (`@media print`) handling.

3.  **PDF Generation API**
    *   **Path:** `vendor/gigpack/app/api/setlists/pdf/route.ts`
    *   **Why:** Server-side PDF generation using Playwright.
    *   **Dependencies:** `playwright`, `lib/pdfmake/*` (if used, though Playwright renders HTML).

4.  **(Future) Authenticated Editor**
    *   **Path:** `vendor/gigpack/app/[locale]/gigpacks/page.tsx` (and `client-page.tsx`)
    *   **Core Component:** `vendor/gigpack/components/gigpack-list.tsx`, `gig-editor-panel.tsx`
    *   **Note:** We will prioritize the public view first, but keep the editor components in mind for Step 8.

### B) Styling Parity Checklist

To ensure exact design fidelity, we must port:

*   **Fonts:**
    *   `ZalandoSansSemiExpanded` (Variable) - Main UI font (mapped to `sans`).
    *   `AntonSC` - Display font for setlists/posters.
    *   `GoogleSans` - Hebrew fallback.
    *   `NotoSansHebrew` - Heavy Hebrew headers.
    *   **Action:** Copy `vendor/gigpack/public/fonts/` to `public/fonts/` and update `app/layout.tsx` (or `lib/fonts.ts`) to load them.

*   **Global CSS (`globals.css`):**
    *   Copy custom utility classes: `.gig-card`, `.date-pill`, `.section-divider`.
    *   Copy poster skins: `.poster-skin-clean`, `.poster-skin-paper`, `.poster-skin-grain` (and their SVG background data URIs).
    *   Copy print styles: `@media print { ... }`.
    *   **Action:** Append these safely to `app/globals.css` or create `app/gigpack.css`.

*   **Tailwind Configuration:**
    *   **Safelist:** Ensure `poster-skin-*` classes are safelisted.
    *   **Content Paths:** Add `components/gigpack/**/*.{ts,tsx}` to `tailwind.config.ts`.
    *   **Colors:** Ensure `gig-highlight`, `gig-muted` variables exist in CSS.

*   **Static Assets:**
    *   `vendor/gigpack/public/gig-fallbacks/*` - Default cover images.
    *   `vendor/gigpack/public/branding/*` - Logos (if reused).

### C) Data Contract (GigPackDTO)

The public view must consume this exact shape. This decouples the UI from the database schema.

```typescript
export interface PublicGigPackDTO {
  // Core Gig Info
  id: string;
  title: string;
  date: string; // ISO date string
  call_time: string; // "18:00"
  venue_name: string;
  venue_address: string;
  venue_map_url?: string;
  cover_image_url?: string; // or fallback index

  // Look & Feel
  theme: "minimal" | "vintage_poster" | "social_card";
  poster_skin: "clean" | "paper" | "grain";

  // Content
  schedule: Array<{
    id: string;
    time: string;
    label: string;
  }>;

  lineup: Array<{
    id: string;
    role_name: string; // "Drums", "MD"
    musician_name: string; // "User Name" or "Pending"
    status: "confirmed" | "pending" | "declined";
  }>;

  setlist: Array<{
    id: string;
    title: string; // Section title (e.g., "Set 1")
    songs: Array<{
      id: string;
      title: string;
      artist?: string;
      key?: string;
      tempo?: string;
      notes?: string;
      is_medley?: boolean;
    }>;
  }>;

  materials: Array<{
    id: string;
    label: string;
    url: string;
    type: "chart" | "audio" | "link" | "other";
  }>;

  packing_list: Array<{
    id: string;
    item: string;
    is_checked?: boolean; // Client-side state mostly
  }>;
}
```

**Security Rule:** NO private notes, financial data, or internal contact info in this DTO.

### D) Clean Schema Proposal

We will create a clean relational structure in Supabase.

```sql
-- Core Gigs Table
create table gigs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date timestamptz not null,
  venue_name text,
  venue_address text,
  cover_image_path text,
  theme text default 'minimal', -- minimal, vintage_poster, social_card
  poster_skin text default 'clean', -- clean, paper, grain
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public Shares (The "Magic Link" mechanism)
create table gig_shares (
  token text primary key, -- The URL slug/token
  gig_id uuid references gigs(id) on delete cascade not null,
  is_active boolean default true,
  expires_at timestamptz
);
create index idx_gig_shares_token on gig_shares(token);

-- Schedule
create table gig_schedule_items (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  time text not null, -- "18:00" (kept simple for display)
  label text not null,
  sort_order int default 0
);

-- Lineup / Roles
create table gig_roles (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  role_name text not null,
  musician_name text, -- De-normalized for MVP or linked to auth.users later
  user_id uuid references auth.users(id), -- Optional link
  status text default 'pending'
);

-- Setlists (Structured)
create table setlist_sections (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  title text not null, -- "Set 1", "Encore"
  sort_order int default 0
);

create table setlist_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references setlist_sections(id) on delete cascade not null,
  title text not null,
  artist text,
  key text,
  tempo text, -- "120"
  notes text,
  sort_order int default 0
);

-- Materials (Links/Files)
create table gig_materials (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  label text not null,
  url text not null,
  type text not null -- chart, audio, link
);
```

### E) RLS & Public Sharing Approach

**The Problem:** We cannot simply "open up" RLS for `gigs` table to anonymous users without risking data scraping or exposure of private fields (fees, etc.).

**The Solution:** Server-Side Service Role for Public Views.

1.  **Public Route (`app/p/[token]/page.tsx`):**
    *   This is a Server Component.
    *   It imports `lib/gigpack/getPublicGigPackDTO.ts`.
    *   It calls `getPublicGigPackDTO(token)`.

2.  **`lib/gigpack/getPublicGigPackDTO.ts`:**
    *   Uses `supabaseAdmin` (service role client) to query `gig_shares` -> `gigs`.
    *   Fetches relations (schedule, lineup, setlist).
    *   **Crucial:** Maps the DB result to `PublicGigPackDTO`. This acts as a firewall, ensuring only safe fields leave the server.

3.  **RLS Policies:**
    *   **Anon:** NO access to `gigs` or related tables.
    *   **Authenticated:** Standard RLS (users can see gigs they own or are assigned to).

### F) Implementation Sequence

1.  **Phase 1: Assets & Styling Parity**
    *   Copy fonts to `public/fonts/`.
    *   Update `app/layout.tsx` (or equivalent) to register new font variables.
    *   Update `tailwind.config.ts` (safelist, content paths).
    *   Append GigPack-specific CSS to `globals.css` (poster skins, print styles).
    *   *Verify:* A test page with `.poster-skin-paper` renders correctly.

2.  **Phase 2: UI Port (Components)**
    *   Copy `vendor/gigpack/components/gigpack/**` -> `components/gigpack/**`.
    *   Copy `vendor/gigpack/components/structured-setlist.tsx`, etc.
    *   Fix imports (point to new paths).
    *   Keep logic minimal/mocked initially if needed.
    *   *Verify:* Components compile without errors.

3.  **Phase 3: Database & Schema**
    *   Create migration: `supabase/migrations/YYYYMMDDHHMMSS_gigpack_schema.sql`.
    *   Apply migration.
    *   *Verify:* Tables exist in Supabase.

4.  **Phase 4: Public Data Fetching**
    *   Create `lib/gigpack/getPublicGigPackDTO.ts`.
    *   Implement service-role query by token.
    *   *Verify:* Unit test or script fetching a mock share.

5.  **Phase 5: Public Route Integration**
    *   Create `app/p/[token]/page.tsx`.
    *   Wire up `getPublicGigPackDTO`.
    *   Pass data to `PublicGigPackView`.
    *   *Verify:* Visiting `/p/demo-token` renders the full UI with DB data.

6.  **Phase 6: Print & PDF**
    *   Port `app/[locale]/setlists/print/page.tsx` -> `app/setlists/print/page.tsx`.
    *   Port `app/api/setlists/pdf/route.ts` -> `app/api/setlists/pdf/route.ts`.
    *   *Verify:* `/api/setlists/pdf?token=...` returns a valid PDF.

7.  **Phase 7: Authenticated View (Later)**
    *   Build the editor using the same components.

