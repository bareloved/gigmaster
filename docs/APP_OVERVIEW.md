# App Overview (ensemble)

## 1. What this app is
- **Ensemble (Gig Brain)** is an operating system for gigging musicians to manage their gigs, lineups, setlists, and finances in one place.
- **Primary Users:** Freelance Musicians, Musical Directors (MDs), and Band Leaders.
- **Primary Workflows:**
  - **Gig Management:** Create gigs, define logistics (time, location), and build setlists.
  - **Lineup & Roles:** Invite musicians to specific roles (e.g., "Keys", "Drums"), track their status (accepted/declined), and manage payments.
  - **Preparation:** Musicians track their learning progress (charts ready, songs learned) and access materials (charts, audio).
  - **Financials:** Track earnings (as a player) and payouts (as a manager).
  - **Calendar Sync:** Two-way sync with Google Calendar and ICS feed export.

## 2. Tech stack
- **Framework/runtime:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide React
- **State/data fetching:** TanStack Query (React Query)
- **Auth:** Supabase Auth (Email/Password, Magic Link, Google OAuth)
- **Database:** Supabase (Postgres)
- **File storage:** Supabase Storage (avatars, gig files)
- **PDF/exports:** "Gig Pack" is a mobile-optimized web view (not PDF generation yet). ICS feed available.
- **Payments:** Manual tracking only (no Stripe/payment gateway integration yet).
- **Other integrations:** Google Calendar API (via `googleapis`), Resend (via `resend` SDK for emails).

## 3. Repo structure
- **High-level tree:**
  - `app/(app)/`: Authenticated application routes (Dashboard, Gigs, Money, etc.)
  - `app/api/`: API Routes (Calendar sync, Invitations, ICS feed)
  - `components/`: UI components broken down by feature (`dashboard`, `gigs`, `money`, `roles`, `ui`)
  - `lib/`: Utilities, Supabase client, shared types, API helpers
  - `supabase/`: Migrations and SQL functions
- **Key entrypoints:**
  - **App Root:** `app/layout.tsx` (Providers)
  - **Dashboard:** `app/(app)/dashboard/page.tsx`
  - **Gig Detail:** `app/(app)/gigs/[id]/page.tsx`
  - **Mobile Pack:** `app/(app)/gigs/[id]/pack/page.tsx`
  - **Auth Callback:** `app/auth/callback/route.ts`

## 4. Deployment & environments
- **Where it runs:** Vercel (recommended)
- **Build/start commands:** `npm run build`, `npm run start`
- **Environments:** Designed for standard Dev -> Preview -> Prod flow.
  - **Development:** Localhost with local or remote Supabase.
  - **Production:** Vercel + Supabase Production.

## 5. Auth & user model
- **Provider:** Supabase Auth (GoTrue).
- **Flow:** Sign Up/In pages (`app/auth/`) -> Magic Link or Password -> Middleware session check -> `app/(app)` layout.
- **User Table:** `auth.users` (Supabase internal) maps 1:1 to `public.profiles`.
- **Profile Fields:** `id` (PK), `email`, `name`, `phone`, `main_instrument`, `avatar_url`, `calendar_ics_token`.

## 6. Database
### 6.1 Provider + access layer
- **Provider:** Supabase (PostgreSQL).
- **Access Layer:** Supabase JS Client (`@supabase/supabase-js`) used in Server Components and Route Handlers.
- **Type Safety:** Generated types in `lib/types/database.ts` + shared application types in `lib/types/shared.ts`.

### 6.2 Schema summary (tables)
| Table Name | Purpose | Primary Key | Notable Columns | Relations |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | User profiles | `id` (uuid) | `email`, `phone`, `calendar_ics_token` | FK to `auth.users` |
| `gigs` | Core event entity | `id` (uuid) | `title`, `date`, `status`, `owner_id` | Owner -> `profiles` |
| `gig_roles` | Lineup slot | `id` (uuid) | `role_name`, `agreed_fee`, `payment_status` | `gig_id`, `musician_id` (Profile), `contact_id` |
| `setlist_items` | Songs/tracks | `id` (uuid) | `title`, `key`, `bpm`, `position` | `gig_id` |
| `gig_files` | Attachments | `id` (uuid) | `url`, `type` (chart, audio), `label` | `gig_id` |
| `musician_contacts` | Address book | `id` (uuid) | `contact_name`, `email`, `status` | `user_id` (Owner), `linked_user_id` |
| `gig_invitations` | Email invites | `id` (uuid) | `token`, `status`, `email` | `gig_id`, `gig_role_id` |
| `gig_readiness` | Musician prep | `id` (uuid) | `songs_learned`, `charts_ready` | `gig_id`, `musician_id` |
| `calendar_connections` | OAuth tokens | `id` (uuid) | `provider` (google), `access_token` | `user_id` |
| `notifications` | In-app alerts | `id` (uuid) | `type`, `message`, `read_at` | `user_id`, `gig_id` |

### 6.3 RLS / policies / security notes
- **RLS:** Enabled on ALL tables.
- **Policies:**
  - Users can CRUD their own gigs (`owner_id`).
  - Users can read gigs where they have a role (`gig_roles`).
  - Strict visibility for `gig_roles` (musicians can see their own fee, managers see all).
- **Security Definer Functions:** Used for complex permission checks (e.g., `fn_is_gig_owner`) to avoid circular RLS recursion.

### 6.4 Migrations
- Managed via `supabase/migrations`.
- Includes roughly ~60 SQL files covering schema, functions, and RLS fixes.

## 7. Core domain modules
- **Gigs:** The central unit. Managed in `app/(app)/gigs`. Includes status workflow (draft -> confirmed -> completed).
- **Roles & Lineup:** "Gig Roles" connect a Gig to a Musician (Profile) or Contact. Handles invitations and status (accepted/declined).
- **Setlists:** Drag-and-drop song management per gig. Syncs with "Learning Status" for individual musician prep.
- **Money:** Tracks `agreed_fee`, `paid_amount`, and `payment_status`. Views for "My Earnings" (Player) and "Payouts" (Manager).
- **Calendar:** Integration module in `app/api/calendar`. Syncs Gig <-> Google Calendar Event.

## 8. Routes and APIs
### 8.1 Pages / app routes
- `/dashboard`: Main overview.
- `/gigs`: List of all gigs.
- `/gigs/[id]`: Detailed gig view (Tabs: Overview, Lineup, Setlist, Files, Money).
- `/gigs/[id]/pack`: "Gig Pack" mobile view.
- `/money`: Financial dashboard.
- `/profile`: User settings.
- `/my-circle`: Musician contacts management.

### 8.2 API routes
- `/api/calendar/connect`, `/disconnect`, `/events`: Google Calendar OAuth & Sync.
- `/api/calendar.ics`: Public ICS feed (token protected).
- `/api/send-invitation`: Triggers Resend emails.
- `/api/auth/google-calendar/callback`: OAuth callback.

### 8.3 External APIs used
- **Google Calendar API:** For pushing/pulling events.
- **Resend:** For sending transactional emails (invites).

## 9. Files, media, and exports
- **Uploads:** Supabase Storage buckets (likely `avatars`, `gig-files`).
- **Image Handling:** Standard `next/image` usage.
- **Exports:**
  - ICS Feed for calendars.
  - "Gig Pack" is a specialized responsive web view, designed to be treated like a digital pass.

## 10. Configuration (env vars)
- **Supabase:**
  - `NEXT_PUBLIC_SUPABASE_URL`: API URL.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Client key.
- **App:**
  - `NEXT_PUBLIC_APP_URL`: Base URL for generating invite links.
- **Integrations (Optional):**
  - `GOOGLE_CALENDAR_CLIENT_ID`: OAuth Client ID.
  - `GOOGLE_CALENDAR_CLIENT_SECRET`: OAuth Client Secret.
  - `GOOGLE_CALENDAR_REDIRECT_URI`: OAuth Redirect URL.
  - `RESEND_API_KEY`: Email service key.

## 11. Observability, testing, performance
- **Logging:** Minimal. Some `console.log` in API routes. DB `activity_log` table tracks business logic events.
- **Tests:** No explicit test suite (`__tests__` or `*.test.ts`) found in the file scan.
- **Performance:**
  - Heavy use of **React Query** for caching and state management.
  - `useInfiniteQuery` used for large lists (Gigs).
  - Database indexes added via migrations (e.g., `20241118210000_add_missing_foreign_key_indexes.sql`).

## 12. Security review (lightweight)
- **Auth:** Relies on Supabase, which is robust.
- **RLS:** Policies are complex due to the "Manager vs Player" dual role. Several migrations were dedicated to fixing "infinite recursion" in RLS.
- **Data Protection:** `calendar_connections` stores OAuth tokens.
- **Validation:** `zod` is installed and likely used in form actions/API routes.

## 13. Known issues / tech debt
- **Complex RLS:** The relationship between `gigs` and `gig_roles` caused RLS recursion issues in the past.
- **No Test Suite:** Lack of automated testing makes refactoring risky.
- **Projects Deprecation:** The `projects` table was removed/deprecated in favor of direct User ownership, but "Projects" might still be referenced conceptually in older UI parts or planned for re-introduction.
- **Manual Payments:** "Payment Status" is just a text field/flag; no actual money movement integration.

## 14. Merge readiness notes
- **Easiest to extract:**
  - **UI Components:** `components/ui` is standard shadcn and can be dropped into any Next.js app.
  - **Types:** `lib/types/shared.ts` is a good contract for the domain model.
- **Biggest risks/conflicts:**
  - **Supabase Dependency:** The app is tightly coupled to Supabase Auth and RLS. Merging into a non-Supabase app would require a complete backend rewrite.
  - **User Model:** Assumes `public.profiles` linked to `auth.users`. Merge target must align with this pattern.
- **Suggested Module Boundaries:**
  - Keep `gigs`, `gig_roles`, and `setlists` as a cohesive "Gig Management" module.
  - `calendar` integration is loosely coupled and can be an optional plugin.
  - `money` is currently simple enough to stay with `gigs`, but could be extracted if the target app has a robust finance system.

## 15. Open questions / unknowns
- **Mobile App State:** "Gig Pack" exists as a web view, but the React Native codebase is mentioned as a "Future" item. Is there a separate repo?
- **Legacy Projects:** Are there any lingering DB columns or code paths that still expect a `project_id`?
- **Notifications:** Are they real-time (Supabase Realtime) or pull-based? Migration `20241118190000_notifications_system.sql` suggests DB-backed notifications, but the delivery mechanism (Toast vs Webhook vs Email) needs verification.


