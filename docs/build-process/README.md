# Build Process Documentation

This folder contains detailed documentation for each step of building the Ensemble app.

## Purpose

Each document captures:
- What was built
- Why we built it that way
- Technical decisions made
- Code files created/modified
- How to test/verify it works
- What's coming next

## Build Steps

### ✅ Completed Steps

- [**Step 0: Project & Tooling Setup**](./step-0-project-setup.md)
  - Next.js, TypeScript, Tailwind CSS
  - shadcn/ui components
  - Theme system with dark mode
  - Basic app layout
  
- [**Step 1: Supabase & Database Foundation**](./step-1-supabase-database.md)
  - Supabase project setup
  - Core schema (profiles, projects, gigs)
  - Row Level Security policies
  - Database connection

- [**Step 2: Authentication, Profiles & "My Account"**](./step-2-authentication.md)
  - Supabase Auth integration
  - Sign in/sign up pages
  - Protected routes with middleware
  - Profile management
  - User menu and sign out
  - Google OAuth

- [**Step 2.5: Performance Optimization - Hybrid Architecture**](./step-2.5-performance-optimization.md)
  - Middleware route protection with caching
  - Client-side user context for instant navigation
  - React cache() for server-side deduplication
  - Loading skeleton states
  - Optimized from 300-500ms → ~50ms page navigation

- [**Step 3: Projects CRUD (Bands/Acts)**](./step-3-projects-crud.md)
  - Project creation, listing, update, delete API functions
  - Projects page with responsive grid layout
  - Create Project dialog with form validation
  - Empty states and loading skeletons
  - Client-side rendering for instant navigation

- [**Step 3.5: Edit & Delete CRUD Operations**](./step-3.5-edit-delete-crud.md)
  - Edit dialogs for projects and gigs with pre-populated forms
  - Delete confirmation dialogs with cascade warnings
  - Settings dropdown menu for gig actions
  - Proper cache invalidation after mutations
  - Danger Zone UI pattern for destructive actions

- [**Step 4: Gigs Basic CRUD**](./step-4-gigs-crud.md)
  - Gig creation, listing, update, delete API functions
  - Create Gig dialog with date, time, location fields
  - Project detail page with gigs list and tabs
  - Gig detail page with full information
  - TanStack Query caching for performance
  - Status badges and formatted date/time display

- [**Step 5: GigRoles (Players, Status, Fee)**](./step-5-gig-roles.md)
  - GigRoles table with musician assignments
  - Role status tracking (invited, confirmed, declined, needs sub)
  - Quick-add musician autocomplete with history
  - Lineup management UI with table and dialogs
  - Fee tracking per role
  - Color-coded status badges

- [**Step 5.5: Security and Caching Fixes**](./step-5.5-security-and-caching-fixes.md)
  - Fixed RLS policies for projects table (cross-user data leak)
  - Fixed TanStack Query cache keys (added user.id to prevent cross-user cache pollution)
  - Added critical patterns to BUILD_STEPS.md
  - Defense in depth: RLS + cache key isolation

- [**Dashboard: Date Range Filter**](./dashboard-date-range-filter.md)
  - Server-side date range filtering for gigs
  - Preset date ranges (7, 30, 90 days)
  - Custom date range picker
  - Reduced data transfer and improved performance

- [**Dashboard: Pagination & Infinite Scroll**](./dashboard-pagination-infinite-scroll.md)
  - Infinite scroll with TanStack Query's useInfiniteQuery
  - 20 gigs per page with automatic loading
  - Intersection Observer for scroll detection
  - Manual "Load More" button fallback

- [**Dashboard: Search Functionality**](./dashboard-search-functionality.md)
  - Real-time search across gig title, project name, and location
  - 300ms debouncing for performance
  - Clear button for quick reset
  - Context-aware empty states

- [**Dashboard: Recent Gigs Section**](./dashboard-recent-gigs-section.md)
  - Collapsible section showing last 20 gigs from past 30 days
  - Lazy loading (only fetches when expanded)
  - "View All Past Gigs" link to history page
  - Separate history page with full past gigs list

- [**Dashboard: Quick Actions**](./dashboard-quick-actions.md)
  - Dropdown menu on gig cards for quick actions
  - Mark as paid/unpaid for players
  - Accept/decline invitations for players
  - Update gig status for managers
  - Toast notifications with sonner
  - TanStack Query mutations with cache invalidation

### 🚧 In Progress

- **Step 6: Setlist Basics** (Next up!)

### 📋 Planned Steps

- Authentication system
- Projects management
- Gigs management
- Role/lineup management
- Setlists & materials
- Payment tracking
- Calendar integration
- Mobile companion app

## How to Use These Docs

- **Starting fresh?** Read from Step 0 onwards
- **Joining the project?** Read all completed steps to understand decisions
- **Adding a feature?** Check if similar patterns exist in previous steps
- **Debugging?** Look up the relevant step to understand the original implementation

## Document Template

Each step document follows this structure:
1. Overview & Goals
2. What We Built
3. Technical Decisions
4. Files Created/Modified
5. How to Test
6. Known Limitations
7. Next Steps

15. [Calendar Integration - Phase 1](./step-8-calendar-integration-phase-1.md) ✅ COMPLETE  
    - ICS feed export for external calendar subscription
    - In-app calendar view with filters
    - Basic conflict detection
    - Token-based security

16. [Calendar Integration - Phase 1.5](./step-15-calendar-integration-phase-1.5.md) ✅ COMPLETE  
    - Google Calendar OAuth integration (read-only)
    - Import calendar events as gigs
    - Full conflict detection (Ensemble + Google Calendar)
    - Connection management UI

17. [Calendar Import Enhancements - Phase 1.6](./step-16-calendar-import-enhancements.md) ✅ COMPLETE  
    - Smart schedule parsing (English + Hebrew)
    - Attendee import and matching
    - Notes extraction from descriptions
    - Flexible date range selection
    - Schedule and notes fields in gig forms

18. [Optional Projects for Gigs](./step-18-optional-projects-for-gigs.md) ✅ COMPLETE  
    - Made projects optional for gigs (standalone gigs)
    - Project selector in create/edit gig dialogs
    - New "All Gigs" page for managing all gigs
    - Filter by project (including "No Project")
    - Updated all views to handle nullable projects
    - Database migration for optional project_id
    - Added owner_id column for standalone gig ownership
    - Fixed RLS policies (see troubleshooting docs)

19. [**Projects as Optional Folders - Complete Refactor**](./step-19-make-projects-optional.md) ✅ COMPLETE  
    - Gig-first architecture: gigs are primary entity with direct ownership
    - Removed personal projects hack (migrated 14 gigs to standalone)
    - Updated RLS to use gig owner_id instead of project ownership
    - Changed all API queries from INNER JOIN to LEFT JOIN for projects
    - Updated dashboard, create/edit, and detail pages
    - Performance optimized with owner_id index
    - Comprehensive documentation of architecture change

## Security & Hardening

- [**Step 22: Database Function Security Hardening**](./step-22-security-function-fixes.md) ✅ COMPLETE  
  - Fixed 5 functions flagged by Supabase security linter
  - Added `search_path` protection to prevent SQL injection
  - Secured SECURITY DEFINER functions
  - Fully qualified all table names
  - Zero performance impact

- [**Step 23: RLS Performance Optimization**](./step-23-rls-performance-optimization.md) ✅ COMPLETE  
  - Fixed 51 performance warnings (43 auth_rls_initplan + 8 multiple_permissive)
  - Wrapped all auth.uid() calls in subqueries for massive performance gains
  - Consolidated duplicate RLS policies (8 → 4 on gig_files, 4 → 3 on gig_invitations)
  - 650x fewer auth function calls per page load
  - Affects 10 tables with 38 optimized policies

- [**Step 24: Foreign Key Index Optimization**](./step-24-foreign-key-indexes.md) ✅ COMPLETE  
  - Added indexes to 5 unindexed foreign keys
  - Improves JOIN, CASCADE DELETE, and referential integrity performance
  - Tables: gig_role_status_history, gig_roles, notifications (3 indexes)
  - 20x faster cascade deletes, 25x faster filtered queries
  - Documented 21 unused indexes (monitoring, not removing yet)

- [**Step 25: Pending Invitations Privacy Fix**](./step-25-pending-invitations-fix.md) ✅ COMPLETE  
  - Fixed premature gig visibility for pending invitations
  - Updated RLS policies to exclude pending roles from gigs_select
  - Added invitation_status filters across all API functions
  - Added performance index on (musician_id, invitation_status)
  - Ensured musicians only see gigs after "Invite All" is clicked

- [**Step 26: Unified Gig Ownership**](./step-26-unify-gig-ownership.md) ✅ COMPLETE  
  - Eliminated dual ownership pattern (owner_id vs project_id)
  - Created personal projects for all users
  - Migrated 18 standalone gigs to personal projects
  - Removed gigs.owner_id column entirely
  - Unified all ownership through projects.owner_id
  - 30-45% faster queries (1 query instead of 3)
  - Simplified codebase with single ownership pattern

- [**Step 19: RLS Security Fixes**](./step-19-rls-security-fix.md) ✅ COMPLETE  
  - Implemented secure helper functions (fn_is_gig_owner, fn_is_gig_musician)
  - Fixed circular dependency risks in RLS policies
  - Enforced strict role-based access for gigs, projects, roles, and files
  - Verified with `pg_policies` system table

## Maintenance & Cleanup

- [**Cleanup: November 18, 2025**](./cleanup-november-18-2025.md)
  - Removed temporary debugging files
  - Deleted redundant migration files
  - Reorganized troubleshooting documentation
  - 15 files + 1 directory removed

- [**Cleanup: November 20, 2025**](./step-27-cleanup-november-20-2025.md)
  - Comprehensive project cleanup and audit
  - Moved 4 summary files to proper documentation locations
  - Deleted temporary cleanup file
  - Updated documentation indexes
  - Ran code quality audits
  - 5 files moved/deleted, documentation organized

---

Last Updated: November 20, 2025
