# Contributing Guide

> Auto-generated from `package.json` and `.env.example` on 2026-02-07.

## Prerequisites

- Node.js >= 24.0.0
- npm
- A Supabase project (remote — no local DB workflow)
- Vercel account (for deployment)

## Environment Setup

Copy the environment variables and fill in your values:

| Variable | Required | Exposed to Browser | Purpose |
|----------|----------|--------------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | No | Server-side admin access (account deletion, public GigPack sharing) |
| `GOOGLE_CALENDAR_CLIENT_ID` | No | No | Google Calendar OAuth integration |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | No | No | Google Calendar OAuth integration |
| `GOOGLE_CALENDAR_REDIRECT_URI` | No | No | Google Calendar OAuth callback URL |
| `RESEND_API_KEY` | No | No | Email invitations via Resend |
| `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` | No | Yes | Venue autocomplete (Google Maps) |
| `NEXT_PUBLIC_APP_URL` | No | Yes | Base URL for invitation links (defaults to localhost in dev) |

**Security notes:**
- Never commit `.env.local` to git.
- `NEXT_PUBLIC_*` variables are visible in the browser — no secrets there.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — keep it server-side only.

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev --turbopack` | Start dev server with Turbopack |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint app lib components` | Run ESLint on source directories |
| `check` | `npm run lint && tsc --noEmit` | Lint + TypeScript type check (no emit) |
| `typecheck` | `tsc --noEmit` | TypeScript check only |
| `predeploy` | `npm run typecheck \|\| echo ... && npm run build` | Typecheck (non-blocking) then build |
| `test` | `vitest` | Run tests in watch mode |
| `test:run` | `vitest run` | Run all tests once |
| `test:watch` | `vitest --watch` | Run tests in watch mode (explicit) |
| `test:coverage` | `vitest run --coverage` | Run tests with coverage report |

## Development Workflow

1. **Install dependencies:** `npm install`
2. **Start dev server:** `npm run dev`
3. **Make changes** — the dev server hot-reloads via Turbopack.
4. **Run checks before committing:**
   ```bash
   npm run check        # Lint + TypeScript
   npm run test:run     # All tests
   ```
5. **Build to verify:** `npm run build`

## Testing

**Framework:** Vitest + React Testing Library + happy-dom

```bash
npm run test:run                           # Run all tests once
npm run test:run -- tests/api/gigs.test.ts # Run a specific file
npm run test:run -- tests/api/            # Run a directory
npm run test:run -- --grep "should create" # Run by pattern
npm run test:coverage                      # Coverage report
```

### Test structure

```
tests/
├── setup.ts          # Global config, Next.js mocks
├── mocks/supabase.ts # Chainable Supabase mock factory
├── fixtures/         # Mock data (gigs, users)
├── api/              # API layer tests
└── components/       # Component tests
```

### Key patterns

- Mock Supabase with the chainable mock factory (`createChainableMock`)
- Always wrap async assertions in `waitFor()`
- Use `fireEvent.submit(form)` for form submissions (more reliable than button clicks with React Hook Form)
- Include `user?.id` in all TanStack Query keys

## Database

**All database work is done directly on remote Supabase.** There is no local migration workflow.

- Apply migrations via Supabase Dashboard SQL Editor
- Never run `supabase db reset` or `supabase db push` without explicit approval
- Always query `pg_policies` before making RLS changes
- See `docs/agent-protocols/database-safety.md` for the full protocol

## Code Style

- **TypeScript** with strict mode
- **Tailwind CSS** for styling (mobile-first)
- **shadcn/ui** for component primitives
- **`'use client'`** on most pages (hybrid architecture for instant navigation)
- **TanStack Query** for all server state (always include `user?.id` in query keys)
- All API functions in `/lib/api/*` are platform-agnostic (no Next.js imports)

## Key Routes

| Route | Purpose |
|-------|---------|
| `/gigs` | Main landing page — all gigs list |
| `/gigs/[id]/pack` | Gig detail/pack view |
| `/bands` | Band management |
| `/settings` | Unified settings (Profile, General, Calendar, Account) |
| `/settings?tab=calendar` | Calendar settings (deep-link for OAuth callback) |
| `/invitations` | Invitation management |
| `/history` | Past gigs |
| `/dashboard` | Dashboard (currently disabled, pending redesign) |
