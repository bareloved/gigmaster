# Project Overview

## 1. Core Purpose
**GigMaster** is an operating system for musicians. It replaces scattered tools (calendar invites, WhatsApp groups, spreadsheets) with a structured system for managing:
- **Gigs**: Logistics, schedules, and status.
- **Music**: Setlists, charts, and audio files.
- **People**: Rosters, roles, and invitations.
- **Money**: Earnings (as a player) and payouts (as a manager).

The app supports distinct personas:
- **Musician**: Focuses on "Where do I need to be?", "What am I playing?", and "Have I been paid?".
- **Manager/MD**: Focuses on organizing gigs, booking rosters, and managing setlists.
- **Agency**: (Future) High-level view of multiple projects.

---

## 2. Main Pages & Routes

### **Dashboard** (`/dashboard`)
The central command center for the user.
- **Hero Section**: Displays the "Next Gig" with immediate actions (View Details, Gig Pack, Setlist).
- **Readiness Tracking**: Interactive checklist for the next gig (Songs, Charts, Sounds, Travel, Gear) with a calculated readiness score.
- **Activity Feed**: Real-time log of changes (e.g., "New song added", "Time changed").
- **Practice Focus**: Widget highlighting songs that need learning/practice based on upcoming gigs.
- **Money Snapshot**: Quick overview of current month's earnings and unpaid fees.
- **Focus Mode**: UI toggle to hide distractions and show only the immediate next gig.

### **All Gigs** (`/gigs`)
A comprehensive list of all upcoming engagements.
- **Views**: Toggle between **List** and **Grid** layouts.
- **Filtering**: Search by text (title, location, project) and filter by Project.
- **Infinite Scroll**: Efficiently handles large histories of gigs.
- **Creation**: `CreateGigDialog` for managers to book new dates.

### **Gig Details** (`/gigs/[id]`)
The deep-dive view for a specific event.
- **Overview**: Date, time, location, and general notes.
- **People**: Roster management (`GigPeopleSection`). Managers can invite/replace musicians; players see who they are playing with.
- **Setlist**: Interactive song list (`GigSetlistSection`) with keys, BPM, and notes.
- **Resources**: File manager (`GigResourcesSection`) for charts, audio, and stage plots.
- **Gig Pack** (`/gigs/[id]/pack`): A simplified, read-only, mobile-optimized view designed for use on stage or during travel.

### **Calendar** (`/calendar`)
A visual timeline of commitments.
- **Views**: Month, Week, Day (via `react-big-calendar`).
- **Color Coding**: Events are colored by role (Manager = Green, Player = Blue, Both = Purple).
- **Interaction**: Clicking an event opens the **Gig Pack** for quick access.

### **Money** (`/money`)
Financial tracking center.
- **As Player**: Detailed table of earnings (`MyEarningsTable`), tracked by paid/unpaid status.
- **As Manager**: Payout management (`PayoutsTable`) to track who needs to be paid for managed gigs.
- **Filters**: Filter by Year, Month, and Project.

### **Invitations** (`/invitations/accept`)
- **Accept Flow**: Handles incoming invitation tokens. Auto-accepts valid tokens and redirects to the Dashboard.

---

## 3. Key Components

### **Feature Components**
- **Dashboard**:
  - `DashboardGigItem` / `DashboardGigItemGrid`: Individual gig cards.
  - `PracticeFocusWidget`: Gamified practice tracking.
  - `GigActivityWidget`: Audit log of gig changes.
  - `DashboardKPICards`: High-level metrics (Gigs this week, Songs to learn).
- **Gig Management**:
  - `GigPeopleSection`: Roster and invitation status.
  - `GigSetlistSection`: Drag-and-drop setlist management.
  - `GigResourcesSection`: File uploads and categorization.
  - `GigStatusBadge` / `GigStatusSelect`: Visual status indicators.
- **Money**:
  - `MyEarningsSummaryCards`: Aggregated financial stats.
  - `PayoutsTable`: Manager-facing financial list.

### **UI Primitives**
Built on **shadcn/ui** (Radix UI + Tailwind):
- `Dialog` (heavily used for forms: `CreateGigDialog`, `InviteMusicianDialog`).
- `Card` (primary container for dashboard and lists).
- `Table` (for money and rosters).
- `Badge` (for status indicators).
- `DropdownMenu` (for actions).

---

## 4. Data Models & Architecture

### **Database (Supabase/Postgres)**
- **`profiles`**: User identity and metadata.
- **`projects`**: Bands or acts (Groups gigs together).
- **`gigs`**: Core event entity (Date, Location, Status).
- **`gig_roles`**: Links Users to Gigs (Role name, Fee, Invitation Status).
- **`setlist_items`**: Songs attached to gigs (Key, BPM, Order).
- **`gig_files`**: Resources attached to gigs (Charts, Audio).
- **`gig_readiness`**: Tracks a user's preparation level for a specific gig.
- **`setlist_learning_status`**: Tracks a user's mastery of specific songs.
- **`gig_activities`**: Audit log for history tracking.

### **TypeScript Types** (`lib/types/shared.ts`)
Designed for code sharing between Web and Future Mobile App.
- **Core**: `Gig`, `Project`, `GigRole`, `SetlistItem`.
- **Composite**: `DashboardGig` (Gig + User Context), `GigPackData` (Aggregated read-only view).
- **Financial**: `PlayerMoneySummary`, `PaymentStatus`.

### **UX Flows**
1. **Onboarding**: User signs up -> Creates Profile -> Creates Project.
2. **Booking Flow**: Manager creates Gig -> Adds Setlist -> Invites Musicians via Email.
3. **Musician Flow**: Receives Email -> Clicks Link (`/invitations/accept`) -> Redirects to Dashboard -> Sees "Next Gig" -> Checks "Readiness" -> Downloads Charts.
4. **Gig Day**: User opens **Gig Pack** on mobile -> Checks Schedule -> Views Setlist -> Gets Paid.

---

## 5. Recent & Upcoming Features
- **Readiness Tracking**: Recently added to help musicians track prep (Songs, Gear, Travel).
- **Activity Feed**: Recently added to provide visibility into gig changes.
- **Mobile App**: Planned companion app using React Native (Expo), sharing `lib/types` and Supabase backend.

