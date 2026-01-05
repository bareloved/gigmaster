This project will be built in **small, intentional steps**.

For each step, follow this mini-loop:

1. **Clarify**: Write 1–2 sentences: *"What am I adding right now?"*
2. **Data first**: Update Supabase schema (tables/columns/indexes).
3. **API/server next**: Route handlers or server functions.
4. **UI last**: shadcn components wired to the data.
5. **Performance check**: Are we over-fetching? Need pagination? Any N+1?
6. **Done means**: It works end-to-end, stays snappy, and is not a god-component.

---

## 🚨 CRITICAL PATTERNS TO FOLLOW (EVERY STEP!)

### **TanStack Query Cache Keys - ALWAYS Include User ID**

**Problem:** Query keys without user IDs cause cross-user cache pollution. When users switch accounts, they see the previous user's data until refresh.

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
  enabled: !!user, // Don't query until user is loaded
});
```

**When to apply:**
- Projects list
- Gigs list (if user-filtered)
- Money/payments data
- User-specific suggestions/autocomplete
- Any data that varies per user

**When NOT needed:**
- Public data (if we ever have it)
- Data scoped by ID only (e.g., single gig by gigId - RLS handles security)

### **Row Level Security (RLS) - Double Defense**

**Remember:** Query keys prevent UI bugs, but RLS prevents security breaches!

**Always verify:**
1. RLS policies are enabled on all tables
2. Policies use `auth.uid()` to filter by current user
3. Test with multiple users to confirm isolation

## Ongoing: Performance & Architecture Mindset

At every step, ask:

- Am I **fetching only what I need**?
- Is there a risk of **N+1 queries**?
- Do I need **pagination or limits** for this list?
- Should I **add an index** on this column?
- Is business logic in the **backend**, not duplicated in every component?
- Will this still be okay with **hundreds of gigs** and **many users**?

If something feels like it will get slow or messy as data grows:
- Stop and redesign **before** building on top of it.

---

# Next Steps - Future Development Roadmap

This document outlines the next 20 steps for developing the Gigging Musicians app beyond the initial 12 core steps.

**Status:** Planning Phase  
**Last Updated:** November 16, 2025

---

## Overview

After completing Steps 0-12 (core foundation, auth, projects, gigs, roles, setlist, files, dashboard, money view, gig pack, and mobile prep), these are the recommended next 20 steps to enhance the app's functionality and user experience.

This roadmap incorporates enhanced features and new ideas, fully reorganized by priority for optimal development sequence.

---

## Step 1 – Invitations & Player Confirmations System ⭐⭐⭐

**Priority:** Critical High  
**Complexity:** Medium  
**Impact:** Very High  
**Effort:** 2-3 weeks

### What

Complete end-to-end invitation flow: managers invite musicians via email, musicians accept/decline from their dashboard or Gig Pack, and can manage their own status with self-service actions.

### Why Now

- Completes the core musician workflow (currently musicians are just "invited" but can't respond)
- High user value - musicians need to confirm their availability
- Foundation for notifications and communication features
- Critical for real-world adoption

### Features

#### Email Invitation Flow
- Manager invites musician by email to a specific gig role
- System creates `gig_invitations` with magic link token
- Invitee clicks magic link → authenticates (or signs up) → invitation auto-accepts
- `gig_roles.musician_id` gets linked to the authenticated user
- Invitation expires after configurable period (e.g., 7 days)

#### Player Self-Service from Gig Pack
- Musicians can update their status directly from Gig Pack view:
  - **Confirm** attendance
  - **Decline** with optional reason
  - **Mark "Need a sub"** (flags for manager, doesn't remove player)
  - **Add personal notes** (private, player-only)
- Status changes visible immediately to managers
- Optimistic UI updates with backend sync

#### Dashboard Actions
- "As Player" view shows invitation status per gig
- Quick action buttons: Accept, Decline, Tentative
- Bulk accept/decline for multiple invitations
- Filter by status (pending, accepted, declined)

#### Workflow Management
- When musician declines → auto-mark role as `needs_sub`
- Notify manager of status changes
- Prevent accepting conflicting gigs (same date/time)
- Status change history/audit log

### Database Changes

```sql
-- Invitation flow
CREATE TABLE gig_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend gig_roles
ALTER TABLE gig_roles ADD COLUMN musician_id UUID REFERENCES auth.users(id);
ALTER TABLE gig_roles ADD COLUMN player_notes TEXT; -- Private notes for player
ALTER TABLE gig_roles ADD COLUMN status_changed_at TIMESTAMPTZ;
ALTER TABLE gig_roles ADD COLUMN status_changed_by UUID REFERENCES auth.users(id);

-- Status change history (optional)
CREATE TABLE gig_role_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_gig_invitations_token ON gig_invitations(token);
CREATE INDEX idx_gig_roles_musician_status ON gig_roles(musician_id, invitation_status);
```

### API Functions

```typescript
// lib/api/gig-invitations.ts
export async function inviteMusicianByEmail(
  gigRoleId: string,
  email: string
): Promise<void>;

export async function acceptInvitation(token: string): Promise<void>;
export async function declineInvitation(token: string, reason?: string): Promise<void>;

// lib/api/gig-roles.ts
export async function updateMyInvitationStatus(
  roleId: string,
  status: 'accepted' | 'declined' | 'tentative' | 'needs_sub',
  notes?: string
): Promise<void>;

export async function updateMyPlayerNotes(
  roleId: string,
  notes: string
): Promise<void>;

export async function getMyPendingInvitations(userId: string): Promise<GigRole[]>;
export async function acceptMultipleInvitations(roleIds: string[]): Promise<void>;
```

### UI Components

- `components/invite-musician-dialog.tsx` - Email invitation form
- `components/player-status-actions.tsx` - Confirm/decline buttons for Gig Pack
- `components/player-notes-section.tsx` - Private notes textarea
- Update `dashboard-gig-item.tsx` with quick action buttons
- Update `gig-pack/page.tsx` with self-service controls

### Performance & Security

- Index on `gig_roles(musician_id, invitation_status)` for fast queries
- RLS: Musicians can only update their own role status
- Managers can override any status
- Prevent status changes for past gigs
- Token expiration cleanup job

---

## Step 2 – Manager Money View + Client Tracking & CRM ⭐⭐⭐

**Priority:** Critical High  
**Complexity:** Medium-High  
**Impact:** Very High  
**Effort:** 2-3 weeks

### What

Complete financial management for managers: track client fees vs musician payouts, manage client relationships, and generate profit reports per gig/project/client.

### Why Now

- Step 10 is half-done (player view complete)
- Critical for MDs and agencies to understand their business
- Enables invoicing, profit tracking, and client management
- All data structure mostly ready

### Features

#### Client Management
- `clients` table: store client contact info, notes
- Assign client to each gig
- Client detail page showing:
  - Contact information (name, email, phone)
  - Gig history with dates and fees
  - Total revenue from client
  - Number of gigs
  - Latest gig date

#### Manager Money Summary
- Total revenue (sum of client fees)
- Total payouts (sum of musician fees)
- Total profit (revenue - payouts)
- Number of gigs managed
- Average profit per gig
- Unpaid invoices count

#### Per-Gig Financial View
- Client fee input field
- Client payment status (unpaid, partial, paid)
- Invoice number and payment due date
- List of musician payouts for this gig
- Total payout calculation
- Profit margin display (client fee - total payouts)

#### Per-Project & Per-Client Summaries
- Filter money view by project or client
- Project-level financial summaries
- Client-level revenue tracking
- Revenue/profit trends over time
- Top/bottom performing projects and clients

#### Multi-Currency Support
- Store currency per gig
- Display amounts in original currency
- Optional: Currency conversion with rates API
- Summary totals in user's primary currency preference

### Database Changes

```sql
-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend gigs table
ALTER TABLE gigs ADD COLUMN client_id UUID REFERENCES clients(id);
ALTER TABLE gigs ADD COLUMN client_fee DECIMAL(10,2);
ALTER TABLE gigs ADD COLUMN client_payment_status TEXT DEFAULT 'unpaid' 
  CHECK (client_payment_status IN ('unpaid', 'partial', 'paid'));
ALTER TABLE gigs ADD COLUMN client_paid_at TIMESTAMPTZ;
ALTER TABLE gigs ADD COLUMN invoice_number TEXT;
ALTER TABLE gigs ADD COLUMN payment_due_date DATE;

CREATE INDEX idx_clients_owner ON clients(owner_id);
CREATE INDEX idx_gigs_client ON gigs(client_id);
CREATE INDEX idx_gigs_payment_status ON gigs(client_payment_status);
```

### API Functions

```typescript
// lib/api/clients.ts
export interface Client {
  id: string;
  ownerId: string;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
}

export async function listMyClients(userId: string): Promise<Client[]>;
export async function getClient(clientId: string): Promise<Client>;
export async function createClient(data: ClientInsert): Promise<Client>;
export async function updateClient(clientId: string, data: ClientUpdate): Promise<Client>;
export async function deleteClient(clientId: string): Promise<void>;
export async function getClientGigs(clientId: string): Promise<Gig[]>;
export async function getClientStats(clientId: string): Promise<{
  gigCount: number;
  totalRevenue: number;
  latestGigDate: string | null;
}>;

// lib/api/manager-money.ts
export interface ManagerMoneySummary {
  totalRevenue: number;
  totalPayouts: number;
  totalProfit: number;
  gigCount: number;
  unpaidInvoices: number;
  currency: string;
}

export interface ManagerMoneyGig {
  id: string;
  date: string;
  title: string;
  projectName: string;
  clientName: string | null;
  clientFee: number | null;
  totalPayouts: number;
  profit: number;
  clientPaymentStatus: string;
  currency: string;
}

export async function getManagerMoneySummary(
  userId: string,
  filters?: {
    projectId?: string;
    clientId?: string;
    dateRange?: { from: string; to: string };
  }
): Promise<ManagerMoneySummary>;

export async function getManagerMoneyGigs(
  userId: string,
  filters?: {
    projectId?: string;
    clientId?: string;
    dateRange?: { from: string; to: string };
    paymentStatus?: string;
  },
  limit?: number
): Promise<ManagerMoneyGig[]>;

export async function updateGigFinancials(
  gigId: string,
  data: {
    clientId?: string;
    clientFee?: number;
    clientPaymentStatus?: string;
    invoiceNumber?: string;
    paymentDueDate?: string;
  }
): Promise<void>;
```

### UI Components

- `/app/(app)/clients/page.tsx` - Client list with stats
- `/app/(app)/clients/[id]/page.tsx` - Client detail with gig history
- `components/add-client-dialog.tsx` - Create/edit client
- `components/manager-money-summary.tsx` - Summary cards
- `components/manager-money-table.tsx` - Gigs table with financials
- `components/gig-financials-dialog.tsx` - Edit client fee and payment status
- Update `/app/(app)/money/page.tsx` to implement Manager tab

### Performance

- Index on `gigs.client_payment_status` and `gigs.date`
- Aggregate calculations done in database queries
- Same caching strategies as Player view
- Pagination for large client lists

### Related Documentation

See `docs/future-enhancements/manager-money-view.md` for detailed specification.

---

## Step 3 – Notifications System + Email Digests ⭐⭐⭐

**Priority:** Critical High  
**Complexity:** Medium  
**Impact:** High  
**Effort:** 2 weeks

### What

Real-time in-app notifications and email digests for important events, keeping users informed without constant app checking.

### Why Now

- Foundation for user engagement and retention
- Critical for Step 1 (invitation responses)
- Reduces friction in communication workflow
- Industry standard for modern apps

### Features

#### Notification Types
- **Invitation received** - New gig role assigned
- **Status changed** - Someone accepted/declined
- **Payment received** - Role marked as paid
- **Gig updated** - Date, time, location changed
- **Gig cancelled** - Gig deleted or cancelled
- **Sub needed** - Someone declined, need replacement
- **Reminder** - Gig tomorrow, 1 week before, etc.

#### In-App Notifications
- Bell icon in header with unread count badge
- Dropdown panel showing recent notifications
- Mark as read/unread
- Mark all as read
- Delete notification
- Click notification → navigate to relevant page
- Empty state when no notifications

#### Email Digests
- Daily or weekly email summary of unread notifications
- Grouped by type (invitations, updates, payments)
- Direct links to relevant pages in app
- Unsubscribe and frequency preferences

#### Notification Preferences
- User settings page section
- Toggle each notification type on/off (separate for in-app vs email)
- Email digest frequency (immediate, daily, weekly, off)
- Quiet hours for email notifications

### Database Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  gig_role_id UUID REFERENCES gig_roles(id) ON DELETE CASCADE
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email_invitations BOOLEAN DEFAULT TRUE,
  email_status_changes BOOLEAN DEFAULT TRUE,
  email_payments BOOLEAN DEFAULT TRUE,
  email_gig_updates BOOLEAN DEFAULT TRUE,
  email_reminders BOOLEAN DEFAULT TRUE,
  email_digest_frequency TEXT DEFAULT 'daily' CHECK (email_digest_frequency IN ('immediate', 'daily', 'weekly', 'off')),
  in_app_invitations BOOLEAN DEFAULT TRUE,
  in_app_status_changes BOOLEAN DEFAULT TRUE,
  in_app_payments BOOLEAN DEFAULT TRUE,
  in_app_gig_updates BOOLEAN DEFAULT TRUE,
  in_app_reminders BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_read ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### API Functions

```typescript
// lib/api/notifications.ts
export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function getMyNotifications(userId: string, limit?: number): Promise<Notification[]>;
export async function getUnreadCount(userId: string): Promise<number>;
export async function markAsRead(notificationId: string): Promise<void>;
export async function markAllAsRead(userId: string): Promise<void>;
export async function deleteNotification(notificationId: string): Promise<void>;
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message?: string;
  linkUrl?: string;
  gigId?: string;
  projectId?: string;
}): Promise<void>;

// Trigger notifications from relevant actions
export async function notifyInvitation(gigRoleId: string): Promise<void>;
export async function notifyStatusChange(gigRoleId: string): Promise<void>;
export async function notifyGigUpdate(gigId: string): Promise<void>;
```

### Implementation

- Use Supabase Realtime for live updates
- Trigger notifications from relevant API functions
- Background job for email digest generation (Supabase Functions + cron)
- Auto-delete old read notifications (90 days)

### UI Components

- `components/notifications-dropdown.tsx` - Header bell with dropdown
- `components/notification-item.tsx` - Single notification display
- `/app/(app)/settings/notifications/page.tsx` - Preferences page

### Performance

- Limit query to recent notifications (last 30 days)
- Pagination for notification list
- Index on `user_id` and `read_at`
- Real-time subscription only for current user

---

## Step 4 – Search & Filtering ⭐⭐

**Priority:** High  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

Quick search and comprehensive filtering across all major views (dashboard, projects, money, gig detail).

### Why Now

- As data grows (100+ gigs), users need quick ways to find items
- Low complexity, high user satisfaction
- Improves UX across the entire app
- Foundation for future advanced search

### Features

#### Dashboard Search
- Filter "As Player" gigs by:
  - Date range (from/to)
  - Project
  - Status (invited, accepted, declined)
  - Search by gig title or location
- Filter "As Manager" gigs by:
  - Date range
  - Project
  - Client
  - Status (draft, confirmed, completed, cancelled)
  - Search by gig title or client name

#### Projects Page
- Search by project name
- Filter by active/archived status
- Sort by: name, created date, upcoming gigs count

#### Gig Detail - People Section
- Filter roles by status (invited, accepted, declined, needs_sub)
- Filter by role type (keys, drums, vocals, etc.)
- Search by musician name

#### Money Page
- Filter by date range, project, client
- Payment status filter (paid/unpaid/partial)
- Search by gig title
- Export filtered results as CSV

#### Clients Page
- Search by client name
- Sort by: name, gig count, total revenue, latest gig date

### Implementation

Use URL query parameters for shareable filtered views:

```
/dashboard?view=player&status=invited&project=abc123
/money?from=2024-01-01&to=2024-12-31&client=xyz789
/projects?search=wedding&archived=false
```

### API Updates

Add filtering parameters to existing functions:

```typescript
// lib/api/gigs.ts
export async function listGigsAsPlayer(
  userId: string,
  filters?: {
    projectId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
): Promise<Gig[]>;

// Similar for listGigsAsManager, listUserProjects, etc.
```

### UI Components

- `components/search-filter-bar.tsx` - Reusable filter component
- `components/date-range-picker.tsx` - Date range selector (shadcn Calendar)
- `components/project-select.tsx` - Project dropdown filter
- `components/client-select.tsx` - Client dropdown filter
- Debounced search inputs (300ms delay)
- "Clear filters" button
- Active filter count badge

### Performance

- Database-level filtering with WHERE clauses
- Add full-text search indexes for text fields
- Debounce search inputs to reduce queries
- Cache filter results with TanStack Query

---

## Step 5 – Gig Templates & Duplicate 🆕 ⭐⭐

**Priority:** High  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

Quickly reuse existing gigs as templates or duplicate them for new dates, saving time for recurring formats.

### Why Now

- Common use case: residencies, regular gigs with same lineup/setlist
- Low implementation complexity
- High time-saving value for users
- Natural extension of existing gig system

### Features

#### Duplicate Gig
- Take any existing gig and create a copy
- Copies:
  - Gig details (title, location, notes)
  - All gig roles (without invitation states)
  - Full setlist
  - File/resource references
- User selects new date/time
- Option to duplicate from gig detail page or gigs list

#### Save as Template (Optional)
- Mark gig as `is_template = true`
- Templates don't show in normal gig lists
- "Create gig from template" workflow
- Template library page showing all saved templates

#### Smart Defaults
- New gig starts in "draft" status
- Invitations are NOT copied (must re-invite)
- Dates/times must be manually set

### Database Changes

```sql
-- Optional: Template flag
ALTER TABLE gigs ADD COLUMN is_template BOOLEAN DEFAULT FALSE;

-- No other schema changes needed
```

### API Functions

```typescript
// lib/api/gigs.ts
export async function duplicateGig(
  gigId: string,
  newDate: string,
  newStartTime?: string,
  newEndTime?: string
): Promise<Gig>;

export async function saveGigAsTemplate(gigId: string, templateName: string): Promise<Gig>;
export async function createGigFromTemplate(templateId: string, date: string): Promise<Gig>;
export async function listMyTemplates(userId: string): Promise<Gig[]>;
```

### UI Components

- Add "Duplicate" action to gig detail page dropdown menu
- Add "Duplicate" to gig list item context menu
- `components/duplicate-gig-dialog.tsx` - Date/time picker for duplicated gig
- Optional: `/app/(app)/templates/page.tsx` - Template library

### Implementation Notes

- Use database transactions to ensure atomic duplication
- Batch insert for roles, setlist items, files
- Show success toast with link to new gig

---

## Step 6 – Mobile Companion App (Expo) ⭐⭐⭐

**Priority:** High  
**Complexity:** High  
**Impact:** Very High  
**Effort:** 6-8 weeks

### What

React Native mobile app for iOS and Android using Expo, optimized for musicians on the go.

### Why Now

- **All backend prep is complete** (Step 12)
- Mobile is critical for musicians on the go
- Can reuse all API functions and types
- High user demand
- Competitive advantage

### Features

See `docs/mobile-integration-guide.md` for complete implementation guide.

#### MVP Features (Weeks 1-4)
- **Authentication** - Email/password sign in
- **Dashboard** - "My Gigs" list (as player)
- **Gig Pack** - Mobile-optimized gig detail view
- **Setlist** - View songs, keys, BPM
- **Resources** - Access files/links
- **Lineup** - See who's playing

#### V2 Features (Weeks 5-6)
- **Quick actions** - Accept/decline invitations inline
- **Push notifications** - For invitations and updates
- **Calendar view** - Month/week view of gigs
- **Money tracking** - Payment status
- **Maps integration** - Directions to venue

#### V3 Features (Weeks 7-8)
- **Offline mode** - Cache recent gigs
- **Status updates** - Change availability from phone
- **Notes** - Add per-gig notes
- **Stage View** - Full-screen setlist display

### Technical Stack

- **Framework:** Expo (React Native)
- **Language:** TypeScript
- **Database:** Supabase (same project as web)
- **State:** TanStack Query
- **Navigation:** React Navigation
- **UI:** NativeWind (Tailwind for React Native)

### Shared Code

Mobile-ready modules (can be copied directly):
- `/lib/api/*` - All API functions
- `/lib/types/*` - All TypeScript types
- `/lib/utils/*` - All utility functions

Web-only modules (need mobile equivalents):
- `/lib/providers/*` - Adapt for React Native
- `/lib/supabase/client.ts` - Replace with RN client

### Resources

- Full guide: `/docs/mobile-integration-guide.md`
- Supabase RN setup: `/lib/supabase/CLIENTS_GUIDE.md`
- Code structure: `/lib/README.md`

---

## Step 7 – Onboarding & Sample Data 🆕 ⭐⭐

**Priority:** Medium-High  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

First-time user wizard with sample data to instantly demonstrate app value and guide new users.

### Why Now

- Reduces friction for new users
- Demonstrates app capabilities without manual setup
- Improves conversion from signup to active use
- Sets user preferences early (role, currency, etc.)

### Features

#### Onboarding Wizard (3 Screens)
1. **Welcome & Role Selection**
   - "I'm mostly a player" / "I'm mostly a manager" / "Both"
   - Sets initial dashboard defaults
2. **Preferences**
   - Default currency selection
   - Timezone
   - Main instrument (for players)
3. **Sample Data Option**
   - "Add sample data to explore" OR "Start from scratch"
   - Clearly labeled as "Sample" to avoid confusion

#### Sample Data Generator
Creates for new user:
- 1 sample project: "Sample Band Project"
- 2 sample gigs:
  - 1 past gig (completed, with payment)
  - 1 upcoming gig (with lineup, setlist, files)
- Example lineup with role assignments
- Example setlist (5-6 songs with keys/BPM)
- Example file resources (URL links)
- Marked with `is_sample = true` flag

#### Sample Data Management
- Banner on dashboard: "This is sample data. You can delete it anytime."
- Quick action: "Delete all sample data"
- Sample projects clearly labeled in UI

### Database Changes

```sql
-- Track onboarding completion
ALTER TABLE profiles ADD COLUMN has_completed_onboarding BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN primary_role TEXT CHECK (primary_role IN ('player', 'manager', 'both'));

-- Flag sample data
ALTER TABLE projects ADD COLUMN is_sample BOOLEAN DEFAULT FALSE;
ALTER TABLE gigs ADD COLUMN is_sample BOOLEAN DEFAULT FALSE;
```

### API Functions

```typescript
// lib/api/onboarding.ts
export async function completeOnboarding(
  userId: string,
  data: {
    primaryRole: 'player' | 'manager' | 'both';
    currency: string;
    mainInstrument?: string;
    createSampleData: boolean;
  }
): Promise<void>;

export async function createSampleData(userId: string): Promise<void>;
export async function deleteSampleData(userId: string): Promise<void>;
```

### UI Components

- `/app/onboarding/page.tsx` - Multi-step wizard
- `components/onboarding-welcome.tsx` - Step 1
- `components/onboarding-preferences.tsx` - Step 2
- `components/onboarding-sample-data.tsx` - Step 3
- `components/sample-data-banner.tsx` - Dashboard banner
- Progress indicator at top

### Implementation Notes

- Show wizard only if `has_completed_onboarding = false`
- Use transactions for sample data creation
- Sample data labeled clearly in UI (badge, color)

---

## Step 8 – Calendar Integration + ICS Feed ⭐⭐

**Priority:** Medium-High  
**Complexity:** Medium-High  
**Impact:** High  
**Effort:** 2-3 weeks

### What

Sync gigs with external calendars via personal ICS feed and in-app calendar view, with optional OAuth for advanced sync.

### Why Now

- Musicians already use calendars extensively
- Meet users where they are
- Two-phase approach: Simple ICS first, OAuth later
- Reduces manual data entry

### Features

#### Phase 1: ICS Feed (MVP)
- Personal ICS feed endpoint: `/api/calendar.ics?token=USER_TOKEN`
- Each gig becomes calendar event with:
  - Title: `[Project Name] Gig Title`
  - Start/end times from gig
  - Location from gig
  - Description with link to Gig Pack
- User-specific secret token (regenerable)
- Subscribe in Google Calendar, Apple Calendar, Outlook

#### In-App Calendar View
- `/calendar` page with month/week/list views
- Shows all user's gigs (as player + as manager)
- Color coded by project
- Click gig → navigate to gig detail
- Filter: All | As Player | As Manager

#### Phase 2: Google Calendar OAuth (Optional)
- OAuth connection to Google Calendar
- Two-way sync:
  - Create gig → auto-create calendar event
  - Update gig → update calendar event
  - Delete gig → delete calendar event
- Import calendar events → create draft gigs

#### Conflict Detection
- Warn when accepting gig that conflicts with existing gig
- Highlight conflicting dates in calendar view
- Check musician availability before inviting

### Database Schema

```sql
-- User calendar settings
ALTER TABLE profiles ADD COLUMN calendar_ics_token TEXT UNIQUE;

-- Calendar connections (OAuth, Phase 2)
CREATE TABLE calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_calendar_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_calendar_id)
);

CREATE TABLE calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES calendar_connections(id) ON DELETE CASCADE,
  gig_id UUID REFERENCES gigs(id) ON DELETE SET NULL,
  external_event_id TEXT,
  sync_direction TEXT,
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Functions

```typescript
// lib/api/calendar.ts
export async function generateICSToken(userId: string): Promise<string>;
export async function regenerateICSToken(userId: string): Promise<string>;
export async function generateICSFeed(userId: string): Promise<string>; // ICS format

// Phase 2: OAuth
export async function connectGoogleCalendar(userId: string, authCode: string): Promise<void>;
export async function disconnectCalendar(connectionId: string): Promise<void>;
export async function syncGigToCalendar(gigId: string, connectionId: string): Promise<void>;
export async function checkGigConflicts(
  userId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<Gig[]>;
```

### UI Components

- `/app/(app)/calendar/page.tsx` - Calendar view (use FullCalendar library)
- `/app/(app)/settings/calendar/page.tsx` - Settings and ICS URL
- `components/calendar-sync-setup.tsx` - Instructions for subscribing ICS
- `components/conflict-warning-dialog.tsx` - Warn on date conflicts

### Implementation

- ICS generation using `ics` library
- Calendar view using `FullCalendar` or `react-big-calendar`
- Background sync job for OAuth (Phase 2)
- Cache calendar data with TanStack Query

---

## Step 9 – Gig Notes & Checklists 🆕 ⭐⭐

**Priority:** Medium-High  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

Structured notes and simple checklists for each gig, supporting both manager-only and band-visible visibility.

### Why Now

- Common need: parking instructions, backline requirements, dress code
- Lightweight feature with high practical value
- Reduces reliance on external note-taking apps
- Natural extension of gig detail page

### Features

#### Gig Notes
- Add multiple notes per gig
- Each note has:
  - Author
  - Timestamp
  - Content (markdown support optional)
  - Visibility: `manager_only` or `band` (visible to all musicians)
- Manager can toggle visibility per note
- Band-visible notes appear in Gig Pack

#### Gig Checklists
- Simple todo items per gig
- Each item has:
  - Label (e.g., "Bring subkick", "Print charts")
  - Completion status (checked/unchecked)
  - Optional: Assign to specific role (e.g., "Drummer brings snare")
- Anyone can check off items
- Visible to all band members

### Database Changes

```sql
CREATE TABLE gig_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  visibility TEXT DEFAULT 'band' CHECK (visibility IN ('manager_only', 'band')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gig_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_done BOOLEAN DEFAULT FALSE,
  assigned_role_id UUID REFERENCES gig_roles(id),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gig_notes_gig ON gig_notes(gig_id);
CREATE INDEX idx_gig_checklist_gig ON gig_checklist_items(gig_id);
```

### API Functions

```typescript
// lib/api/gig-notes.ts
export interface GigNote {
  id: string;
  gigId: string;
  authorId: string;
  authorName: string;
  content: string;
  visibility: 'manager_only' | 'band';
  createdAt: string;
  updatedAt: string;
}

export async function listGigNotes(gigId: string, userRole: 'manager' | 'player'): Promise<GigNote[]>;
export async function createGigNote(gigId: string, content: string, visibility: string): Promise<GigNote>;
export async function updateGigNote(noteId: string, data: { content?: string; visibility?: string }): Promise<void>;
export async function deleteGigNote(noteId: string): Promise<void>;

// lib/api/gig-checklist.ts
export interface ChecklistItem {
  id: string;
  gigId: string;
  label: string;
  isDone: boolean;
  assignedRoleId: string | null;
  position: number;
}

export async function listChecklistItems(gigId: string): Promise<ChecklistItem[]>;
export async function createChecklistItem(gigId: string, label: string, assignedRoleId?: string): Promise<ChecklistItem>;
export async function toggleChecklistItem(itemId: string): Promise<void>;
export async function deleteChecklistItem(itemId: string): Promise<void>;
```

### UI Components

- `components/gig-notes-section.tsx` - Notes list + add new note
- `components/gig-note-item.tsx` - Single note with visibility toggle
- `components/gig-checklist-section.tsx` - Checklist with checkboxes
- Add sections to gig detail page
- Show band-visible notes/checklist in Gig Pack

### Implementation Notes

- Simple textarea for note content (markdown optional for future)
- Inline "Add item" for checklist
- Optimistic updates for checkbox toggles

---

## Step 10 – Travel & Logistics Block 🆕 ⭐⭐

**Priority:** Medium-High  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

Structured fields for call time, meeting spot, parking, dress code, and simple ride-sharing coordination.

### Why Now

- Common pain point: "Where do we meet? What time? Where do I park?"
- Reduces WhatsApp chaos
- Low implementation complexity
- High practical value for live gigs

### Features

#### Logistics Fields
- **Call time** - When to arrive (separate from show time)
- **Meeting point** - Where to meet before entering venue
- **Parking info** - Instructions and location
- **Load-in instructions** - Access codes, loading dock info, etc.
- **Dress code** - What to wear

#### Ride Sharing (MVP)
Simple ride coordination:
- Drivers can volunteer with number of available seats
- Musicians can mark "Need a ride"
- See list of available rides and who needs one
- Optional notes (e.g., "Leaving from downtown")

### Database Changes

```sql
-- Extend gigs table
ALTER TABLE gigs ADD COLUMN call_time TIME;
ALTER TABLE gigs ADD COLUMN meeting_point TEXT;
ALTER TABLE gigs ADD COLUMN parking_info TEXT;
ALTER TABLE gigs ADD COLUMN load_in_instructions TEXT;
ALTER TABLE gigs ADD COLUMN dress_code TEXT;

-- Simple ride sharing (optional)
CREATE TABLE gig_rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id),
  seats_available INTEGER NOT NULL,
  note TEXT,
  passengers JSONB DEFAULT '[]', -- Array of user IDs
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Functions

```typescript
// lib/api/gigs.ts (extend existing)
// Add logistics fields to Gig interface and update functions

// lib/api/gig-rides.ts
export interface GigRide {
  id: string;
  gigId: string;
  driverId: string;
  driverName: string;
  seatsAvailable: number;
  note: string | null;
  passengers: string[]; // User IDs
}

export async function listGigRides(gigId: string): Promise<GigRide[]>;
export async function offerRide(gigId: string, seats: number, note?: string): Promise<GigRide>;
export async function joinRide(rideId: string): Promise<void>;
export async function leaveRide(rideId: string): Promise<void>;
export async function cancelRide(rideId: string): Promise<void>;
```

### UI Components

- Add logistics section to gig detail page
- `components/gig-logistics-section.tsx` - Display and edit logistics
- `components/gig-rides-section.tsx` - Ride sharing UI
- Show logistics prominently in Gig Pack
- Link meeting point to Google Maps if address-like

### Implementation Notes

- Keep ride sharing simple (no complex matching algorithms)
- Show logistics clearly on mobile (Gig Pack)
- Consider adding logistics to gig duplicate/template

---

## Step 11 – Companies/Organizations & Multi-Admin ⭐⭐

**Priority:** Medium  
**Complexity:** High  
**Impact:** Medium (High for agencies)  
**Effort:** 3-4 weeks

### What

Add "Company" entity for agencies managing multiple projects/bands, with role-based access control for multiple admins.

### Why Now

- Mentioned in original vision (personas: company/agency)
- Enables app to scale beyond solo MDs
- Natural hierarchy: Company → Projects → Gigs
- Important for targeting agencies as customers

### Features

#### Company Management
- Create/edit/delete companies
- Company settings: name, logo, description
- Invite users to company via email
- Assign roles: admin, manager, musician
- Company-level dashboard showing all projects and gigs

#### Role-Based Access Control
- **Company Admin** - Full control over company, projects, gigs, finances
- **Project Manager** - Can manage assigned projects only
- **Musician** - Can view projects they're invited to
- Permissions enforced via RLS policies

#### Company Dashboard
- Overview of all projects under company
- All upcoming gigs across all projects
- Company-wide financial statistics
- Team members list with roles
- Company settings and branding

#### Project-Company Linking
- Optional `company_id` on projects
- Projects can exist without a company (solo MDs)
- "Switch Company" context in header for multi-company users
- Filter dashboard by company

### Database Schema

```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE company_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'musician')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id);

CREATE INDEX idx_company_members_company ON company_members(company_id);
CREATE INDEX idx_company_members_user ON company_members(user_id);
CREATE INDEX idx_projects_company ON projects(company_id);
```

### API Functions

```typescript
// lib/api/companies.ts
export async function listMyCompanies(userId: string): Promise<Company[]>;
export async function getCompany(companyId: string): Promise<Company>;
export async function createCompany(data: CompanyInsert): Promise<Company>;
export async function updateCompany(companyId: string, data: CompanyUpdate): Promise<Company>;
export async function deleteCompany(companyId: string): Promise<void>;
export async function addCompanyMember(companyId: string, userId: string, role: string): Promise<void>;
export async function removeCompanyMember(companyId: string, userId: string): Promise<void>;
export async function getCompanyMembers(companyId: string): Promise<CompanyMember[]>;
export async function getCompanyProjects(companyId: string): Promise<Project[]>;
```

### UI Components

- `/app/(app)/companies/page.tsx` - Company list
- `/app/(app)/companies/[id]/page.tsx` - Company detail with tabs (Projects, Team, Settings)
- `components/company-switcher.tsx` - Header dropdown
- Add "Company" field to Create/Edit Project dialog

### RLS Policies

```sql
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Company admins can update"
  ON companies FOR UPDATE
  USING (id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));
```

---

## Step 12 – Sub/Dep Pool & "Need a Sub" Flow 🆕 ⭐⭐

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Medium  
**Effort:** 2 weeks

### What

Help managers handle deps/subs smoothly with a trusted musician pool and streamlined "need a sub" workflow.

### Why Now

- Common real-world scenario: musician can't make it
- Reduces friction in finding replacements
- Natural extension of gig roles system
- Builds on invitation system (Step 1)

### Features

#### Trusted Pool
- Per-project or user-level pool of trusted musicians
- Store musician profiles with:
  - Primary instrument
  - Other instruments
  - Location/region
  - Contact info
- Quick-add musicians to pool from past gigs

#### "Need a Sub" Flow
1. Player marks role as "Need a sub" from Gig Pack
2. Updates `gig_roles.player_status = needs_sub`
3. Notifies manager automatically
4. Manager sees:
   - Alert banner on gig detail
   - "Suggested subs" list based on:
     - Same instrument/role
     - Same project history
     - Location (optional)
5. Manager clicks "Invite" on suggested sub
6. Normal invitation flow kicks in

#### Dep History
- Track which deps have subbed for which gigs
- Build reliability scoring (future)
- See musician's gig history with this project

### Database Changes

```sql
-- Extend profiles
ALTER TABLE profiles ADD COLUMN primary_instrument TEXT;
ALTER TABLE profiles ADD COLUMN other_instruments TEXT[]; -- Array
ALTER TABLE profiles ADD COLUMN home_city TEXT;

-- Trusted musician pool
CREATE TABLE project_musicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  musician_id UUID NOT NULL REFERENCES auth.users(id),
  instruments TEXT[], -- What they play
  notes TEXT,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, musician_id)
);

-- Track player status includes 'needs_sub'
-- Already in gig_roles.player_status from Step 1
```

### API Functions

```typescript
// lib/api/project-musicians.ts
export interface ProjectMusician {
  id: string;
  projectId: string;
  musicianId: string;
  musicianName: string;
  instruments: string[];
  notes: string | null;
}

export async function listProjectMusicians(projectId: string): Promise<ProjectMusician[]>;
export async function addMusicianToPool(projectId: string, musicianId: string, instruments: string[]): Promise<void>;
export async function removeMusicianFromPool(poolId: string): Promise<void>;

// lib/api/gig-roles.ts (extend)
export async function getSuggestedSubs(
  gigRoleId: string,
  filters?: {
    instrument?: string;
    location?: string;
  }
): Promise<ProjectMusician[]>;
```

### UI Components

- `/app/(app)/projects/[id]/musicians/page.tsx` - Trusted pool management
- `components/add-to-pool-dialog.tsx` - Add musician to trusted pool
- `components/suggested-subs-dialog.tsx` - Show suggested replacements
- Alert banner on gig detail when someone needs sub
- "Need a Sub" button in Gig Pack (player view)

### Implementation Notes

- Suggest based on past gigs with same project
- Allow quick-add from previous gig lineups
- Consider adding "Availability" status for deps (future)

---

## Step 13 – Export Gig PDF & CSV 🆕 ⭐

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Medium  
**Effort:** 1-2 weeks

### What

Export gig details as printable/shareable PDF and financial data as CSV for accountants.

### Why Now

- Common requests: venue techs want gig sheets, accountants need data
- Relatively straightforward implementation
- Professional polish for app
- Enables offline/printed workflows

### Features

#### Gig PDF Export
Two versions:
1. **Band Version** (for musicians/venue)
   - Gig info, logistics, lineup, setlist
   - No money/client details
   - Clean, printable format
2. **Manager Version** (for internal use)
   - Everything from band version
   - Plus: client info, fees, payouts, profit

#### PDF Content
- Gig title, date, time, location
- Project/band name and logo
- Full lineup with roles
- Complete setlist with keys/BPM
- Logistics (call time, parking, dress code)
- Notes (band-visible only for band version)
- QR code linking to Gig Pack (optional)

#### Money CSV Export
From Money page:
- Select date range
- Export filtered gigs
- Columns:
  - Date, Project, Gig Title, Client, Client Fee, Total Payouts, Profit, Payment Status, Currency

### API Functions

```typescript
// lib/api/gig-export.ts
export async function generateGigPDF(
  gigId: string,
  version: 'band' | 'manager'
): Promise<string>; // Returns PDF URL or blob

export async function generateMoneyCSV(
  userId: string,
  filters?: {
    dateFrom?: string;
    dateTo?: string;
    projectId?: string;
    clientId?: string;
  }
): Promise<string>; // Returns CSV content
```

### Implementation

- Use `jsPDF` or `react-pdf` for PDF generation
- Server-side generation for better performance
- Store generated PDFs temporarily in Supabase Storage
- CSV generation can be client-side

### UI Components

- Add "Export" dropdown to gig detail page header
  - Options: "Band PDF", "Manager PDF"
- Add "Export CSV" button to Money page
- `components/export-gig-pdf-dialog.tsx` - PDF options (optional)
- Show loading state during generation

---

## Step 14 – Recurring Gigs & Series 🆕 ⭐

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Medium  
**Effort:** 2 weeks

### What

Handle residencies and repeating events via gig series, automatically generating future gig instances.

### Why Now

- Common use case: weekly residencies, monthly shows
- Saves massive time for regular gigs
- Natural extension of gig templates
- Addresses feedback from gigging musicians

### Features

#### Series Creation
- From existing gig: "Create series from this gig"
- Define pattern:
  - Weekly (specify day of week)
  - Monthly (specify day of month or week)
  - Custom interval
- Set start date and optional end date
- System auto-generates future gig instances

#### Series Management
- Each generated gig is normal gig but linked to series
- Edit single gig → doesn't affect series
- Edit series → option to update all future gigs
- Delete series → option to delete all future gigs
- View all gigs in a series

#### Series Display
- Gigs list shows series badge/label
- "View series" link to see all instances
- Series overview page with all gig dates

### Database Changes

```sql
CREATE TABLE gig_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  pattern TEXT NOT NULL, -- 'weekly', 'monthly', 'custom'
  day_of_week INTEGER, -- 0-6 for weekly
  interval INTEGER DEFAULT 1, -- Every N weeks/months
  start_date DATE NOT NULL,
  end_date DATE, -- Nullable for ongoing
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gigs ADD COLUMN series_id UUID REFERENCES gig_series(id);

CREATE INDEX idx_gig_series_project ON gig_series(project_id);
CREATE INDEX idx_gigs_series ON gigs(series_id);
```

### API Functions

```typescript
// lib/api/gig-series.ts
export interface GigSeries {
  id: string;
  projectId: string;
  name: string;
  pattern: 'weekly' | 'monthly' | 'custom';
  dayOfWeek: number | null;
  interval: number;
  startDate: string;
  endDate: string | null;
}

export async function createGigSeries(
  gigId: string, // Template gig
  pattern: string,
  options: {
    dayOfWeek?: number;
    interval?: number;
    startDate: string;
    endDate?: string;
  }
): Promise<GigSeries>;

export async function listGigSeries(projectId: string): Promise<GigSeries[]>;
export async function getSeriesGigs(seriesId: string): Promise<Gig[]>;
export async function updateGigSeries(seriesId: string, data: Partial<GigSeries>): Promise<void>;
export async function deleteGigSeries(seriesId: string, deleteGigs: boolean): Promise<void>;
```

### UI Components

- `components/create-series-dialog.tsx` - Pattern selection, date range
- `/app/(app)/series/[id]/page.tsx` - Series detail with all gigs
- Add "Create series" button to gig detail
- Series badge on gig list items
- "View series" link on gig detail if part of series

### Implementation Notes

- Generate gigs in batch (e.g., 6 months at a time)
- Background job to generate new future gigs periodically
- Copy lineup, setlist, files from template gig

---

## Step 15 – Rehearsal Scheduling ⭐

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Low-Medium  
**Effort:** 2 weeks

### What

Schedule and track rehearsals separately from gigs, with optional linking to specific upcoming gigs.

### Why Now

- Bands need to organize rehearsals
- Different workflow from gigs (focus topics, attendance, etc.)
- Natural extension of existing gig system
- Completes project lifecycle

### Features

#### Rehearsal as Gig Type
- Add "rehearsal" as gig type (vs "gig")
- Different UI treatment (icon, color, badges)
- Rehearsal-specific fields

#### Rehearsal Details
- **Focus topics** - What to work on
- **Songs to practice** - Links to setlist
- **Venue/Space** - Studio, garage, etc.
- **Equipment needed** - Amps, mics, PA, etc.
- **Preparation notes** - What to bring/prep

#### Link to Upcoming Gigs
- "Rehearsal for: [Gig Name]"
- Show linked gig details
- Multiple rehearsals can link to same gig
- Access linked gig's setlist for practice

#### Attendance Tracking
- Mark who showed up after rehearsal
- Track late arrivals
- Attendance history per musician
- Optional: Attendance percentage per project

#### Rehearsal Notes
- Post-rehearsal notes and feedback
- Action items for next rehearsal
- Audio/video recordings (URL links)

### Database Changes

```sql
-- Add type to gigs
ALTER TABLE gigs ADD COLUMN type TEXT DEFAULT 'gig' 
  CHECK (type IN ('gig', 'rehearsal'));

-- Rehearsal-specific fields
ALTER TABLE gigs ADD COLUMN focus_topics TEXT;
ALTER TABLE gigs ADD COLUMN equipment_needed TEXT;
ALTER TABLE gigs ADD COLUMN linked_gig_id UUID REFERENCES gigs(id);
ALTER TABLE gigs ADD COLUMN rehearsal_notes TEXT;

-- Attendance tracking
CREATE TABLE rehearsal_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT FALSE,
  arrived_late BOOLEAN DEFAULT FALSE,
  notes TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rehearsal_attendance_gig ON rehearsal_attendance(gig_id);
```

### API Functions

```typescript
// lib/api/gigs.ts (extend)
// Add type and rehearsal fields to Gig interface

// lib/api/rehearsals.ts
export async function markAttendance(
  gigId: string,
  attendance: Array<{
    roleId: string;
    attended: boolean;
    late: boolean;
    notes?: string;
  }>
): Promise<void>;

export async function getAttendanceHistory(projectId: string): Promise<AttendanceRecord[]>;
```

### UI Components

- "Create Rehearsal" vs "Create Gig" buttons
- Rehearsal-specific form fields in dialogs
- `components/rehearsal-attendance.tsx` - Attendance checklist
- `/app/(app)/projects/[id]/rehearsals/page.tsx` - Rehearsal history
- Filter dashboard by type (gigs vs rehearsals)
- Different icon/color for rehearsals in lists

---

## Step 16 – Advanced Setlist Features ⭐

**Priority:** Low-Medium  
**Complexity:** Medium  
**Impact:** Low  
**Effort:** 2-3 weeks

### What

Enhanced setlist tools: auto-link songs, PDF export, stage view, templates, BPM calculator, transpose keys.

### Why Now

- Setlist is already functional (Step 6)
- These are polish features, not critical path
- High "wow factor" for musicians
- Differentiate from competitors

### Features

See `docs/future-enhancements/setlist-enhancements.md` for full details.

#### Auto-Link Songs
- Detect song titles and search Spotify/YouTube
- Display links next to each song
- Click to open in new tab
- Optional: Embed preview player

#### PDF Export
- Generate printable setlist
- Custom formatting options (font size, margins, include/exclude key/BPM/notes)
- Header with gig info
- Download or email PDF

#### Stage View Mode
- Large text display for on-stage viewing
- Dark theme for low-light environments
- Scrollable with large touch targets
- Full-screen mode
- Current song highlight
- Swipe to advance

#### Setlist Templates
- Save frequently used setlists as templates
- "Clone Setlist" from previous gig
- Quick-apply template to new gig
- Template library

#### BPM Calculator
- Tap tempo to calculate BPM
- Built-in to add/edit song dialog
- Visual metronome

#### Transpose Keys
- Shift entire setlist up/down by semitones
- Batch key change
- Useful when changing band key

### Database Updates

```sql
CREATE TABLE setlist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE setlist_items ADD COLUMN spotify_url TEXT;
ALTER TABLE setlist_items ADD COLUMN youtube_url TEXT;
```

### Implementation Priority

1. PDF export (most requested)
2. Setlist templates (high utility)
3. Stage View (mobile-first)
4. Auto-linking (nice-to-have)
5. Transpose/BPM tools (power user features)

---

## Step 17 – "Today View" Mobile Dashboard 🆕 ⭐

**Priority:** Low-Medium  
**Complexity:** Low  
**Impact:** Medium  
**Effort:** 1 week

### What

Focused "Today" screen, especially for mobile, with one-tap access to next gig and Gig Pack.

### Why Now

- Mobile-first feature for musicians on the go
- Simplifies daily use case: "What do I have today?"
- Complements mobile app (Step 6)
- Works great in Simple Mode (Step 18)

### Features

#### Today View
- `/today` route showing:
  - All gigs happening today
  - If none, the next upcoming gig
  - Today's rehearsals (if any)
- For each gig:
  - Project name, gig title
  - Time and location
  - One-tap actions:
    - Open Gig Pack
    - Open navigation (maps link)
    - Quick status update (confirm/decline)

#### Next Gigs Preview
- Below today's gigs, show next 3-5 upcoming gigs
- Compact card format
- Quick navigation to each

#### Integration with Simple Mode
- In Simple Mode, "Today View" becomes default landing page
- Minimal navigation, maximum focus
- Large touch targets for mobile

### API Functions

```typescript
// lib/api/today.ts
export interface TodayGig {
  id: string;
  title: string;
  projectName: string;
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  locationAddress: string;
  role: string;
  invitationStatus: string;
  type: 'gig' | 'rehearsal';
}

export async function getTodayGigs(userId: string): Promise<TodayGig[]>;
export async function getNextGigs(userId: string, limit: number): Promise<TodayGig[]>;
```

### UI Components

- `/app/(app)/today/page.tsx` - Today view
- `components/today-gig-card.tsx` - Large card with quick actions
- `components/next-gigs-list.tsx` - Compact upcoming list
- Add "Today" link to sidebar navigation

### Implementation Notes

- Mobile-optimized design (large cards, big buttons)
- Cache today's data aggressively
- Refresh on page visibility change
- Works great on mobile app

---

## Step 18 – Simple Mode & Accessibility 🆕 ⭐

**Priority:** Low-Medium  
**Complexity:** Low  
**Impact:** Low-Medium  
**Effort:** 1 week

### What

Simplified UX mode and accessibility settings for non-tech-savvy musicians.

### Why Now

- Makes app approachable for broader audience
- Low implementation complexity
- Addresses accessibility best practices
- Differentiates from complex alternatives

### Features

#### Simple Mode
- Toggleable in user settings
- When enabled:
  - Dashboard shows only "Today View" (Step 17)
  - Navigation limited to: Today, My Gigs, Profile
  - Hide advanced sections (Money, Clients, Analytics, Companies)
  - Larger buttons and clearer labels
  - Less density, more whitespace
- Ideal for musicians who just want: "Where do I need to be and what do I play?"

#### Accessibility Settings
- **Large text mode** - Increases base font size
- **High contrast mode** - Higher contrast color palette
- **Reduced motion** - Respects `prefers-reduced-motion`
- **Screen reader optimization** - ARIA labels, semantic HTML

#### Preferences
- Profile > Preferences section:
  - Toggle "Simple mode"
  - Toggle "Large text"
  - Toggle "High contrast"
- Settings persist across devices

### Database Changes

```sql
-- Extend profiles
ALTER TABLE profiles ADD COLUMN ui_mode TEXT DEFAULT 'full' CHECK (ui_mode IN ('simple', 'full'));
ALTER TABLE profiles ADD COLUMN pref_large_text BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN pref_high_contrast BOOLEAN DEFAULT FALSE;
```

### Implementation

- Use CSS variables for theming
- Conditional navigation based on `ui_mode`
- Conditional routing: simple mode redirects to `/today` on login
- Tailwind variants for large text and high contrast

### UI Components

- `/app/(app)/settings/preferences/page.tsx` - Preference toggles
- `lib/providers/theme-provider.tsx` - Apply accessibility preferences
- Update `components/app-sidebar.tsx` with conditional navigation

---

## Step 19 – Communication Tools ⭐

**Priority:** Low  
**Complexity:** High  
**Impact:** Medium  
**Effort:** 4-5 weeks

### What

In-app messaging and chat for gig coordination, reducing reliance on external tools.

### Why Now

- Reduces reliance on WhatsApp, SMS, email threads
- Keep all gig communication in one place
- Integrate with gig context (share setlists, files)
- Notifications can link to conversations
- Major differentiator

### Features

#### Gig Chat
- Dedicated chat thread per gig
- All invited musicians can participate
- Share files, links, updates
- Pin important messages

#### Project Chat
- Ongoing conversation per project
- All project members included
- Discuss upcoming gigs, ideas

#### Direct Messages
- 1-on-1 messaging between users
- Search message history
- Attach gigs, files, links

#### Rich Features
- @mentions to tag specific users
- Reactions/emojis
- Thread replies
- File/image uploads
- Voice messages (future)

#### Notifications
- Real-time message notifications
- Email digest for unread messages
- Mute conversations
- Notification preferences per chat

### Database Schema

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  muted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
```

### Implementation

- Use Supabase Realtime for live messages
- Message pagination (load 50 at a time)
- Typing indicators
- Online/offline status
- Message search

### UI Components

- Chat sidebar listing conversations
- Message thread view
- Message composer with formatting
- Emoji picker
- Unread badge counts

### Performance

- Pagination for message history
- Real-time subscriptions only for active conversation
- Cache recent conversations
- Index on `conversation_id` and `created_at`

---

## Step 20 – Analytics & Insights ⭐

**Priority:** Low  
**Complexity:** Medium  
**Impact:** Medium  
**Effort:** 2-3 weeks

### What

Data visualization and business insights for musicians and managers.

### Why Now

- Users have accumulated data
- Differentiate with smart insights
- Help users understand their gigging business
- Tax season reporting

### Features

#### Player Analytics
- Income over time (line chart)
- Income by month/quarter/year
- Income by project (pie chart)
- Average fee per gig
- Top-paying projects
- Payment velocity (days to get paid)
- Gigs per month (bar chart)
- Busiest months
- Gig acceptance rate
- Most frequent collaborators
- Projected income (next 3/6/12 months based on accepted gigs)

#### Manager Analytics
- Revenue vs expenses over time
- Profit margins per project
- Most/least profitable gigs
- Client fee trends
- Average payout per musician
- Gigs per project
- Revenue per project
- Profit per project
- Project growth trends
- Most hired musicians
- Musician utilization rate
- Reliability metrics (acceptance rate)

#### Reports
- **Tax Reports** - Exportable income summaries
- **Project Reports** - Per-project financial breakdowns
- **Custom Reports** - Date range, filter by project
- **Export Formats** - PDF, CSV, Excel

### Database Views

Create materialized views for performance:

```sql
CREATE MATERIALIZED VIEW user_monthly_income AS
SELECT 
  gr.musician_id,
  DATE_TRUNC('month', g.date) as month,
  COUNT(*) as gig_count,
  SUM(gr.agreed_fee) as total_income,
  SUM(CASE WHEN gr.is_paid THEN gr.agreed_fee ELSE 0 END) as paid_income
FROM gig_roles gr
JOIN gigs g ON gr.gig_id = g.id
GROUP BY gr.musician_id, DATE_TRUNC('month', g.date);

CREATE MATERIALIZED VIEW project_performance AS
SELECT 
  p.id as project_id,
  p.owner_id,
  COUNT(g.id) as gig_count,
  SUM(g.client_fee) as total_revenue,
  SUM(
    SELECT SUM(agreed_fee) FROM gig_roles WHERE gig_id = g.id
  ) as total_payouts
FROM projects p
LEFT JOIN gigs g ON p.id = g.project_id
GROUP BY p.id, p.owner_id;
```

### UI Components

- `/app/(app)/analytics/page.tsx` - Analytics dashboard
- Chart components using `recharts` library
- Date range selector
- Export button
- Print-friendly report layout

### Performance

- Use materialized views for aggregations
- Refresh views nightly via cron job
- Cache analytics queries (5 minute stale time)
- Lazy load charts (only render visible tabs)

---

## Priority Matrix

| Step | Name | Priority | Complexity | Impact | Effort |
|------|------|----------|------------|--------|--------|
| 1 | Invitations & Confirmations | ⭐⭐⭐ Critical High | Medium | Very High | 2-3 weeks |
| 2 | Manager Money + Client CRM | ⭐⭐⭐ Critical High | Med-High | Very High | 2-3 weeks |
| 3 | Notifications + Email Digests | ⭐⭐⭐ Critical High | Medium | High | 2 weeks |
| 4 | Search & Filtering | ⭐⭐ High | Low | Medium | 1 week |
| 5 | Gig Templates & Duplicate 🆕 | ⭐⭐ High | Low | Medium | 1 week |
| 6 | Mobile App (Expo) | ⭐⭐⭐ High | High | Very High | 6-8 weeks |
| 7 | Onboarding & Sample Data 🆕 | ⭐⭐ Med-High | Low | Medium | 1 week |
| 8 | Calendar Integration + ICS | ⭐⭐ Med-High | Med-High | High | 2-3 weeks |
| 9 | Gig Notes & Checklists 🆕 | ⭐⭐ Med-High | Low | Medium | 1 week |
| 10 | Travel & Logistics 🆕 | ⭐⭐ Med-High | Low | Medium | 1 week |
| 11 | Companies/Organizations | ⭐⭐ Medium | High | Med-High | 3-4 weeks |
| 12 | Sub/Dep Pool & Need a Sub 🆕 | ⭐⭐ Medium | Medium | Medium | 2 weeks |
| 13 | Export Gig PDF & CSV 🆕 | ⭐ Medium | Medium | Medium | 1-2 weeks |
| 14 | Recurring Gigs & Series 🆕 | ⭐ Medium | Medium | Medium | 2 weeks |
| 15 | Rehearsal Scheduling | ⭐ Medium | Medium | Low-Med | 2 weeks |
| 16 | Advanced Setlist Features | ⭐ Low-Med | Medium | Low | 2-3 weeks |
| 17 | "Today View" Mobile Dashboard 🆕 | ⭐ Low-Med | Low | Medium | 1 week |
| 18 | Simple Mode & Accessibility 🆕 | ⭐ Low-Med | Low | Low-Med | 1 week |
| 19 | Communication Tools | ⭐ Low | High | Medium | 4-5 weeks |
| 20 | Analytics & Insights | ⭐ Low | Medium | Medium | 2-3 weeks |

🆕 = New feature from enhanced roadmap

---

## Recommended Sequence

### Phase 1: Complete Core Workflows (6-8 weeks)
1. **Step 1** - Invitations & Confirmations (2-3 weeks)
2. **Step 2** - Manager Money + Client CRM (2-3 weeks)
3. **Step 3** - Notifications + Email Digests (2 weeks)

**Goal:** Fully functional MVP with complete musician and manager workflows, including end-to-end invitation flow and financial tracking.

### Phase 2: UX Polish & Mobile Readiness (8-10 weeks)
4. **Step 4** - Search & Filtering (1 week)
5. **Step 5** - Gig Templates & Duplicate (1 week)
6. **Step 7** - Onboarding & Sample Data (1 week)
7. **Step 6** - Mobile App MVP (6-8 weeks, can overlap with steps 8-10)

**Goal:** Mobile presence, improved UX, and reduced friction for new users.

### Phase 3: Enhanced Features & Engagement (6-8 weeks)
8. **Step 8** - Calendar Integration + ICS (2-3 weeks)
9. **Step 9** - Gig Notes & Checklists (1 week)
10. **Step 10** - Travel & Logistics (1 week)
11. **Step 12** - Sub/Dep Pool (2 weeks)

**Goal:** Address real-world workflows and increase daily engagement.

### Phase 4: Scale & Growth (8-12 weeks)
12. **Step 11** - Companies/Organizations (3-4 weeks)
13. **Step 13** - Export PDF & CSV (1-2 weeks)
14. **Step 14** - Recurring Gigs & Series (2 weeks)
15. **Step 15** - Rehearsal Scheduling (2 weeks)

**Goal:** Target agencies, handle complex use cases, and scale beyond solo MDs.

### Phase 5: Premium Features & Polish (8-10 weeks)
16. **Step 16** - Advanced Setlist (2-3 weeks)
17. **Step 17** - "Today View" (1 week)
18. **Step 18** - Simple Mode & Accessibility (1 week)
19. **Step 19** - Communication Tools (4-5 weeks)
20. **Step 20** - Analytics & Insights (2-3 weeks)

**Goal:** Premium features, data insights, and polish for market differentiation.

---

## Summary Statistics

- **Total Steps:** 20 (was 11)
- **New Features:** 9 (marked with 🆕)
- **Enhanced Features:** 11 (merged and improved)
- **Total Estimated Effort:** 50-65 weeks (12-16 months with one developer)
- **Critical High Priority:** 3 steps
- **High Priority:** 4 steps
- **Medium Priority:** 7 steps
- **Low Priority:** 6 steps

---

## Related Documentation

- `/docs/future-enhancements/manager-money-view.md` - Step 2 details
- `/docs/future-enhancements/setlist-enhancements.md` - Step 16 details
- `/docs/future-enhancements/musician-accounts-linking.md` - Future: Link profiles
- `/docs/future-enhancements/musician-contacts-system.md` - Future: Contact book
- `/docs/future-enhancements/roster-automation.md` - Future: Smart rostering
- `/docs/future-enhancements/multi-step-gig-wizard.md` - Future: Improved gig creation
- `/docs/mobile-integration-guide.md` - Step 6 implementation guide
- `/BUILD_STEPS.md` - Completed steps 0-12

---

**Last Updated:** November 16, 2025  
**Status:** Planning Phase - Ready for Step 1  
**Sources:** Original next-steps.md + ChatGPT feature ideas (intelligently merged)


## Ongoing: Performance & Architecture Mindset

At every step, ask:

- Am I **fetching only what I need**?
- Is there a risk of **N+1 queries**?
- Do I need **pagination or limits** for this list?
- Should I **add an index** on this column?
- Is business logic in the **backend**, not duplicated in every component?
- Will this still be okay with **hundreds of gigs** and **many users**?

If something feels like it will get slow or messy as data grows:
- Stop and redesign **before** building on top of it.
