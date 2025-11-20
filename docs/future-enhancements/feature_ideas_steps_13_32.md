# Feature Ideas – Detailed Spec (Steps 13–32)

This document expands the 20 feature ideas into more detailed specs you can use while building the app.

---

## 13. 🎫 Musician Accounts & Invitations

**Summary:**  
Turn lineup entries into real users by inviting musicians via email and linking them to `gig_roles` through a secure invitation flow.

### Details

- **Goal**
  - Allow managers to invite musicians to gigs using email.
  - Once the musician accepts, the gig automatically appears in their “As Player” views and Gig Pack.

- **Data Model**
  - `gig_invitations` table:
    - `id`
    - `gig_id` (FK to `gigs`)
    - `gig_role_id` (FK to `gig_roles`)
    - `email`
    - `status` (pending | accepted | declined | expired)
    - `token` (random string for magic link)
    - `expires_at`
    - `created_at`, `updated_at`
  - Extend `gig_roles`:
    - `musician_id` (nullable FK to `profiles` / auth user id)

- **Core Behaviour**
  - Manager clicks “Invite musician” next to a role.
  - Enters email → creates `gig_invitations` row → sends magic link.
  - Invitee opens magic link:
    - If not logged in → log in / sign up.
    - After auth, app:
      - Validates token & expiration.
      - Links `gig_roles.musician_id = current user`.
      - Sets `gig_invitations.status = accepted`.
  - If invitee declines → `status = declined`, and role remains unlinked.

- **UI / UX**
  - In **Gig > People**:
    - Each role:
      - Shows musician name (if set).
      - Button: “Invite by email”.
      - Badge: `Invited`, `Accepted`, `Declined`.
  - In **Dashboard > As Player**:
    - List of gigs based on `gig_roles.musician_id = current user`.

- **Done When**
  - Manager can invite a musician by email.
  - Musician logs in, accepts, and sees that gig in their player dashboard and Gig Pack automatically.

---

## 14. 📲 Player Self-Service on Gig Pack

**Summary:**  
Let musicians manage their own status from the Gig Pack screen (confirm/decline, request sub, personal notes).

### Details

- **Goal**
  - Reduce back-and-forth by letting players update their status themselves.
  - Make Gig Pack the “single source of truth” for each player.

- **Data Model**
  - Extend `gig_roles`:
    - `player_status` (invited | confirmed | needs_sub | declined)
    - `player_notes` (text, per-player, private)

- **Core Behaviour**
  - Current user sees their own role(s) on the Gig Pack.
  - Available actions:
    - Confirm attendance.
    - Mark “Need a sub” (does not remove them, just flags).
    - Decline (optionally with a note).
  - User can write/edit their **personal notes** for this gig (visible only to them).

- **UI / UX**
  - **Gig Pack > “My Status” section**:
    - Shows:
      - Role (e.g. Keys / MD).
      - Status with big buttons: `Confirm`, `Need a sub`, `Decline`.
    - “My notes” text area for personal notes.
  - Status changes should visually update instantly and be visible to managers on the main gig page.

- **Done When**
  - Player can open Gig Pack on mobile and:
    - Confirm/decline.
    - Mark “Need a sub”.
    - Add their private notes.
  - Manager sees status updates on the gig.

---

## 15. 📅 Global Calendar View & ICS Feed

**Summary:**  
Provide a calendar view and personal ICS feed so users can see gigs in Google/Apple calendar.

### Details

- **Goal**
  - Aggregate all gigs relevant to the user (as player and/or manager) into one calendar.
  - Let users subscribe via ICS without complex OAuth integrations.

- **Core Behaviour**
  - **Calendar page (`/calendar`):**
    - Shows gigs where:
      - User is manager/owner.
      - OR user is in `gig_roles.musician_id`.
    - Basic month view + list/agenda view (even if simple).
    - Filters:
      - `All | As Player | As Manager`.
  - **ICS Feed Endpoint:**
    - Endpoint like `/api/calendar.ics?token=...`.
    - Returns events for the authenticated user.
    - Each event:
      - Title: `[Project Name] Gig Title`.
      - Start/end from `date + start_time / end_time`.
      - Description includes link to Gig Pack.

- **Security**
  - ICS URL should be user-specific with a secret token.
  - Allow user to regenerate ICS token (invalidates old URL).

- **UI / UX**
  - Add CTA on Dashboard & Money page: “Open calendar”.
  - On Calendar page:
    - Toggle to view list vs month view.
  - Profile > “Calendar sync” section:
    - Show ICS URL.
    - Instructions: “Copy this and add to Google/Apple Calendar as a subscription”.

- **Done When**
  - User can:
    - See a calendar of their gigs inside the app.
    - Subscribe to ICS in Google/Apple and see gigs show up there.

---

## 16. 🧬 Gig Templates & Duplicate Gig

**Summary:**  
Make it easy to reuse past gigs as templates or duplicate them for new dates.

### Details

- **Goal**
  - Save time for recurring formats (same band, similar setlist, similar logistics).

- **Data Model**
  - Option A (simpler): No dedicated templates table.
    - Add `is_template` boolean to `gigs`.
  - Reuse existing related tables:
    - `gig_roles`, `setlist_items`, `gig_files`.

- **Core Behaviour**
  - “Duplicate gig” action:
    - Takes an existing gig and:
      - Creates a new `gigs` row.
      - Copies `gig_roles` (minus invitations/state if needed).
      - Copies `setlist_items`.
      - Copies `gig_files` references (or clones them if needed).
      - Does **not** blindly copy date/time; user chooses a new date.
  - Optional: “Save as template”:
    - Mark gig as `is_template = true`.
    - UI to “Create gig from template” and then choose date/time.

- **UI / UX**
  - On Gig Detail → actions dropdown:
    - “Duplicate gig”.
  - On Gigs list:
    - Each row menu: “Duplicate”.
  - If you add templates:
    - On “New Gig” screen: “Start from template”.

- **Done When**
  - Manager can take an existing gig, click “Duplicate”, pick a date, and get a new gig with lineup + setlist + files pre-filled.

---

## 17. 💰 Manager Money View + Client Tracking

**Summary:**  
Allow managers/companies to track client fees, payouts to musicians, and basic profit per gig/project.

### Details

- **Goal**
  - Provide a clear financial overview: who’s paying what, what the band is being paid, and what’s left as profit.

- **Data Model**
  - `clients` table:
    - `id`
    - `owner_id` (user or organization)
    - `name`
    - `contact_person`
    - `email`
    - `phone`
    - `notes`
    - timestamps
  - Extend `gigs`:
    - `client_id` (FK to `clients`, nullable)
    - `client_fee` (numeric)
    - `payment_status` (unpaid | partially_paid | paid) – optional
  - Use `gig_roles.agreed_fee` for payouts to musicians.

- **Core Behaviour**
  - Manager can:
    - Assign a client to a gig.
    - Set a `client_fee` for the gig.
  - Money summary:
    - Per gig:
      - Client fee.
      - Sum of `agreed_fee` for all roles (payouts).
      - Profit = `client_fee - sum(agreed_fee)`.
    - For a date range:
      - Total client fees.
      - Total payouts.
      - Total profit.

- **UI / UX**
  - **Gig Detail > Money section:**
    - Select client (dropdown).
    - Input client fee.
    - Show quick profit summary.
  - **Money page (Manager view):**
    - Cards:
      - Total invoiced (client fees).
      - Total payouts.
      - Profit.
    - Table:
      - Date, gig title, project, client, client fee, payouts, profit, payment status.

- **Permissions**
  - Client and fee data visible only to managers/org admins.
  - Hidden in player-only views and Gig Pack.

- **Done When**
  - Manager can see per-gig and overall money summary with clients and profit.

---

## 18. 📇 Client CRM View

**Summary:**  
Basic, lightweight CRM to track clients and see their gig history.

### Details

- **Goal**
  - Help managers remember who their clients are, how often they work together, and revenue per client.

- **Core Behaviour**
  - List all clients for `owner_id`.
  - For each client:
    - Count gigs.
    - Sum client fees.
    - Show latest gig date.
  - Client detail:
    - Contact info.
    - List of gigs (past & upcoming) with dates and amounts.

- **UI / UX**
  - `/clients` page:
    - Table:
      - Client name, last gig date, number of gigs, total fees.
    - “Add client” button.
  - Client detail page:
    - Header with contact info.
    - Section with stats.
    - Table of gigs filtered by this client.

- **Done When**
  - Manager can open Clients, see high-level stats, and drill into individual clients to view their gig history.

---

## 19. 📝 Gig Notes & Checklists

**Summary:**  
Add structured notes and simple checklists to each gig.

### Details

- **Goal**
  - Store context like parking instructions, backline needs, dress code, and tiny “don’t forget” items.

- **Data Model**
  - `gig_notes`:
    - `id`
    - `gig_id`
    - `author_id`
    - `content`
    - `visibility` (manager_only | band)
    - timestamps
  - `gig_checklist_items`:
    - `id`
    - `gig_id`
    - `label`
    - `is_done`
    - `assigned_role_id` (nullable; can assign to a specific role)

- **Core Behaviour**
  - Any authorized user can create a note.
  - Manager can mark notes as “manager only”.
  - Anyone in the gig can see band-visible notes.
  - Checklist:
    - Add items.
    - Toggle completion.
    - Optionally assign to a role (e.g. “Drummer brings snare”).

- **UI / UX**
  - On Gig Detail:
    - “Notes” section:
      - List of notes with author + time.
      - Textarea to add a new note.
      - Visibility selector (if manager).
    - “Checklist” section:
      - List of items with checkboxes.
      - Add new item inline.
  - On Gig Pack:
    - Show only notes/checklist with `visibility = band`.

- **Done When**
  - You can add/manage notes and checklist items on a gig, and players can see band-visible items in Gig Pack.

---

## 20. 🔍 Search & Filters Across Gigs

**Summary:**  
Improve gig navigation with search and filters on date, status, and payment.

### Details

- **Goal**
  - Let users quickly find specific gigs (by name, client, venue, etc.) and filter to see what matters (e.g. unpaid gigs).

- **Core Behaviour**
  - Search input:
    - Matches gig title, project name, client name, location.
  - Filters:
    - Date range (from–to).
    - Status: upcoming / past / draft / cancelled.
    - Payment: paid / unpaid / partially paid.
  - Different defaults:
    - Players: default “upcoming as player”.
    - Managers: default “upcoming & past as manager”.

- **UI / UX**
  - On `/gigs` or Dashboard gigs list:
    - Search bar at top.
    - Filter chips/selectors.
  - On `/money`:
    - Date filter + paid/unpaid toggles to narrow list.

- **Done When**
  - User can type partial text or set a filter and the gig list updates to show matching gigs only.

---

## 21. 🧓 Simple Mode & Accessibility

**Summary:**  
A simplified UX mode + accessibility settings for non-tech-savvy musicians.

### Details

- **Goal**
  - Make the app approachable for users who want minimal options and large, clear UI.

- **Data Model**
  - Extend `profiles`:
    - `ui_mode` (simple | full)
    - `pref_large_text` (boolean)
    - `pref_high_contrast` (boolean)

- **Core Behaviour**
  - Simple mode:
    - Dashboard shows:
      - Today’s gig (if any).
      - Next upcoming gig.
      - Big “Open Gig Pack” button.
    - Hide advanced sections (Money, Clients, Analytics, etc.).
  - Accessibility:
    - Larger base font if `pref_large_text = true`.
    - High-contrast palette if `pref_high_contrast = true`.
    - Respect `prefers-reduced-motion` where possible.

- **UI / UX**
  - Profile > Preferences:
    - Switch “Simple mode”.
    - Toggle “Large text”, “High contrast”.
  - In simple mode:
    - Cleaner navigation with fewer menu items.
    - Less density; bigger buttons.

- **Done When**
  - User can flip a switch to enter “simple mode” and see a clearly simplified app, better suited for low-tech users.

---

## 22. 🌱 Onboarding & Sample Data

**Summary:**  
First-time wizard plus sample project/gigs to show value instantly.

### Details

- **Goal**
  - Help new users understand what the app does without requiring them to create everything manually.

- **Core Behaviour**
  - On first login:
    - Show 2–3 onboarding screens (wizard):
      - Main role: mostly player / mostly manager / both.
      - Default currency.
      - Option: “Add your first project now” OR “Load sample data”.
  - Sample data:
    - 1 sample project with:
      - 1 past gig.
      - 1 upcoming gig.
      - Example lineup, setlist, files.
    - CLEARLY labeled “Sample” so it’s not confusing.

- **Data Model**
  - Flag in profile: `has_completed_onboarding` (boolean).
  - Sample data generator function that:
    - Creates project + gigs safely namespaced as sample (e.g. `is_sample = true`).

- **UI / UX**
  - Progress at top on first run: “Step 1 of 3…”.
  - After wizard:
    - Landing on dashboard with sample project visible.
    - Banner: “This is sample data. You can delete it anytime.”

- **Done When**
  - New user can onboard in under ~30–60 seconds and immediately see a realistic sample setup.

---

## 23. 🔁 Recurring Gigs & Series

**Summary:**  
Handle residencies and repeating events via gig series.

### Details

- **Goal**
  - Let managers define recurring gigs (weekly, monthly, etc.) without creating each one manually.

- **Data Model**
  - `gig_series` table:
    - `id`
    - `project_id`
    - `name`
    - `pattern` (weekly / monthly / custom JSON)
    - `day_of_week` (for weekly)
    - `interval` (e.g. every 1 week)
    - `start_date`
    - `end_date` (nullable)
  - `gigs.series_id` to link each generated instance.

- **Core Behaviour**
  - From an existing gig:
    - “Create series from this gig”.
    - Choose recurrence pattern and end date.
  - System generates future `gigs` rows based on the rule.
  - Each generated gig is a normal gig but linked to a series.
  - Later:
    - Editing a single gig does not necessarily change the series (MVP can keep it simple).

- **UI / UX**
  - On Gig detail:
    - Button “Repeat this gig…”.
  - On Gigs list:
    - Show a series label (e.g. “Thu Residency @ Venue (Series)”).
    - Option to “View series” to see all gigs in that series.

- **Done When**
  - Manager can define a recurring series and automatically get multiple gig instances without manual duplication.

---

## 24. 👥 Sub / Dep Pool & “Need a Sub” Flow

**Summary:**  
Help managers and bands handle dep/subs smoothly when a musician can’t play a gig.

### Details

- **Goal**
  - Streamline the “I can’t make it, need a sub” process.

- **Data Model**
  - Extend `profiles`:
    - `primary_instrument`
    - `other_instruments` (array)
    - `home_city` or region
  - `project_musicians` / `trusted_pool`:
    - `project_id`
    - `musician_id`
    - `instrument` (optional)

- **Core Behaviour**
  - Player hits “Need a sub” in Gig Pack.
  - This:
    - Updates `gig_roles.player_status = needs_sub`.
    - Optionally adds a note.
    - Notifies manager.
  - Manager “Suggested subs”:
    - Query from trusted pool based on:
      - Same instrument/role.
      - Same project.
      - Maybe location.

- **UI / UX**
  - In Gig Pack (player):
    - Button: “Need a sub” with optional reason text.
  - In Gig view (manager):
    - Banner: “X has requested a sub”.
    - Button: “View suggested subs”.
    - List of suggested players with “Invite” buttons.

- **Done When**
  - Player can flag they need a sub and the manager gets a clear alert plus suggested replacements.

---

## 25. 🎼 Rehearsals Linked to Gigs

**Summary:**  
Add rehearsals as first-class items tied to projects and optionally specific gigs.

### Details

- **Goal**
  - Track rehearsals separate from gigs but connected logically.

- **Data Model**
  - `rehearsals` table:
    - `id`
    - `project_id`
    - `gig_id` (nullable)
    - `date`
    - `start_time`, `end_time` (optional)
    - `location`
    - `notes`
    - timestamps

- **Core Behaviour**
  - Manager can:
    - Add rehearsal from project or gig page.
  - Players:
    - See rehearsals for projects/gigs where they’re in the lineup.
  - Rehearsals appear on calendar and dashboards.

- **UI / UX**
  - On Gig Detail:
    - “Rehearsals” block:
      - List upcoming/past rehearsals.
      - “Add rehearsal”.
  - On Dashboard:
    - “Upcoming rehearsals” list.
  - On Gig Pack:
    - Show rehearsals attached to that gig.

- **Done When**
  - Rehearsals are visible to the right musicians and tied clearly to specific gigs/projects.

---

## 26. 🚐 Travel & Logistics Block

**Summary:**  
Structured fields for call time, meeting spot, parking notes, dress code, and simple ride-sharing.

### Details

- **Goal**
  - Answer logistic questions at a glance and reduce WhatsApp chaos.

- **Data Model**
  - Extend `gigs`:
    - `call_time`
    - `meeting_point` (string)
    - `parking_info`
    - `load_in_instructions`
    - `dress_code`
  - Simple `gig_rides` table (optional, MVP-level):
    - `id`
    - `gig_id`
    - `driver_id`
    - `seats_available`
    - `note`
    - `passengers_ids` (array or join table for more structure)

- **Core Behaviour**
  - Manager sets logistics on gig edit page.
  - Musicians see logistics in Gig Pack.
  - Ride sharing:
    - Drivers can volunteer seats.
    - Others can mark “Need a ride”.

- **UI / UX**
  - Gig Detail + Gig Pack:
    - “Logistics” section:
      - Call time vs show time.
      - Meeting point (with link to maps if address-like).
      - Parking / load-in notes.
      - Dress code.
    - “Rides” subsection (MVP simple).
  - Keep layout very clear and readable, especially on mobile.

- **Done When**
  - Everyone can see call time, meeting point, parking, and dress code in one place, and optionally coordinate rides.

---

## 27. 🎵 Rich Setlist (Charts, Audio, Key, BPM)

**Summary:**  
Make the setlist musically useful with key, tempo, charts, and reference audio per song.

### Details

- **Goal**
  - Turn setlist into a real rehearsal/performance tool.

- **Data Model**
  - Extend `setlist_items`:
    - `key` (string, e.g. “Gm”)
    - `bpm` (integer)
    - `notes` (arrangement notes)
  - `setlist_item_files` (optional):
    - `id`
    - `setlist_item_id`
    - `file_id` (FK to existing file storage)
    - `type` (chart | audio | other)
    - `title` (optional)

- **Core Behaviour**
  - Manager (or MD) can:
    - Set key and BPM for each song.
    - Add short arrangement notes.
    - Attach a chart (PDF/image).
    - Attach a reference audio file or external link.
  - Musicians can open chart or play reference from Gig Pack.

- **UI / UX**
  - In Gig Detail:
    - Setlist editor with columns:
      - Song title, key, BPM, notes, attachments.
  - In Gig Pack:
    - Setlist list:
      - Each song shows:
        - Title.
        - Key + BPM badges.
        - Icons/buttons: “Chart”, “Audio” (if present).

- **Done When**
  - For each song, players can see key, tempo, notes, and quickly open chart or reference audio.

---

## 28. 📄 Export: Gig PDF & CSV

**Summary:**  
Export gig details as a PDF and financial data as CSV.

### Details

- **Goal**
  - Provide printable/shareable outputs for venues, agents, and accountants.

- **Core Behaviour**
  - Gig PDF:
    - “Band version”:
      - Gig info, logistics, lineup, setlist.
      - No money/client details.
    - “Manager version”:
      - Includes money + client details.
  - Money CSV:
    - From Money page, for selected time range.
    - Columns:
      - Date, project, gig title, client, client fee, payouts total, profit, status.

- **UI / UX**
  - Gig Detail:
    - “Export → Band PDF / Manager PDF”.
  - Money page:
    - “Export CSV” with date range selection.

- **Done When**
  - Manager can download a PDF gig sheet and a CSV of financial data for select periods.

---

## 29. 🔔 Notifications & Email Digests

**Summary:**  
Notify users about invites, changes, rehearsals, and key money events.

### Details

- **Goal**
  - Keep everyone informed without requiring them to constantly check the app.

- **Data Model**
  - `notifications` table:
    - `id`
    - `user_id`
    - `type` (invite, gig_changed, rehearsal_added, sub_requested, etc.)
    - `data` (JSON)
    - `is_read`
    - timestamps
  - Extend profile with notification preferences:
    - `notify_email` (boolean)
    - Possibly per-type settings later.

- **Core Behaviour**
  - Trigger notifications on:
    - New gig invitation.
    - Date/time/location changes.
    - New rehearsal.
    - Player requests a sub.
    - Payment status updated (optional).
  - Delivery:
    - In-app (bell icon + dropdown list).
    - Email (MVP: send simple emails).

- **UI / UX**
  - Top bar: notification bell with unread badge.
  - Notifications page:
    - List of notifications with links to relevant pages.
  - Profile > Notifications:
    - Toggle email notifications on/off.

- **Done When**
  - Key events generate in-app + email notifications and users can mark them as read and tweak email prefs.

---

## 30. 📊 Per-User Analytics & Insights

**Summary:**  
Give each user a personal stats dashboard about gigs and income.

### Details

- **Goal**
  - Help musicians understand their workload, earnings, and key collaborators.

- **Core Behaviour**
  - Metrics:
    - Number of gigs played (as player) per month.
    - Total income (sum of `agreed_fee` for gigs marked as completed).
    - Top projects/clients by number of gigs and/or income.
    - Simple trends (e.g. gigs per month chart).

- **UI / UX**
  - `/stats` or Dashboard “Insights” tab:
    - Summary cards:
      - Gigs this month.
      - Income this month.
      - Top client/project.
    - Simple chart:
      - Gigs per month (last 6–12 months).
    - Table/list:
      - Top projects/clients.

- **Done When**
  - User can see their gigs and earnings over a chosen time period and which projects/clients they work with most.

---

## 31. 🏢 Organizations & Multi-Admin

**Summary:**  
Support production companies / bands with multiple admins managing shared projects and gigs.

### Details

- **Goal**
  - Allow a shared space where multiple users can manage projects, gigs, clients, and finances.

- **Data Model**
  - `organizations` table:
    - `id`
    - `name`
    - `owner_id`
    - `settings` (JSON)
  - `organization_members`:
    - `organization_id`
    - `user_id`
    - `role` (owner | admin | viewer)
  - Projects:
    - `project_id` belongs to either a user or an organization (e.g. `owner_type`, `owner_id` or separate columns).

- **Core Behaviour**
  - Org owner:
    - Creates organization.
    - Invites members by email.
    - Assigns roles.
  - Org admins:
    - Can create/edit projects and gigs under the organization.
    - Can view org-level Money and Clients.
  - Users can switch between “personal” space and org spaces.

- **UI / UX**
  - Top bar:
    - Organization switcher (like “Workspace” selector).
  - Org Settings page:
    - Manage members, roles, name, etc.

- **Done When**
  - Multiple admins can collaboratively manage the same set of projects, gigs, and clients under one organization.

---

## 32. 📆 “Today View” Mobile Dashboard

**Summary:**  
A focused “Today” screen, especially for mobile, with quick access to the next gig and Gig Pack.

### Details

- **Goal**
  - Provide a one-glance overview of what’s happening today and what’s coming next for the user.

- **Core Behaviour**
  - Aggregates:
    - All gigs happening today.
    - If none, the next upcoming gig.
    - Today’s rehearsals (if any).
  - For each gig:
    - Show project name, gig title, time, and location.
    - One-tap actions:
      - Open Gig Pack.
      - Open navigation (map link).

- **UI / UX**
  - `/today` route (could be the default landing page, especially in simple mode):
    - Big card for “Today’s Gig” (or “Next Gig”).
    - Below:
      - List of next 3–5 gigs.
    - Show rehearsals in a small section.
  - In Simple mode:
    - “Today View” becomes the primary dashboard.

- **Done When**
  - On mobile, user can open the app and immediately understand:
    - What they have today.
    - What their very next gig is.
    - With a single tap to access the Gig Pack and navigation.

---
