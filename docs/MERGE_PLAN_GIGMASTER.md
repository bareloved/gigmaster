# Merge Plan: Gigmaster/GigPack → Ensemble

## 1. Current state of Ensemble (facts)
- **Tech stack**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui.
- **Data Fetching**: TanStack Query + Supabase JS Client (typed).
- **Deployment**: Vercel (Frontend/API) + Supabase (Database/Auth/Storage).
- **Auth**: Supabase Auth (Email/Magic Link/Google) handling `public.profiles` 1:1 mapping.
- **Database**:
  - **Core Tables**: `gigs`, `gig_roles` (lineup), `setlist_items`, `gig_files`, `profiles`.
  - **Features**: Extensive RLS policies, Calendar integration (OAuth tokens in `calendar_connections`), Invitations system (`gig_invitations`).
  - **Missing**: "Bands" or "Projects" entity (currently deprecated/removed), Public access (all routes require auth).
- **Key Routes**:
  - `app/(app)/dashboard` (Main)
  - `app/(app)/gigs/[id]` (Detail)
  - `app/(app)/gigs/[id]/pack` (Authenticated "Pack" view)
  - `app/(app)/money` (Financials)

## 2. What we are importing from Gigmaster/GigPack
- **Public Share Page**: Access to a "Gig Pack" via a public slug or unique token (no login required for read-only view).
- **"Gig Pack" View Patterns**: The specific mobile-optimized, "digital pass" visual design (spacing, typography, "glanceable" cards).
- **Setlist PDF Export**: Ability to generate a printable PDF setlist (likely using Playwright/Puppeteer).
- **Bands/Branding**: Concept of "Bands" with logos/colors (Skins) that apply to the public Gig Pack.
- **Venue Autocomplete**: (If part of GigPack source) Enhanced location selection.

## 3. Canonical data model in Ensemble (final state)
We will extend the Ensemble schema to support these features without breaking existing logic.

### New / Updated Tables

| Entity | Changes / New Fields | Purpose |
| :--- | :--- | :--- |
| **`bands`** (New) | `id`, `name`, `logo_url`, `brand_color`, `website`, `owner_id` | Groups gigs under a brand identity. Replaces legacy "Projects". |
| **`gigs`** (Update) | `band_id` (FK to `bands`), `share_token` (unique string, indexed), `is_public` (boolean), `poster_skin` (string enum) | Enables public sharing and branding. |
| **`gig_roles`** | No change (already relational). | Stores lineup. |
| **`setlist_items`** | No change (already relational). | Stores songs. |

### Feature Mapping

| Feature | Tables Used | Notes |
| :--- | :--- | :--- |
| **Public Pack** | `gigs` (token), `bands` (branding), `setlist_items`, `gig_roles` | Needs careful "View Model" to exclude private financial info. |
| **PDF Export** | `setlist_items` | Rendered via a dedicated print-optimized route. |
| **Branding** | `bands` | Stores the "Skin" configuration. |

## 4. Migration mapping from Gigmaster → Ensemble
Assuming "Gigmaster" source uses JSONB for some structures (common in legacy versions), we map them to Ensemble's relational tables.

| Gigmaster (Source) | Ensemble (Target) | Transform / Logic |
| :--- | :--- | :--- |
| `gigs.lineup` (JSONB Array) | `gig_roles` (Rows) | Iterate array. Map `name` -> `musician_contacts` (if no user) or `profiles`. Map `role` -> `role_name`. |
| `gigs.setlist_structured` (JSONB) | `setlist_items` (Rows) | Iterate array. Map `title`, `key`, `bpm`, `notes` to columns. Preserve `position` order. |
| `projects` | `bands` | Direct mapping of Name/Description. Migrate `logo` to Supabase Storage if needed. |
| `gigs.slug` | `gigs.share_token` | If unique, can reuse. Otherwise generate new `nanoid` tokens. |

**Edge Cases:**
- **Missing Users**: If a lineup member in JSONB doesn't match an Auth User, create a `musician_contact` for the Gig Owner and link the role there.
- **Invalid Data**: Skip corrupted JSON items; log errors to a migration audit table.

## 5. Implementation sequence (lowest risk first)

### Phase 1: Schema & Models (Low Risk)
- [ ] Create `bands` table (RLS: Owner manages).
- [ ] Add `band_id`, `share_token`, `is_public` columns to `gigs`.
- [ ] Add DB indexes for `share_token` and `band_id`.
- [ ] **Verification**: Check `schema.sql` via Supabase Dashboard or SQL editor.

### Phase 2: Public API & Route (Medium Risk)
- [ ] Create `lib/api/public-pack.ts` (Service Role fetcher).
- [ ] Create `app/p/[token]/page.tsx` (Public Route).
- [ ] Implement read-only UI reusing `components/gigs/pack/*`.
- [ ] **Verification**: Access `/p/123-abc` in Incognito mode. Ensure NO financial data is leaked.

### Phase 3: Branding & PDF (Medium Risk)
- [ ] Implement "Create Band" UI in Dashboard.
- [ ] Update Gig Form to select Band.
- [ ] Create `/api/gigs/[id]/pdf` route (using Playwright/Puppeteer).
- [ ] **Verification**: Generate PDF for a gig with 10+ songs.

### Phase 4: Data Import (High Risk)
- [ ] Write migration script (Node.js) to pull from Gigmaster and push to Ensemble via API/Supabase Client.
- [ ] Run dry-run import.
- [ ] **Verification**: Compare record counts and spot-check 5 complex gigs.

## 6. Security/RLS plan for public sharing
**Pattern**: **Service Role "View" Layer** (Recommended)
Instead of opening RLS to `anon` (public), we keep RLS strict and use a specific Next.js Route/Server Component to fetch public data.

1.  **Strict RLS**: `gigs`, `gig_roles`, etc. remain `auth.uid() = owner_id` (or lineup participant).
2.  **Public Accessor**:
    - `app/p/[token]/page.tsx` is a Server Component.
    - It calls a function `getPublicGigByToken(token)` using `supabaseAdmin` (Service Role).
    - This function **manually filters** sensitive fields (removes `agreed_fee`, `contact_info`).
    - It returns a DTO (Data Transfer Object) specifically for the view.
3.  **Exclusions**:
    - NEVER return `gig_roles.agreed_fee` or `gig_roles.is_paid` to the public view.
    - NEVER return private notes.

## 7. Risks & mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **RLS Leak** | Public sees private money info | Use DTO pattern in Server Component; do NOT pass raw DB rows to client. |
| **Playwright on Vercel** | Timeout / bloated bundle | Use `chromium-min` or an external PDF service (e.g. Browserless) if Vercel limits are hit. |
| **Migration Data Loss** | Old JSONB data missing fields | Create a `legacy_data` JSONB column in `gigs` to dump raw source data just in case. |
| **URL Conflicts** | Token collision | Use sufficiently long random strings (e.g., nanoid of length 10+). |

## 8. Definition of Done checklist
- [ ] `bands` table exists and links to `gigs`.
- [ ] Public sharing URL (`/p/[token]`) works without login.
- [ ] Public view shows **branding** (Logo/Colors).
- [ ] Public view **hides** all financial data.
- [ ] Setlist can be exported to PDF.
- [ ] All "GigPack" visual patterns are ported to `components/gigs/pack`.
- [ ] Docs updated with new architecture diagrams.

## 9. Open Questions
- **Venue Autocomplete**: Does the current `googleapis` setup include the Places API, or do we need a separate API key/quota for venue search?
- **PDF Generation**: Will we run a headless browser on Vercel (size limits) or just use a print-optimized CSS media query? (Plan currently assumes Playwright/Puppeteer).
- **Legacy Data**: Do we have a sample JSON dump of the "Gigmaster" data to validate the migration logic against?

