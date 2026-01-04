# Ensemble - Gig Brain

A dedicated operating system for gigging musicians.

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Postgres, Auth, Storage)
- **Data Fetching**: TanStack Query (React Query)
- **Future**: Expo React Native for mobile companion app

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

1. Clone the repository (if not already done)

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials (Step 1 of BUILD_STEPS.md)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

You should see the dashboard with sidebar navigation.

## Project Structure

```
/app
  /(app)              # Authenticated app routes
    /dashboard        # Main dashboard
    /projects         # Projects management
    /money            # Financial tracking
    /profile          # User profile
  /layout.tsx         # Root layout with providers
  /page.tsx           # Root page (redirects to dashboard)
  /globals.css        # Global styles with Tailwind

/components
  /ui                 # shadcn/ui components
  app-sidebar.tsx     # Main navigation sidebar
  app-header.tsx      # Top header bar

/lib
  /providers          # React providers (Query, etc.)
  utils.ts            # Utility functions
```

## What's Been Set Up (Step 0 ✅)

- ✅ Next.js 15 with App Router
- ✅ TypeScript configuration
- ✅ Tailwind CSS
- ✅ shadcn/ui with components:
  - Button
  - Card
  - Avatar
  - Tabs
  - Scroll Area
  - Sheet (mobile sidebar)
- ✅ Supabase client library
- ✅ TanStack Query
- ✅ Basic app layout with:
  - Responsive sidebar (desktop + mobile)
  - Top header with user avatar
  - Dashboard, Projects, Money, and Profile pages

## Documentation

### 📚 **Comprehensive Documentation**
- [**📖 Documentation Hub**](./docs/README.md) - Start here for all docs
- [**🤖 AI Agent Workflow Guide**](./docs/AI_AGENT_WORKFLOW_GUIDE.md) - How to work with AI agents effectively
- [**🏗️ Build Steps**](./BUILD_STEPS.md) - Current project status (18 steps completed!)
- [**🚀 Next Steps Roadmap**](./docs/future-enhancements/next-steps.md) - Planned features

### 🎯 **Quick Links**
- [Build Process Docs](./docs/build-process/) - How features were built
- [Troubleshooting](./docs/troubleshooting/) - Common issues and solutions
- [Setup Guides](./docs/setup/) - Configuration and integrations
- [Architecture Rules](./.cursorrules) - Project principles and patterns

## Current Status

**Completed Features (Step 18):**
- ✅ Authentication & profiles
- ✅ Projects management
- ✅ Gigs management (with optional projects)
- ✅ Gig roles & lineup
- ✅ Setlists & materials
- ✅ Financial tracking (basic)
- ✅ Calendar integration (ICS + Google Calendar OAuth)
- ✅ "My Circle" musician contacts
- ✅ Dashboard with filters & quick actions

**Next Up:**
- 🚧 Notifications system
- 🚧 Advanced setlist features
- 🚧 Manager money dashboard

See [Next Steps Roadmap](./docs/future-enhancements/next-steps.md) for full plan.

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Working with AI Agents

This project has extensive documentation for working with AI agents. See [AI Agent Workflow Guide](./docs/AI_AGENT_WORKFLOW_GUIDE.md) for:
- When to start a new agent
- What context to provide
- Templates for common scenarios
- Best practices and tips

