# Future Enhancements

This folder contains specifications and ideas for future features that are NOT yet implemented.

## Purpose
- Document feature ideas for later implementation
- Maintain specs that require foundation work first
- Keep the main BUILD_STEPS.md focused on current work

## What Belongs Here
- Features that depend on completing core steps first
- Advanced features beyond MVP scope
- Nice-to-have enhancements
- UI/UX improvements that require significant refactoring

## What Does NOT Belong Here
- Current work in progress (use BUILD_STEPS.md)
- Bugs or fixes (use GitHub issues if applicable)
- Completed features (document in /docs/build-process/)

---

## Planned Enhancements

### 1. Multi-Step Gig Creation Wizard
**File:** `multi-step-gig-wizard.md`

**Status:** Requires Steps 5-10 completion

**Summary:** Transform single-dialog gig creation into a comprehensive 3-step wizard:
- Step 1: When & Where
- Step 2: Who & Player Info  
- Step 3: Review & Send

Focuses on player-first experience with placeholders for manager features.

**Prerequisites:**
- Step 5: GigRoles (musicians/lineup)
- Step 6: Setlist
- Step 7: Files & materials
- Step 8: Dashboard views
- Step 10: Money tracking
- Invite system (TBD)

---

### 2. Musician Contacts Database & Quick Invite
**File:** `musician-contacts-system.md`

**Status:** Light version implemented (Step 5), full version planned

**Summary:** Build a personal musician contacts database with Facebook-style autocomplete tagging:
- Database of musicians you work with
- Type-ahead search with frequency badges
- Quick add multiple musicians
- Contact management page
- Import from CSV

**Current State:**
- ✅ Light autocomplete (searches past musician names)
- ✅ Shows frequency & roles
- ✅ TanStack Query caching

**Future:**
- Full contacts table
- Manual contact management
- Link to user accounts
- Default fees & notes per contact

---

### 3. Musician Accounts & User Linking
**File:** `musician-accounts-linking.md`

**Status:** Architecture ready, requires invite system + musician dashboard

**Summary:** Bridge from text-based musicians to real user accounts:
- Musicians sign up for accounts
- Auto-link text names to user IDs
- Invite system (email/SMS)
- Musician dashboard (see their gigs)
- Confirm/decline workflow
- Gig Pack view for players

**Current State:**
- ✅ Database fields ready (`musician_id` + `musician_name`)
- ✅ Can store both text and user links
- ❌ No invite system yet
- ❌ No musician-side access yet

**Implementation Phases:**
1. Invite system (email/SMS)
2. Musician dashboard & Gig Pack
3. Auto-linking on signup
4. Advanced features (availability, subs, payments)

**Prerequisites:**
- Steps 6-10 (full gig workflow)
- Email service (SendGrid/Resend)
- SMS service (Twilio) - optional

---

### 4. Project Default Roster (Roster Automation)
**File:** `roster-automation.md`

**Status:** Saved for later, high ROI

**Summary:** Reduce friction when adding roles to gigs:
- Define default roster at project level
- Auto-populate roles when creating gig
- Copy lineup from previous gig
- Quick-add templates (trio, quartet, 5-piece)

**Benefits:**
- Set up once, use forever
- Save 80% of repetitive data entry
- Still flexible per gig

**Prerequisites:**
- Step 5: GigRoles (complete)

---

### 5. Setlist Enhancements
**File:** `setlist-enhancements.md`

**Status:** Basic setlist complete (Step 6), bulk import complete (Step 6.5), drag-and-drop complete (Step 6.6), more enhancements planned

**Summary:** Advanced features to make setlist management more powerful:
- ✅ Drag-and-drop reordering
- ✅ Bulk import from text/CSV
- Song library / templates
- Duplicate song detection
- Set sections (Opener, Main Set, Encore)
- Integration with music notation services

**Current State:**
- ✅ Basic setlist (CRUD operations)
- ✅ Song details (title, key, BPM, notes)
- ✅ Ordered display
- ✅ Bulk text import with regex parsing (Step 6.5)
- ✅ Preview/edit before importing
- ✅ Drag-and-drop reordering (Step 6.6)
- ❌ No song library yet
- ❌ No set sections yet

**Implementation Priority:**
1. Song library / templates (High)
2. Set sections (Medium)
3. Duplicate detection (Low)
4. Music notation integration (Low)

**Prerequisites:**
- Step 6: Setlist basics (complete)
- Step 6.5: Bulk import (complete)
- Step 6.6: Drag-and-drop (complete)

---

### 6. Resources - Invitee View
**File:** `resources-invitee-view.md`

**Status:** Basic resources complete (Step 7), invitee view planned

**Summary:** Provide different resource views based on user role:
- **Owners/Managers**: Full control (current - edit, delete)
- **Invitees**: Streamlined, clickable access (planned)

**Planned Behavior for Invitees:**
- Entire resource card becomes clickable link
- Opens URL directly without separate "Open" button
- Hide edit and delete buttons (not available to invitees)
- Clean, simple view for accessing materials

**Benefits:**
- Faster access for musicians
- Less clutter for read-only users
- Clear visual distinction between roles
- Better mobile UX (larger tap target)

**Prerequisites:**
- Step 7: Resources (complete)
- Step 8: Dashboard Views / Role detection (complete)
- Permission checking logic

---

### 7. Manager Money View
**File:** `manager-money-view.md`

**Status:** Player view complete (Step 10), Manager view planned

**Summary:** Comprehensive financial dashboard for project managers:
- Track client fees and revenue
- Calculate total payouts per gig
- View profit (revenue - payouts)
- Project-level financial reporting
- Payment status tracking (client payments, musician payouts)

**Benefits:**
- Complete financial visibility for managers
- Profit tracking per gig and project
- Identify unpaid clients/musicians quickly
- Data-driven decision making

**Current State:**
- ✅ Player Money View (musicians see their earnings)
- ✅ Database supports gig_roles fees, payment tracking
- ✅ Currency field on gigs table
- ❌ No client fee tracking yet
- ❌ No manager financial dashboard

**Implementation Phases:**
1. Add client_fee field to gigs
2. Build manager money API functions
3. Create manager dashboard UI
4. Add project-level financial summaries

**Prerequisites:**
- Step 10: Player Money View (complete)
- Step 5: GigRoles system (complete)

### 8. Dashboard Improvements
**File:** `dashboard-improvements.md`

**Status:** Dashboard unified view complete, improvements planned

**Summary:** Collection of 10 potential enhancements to the dashboard:
- Server-side filtering & date ranges
- Pagination/load more
- Search functionality
- Status filters
- Multiple roles display
- Recent gigs section
- Quick actions
- Statistics/summary cards
- Sort options
- View preferences persistence

**Current State:**
- ✅ Unified timeline view with role and time filters
- ✅ Grid and list views (independent per section)
- ✅ Today, This Week, Upcoming sections
- ❌ No search, pagination, or statistics yet

**Priority Recommendations:**
- Quick wins: View preferences persistence, search, status filter
- High value: Statistics cards, quick actions, server-side filtering

---

### 9. Real-Time Notifications Enhancement (Instagram-Like UX)
**File:** `real-time-notifications-enhancement.md`

**Status:** Core system complete, UX enhancements planned

**Summary:** Enhance existing real-time notifications with Instagram-like user experience:
- **Phase 1:** Toast/banner notifications (HIGH priority, 1-2 hours)
- **Phase 2:** Browser push notifications (MEDIUM priority, 4-6 hours)
- **Phase 3:** Polish - grouping, avatars, preferences (LOW priority, 3-5 hours)

**Current State:**
- ✅ Real-time updates via Supabase Realtime (WebSocket)
- ✅ Bell icon with unread badge
- ✅ Dropdown with scrollable list
- ✅ Mark as read/delete functionality
- ✅ Proper database indexes and RLS
- ❌ No toast/banner when notifications arrive
- ❌ No browser push notifications
- ❌ No sound or notification preferences

**Main Gap:**
Visual feedback when notifications arrive in real-time. Currently updates the badge silently without toasts.

**Quick Win:**
Add toast notifications with `sonner` library (1-2 hours for biggest UX impact).

**Prerequisites:**
- ✅ Notifications system (Step 19 - complete)
- Phase 2 requires HTTPS for browser push (already have for production)

---

## How to Use This Folder

1. **When adding a new enhancement:**
   - Create a detailed spec with:
     - Overview & goals
     - Prerequisites
     - Technical details
     - Acceptance criteria
     - Timeline recommendation
   - Update this README with a brief summary

2. **Before implementing:**
   - Verify all prerequisites are complete
   - Review spec for any needed updates
   - Create a plan in BUILD_STEPS.md
   - Move completed documentation to /docs/build-process/

3. **After implementation:**
   - Archive or remove the spec from this folder
   - Document the completed work in /docs/build-process/

