# GigMaster

A dedicated operating system for gigging musicians — manage gigs, lineups, setlists, finances, and calendars in one place.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime)
- **State:** TanStack Query v5 (React Query)
- **Testing:** Vitest + React Testing Library + happy-dom
- **Deployment:** Vercel
- **Future:** Expo React Native mobile companion app

## Getting Started

### Prerequisites

- Node.js >= 24.0.0
- npm

### Installation

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create `.env.local` with your Supabase credentials
   - See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for all variables

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
/app
  /(app)                # Authenticated routes
    /bands              # Band/project management
    /calendar           # Calendar view & Google import
    /dashboard          # Main dashboard (player/manager views)
    /gigs               # Gig editor, detail, and pack views
    /history            # Past gigs archive
    /invitations        # Invitation acceptance
    /money              # Earnings & payouts
    /my-circle          # Musician contacts
    /profile            # User profile
    /settings           # App settings (calendar, etc.)
  /api                  # API routes (calendar, invitations, gigpack)
  /auth                 # Authentication pages

/components
  /bands                # Band editor
  /contacts             # Contact management dialogs
  /dashboard            # Dashboard widgets & gig cards
  /gigpack              # GigPack editor, layouts, setlists, sharing
  /gigs                 # Gig-specific dialogs
  /layout               # Top nav, sidebar, notifications, user menu
  /money                # Earnings & payouts tables
  /roles                # Role/lineup management
  /setlists             # Setlist editor, bulk add, learning status
  /shared               # Reusable components
  /ui                   # shadcn/ui primitives

/lib
  /api                  # Data access layer (21 modules, mobile-ready)
  /gigpack              # GigPack utilities, templates, i18n
  /integrations         # Google Calendar OAuth
  /providers            # React context (auth, query)
  /supabase             # Supabase clients (browser + server)
  /types                # TypeScript types (database, shared, gigpack)
  /utils                # Pure utility functions
  /emails               # Email templates

/tests                  # Vitest test suite
  /api                  # API function tests
  /components           # Component tests
  /fixtures             # Mock data
  /mocks                # Supabase mock factory
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint on app, lib, components |
| `npm run check` | Lint + TypeScript type check (no emit) |
| `npm run typecheck` | TypeScript check only |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run all tests once |
| `npm run test:coverage` | Run tests with coverage report |

## Features

### Core
- Gig creation and management (standalone or within bands/projects)
- GigPack — shareable, mobile-optimized gig info pages
- Lineup management with role assignment and fee tracking
- Setlist editor with drag-and-drop, bulk import, and section support
- PDF setlist upload with inline preview
- Gig drafts with auto-save

### People
- "My Circle" musician contacts with smart learning
- Unified search (contacts, system users, invite fallback)
- Email and WhatsApp invitations with magic links
- Invitation acceptance/decline with conflict detection

### Calendar
- ICS feed export (subscribe from any calendar app)
- Google Calendar OAuth import with smart schedule parsing
- In-app calendar view (month/week/day) with role filtering
- Conflict detection across Ensemble gigs and Google Calendar

### Money
- Player earnings view with year/month filtering
- Manager payouts view with project filtering
- Payment status tracking (pending, paid, partial, overdue)
- Summary KPIs and one-click payment marking

### Other
- Real-time notifications (Supabase Realtime)
- Dashboard with player/manager views, search, and filters
- Profile avatars (upload + Google OAuth auto-import)
- Dark mode
- Passwordless authentication (magic link, Google OAuth)
- Activity feed and gig history

## Documentation

- [CLAUDE.md](./CLAUDE.md) — AI agent instructions and architecture overview
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) — All environment variables
- [BUILD_STEPS.md](./BUILD_STEPS.md) — Step-by-step build history
- [CHANGELOG.md](./CHANGELOG.md) — Release history
- [docs/CONTRIB.md](./docs/CONTRIB.md) — Contributing guide
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — Operations runbook
- [docs/APP_OVERVIEW.md](./docs/APP_OVERVIEW.md) — Full app overview
- [docs/TESTING.md](./docs/TESTING.md) — Testing guide
- [docs/agent-protocols/](./docs/agent-protocols/) — Database safety protocols
- [docs/build-process/](./docs/build-process/) — Feature build documentation
- [docs/future-enhancements/](./docs/future-enhancements/) — Roadmap and planned features

## Current Status

See [CHANGELOG.md](./CHANGELOG.md) for recent changes and [BUILD_STEPS.md](./BUILD_STEPS.md) for full build history.

**Not yet production-ready.** Active development areas: invitation polish, calendar enhancements, payment tracking improvements, and mobile companion app.
