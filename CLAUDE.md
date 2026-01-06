# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ensemble** is a gig management platform for musicians. It tracks projects (bands/acts), gigs, lineups, setlists, files, payments, and invitations. Built with Next.js 15 (App Router), React 19, TypeScript, Supabase, and TanStack Query.

**Current Status:** 22 steps complete, production-ready with invitations, calendar integration, notifications, and payment tracking.

## Working With Me

**I'm not a developer.** I'm a musician building this app with AI assistance. I don't have a coding background, so please:

- **Guide me through decisions** - Don't assume I understand the implications. Explain trade-offs in plain language.
- **Question my choices** - If I suggest something that seems off, push back and offer better alternatives.
- **Explain as you go** - Brief explanations help me learn. What does this code do? Why this approach?
- **Keep it simple** - Prefer straightforward solutions over clever ones. I need to understand and maintain this.
- **Warn about risks** - If something could break the app or cause data loss, make it very clear.

I'm here to learn, so treat me as a collaborator who needs context, not a developer who just needs code.

## Essential Commands

### Development
```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Production build
npm run lint         # Run ESLint
npm run check        # Lint + TypeScript check (no emit)
```

### Database (Supabase)
**CRITICAL:** We work DIRECTLY with remote Supabase. DO NOT use local migrations.

- Use Supabase MCP tools (if available) for all database operations
- Apply migrations via Supabase Dashboard SQL Editor
- Never run `supabase db reset` or `supabase db push` without explicit approval
- See `.cursorrules` for mandatory database safety protocols

### Testing
No test framework currently installed. Manual testing in browser.

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS, shadcn/ui components
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **State:** TanStack Query v5 for server state, React Context for auth
- **Future:** Expo React Native mobile companion app

### Hybrid Performance Architecture

**Critical Pattern:** This app uses a hybrid server/client architecture for optimal performance.

- **Server Components:** Used for layouts and initial data (rare)
- **Client Components:** Primary pattern with TanStack Query
- **Global UserProvider:** Auth state managed via React Context
- **Loading Gate:** App layout level prevents auth flicker
- **Page Navigation:** Instant (~10-50ms) after initial load via client-side routing

**Why:** All navigations are instant because pages are client components. Server components would trigger full re-renders.

### Code Structure

```
/app
  /(app)              # Authenticated routes (client components)
    /dashboard        # Main dashboard with player/manager views
    /projects         # Project management
    /gigs             # Gig detail and pack views
    /money            # Earnings & payouts
    /my-circle        # Musician contacts management
    /calendar         # Calendar view & import
    /invitations      # Invitation acceptance
    /profile          # User profile
    /settings         # App settings
  /api                # Next.js API routes (server-side)
  /auth               # Authentication pages
  /layout.tsx         # Root layout with providers
  /globals.css        # Global styles + Tailwind

/lib
  /api              # Data access layer (mobile-ready ✅)
  /types            # TypeScript types (mobile-ready ✅)
  /utils            # Pure utilities (mobile-ready ✅)
  /providers        # React context providers (web-only)
  /supabase         # Supabase clients (web-only)
  /integrations     # External APIs (Google Calendar)
  /emails           # Email templates

/components
  /ui               # shadcn/ui components
  [feature].tsx     # Feature-specific components

/docs                # Comprehensive project documentation
```

### Key Architectural Principles

1. **Platform-Agnostic API Layer**
   - All `/lib/api/*` functions are mobile-ready
   - No Next.js imports, no browser globals
   - Only Supabase client and type imports
   - Return plain data (no JSX)

2. **Type Safety**
   - Database types auto-generated from Supabase
   - All types exported from `/lib/types/shared.ts`
   - Strict TypeScript across all modules

3. **Performance-First**
   - TanStack Query caching throughout
   - Optimistic UI updates
   - No N+1 queries (use joins)
   - Indexed database columns for all frequent queries
   - Pagination/limits on all lists

4. **Security by Default**
   - Row Level Security (RLS) on all tables
   - Cache keys include `user?.id` to prevent cross-user pollution
   - All mutations validate authorization
   - Never assume policy names (query `pg_policies` first)

## Critical Development Patterns

### TanStack Query Cache Keys - ALWAYS Include User ID

**Problem:** Query keys without user IDs cause cross-user cache pollution.

**Solution:** ALWAYS include `user?.id` in query keys for user-specific data:

```typescript
// ❌ BAD - Cache shared across all users
const { data } = useQuery({
  queryKey: ["projects"],
  queryFn: listUserProjects,
});

// ✅ GOOD - Each user gets their own cache
const { user } = useUser();
const { data } = useQuery({
  queryKey: ["projects", user?.id],
  queryFn: listUserProjects,
  enabled: !!user,
});
```

### Row Level Security (RLS)

**Always verify:**
1. RLS policies are enabled on all tables
2. Policies use `auth.uid()` to filter by current user
3. Query `pg_policies` to see ACTUAL policy names (never assume!)
4. Check for circular dependencies between tables (see troubleshooting docs)

**Before ANY RLS changes:**
```sql
-- Check current policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'your_table'
ORDER BY policyname;
```

### Database Operations Protocol

**MANDATORY before any database work:**

1. **Never assume** - Always query current state first
2. **Run advisors** (if MCP available) - security and performance checks
3. **Use exact names** - Query `pg_policies`, `pg_indexes`, etc.
4. **Verify after** - Confirm changes actually applied
5. **No local workflow** - Work directly with Supabase remote

See `docs/agent-protocols/database-safety.md` for full protocol.

### Comprehensive Impact Analysis

When making architectural changes (column renames, schema changes, type modifications):

**MANDATORY 7-Step Check:**
1. **Search first** - `grep -r "column_name"` across entire codebase
2. **Document all occurrences** - File path, line number, context
3. **Identify layers** - Database, Types, API, Components, Pages
4. **Fix in order** - Database → Types → API → Components → Pages
5. **Verify each layer** - Run lint, search again
6. **Test critical paths** - CRUD operations
7. **Final grep** - Confirm 0 references to old name

**What NOT to do:** Make changes incrementally as errors appear.

See `.cursorrules` for detailed examples.

## Domain Model

### Core Entities

**Hierarchy:** Users → Projects → Gigs → (Roles, Setlist, Files)

- **Users/Profiles** - Musicians and managers (auth + profile data)
- **Projects** - Bands, acts, or ensembles (owned by user)
- **Gigs** - Individual performances (belong to project OR standalone)
- **Gig Roles** - Lineup positions (musician + role + payment info)
- **Setlist Items** - Songs for a gig (ordered list)
- **Gig Files** - External links (Google Drive, Dropbox, etc.)
- **Musician Contacts** - Personal contacts database ("My Circle")
- **Gig Invitations** - Email/WhatsApp invitations with magic links
- **Notifications** - Real-time in-app notifications

### Key Relationships

- **Projects are optional** - Gigs can exist without projects (flexible workflow)
- **Gig Roles link users** - `musician_id` (nullable) links to auth users
- **Contacts auto-link** - When invited user signs up, all their roles update
- **Calendar integration** - ICS feed + Google Calendar OAuth import
- **Payment tracking** - `payment_status` enum (pending, paid, partial, overdue)

### Status Workflows

**Gig Statuses:** confirmed, tentative, cancelled
**Invitation Statuses:** pending, accepted, declined, needs_sub
**Payment Statuses:** pending, paid, partial, overdue

## Important Patterns & Conventions

### API Functions

All API functions in `/lib/api/*` follow this pattern:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@/lib/types/shared';

export async function listUserProjects(): Promise<Project[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
```

**Key points:**
- Create Supabase client inside function
- Import types from `/lib/types/shared.ts`
- Throw errors (let caller handle)
- Return typed data or empty array/null
- No browser/Next.js dependencies

### TanStack Query Usage

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { listUserProjects } from '@/lib/api/projects';

export function ProjectsList() {
  const { user } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ['projects', user?.id], // ALWAYS include user.id
    queryFn: listUserProjects,
    enabled: !!user, // Don't run until user loaded
    staleTime: 2 * 60 * 1000, // 2 minutes (adjust per feature)
  });

  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* Render data */}</div>;
}
```

### Mutations & Cache Invalidation

```typescript
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: createProject,
  onSuccess: () => {
    // Surgical cache invalidation
    queryClient.invalidateQueries({
      queryKey: ['projects', user?.id]
    });
    toast.success('Project created!');
  },
});
```

### Component Patterns

- **Use client components** - Most pages/components should be `'use client'`
- **Loading states** - Always provide skeleton UI while loading
- **Error boundaries** - Handle errors gracefully with messages
- **Empty states** - Provide helpful CTAs when no data
- **Optimistic updates** - Update UI immediately, rollback on error
- **No god components** - Break large components into smaller focused ones

### Styling Conventions

- **Tailwind CSS** - Primary styling method
- **shadcn/ui** - Component library for UI primitives
- **Mobile-first** - Responsive design using `sm:`, `md:`, `lg:` breakpoints
- **Dark mode** - Supported via theme provider
- **No inline styles** - Use Tailwind classes

## Database Schema Highlights

### Tables with Special Considerations

**gigs:**
- `project_id` is nullable (gigs can be standalone)
- `external_calendar_event_id` tracks imported events
- `notes` and `schedule` for rich event details
- `currency` defaults to 'ILS' (8 supported currencies)

**gig_roles:**
- `musician_id` nullable until user accepts invitation
- `contact_id` links to My Circle contacts
- `invitation_status` tracks acceptance workflow
- `payment_status` enum (not boolean) for nuanced tracking

**musician_contacts:**
- `status`: 'local_only', 'invited', 'active_user'
- `linked_user_id` connects contact to registered user
- Auto-created from gig roles, learns patterns over time

**gig_invitations:**
- 64-char secure tokens with 7-day expiration
- Tracks email AND WhatsApp invitations
- Magic link acceptance flow

**profiles:**
- Synced from `auth.users` via database trigger
- Publicly readable (for user search) but only owner can update
- Includes `calendar_ics_token` for ICS feed subscriptions

### Indexes & Performance

All foreign keys have indexes. Key performance indexes:

- `gig_roles`: `musician_id`, `payment_status`, composite on `(gig_id, musician_id)`
- `gigs`: `project_id`, `date`, `status`
- `musician_contacts`: GIN for full-text search, composite on `(user_id, last_worked_date)`
- `notifications`: `user_id`, `read_at`, `created_at`

## Common Tasks & Workflows

### Adding a New Feature

1. **Plan first** - Review `docs/future-enhancements/next-steps.md`
2. **Database changes** - Create migration, apply via Supabase Dashboard
3. **Types** - Update `database.ts` and `shared.ts`
4. **API functions** - Add to `/lib/api/[feature].ts`
5. **UI components** - Create feature components
6. **Page integration** - Wire up to existing pages
7. **Test** - Manual testing in browser
8. **Document** - Add to `docs/build-process/`

### Modifying Database Schema

1. **Read** `docs/agent-protocols/database-safety.md`
2. **Query current state** - Use `pg_policies`, `pg_indexes`, etc.
3. **Create migration SQL** - In `supabase/migrations/`
4. **Apply via Dashboard** - Never use local CLI
5. **Update types** - Regenerate or manually update `database.ts`
6. **Update API functions** - Reflect schema changes
7. **Comprehensive grep** - Find all affected code
8. **Test thoroughly** - Verify RLS, indexes, queries

### Debugging RLS Issues

See `docs/troubleshooting/rls-debugging-saga.md` for war stories.

**Quick checklist:**
1. Query `pg_policies` for ACTUAL policy names
2. Check for circular dependencies (Table A ↔ Table B)
3. Use exact policy names when dropping/recreating
4. Test with multiple users to confirm isolation
5. Break circular dependencies by making one table permissive

### Working with Invitations

The invitation system has three flows:

1. **Email Invitation** - Manager sends email with magic link
2. **WhatsApp Invitation** - Manager gets WhatsApp deep link to send
3. **Direct Add** - Manager adds registered user directly (no invitation needed)

All three create a `gig_role` entry and send an in-app notification.

### Calendar Integration

Two-way understanding:

1. **Export (ICS Feed)** - Gigs → External calendar via subscription URL
2. **Import (OAuth)** - Google Calendar → Gigs via OAuth + import UI

Conflict detection checks both Ensemble gigs AND Google Calendar events.

## Testing Notes

**No automated tests currently.** Manual testing workflow:

1. Build succeeds (`npm run build`)
2. Lint passes (`npm run lint`)
3. TypeScript checks pass (`npm run check`)
4. Manual browser testing for all user flows
5. Test with multiple user accounts for RLS verification
6. Test on mobile viewport for responsive design

## Deployment

- **Platform:** Vercel (production)
- **Environment Variables:** See `ENVIRONMENT_VARIABLES.md`
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Optional:** Google Calendar OAuth, Resend API key

See `VERCEL_DEPLOYMENT_INSTRUCTIONS.md` for complete guide.

## Documentation

Extensive documentation in `/docs/`:

- **AI_AGENT_WORKFLOW_GUIDE.md** - How to work with AI agents effectively
- **build-process/** - Step-by-step feature documentation (22 steps)
- **future-enhancements/** - Roadmap and planned features
- **agent-protocols/** - MANDATORY protocols for database work
- **troubleshooting/** - Common issues and solutions
- **setup/** - Configuration guides (Google Calendar, etc.)

**Always read** `.cursorrules` for architectural rules and safety protocols.

## Mobile App Preparation

The codebase is architected for future mobile app:

**Mobile-Ready:**
- `/lib/api/*` - All API functions
- `/lib/types/*` - All TypeScript types
- `/lib/utils/*` - All utility functions

**Web-Only:**
- `/lib/providers/*` - React Context (rebuild for RN)
- `/lib/supabase/client.ts` - Browser client (use RN Supabase client)
- `/lib/supabase/server.ts` - Next.js server (N/A for mobile)

See `lib/README.md` and `docs/mobile-integration-guide.md` for details.

## Special Notes

### Performance Expectations

- **Page navigation:** < 50ms (after initial load)
- **Search queries:** < 200ms (with 100+ records)
- **Mutation response:** < 500ms (optimistic UI updates immediately)
- **Real-time notifications:** Instant (via Supabase Realtime)

### Security Considerations

- **RLS on all tables** - Enforced at database level
- **Cache isolation** - `user?.id` in all query keys
- **Token security** - Calendar tokens, invitation tokens are cryptographically secure
- **Public profile search** - Profiles visible to all authenticated users (by design)
- **Input validation** - Email, phone, file uploads validated client + server

### Known Limitations

1. **No recurring events** - Calendar import treats each instance separately
2. **Single currency** - ILS only (field ready for multi-currency)
3. **No email preferences** - Users can't toggle notification types
4. **No automated tests** - Manual testing only
5. **No file uploads** - External links only (Google Drive, Dropbox, etc.)
6. **Limited search** - Basic `ilike` pattern matching (no full-text yet)

## Getting Help

- **Read first:** `.cursorrules`, `BUILD_STEPS.md`, `docs/README.md`
- **Troubleshooting:** `docs/troubleshooting/`
- **AI workflow:** `docs/AI_AGENT_WORKFLOW_GUIDE.md`
- **Database issues:** `docs/agent-protocols/database-safety.md`

## Recent Major Changes

- **Step 22 (Nov 20, 2024):** Money View v1 with earnings & payouts
- **Step 21 (Nov 20, 2024):** Profile avatar upload + Google OAuth extraction
- **Step 20 (Nov 19, 2024):** Unified user search (command palette pattern)
- **Step 19 (Nov 18, 2024):** Real-time in-app notifications
- **Steps 15-17 (Nov 18, 2024):** Full calendar integration (ICS + Google OAuth)
- **Step 14 (Nov 17, 2024):** "My Circle" contacts system with auto-linking
- **Step 13 (Nov 16, 2024):** Invitation system with email/WhatsApp

See `BUILD_STEPS.md` for complete history.
