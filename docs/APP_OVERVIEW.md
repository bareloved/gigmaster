# App Overview

> Last updated: 2026-02-18

## 1. What this app is

**GigMaster** is an operating system for gigging musicians to manage gigs, lineups, setlists, and finances in one place.

**Primary Users:** Freelance musicians, musical directors (MDs), and band leaders.

**Primary Workflows:**
- **Gig Management:** Create gigs (standalone or within bands), define logistics, build setlists, share via GigPack.
- **Lineup & Roles:** Invite musicians to roles, track acceptance status, manage payments.
- **Preparation:** Musicians track learning progress and access materials (charts, audio, PDF setlists).
- **Financials:** Track earnings (as player) and payouts (as manager).
- **Calendar Sync:** Google Calendar OAuth import with conflict detection, in-app calendar with swipe navigation and 3-day view.

## 2. Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| UI | Tailwind CSS, shadcn/ui, Lucide React |
| State | TanStack Query v5 (React Query) |
| Auth | Supabase Auth (Email/Password, Magic Link, Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage (avatars, setlist PDFs) |
| Email | Resend SDK |
| Calendar | Google Calendar API (`googleapis`) |
| Maps | Google Places API (venue autocomplete) |
| Testing | Vitest, React Testing Library, happy-dom |
| i18n | next-intl |
| Deployment | Vercel |

## 3. Repo structure

```
app/(app)/          # 13 authenticated route groups
app/api/            # 10+ API endpoint groups
components/         # 13 feature directories + shadcn/ui primitives
lib/api/            # 21 data access modules (mobile-ready)
lib/gigpack/        # 8 GigPack utilities (templates, i18n, parser)
lib/integrations/   # Google Calendar OAuth
lib/providers/      # React context (auth, query)
lib/supabase/       # Browser + server clients
lib/types/          # database.ts, shared.ts, gigpack.ts
lib/utils/          # Pure utility functions
lib/emails/         # Email templates
tests/              # Vitest test suite (API + component tests)
docs/               # Project documentation
```

**Key entrypoints:**
- `app/layout.tsx` — Root layout with providers
- `app/(app)/gigs/page.tsx` — Main landing page (gig list with editor)
- `app/(app)/calendar/page.tsx` — Calendar view with swipe navigation
- `components/layout/top-nav.tsx` — Primary navigation
- `components/gigpack/editor/gig-editor-panel.tsx` — GigPack editor

## 4. Deployment & environments

- **Platform:** Vercel (automatic deploys from `main`)
- **Build:** `npm run build` / `npm run start`
- **Environments:** Dev (localhost) → Preview (Vercel PR deploys) → Production
- **Database:** Remote Supabase only (no local migration workflow)
- **Node.js:** >= 24.0.0

## 5. Auth & user model

- **Provider:** Supabase Auth (GoTrue)
- **Methods:** Email/password, magic link, Google OAuth
- **Flow:** Auth pages → session check via middleware → authenticated app layout
- **User table:** `auth.users` maps 1:1 to `public.profiles` via database trigger
- **Profile fields:** `id`, `email`, `name`, `phone`, `main_instrument`, `avatar_url`, `calendar_ics_token`

## 6. Database

### 6.1 Provider + access layer

- **Provider:** Supabase (PostgreSQL)
- **Access:** `@supabase/supabase-js` client in browser and server contexts
- **Types:** Generated in `lib/types/database.ts`, application types in `lib/types/shared.ts`
- **RPC functions:** `save_gig_pack`, `list_dashboard_gigs`, `list_past_gigs`

### 6.2 Schema summary

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | `email`, `phone`, `avatar_url`, `calendar_ics_token` |
| `bands` | Projects/bands | `name`, `owner_id`, `default_lineup` |
| `gigs` | Core event entity | `title`, `date`, `status`, `owner_id`, `gig_type`, `hero_image_url`, `setlist_pdf_url` |
| `gig_roles` | Lineup slots | `role_name`, `musician_id`, `contact_id`, `agreed_fee`, `payment_status`, `invitation_status` |
| `gig_drafts` | Draft gigs | `owner_id`, `form_data`, `title` |
| `setlist_sections` | Setlist sections per gig | `gig_id`, `title`, `position` |
| `setlist_items` | Songs within sections | `section_id`, `title`, `key`, `bpm`, `position` |
| `gig_files` | External resource links | `gig_id`, `url`, `type`, `label` |
| `musician_contacts` | "My Circle" address book | `contact_name`, `email`, `status`, `linked_user_id` |
| `gig_invitations` | Magic link invitations | `token`, `status`, `email` |
| `notifications` | In-app alerts | `type`, `message`, `read_at`, `user_id` |
| `calendar_connections` | Google OAuth tokens | `provider`, `access_token`, `refresh_token` |
| `gig_activity_log` | Activity audit trail | `gig_id`, `activity_type`, `metadata` |
| `setlist_learning_status` | Musician prep tracking | `setlist_item_id`, `musician_id`, `status` |

### 6.3 RLS & security

- RLS enabled on all tables
- Users can CRUD their own gigs (`owner_id = auth.uid()`)
- Users can read gigs where they have a role
- Profiles publicly readable (for user search), only owner can update
- Security definer functions for complex permission checks (avoid circular RLS)
- `SUPABASE_SERVICE_ROLE_KEY` used server-side for public GigPack sharing (bypasses RLS)

### 6.4 Migrations

Managed in `supabase/migrations/`. Applied manually via Supabase Dashboard SQL Editor. ~60+ migration files covering schema, functions, RLS, and indexes.

## 7. Core domain modules

| Module | Description | Key Files |
|--------|-------------|-----------|
| **Gigs** | Central entity. Standalone or within a band. Status workflow (confirmed/tentative/cancelled). | `lib/api/gigs.ts`, `lib/api/dashboard-gigs.ts` |
| **GigPack** | Shareable gig info page with editor, templates, themes, i18n. | `lib/gigpack/`, `components/gigpack/` |
| **Bands** | Projects/acts that group gigs. Default lineups. | `lib/api/bands.ts`, `components/bands/` |
| **Roles & Lineup** | Connect gigs to musicians. Invitation workflow. | `lib/api/gig-roles.ts`, `lib/api/gig-invitations.ts` |
| **Setlists** | Drag-and-drop, sections, bulk import, learning status, PDF upload. | `lib/api/setlist-items.ts`, `lib/api/setlist-learning.ts` |
| **Money** | Player earnings and manager payouts. Payment status enum. | `lib/api/money.ts`, `lib/api/player-money.ts` |
| **Calendar** | Google Calendar OAuth import, calendar invites, conflict detection. | `lib/api/calendar.ts`, `lib/api/calendar-google.ts` |
| **Contacts** | "My Circle" with smart learning and auto-linking. | `lib/api/musician-contacts.ts` |
| **Notifications** | Real-time via Supabase Realtime + polling backup. | `lib/api/notifications.ts` |

## 8. Routes and APIs

### Pages

| Route | Description |
|-------|-------------|
| `/gigs` | Main landing page — gig list with upcoming/previous toggle and editor panel |
| `/gigs/[id]` | Gig detail |
| `/gigs/[id]/pack` | GigPack mobile view |
| `/bands` | Band management |
| `/money` | Earnings (player) and payouts (manager) |
| `/my-circle` | Musician contacts |
| `/calendar` | In-app calendar view (month/week/3-day) with swipe navigation |
| `/calendar/import` | Google Calendar import |
| `/history` | Past gigs archive |
| `/invitations` | Pending/declined invitations |
| `/settings` | Unified settings (Profile, General, Calendar, Account) |
| `/dashboard` | Dashboard (grayed out, pending redesign) |

### API routes

| Endpoint | Purpose |
|----------|---------|
| `/api/calendar/*` | Google Calendar OAuth + sync |
| `/api/auth/google-calendar/callback` | OAuth callback |
| `/api/send-invitation` | Email invitations via Resend |
| `/api/gigpack/[slug]/*` | Public GigPack endpoints |
| `/api/gig/[id]/*` | Individual gig operations |
| `/api/webhooks/*` | Google Calendar event webhooks |
| `/api/account/*` | Account deletion |

## 9. Files, media, and exports

- **Storage:** Supabase Storage buckets (`avatars`, `setlist-pdfs`)
- **Uploads:** Avatar images (5MB limit), setlist PDFs with drag-and-drop
- **External links:** Gig files link to Google Drive, Dropbox, etc.
- **Exports:** ICS calendar feed, GigPack shareable web pages

## 10. Configuration (env vars)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side admin access |
| `GOOGLE_CALENDAR_CLIENT_ID` | No | Google Calendar OAuth |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | No | Google Calendar OAuth |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No | Google Calendar callback URL |
| `RESEND_API_KEY` | No | Email invitations |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | No | Venue autocomplete |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for invitation links |

## 11. Observability, testing, performance

- **Logging:** Minimal server-side logging. `gig_activity_log` table tracks business events.
- **Tests:** Vitest test suite — 827 tests across 26 files, 95% API coverage. See `docs/TESTING.md`.
- **Performance:**
  - TanStack Query caching throughout (2-5 min stale times)
  - Dashboard RPC functions (`list_dashboard_gigs`, `list_past_gigs`) for single-query loading
  - Database indexes on all foreign keys and frequent query columns
  - GIN indexes for full-text search on contacts
  - Optimistic UI updates for instant feedback
  - Hybrid server/client architecture for instant page navigation (~10-50ms)

## 12. Security

- **Auth:** Supabase Auth with RLS on all tables
- **RLS complexity:** Manager vs player dual-role model required security definer functions to avoid circular recursion
- **Token security:** Calendar ICS tokens (32-byte), invitation magic links (64-char), 7-day expiry
- **Data protection:** OAuth tokens stored in `calendar_connections`, service role key server-only
- **Validation:** Zod for form validation, email/phone format checks

## 13. Known limitations & tech debt

1. **No recurring events** — Calendar import treats each instance separately
2. **Single currency default** — ILS (field supports 8 currencies)
3. **No email preferences** — Users can't toggle notification types
4. **Basic search** — `ilike` pattern matching (no full-text on gigs)
5. **No bulk payment updates** — One at a time
6. **No CSV/PDF export** — For financial data
7. **Manual overdue marking** — No automatic detection
8. **Component test coverage** — API layer at 95%, component tests still limited
