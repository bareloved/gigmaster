# Post-Deployment Testing Checklist

**Last Updated:** November 21, 2025  
**Purpose:** Comprehensive checklist of features to test after deploying to production

---

## 🚀 Before You Start

- [ ] Deployment is complete and live
- [ ] Environment variables are set correctly in Vercel
- [ ] Database migrations have been applied to production:
  - [ ] `20251120000003_setup_avatars_storage.sql` (Avatar storage bucket)
  - [ ] `20251120000004_extract_google_avatar.sql` (Google OAuth avatar extraction)
  - [ ] `20251120000005_money_view_v1.sql` (Payment status system)
  - [ ] All other migrations
- [ ] You have the production URL (e.g., `https://your-app.vercel.app`)
- [ ] Supabase Storage bucket `avatars` exists and is publicly readable
- [ ] Supabase RLS policies are enabled

---

## 🎨 Layout & Navigation (Step 29)

### Two-Row Sticky Header

**All pages:**

- [ ] Two-row sticky header is visible at top
- [ ] Header stays visible when scrolling
- [ ] Header background has proper blur/transparency effect

### Row 1: Global App Bar

**Navigation:**
- [ ] Logo displays correctly on left
- [ ] "Gig Brain" subtitle visible
- [ ] Nav items visible: Dashboard, Gigs, Money, Calendar, My Circle
- [ ] "More" dropdown shows: History (and future items)
- [ ] Active page is highlighted with underline indicator
- [ ] Clicking nav items navigates correctly
- [ ] Underline indicator animates smoothly

**Actions (Right Side):**
- [ ] "+ New Gig" button visible and clickable
- [ ] Clicking opens CreateGigDialog
- [ ] Notification bell shows unread count badge
- [ ] Clicking bell opens notifications dropdown
- [ ] Dark mode toggle works
- [ ] User menu dropdown works:
  - [ ] Shows user avatar and name
  - [ ] Shows email
  - [ ] "Profile" link navigates to `/profile`
  - [ ] "Settings" link navigates to `/settings/calendar`
  - [ ] "Sign Out" works and redirects

**Mobile Responsive (< 1024px):**
- [ ] Hamburger menu icon appears on mobile
- [ ] Clicking hamburger opens side drawer (Sheet)
- [ ] Side drawer shows all nav items
- [ ] Side drawer closes after selecting item
- [ ] Logo remains visible on mobile
- [ ] Actions remain visible on mobile

### Row 2: Project Bar

**Project Selector:**
- [ ] "Projects:" label with icon visible
- [ ] "All Projects" pill shows total gig count
- [ ] Top 5 projects shown as pills with counts
- [ ] Clicking project pill filters gigs
- [ ] Selected project is highlighted (filled style)
- [ ] "More" dropdown shows additional projects (if > 5)
- [ ] "View all" link navigates to `/projects`
- [ ] Project counts update in real-time

**Context Actions:**
- [ ] Search input visible on larger screens (lg+)
- [ ] Search input works on relevant pages
- [ ] Filter button placeholder visible

**Mobile Responsive:**
- [ ] Project bar scrolls horizontally on mobile
- [ ] Touch swipe works for scrolling projects

---

## 👤 Profile Avatars (Step 21)

### Avatar Display

**Header / User Menu:**
- [ ] User avatar displays in top-right user menu button
- [ ] If no avatar, shows initials (first 2 letters of name)
- [ ] Avatar is circular
- [ ] Clicking avatar opens user menu dropdown

**Sidebar / App Header:**
- [ ] Avatar displays consistently throughout app
- [ ] Fallback to initials works everywhere
- [ ] Avatar images load quickly
- [ ] Broken images fall back to initials gracefully

### Avatar Upload

**Profile Page (`/profile`):**

- [ ] Profile page shows current avatar or initials
- [ ] "Upload Avatar" button is visible
- [ ] Clicking button opens file picker
- [ ] Can select image file (JPEG, PNG, WebP, GIF)
- [ ] File size validation works (max 5MB)
- [ ] Shows error for invalid file types
- [ ] Shows error for oversized files
- [ ] Upload progress/feedback is shown
- [ ] Avatar updates immediately after upload
- [ ] New avatar appears throughout app instantly
- [ ] Can replace existing avatar
- [ ] Old avatar is overwritten (not duplicated)

### Google OAuth Avatar Import

**For users who sign up with Google:**
- [ ] Google profile picture is automatically imported on first signup
- [ ] Avatar is stored in Supabase Storage `avatars` bucket
- [ ] Avatar URL is saved to `profiles.avatar_url`
- [ ] Avatar displays correctly after signup
- [ ] User can still manually upload different avatar

### Storage & Security

**Supabase Storage (`avatars` bucket):**
- [ ] Avatars are publicly readable (can view without auth)
- [ ] Users can only upload to their own folder
- [ ] Users can only update their own avatar
- [ ] Users can only delete their own avatar
- [ ] Cannot access or modify other users' avatars
- [ ] Path structure: `{user_id}/avatar.{ext}`

---

## 💰 Money View v1 (Step 22)

### Enhanced Payment System

**Migration Applied:**
- [ ] `payment_status` field exists (replaces old `is_paid` boolean)
- [ ] Values: 'pending', 'paid', 'partial', 'overdue'
- [ ] `paid_amount` field exists (for partial payments)
- [ ] `currency` field exists (defaults to 'ILS')

### My Earnings (Player View)

**URL:** `/money`

**Summary Cards (Top):**
- [ ] "Unpaid Gross" card shows total unpaid amount
- [ ] "Paid (All Time)" card shows total lifetime earnings
- [ ] "This Month" card shows current month earnings
- [ ] Currency displays correctly (ILS)
- [ ] Amounts are accurate
- [ ] Cards update when filters change

**Filters:**
- [ ] Year dropdown works (shows current and past years)
- [ ] Month dropdown works (All Months, Jan-Dec)
- [ ] Status filter works:
  - [ ] "All" shows everything
  - [ ] "Paid" shows only paid gigs
  - [ ] "Unpaid" shows pending/partial/overdue
- [ ] Table updates immediately when filters change
- [ ] Summary cards reflect filtered data

**Earnings Table:**
- [ ] Shows all gigs where user is a player
- [ ] Columns: Date, Gig, Project, Role, Location, Fee, Status, Actions
- [ ] Date format is readable
- [ ] Project name displays correctly
- [ ] Role name displays correctly
- [ ] Location shows (or "Not specified")
- [ ] Fee amount displays with currency
- [ ] Status badge colors:
  - [ ] Green for "Paid"
  - [ ] Yellow/amber for "Partial"
  - [ ] Gray for "Pending"
  - [ ] Red for "Overdue"
- [ ] Payment status badge is readable
- [ ] "..." menu appears on each row
- [ ] Clicking "..." shows actions:
  - [ ] "Mark as Paid" (if not paid)
  - [ ] "Mark as Unpaid" (if paid)
  - [ ] Actions disabled if not applicable
- [ ] Marking as paid/unpaid updates immediately
- [ ] Toast notification appears on update
- [ ] Table re-sorts after status change (if sorted by status)

**Empty State:**
- [ ] Shows "No earnings found" when no gigs
- [ ] Message changes based on active filters

**Sorting:**
- [ ] Clicking column headers sorts table
- [ ] Sort by date (ascending/descending)
- [ ] Sort by amount
- [ ] Sort by status
- [ ] Sort indicator shows current sort

### Payouts (Manager View)

**URL:** `/money` (when user is a manager)

**Tab Toggle:**
- [ ] Shows tabs: "My Earnings" | "Payouts"
- [ ] "My Earnings" tab shows player view (above)
- [ ] "Payouts" tab shows manager view

**Summary Cards (Payouts):**
- [ ] "Total Unpaid" card shows amount owed to musicians
- [ ] "Total Paid" card shows amount paid to musicians
- [ ] "This Month" card shows current month payouts
- [ ] Amounts update with filters

**Filters (Payouts):**
- [ ] Year dropdown works
- [ ] Month dropdown works
- [ ] Project filter works:
  - [ ] "All Projects" shows all
  - [ ] Individual projects filter correctly
- [ ] Status filter works (All, Paid, Unpaid)
- [ ] Table and summary update together

**Payouts Table:**
- [ ] Shows all gig roles for user's managed projects
- [ ] Columns: Date, Gig, Project, Musician, Role, Fee, Status, Actions
- [ ] Musician name displays correctly
- [ ] Can see all musicians user needs to pay
- [ ] Status badges match player view colors
- [ ] "..." menu works
- [ ] Can mark musicians as paid/unpaid
- [ ] Updates work for any musician in managed projects
- [ ] Toast notifications work

**Authorization:**
- [ ] Players can update their own payment status
- [ ] Managers can update payment status for their projects
- [ ] Cannot update payment status for other users' gigs
- [ ] API properly checks authorization

### Payment Status Updates

**Update Dialog (Optional Enhancement):**
- [ ] Dialog appears when marking as paid (if implemented)
- [ ] Can enter partial payment amount
- [ ] Can select payment date
- [ ] Validation works (amount > 0, date not future)
- [ ] Save button updates status

**Status Transitions:**
- [ ] Pending → Paid works
- [ ] Paid → Unpaid works (reversal)
- [ ] Partial payment saves amount correctly
- [ ] Overdue status calculated correctly (if implemented)

**Real-Time Updates:**
- [ ] Dashboard payment indicators update
- [ ] Money page updates without refresh
- [ ] Notifications sent on status change (if implemented)

---

## 📅 Calendar Integration (Step 15 - Phase 1)

### 1. Calendar Settings Page

**URL:** `/settings/calendar`

- [ ] Page loads without errors
- [ ] Calendar subscription URL is displayed
- [ ] URL uses production domain (not localhost)
- [ ] Token is generated automatically on first visit
- [ ] Copy button works and copies full URL
- [ ] Regenerate button shows confirmation dialog
- [ ] Regenerating creates a new token
- [ ] Old token no longer works after regeneration
- [ ] Instructions for Google/Apple/Outlook are visible

### 2. ICS Feed Endpoint

**URL:** `/api/calendar.ics?token=YOUR_TOKEN`

- [ ] Endpoint returns ICS file (not error)
- [ ] ICS file downloads or displays in browser
- [ ] File starts with `BEGIN:VCALENDAR`
- [ ] Calendar name appears: `X-WR-CALNAME:Ensemble Gigs`
- [ ] Calendar description appears: `X-WR-CALDESC:Your gigs from Ensemble`
- [ ] All your gigs appear as `BEGIN:VEVENT...END:VEVENT` blocks
- [ ] Each gig has correct title: `[Project Name] Gig Title`
- [ ] Dates and times are correct
- [ ] Locations are included (when provided)
- [ ] Description includes link to Gig Pack (production URL)
- [ ] Invalid token returns 401 error
- [ ] Missing token returns 400 error

### 3. Google Calendar Subscription

- [ ] Open Google Calendar (calendar.google.com)
- [ ] Click "+" next to "Other calendars"
- [ ] Select "From URL"
- [ ] Paste production ICS URL
- [ ] Calendar is added successfully
- [ ] Calendar name shows as "Ensemble Gigs" (or URL - Google quirk)
- [ ] Wait 5-10 minutes, then check:
  - [ ] Gigs appear in calendar
  - [ ] Dates are correct
  - [ ] Times are correct (check timezone)
  - [ ] Titles match: `[Project Name] Gig Title`
  - [ ] Locations are shown
  - [ ] Click event → description has link to Gig Pack

### 4. Apple Calendar Subscription (Mac)

- [ ] Open Apple Calendar app
- [ ] File → New Calendar Subscription
- [ ] Paste production ICS URL
- [ ] Calendar name auto-fills as "Ensemble Gigs"
- [ ] Set refresh to "Every hour"
- [ ] Calendar is added successfully
- [ ] Gigs appear immediately (or within minutes)
- [ ] Dates and times are correct
- [ ] Right-click calendar → "Refresh" works
- [ ] After refresh, new/updated gigs appear

### 5. In-App Calendar View

**URL:** `/calendar`

- [ ] Page loads without errors
- [ ] Calendar appears in top navigation
- [ ] Month view displays correctly
- [ ] Week view displays correctly
- [ ] Day view displays correctly
- [ ] All gigs appear in correct dates
- [ ] Color coding works:
  - [ ] Blue for "Playing" gigs
  - [ ] Green for "Managing" gigs
  - [ ] Purple for "Both" (manager + player)
- [ ] Filter dropdown works:
  - [ ] "All Gigs" shows everything
  - [ ] "Managing" shows only manager gigs
  - [ ] "Playing" shows only player gigs
- [ ] Click on event navigates to correct Gig Pack page
- [ ] Hover tooltip shows project, location, role
- [ ] Legend is visible and accurate
- [ ] Empty state shows when no gigs in date range
- [ ] Navigation (prev/next month) works

### 6. Conflict Detection

**Test with overlapping gigs:**

- [ ] Create two gigs on same date/time
- [ ] Get invited to both as player
- [ ] Accept first invitation → should succeed
- [ ] Try to accept second invitation:
  - [ ] Conflict warning dialog appears
  - [ ] Shows conflicting gig details (date, time, project, role)
  - [ ] "Accept Anyway" button works
  - [ ] "Cancel" button closes dialog
  - [ ] Accepting shows success toast
- [ ] Test with non-overlapping gigs → should accept directly without dialog

### 7. Calendar Settings Navigation

- [ ] "Settings" link appears in user menu dropdown
- [ ] Clicking "Settings" navigates to `/settings/calendar`
- [ ] Back navigation works correctly

### 8. Updates and Sync

**Test that changes propagate:**

- [ ] Create a new gig
- [ ] Wait 1 minute (cache expiry)
- [ ] Visit ICS URL in incognito window → new gig appears
- [ ] Google Calendar: Wait 5-10 minutes (or remove/re-add) → new gig appears
- [ ] Apple Calendar: Right-click → Refresh → new gig appears
- [ ] Edit gig (change time/location)
- [ ] Wait 1 minute
- [ ] Refresh ICS URL → changes appear
- [ ] Delete a gig
- [ ] Wait 1 minute
- [ ] Refresh ICS URL → gig is gone
- [ ] Calendar apps eventually reflect the deletion

---

## 🎯 Dashboard Features (Previously Completed)

### Dashboard Page

**URL:** `/dashboard`

- [ ] Page loads without errors
- [ ] "Upcoming Gigs" section shows future gigs
- [ ] "Recent Gigs" section shows past gigs (collapsible)
- [ ] Search bar filters by title, project, location
- [ ] Date range picker works (Next 7/30/90 days, Custom)
- [ ] Sort dropdown works (Date, Project, Status, Payment, Location)
- [ ] List/Grid view toggle works
- [ ] Role filter works (All | Managing | Playing)
- [ ] View preferences persist after page refresh
- [ ] Infinite scroll loads more gigs
- [ ] "Load More" button appears when needed

### Quick Actions (Dashboard Items)

- [ ] "..." menu appears on gig cards
- [ ] **As Player:**
  - [ ] "Mark as Paid" works (updates to payment_status: 'paid')
  - [ ] "Mark as Unpaid" works (updates to payment_status: 'pending')
  - [ ] Payment status updates reflect new enum system
  - [ ] "Accept Invitation" works (only if invited)
  - [ ] "Decline Invitation" works (only if invited)
  - [ ] Conflict detection triggers when accepting
- [ ] **As Manager:**
  - [ ] "Confirm Gig" works
  - [ ] "Cancel Gig" works
  - [ ] "Mark as Completed" works
- [ ] Toast notifications appear after each action
- [ ] Dashboard updates immediately after actions
- [ ] Payment status badge reflects current state accurately

---

## 📊 History Page

**URL:** `/history`

- [ ] Page loads without errors
- [ ] Shows past gigs only (before today)
- [ ] Search works (title, project, location)
- [ ] Date range presets work (Last 30/90 days, Last year, All time, Custom)
- [ ] Role filter works
- [ ] Sort options work
- [ ] Infinite scroll works
- [ ] "Load More" button works
- [ ] View preferences persist

---

## 👥 Profile & Settings

### Profile Page

**URL:** `/profile`

- [ ] Page loads without errors
- [ ] User info displays correctly
- [ ] Edits save successfully

### Calendar Settings

**URL:** `/settings/calendar`

- [ ] Already tested above (see Calendar Integration section)

---

## 🎵 Gigs & Projects

### Projects Page

**URL:** `/projects`

- [ ] Page loads without errors
- [ ] All user projects are listed
- [ ] Create new project works
- [ ] Click project navigates to project detail

### Gig Detail Page

**URL:** `/gigs/[id]`

- [ ] Page loads without errors
- [ ] All gig info displays correctly
- [ ] Edit gig works
- [ ] Manage lineup works (as manager)

### Gig Pack Page

**URL:** `/gigs/[id]/pack`

- [ ] Page loads without errors
- [ ] Shows logistics (date, time, location)
- [ ] Shows music (setlist, files)
- [ ] Shows people (roles, musicians)
- [ ] Shows money (fees, payment status)
- [ ] Accept/Decline invitation works (as player)
- [ ] Conflict detection works when accepting

---

## 🔐 Authentication

### Sign In

**URL:** `/auth/sign-in`

- [ ] Page loads without errors
- [ ] Sign in with email/password works
- [ ] Magic link sign in works (if enabled)
- [ ] Error messages display correctly
- [ ] Redirect after sign in works

### Sign Up

**URL:** `/auth/sign-up`

- [ ] Page loads without errors
- [ ] Sign up works
- [ ] Email verification works (if required)
- [ ] Profile is created automatically
- [ ] Redirect after sign up works

### Sign Out

- [ ] Sign out button in user menu dropdown works
- [ ] Redirects to sign in page
- [ ] User is logged out completely
- [ ] Session is properly cleared

---

## 🔒 Security & Permissions

### Row Level Security (RLS)

- [ ] Users can only see their own data
- [ ] Cannot access other users' gigs
- [ ] Cannot access other users' profiles
- [ ] Calendar tokens are properly isolated per user
- [ ] API endpoints respect RLS policies

### Calendar Token Security

- [ ] Token is unique per user
- [ ] Cannot guess or brute-force tokens
- [ ] Old tokens are invalidated after regeneration
- [ ] Invalid tokens return 401 (not data)
- [ ] Tokens are not exposed in logs

---

## 📱 Mobile Responsiveness

### Test on Mobile Device

- [ ] Dashboard displays correctly
- [ ] Calendar view is usable on mobile
- [ ] Settings page is readable
- [ ] Navigation works smoothly
- [ ] Touch interactions work (tap, scroll, swipe)
- [ ] Forms are usable (input, dropdowns, date pickers)

---

## ⚡ Performance

### Load Times

- [ ] Dashboard loads in < 2 seconds
- [ ] Calendar view loads in < 2 seconds
- [ ] ICS endpoint responds in < 1 second
- [ ] Gig detail page loads in < 2 seconds

### Caching

- [ ] ICS feed caches for 1 minute
- [ ] TanStack Query caches dashboard data (5 min)
- [ ] No unnecessary refetches on navigation

### Database Performance

- [ ] Dashboard with 100+ gigs loads quickly
- [ ] Search is fast (< 500ms)
- [ ] Infinite scroll is smooth
- [ ] No N+1 query issues

---

## 🐛 Error Handling

### Common Errors

- [ ] 404 pages display correctly
- [ ] 500 errors show user-friendly message
- [ ] Network errors show helpful message
- [ ] Database errors are caught and logged
- [ ] Invalid calendar tokens show 401 with clear message
- [ ] Missing data shows empty states (not crashes)

### Edge Cases

- [ ] Gig with no start/end time displays correctly in calendar
- [ ] Gig spanning midnight shows correctly
- [ ] Past gigs appear in Recent Gigs
- [ ] Future gigs appear in Upcoming
- [ ] Empty states show when no data
- [ ] Conflict detection handles edge cases (same time, overnight gigs)

---

## 🎨 UI/UX

### Visual Check

- [ ] All pages follow consistent design
- [ ] shadcn/ui components render correctly
- [ ] Colors and typography are consistent
- [ ] Icons are clear and appropriate
- [ ] Spacing and alignment are correct
- [ ] Dark mode works (if implemented)

### User Experience

- [ ] Loading states appear while fetching data
- [ ] Skeleton loaders show during data load
- [ ] Toast notifications are clear and timely
- [ ] Error messages are helpful (not technical)
- [ ] Confirmation dialogs appear for destructive actions
- [ ] Navigation is intuitive
- [ ] Buttons have clear labels

---

## 📝 Documentation

### Check Documentation

- [ ] README.md is up-to-date
- [ ] BUILD_STEPS.md includes latest features:
  - [ ] Step 15 (Calendar Integration)
  - [ ] Step 21 (Profile Avatars)
  - [ ] Step 22 (Money View v1)
  - [ ] Step 29 (Layout Refactor)
- [ ] Build process docs exist:
  - [ ] `docs/build-process/step-8-calendar-integration-phase-1.md`
  - [ ] `docs/build-process/step-21-profile-avatars.md`
  - [ ] `docs/build-process/step-22-money-view-v1.md`
  - [ ] `docs/build-process/step-29-layout-refactor-top-header.md`
- [ ] `docs/future-enhancements/calendar-integration-roadmap.md` exists
- [ ] All code has inline comments where needed

---

## ✅ Final Checks

### Before Announcing to Users

- [ ] All critical features tested and working
- [ ] No major bugs or errors
- [ ] Performance is acceptable
- [ ] Security has been reviewed
- [ ] Calendar subscription works end-to-end
- [ ] Mobile experience is acceptable
- [ ] Error handling is user-friendly

### Production Environment

- [ ] Database backups are configured
- [ ] Error monitoring is set up (Sentry, etc.)
- [ ] Analytics are configured (if desired)
- [ ] Environment variables are secure (not in git)
- [ ] SSL/HTTPS is working
- [ ] Domain is configured correctly

---

## 🎉 Ready to Launch!

Once all items are checked, you're ready to:
1. ✅ Invite test users (friends)
2. ✅ Gather feedback
3. ✅ Monitor for issues
4. ✅ Plan Phase 1.5 (Google Calendar OAuth)

---

## 🔗 Related Documentation

- `BUILD_STEPS.md` - Full build history
- `docs/build-process/step-8-calendar-integration-phase-1.md` - Calendar implementation
- `docs/build-process/step-21-profile-avatars.md` - Avatar system implementation
- `docs/build-process/step-22-money-view-v1.md` - Payment status system implementation
- `docs/build-process/step-29-layout-refactor-top-header.md` - Two-row header layout
- `docs/future-enhancements/calendar-integration-roadmap.md` - Phase 1.5 roadmap
- `docs/future-enhancements/dashboard-improvements.md` - Dashboard features
- `VERCEL_DEPLOYMENT_INSTRUCTIONS.md` - Deployment guide
- `ENVIRONMENT_VARIABLES.md` - Environment variables reference

---

**Notes:**
- Print this checklist or keep it open during deployment testing
- Check off items as you test them
- Document any issues you find
- Prioritize critical features (auth, calendar, dashboard)
- Nice-to-have features can be tested later

**Good luck with deployment! 🚀**

