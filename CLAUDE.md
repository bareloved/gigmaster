# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GigMaster** is a gig management platform for musicians. It tracks bands/acts, gigs, lineups, setlists, files, payments, and invitations. Built with Next.js 15 (App Router), React 19, TypeScript, Supabase, and TanStack Query.

**Current Status:** Not yet production-ready. Active areas: invitation polish, calendar enhancements, payment tracking improvements, and mobile companion app.

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
```bash
npm test              # Run tests in watch mode
npm run test:run      # Run all tests once
npm run test:coverage # Run with coverage report
```

## Architecture Overview

### Tech Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **UI:** Tailwind CSS, shadcn/ui components
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **State:** TanStack Query v5 for server state, React Context for auth
- **Testing:** Vitest, React Testing Library, happy-dom
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
    /bands            # Band/act management
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

/tests               # Vitest test suite
  /api              # API function tests
  /components       # Component tests
  /fixtures         # Mock data
  /mocks            # Supabase mock factory
  /utils            # Test utilities

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
  queryKey: ["bands"],
  queryFn: listUserBands,
});

// ✅ GOOD - Each user gets their own cache
const { user } = useUser();
const { data } = useQuery({
  queryKey: ["bands", user?.id],
  queryFn: listUserBands,
  enabled: !!user,
});
```

### Radix Overlays - Page Shift Fix (modal={false})

**Problem:** Radix UI modal overlays add `overflow: hidden` to the body, removing the scrollbar and shifting the page ~15px left. `scrollbar-gutter: stable` conflicts with Radix's scroll-lock compensation, making it worse.

**Solution:** Our wrappers for `Dialog`, `Sheet`, and `DropdownMenu` default `modal` to `false`, which disables scroll locking entirely — no shift. Two supporting changes make this work:

1. **`onInteractOutside` prevention** on `DialogContent`/`SheetContent` — prevents the "opens then instantly closes" bug when triggered from a DropdownMenu
2. **Overlay wrapped in `Close`** — clicking the dark backdrop still dismisses the dialog/sheet

Do NOT add `scrollbar-gutter: stable` to `globals.css` — it conflicts with Radix's scroll-lock library.

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

**Hierarchy:** Users → Bands → Gigs → (Roles, Setlist, Files)

- **Users/Profiles** - Musicians and managers (auth + profile data)
- **Bands** - Bands, acts, or ensembles (owned by user)
- **Gigs** - Individual performances (belong to a band OR standalone)
- **Gig Roles** - Lineup positions (musician + role + payment info)
- **Setlist Items** - Songs for a gig (ordered list)
- **Gig Files** - External links (Google Drive, Dropbox, etc.)
- **Musician Contacts** - Personal contacts database ("My Circle")
- **Gig Invitations** - Email/WhatsApp invitations with magic links
- **Notifications** - Real-time in-app notifications

### Key Relationships

- **Bands are optional** - Gigs can exist without a band (flexible workflow)
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
import type { Band } from '@/lib/types/gigpack';

export async function listUserBands(): Promise<Band[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('bands')
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
import { listUserBands } from '@/lib/api/bands';

export function BandsList() {
  const { user } = useUser();

  const { data, isLoading, error } = useQuery({
    queryKey: ['bands', user?.id], // ALWAYS include user.id
    queryFn: listUserBands,
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
  mutationFn: createBand,
  onSuccess: () => {
    // Surgical cache invalidation
    queryClient.invalidateQueries({
      queryKey: ['bands', user?.id]
    });
    toast.success('Band created!');
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
- `band_id` is nullable (links to `bands` table — gigs can be standalone)
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

### Important: "bands" table

The `bands` table stores band/act data. The FK column on `gigs` is `band_id`.
- **Supabase queries:** Use `.from("bands")`
- **Types:** Use `Band` from `lib/types/gigpack`

### Indexes & Performance

All foreign keys have indexes. Key performance indexes:

- `gig_roles`: `musician_id`, `payment_status`, composite on `(gig_id, musician_id)`
- `gigs`: `band_id` (FK to `bands`), `date`, `status`
- `musician_contacts`: GIN for full-text search, composite on `(user_id, last_worked_date)`
- `notifications`: `user_id`, `read_at`, `created_at`

## Common Tasks & Workflows

### Updating the Changelog

**MANDATORY:** Every time changes are committed and pushed to `main`, update `CHANGELOG.md`:

1. Add entries under `## [Unreleased]` using these categories: `Added`, `Changed`, `Fixed`, `Removed`
2. Keep entries concise (one line each)
3. When a release is tagged or a PR is merged, move `[Unreleased]` entries under a dated heading (`## YYYY-MM-DD`)

### Adding a New Feature

1. **Plan first** - Review `docs/future-enhancements/next-steps.md`
2. **Database changes** - Create migration, apply via Supabase Dashboard
3. **Types** - Update `database.ts` and `shared.ts`
4. **API functions** - Add to `/lib/api/[feature].ts`
5. **Write tests** - Add API tests in `tests/api/`, component tests in `tests/components/`
6. **UI components** - Create feature components
7. **Page integration** - Wire up to existing pages
8. **Test** - Run `npm run test:run` + manual browser testing
9. **Document** - Add to `docs/build-process/`
10. **Update changelog** - Add entry to `CHANGELOG.md` under `[Unreleased]`

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

## Testing

### Framework: Vitest + React Testing Library

**Stack:** Vitest (test runner), React Testing Library (component testing), happy-dom (fast DOM environment)

### Test Structure

```
tests/
├── setup.ts              # Global test setup, Next.js mocks
├── mocks/
│   └── supabase.ts       # Chainable Supabase mock factory
├── fixtures/
│   ├── gigs.ts           # Mock gig, role, contact data
│   └── users.ts          # Mock user, profile data
├── utils/
│   └── render.tsx        # Custom render with providers
├── api/                  # API layer tests
│   ├── gigs.test.ts
│   ├── gig-roles.test.ts
│   └── gig-invitations.test.ts
└── components/           # Component tests
    ├── roles/
    └── shared/
```

### Writing API Tests

Mock the Supabase client with the chainable mock factory:

```typescript
import { createChainableMock } from "../mocks/supabase";

vi.mock("@/lib/supabase/client");

beforeEach(() => {
  vi.mocked(createClient).mockReturnValue(mockSupabase as any);
});

it("should fetch data", async () => {
  mockSupabase.from.mockReturnValue(
    createChainableMock({ data: mockGig, error: null })
  );

  const result = await getGig("test-id");
  expect(result).toEqual(mockGig);
});
```

### Writing Component Tests

Use the custom render with QueryClientProvider:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock API functions
vi.mock("@/lib/api/gig-roles", () => ({
  updateRole: vi.fn(),
}));

// Mock user provider
vi.mock("@/lib/providers/user-provider", () => ({
  useUser: () => ({ user: { id: "test-user" }, profile: { name: "Test" } }),
}));

it("should submit form", async () => {
  render(<MyComponent />);

  // Use fireEvent.submit for forms (more reliable than clicking submit button)
  const form = screen.getByRole("dialog").querySelector("form")!;
  fireEvent.submit(form);

  await waitFor(() => {
    expect(updateRole).toHaveBeenCalled();
  });
});
```

### Key Testing Patterns

1. **Form submissions** - Use `fireEvent.submit(form)` instead of clicking submit buttons (more reliable with React Hook Form)
2. **Async queries** - Always wrap in `waitFor()` for TanStack Query data
3. **Currency formatting** - Remember `formatCurrency()` adds 2 decimal places (e.g., "₪500.00")
4. **User mocking** - Mock `useUser` hook to provide consistent user context
5. **Supabase mocking** - Use chainable mock that supports `.from().select().eq().single()` patterns

### Manual Testing Checklist

In addition to automated tests:

1. Build succeeds (`npm run build`)
2. Lint passes (`npm run lint`)
3. TypeScript checks pass (`npm run check`)
4. Manual browser testing for critical user flows
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
4. **No file uploads** - External links only (Google Drive, Dropbox, etc.)
5. **Limited search** - Basic `ilike` pattern matching (no full-text yet)

## Getting Help

- **Read first:** `.cursorrules`, `BUILD_STEPS.md`, `docs/README.md`
- **Troubleshooting:** `docs/troubleshooting/`
- **AI workflow:** `docs/AI_AGENT_WORKFLOW_GUIDE.md`
- **Database issues:** `docs/agent-protocols/database-safety.md`

## Recent Major Changes

See `BUILD_STEPS.md` for complete history.
