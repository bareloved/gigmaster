# Dashboard Future Improvements

This document tracks potential enhancements to the Dashboard page (`/app/(app)/dashboard/page.tsx`).

**Current Status:** Dashboard unified view with filters, search, pagination, quick actions, sorting, and preferences persistence is complete.

**Last Updated:** November 17, 2025 - Completed: server-side filtering, pagination, search, recent gigs, quick actions, sorting, and preferences persistence.

---

## 1. Server-Side Filtering & Date Range Selection ✅ COMPLETE

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Performance improvement for large datasets  
**Status:** ✅ Completed November 17, 2024

### Current State (Before)
- Client-side filtering only (filters applied in JavaScript after fetching)
- Fixed date range (today to +90 days)
- All filtering happens in browser

### Implemented Solution
- Add server-side date range filtering via `ListDashboardGigsOptions` parameter
- Allow users to select custom date ranges (e.g., "Next 30 days", "This month", "Custom range")
- Pass date range to `listDashboardGigs()` API function
- Reduce data transfer for users with many gigs

### Benefits
- Better performance with large datasets
- Reduced bandwidth usage
- More flexible date range selection
- Foundation for advanced filtering

### What Was Built
- ✅ Date range presets: Next 7/30/90 days
- ✅ Custom date range picker (shadcn Calendar + Popover)
- ✅ Server-side filtering via `ListDashboardGigsOptions`
- ✅ TanStack Query cache keys include date range
- ✅ Visual indicator showing selected range
- ✅ Time filters work within selected date range
- ✅ Mobile responsive design

### Documentation
- `docs/build-process/dashboard-date-range-filter.md`

---

## 2. Pagination or "Load More" ✅ COMPLETE

**Priority:** Medium  
**Complexity:** Low-Medium  
**Impact:** Better handling of large gig lists  
**Status:** ✅ Completed November 17, 2024

### Current State (Before)
- Limited to 100 gigs max in query
- All results loaded at once
- "Upcoming" section uses ScrollArea for long lists

### Implemented Solution
- ✅ Infinite scroll with Intersection Observer (auto-loads when scrolling)
- ✅ "Load More" button as fallback/alternative
- ✅ Paginated results: 20 gigs per page
- ✅ TanStack Query's `useInfiniteQuery` for efficient data fetching
- ✅ Loading states with spinner

### What Was Built
- ✅ API updated to support `limit` and `offset` parameters
- ✅ Returns `{ gigs, hasMore, total }` for pagination control
- ✅ `useInfiniteQuery` replaces `useQuery` in dashboard
- ✅ Intersection Observer for automatic infinite scroll
- ✅ "Load More" button with loading state
- ✅ Works in both grid and list views
- ✅ Loading spinner during fetch

### Benefits
- ✅ Handle hundreds of gigs without performance issues
- ✅ Faster initial page load (only 20 gigs initially)
- ✅ Better UX for users with many upcoming gigs
- ✅ Reduced memory usage
- ✅ Smooth infinite scroll experience

### Documentation
- `docs/build-process/dashboard-pagination-infinite-scroll.md`

---

## 3. Search Functionality ✅ COMPLETE

**Priority:** High  
**Complexity:** Low  
**Impact:** Quick access to specific gigs  
**Status:** ✅ Completed November 17, 2024

### Current State (Before)
- Filter by role (All/Managing/Playing) and time (Today/This Week/All)
- No text search capability

### Implemented Solution
- ✅ Search bar above date range filters
- ✅ Search by: Gig title, Project name, Location name
- ✅ Real-time filtering as user types (with 300ms debounce)
- ✅ Clear search button (X icon)
- ✅ Client-side filtering (simple string matching)
- ✅ Works seamlessly with existing filters

### What Was Built
- ✅ Search input field with Search icon
- ✅ Debounced search (300ms delay)
- ✅ Clear button appears when search has text
- ✅ Case-insensitive search across gig title, project name, and location
- ✅ Integrated with role and time filters
- ✅ Updated empty state messages for search results

### Benefits
- ✅ Quick access to specific gigs
- ✅ Essential as gig list grows
- ✅ Better UX for power users
- ✅ Works with existing filters (role, time, date range)
- ✅ Fast client-side filtering

### Documentation
- `docs/build-process/dashboard-search-functionality.md`

---

## 4. Status Filter

**Priority:** Low  
**Complexity:** Low  
**Impact:** Focus on specific gig statuses

### Current State
- Shows all gig statuses (confirmed, draft, cancelled, etc.)
- Status displayed as badge on each gig item

### Proposed Enhancement
- Add status filter dropdown/pills
- Filter by: All, Confirmed, Draft, Cancelled, etc.
- Combine with existing role and time filters
- Show count of gigs per status

### Benefits
- Focus on specific statuses
- Hide cancelled/draft gigs when needed
- Better organization for managers
- Quick status overview

### Implementation Notes
- Add status filter state
- Update `roleFilteredGigs` logic to include status filter
- Use shadcn Select or Button group
- Show status counts in filter UI

---

## 5. Multiple Roles Per Gig Display

**Priority:** Low  
**Complexity:** Medium  
**Impact:** Better clarity when user has multiple roles

### Current State
- Shows first player role if user is both manager and player
- Single `playerRoleName` field in `DashboardGig` type

### Proposed Enhancement
- Show all roles user has on the gig
- Display as: "Managing • Keys • MD" (if user is manager and plays both keys and MD)
- Or aggregate display: "Managing + 2 roles"
- Click to expand and see all roles

### Benefits
- Clearer when user has multiple roles
- Better representation of complex scenarios
- More accurate role information
- Better for users who wear many hats

### Implementation Notes
- Update `DashboardGig` type to include `playerRoleNames: string[]`
- Update API to return all roles, not just first
- Update `DashboardGigItem` to display multiple roles
- Consider UI for many roles (truncate with "+X more")

---

## 6. Recent Gigs Section ✅ COMPLETE

**Priority:** Low  
**Complexity:** Low-Medium  
**Impact:** Quick access to recent history  
**Status:** ✅ Completed November 17, 2024

### Current State (Before)
- Only shows upcoming gigs (date >= today)
- No access to past gigs from dashboard

### Implemented Solution
- ✅ "Recent Gigs" section after "Upcoming"
- ✅ Shows last 20 completed gigs from past 30 days
- ✅ Collapsible toggle to show/hide past gigs
- ✅ Separate API function for past gigs
- ✅ Sorted by date (most recent first)

### What Was Built
- ✅ `listRecentPastGigs()` API function
- ✅ Fetches gigs from last 30 days (up to yesterday)
- ✅ Returns last 20 gigs, sorted by date descending
- ✅ Collapsible section with History icon
- ✅ Loading states and empty states
- ✅ Works with manager and player roles

### Benefits
- ✅ Quick access to recent history
- ✅ See what you just completed
- ✅ Better context for upcoming gigs
- ✅ Useful for payment tracking
- ✅ Optional (collapsed by default)

### Documentation
- `docs/build-process/dashboard-recent-gigs-section.md`

---

## 7. Quick Actions on Dashboard Items ✅ COMPLETE

**Priority:** Medium  
**Complexity:** Medium  
**Impact:** Faster workflows  
**Status:** ✅ Implemented (2025-11-17)

### Implementation Details
- Added dropdown menu with quick actions to dashboard gig cards
- Installed sonner for toast notifications
- Created `lib/api/gig-actions.ts` with API functions for:
  - Mark as paid/unpaid
  - Accept/decline invitations
  - Update gig status (for managers)
- Added `playerGigRoleId` to DashboardGig interface
- Implemented mutations with TanStack Query for cache invalidation
- Added dropdown to both list and grid view components
- Actions conditionally shown based on user role and gig state
- Toast notifications for success/error feedback

See: `docs/build-process/dashboard-quick-actions.md`

### Current State
- Click card to view detail page
- "Gig Pack" button
- "Manage" button (for managers)

### Proposed Enhancement
- Inline quick actions:
  - Mark as paid (for players)
  - Quick status update (for managers)
  - Confirm/decline invitation (for players)
  - Add to calendar
- Dropdown menu on each gig card
- Hover actions or action buttons

### Benefits
- Faster workflows without leaving dashboard
- Common actions accessible immediately
- Better mobile UX
- Reduced navigation

### Implementation Notes
- Add DropdownMenu component to gig items
- Create quick action API functions
- Optimistic UI updates
- Toast notifications for success/error
- Consider permissions (only show actions user can perform)

---

## 8. Dashboard Statistics/Summary Cards

**Priority:** High  
**Complexity:** Medium  
**Impact:** At-a-glance insights

### Current State
- Just lists of gigs
- No summary information

### Proposed Enhancement
- Add summary cards at top:
  - "Gigs this week" count
  - "Total unpaid" amount (for players)
  - "Upcoming confirmations needed" count
  - "Gigs this month" count
- Role-specific summaries:
  - Players: Earnings, unpaid, upcoming
  - Managers: Gigs managed, pending invitations, total revenue
- Click cards to filter to relevant gigs

### Benefits
- At-a-glance insights
- Quick financial overview
- Better decision making
- Professional dashboard feel

### Implementation Notes
- Create summary API functions
- Add summary cards component
- Use shadcn Card components
- Calculate stats from filtered gigs
- Cache summary data (TanStack Query)
- Consider separate query or calculate from existing data

---

## 9. Sort Options ✅ COMPLETE

**Priority:** Low  
**Complexity:** Low  
**Impact:** Flexible organization  
**Status:** ✅ Implemented (2025-11-17)

### Implementation Details
- Added sort dropdown to each section (Today, This Week, Upcoming)
- Sort options:
  - Date (ascending/descending)
  - Project name (A-Z / Z-A)
  - Status (A-Z / Z-A)
  - Payment status (paid first / unpaid first)
  - Location (A-Z / Z-A)
- Each section has independent sort state
- Client-side sorting using `useMemo` for performance
- Sort dropdown uses shadcn/ui Select component
- Visual indicator (ArrowUpDown icon) in dropdown trigger
- User-friendly labels (e.g., "Date ↑", "Project A-Z")

### Current State
- ✅ Sorted by date/time (ascending) by default
- ✅ Full user control over sorting per section
- ✅ Independent sort preferences for each section

### Benefits
- ✅ Flexible organization
- ✅ Find gigs by different criteria
- ✅ Better for power users
- ✅ Customizable workflow

### Implementation Notes
- ✅ Added sort state to component (sortBy, sortOrder per section)
- ✅ Updated `useMemo` to apply sorting
- ✅ Added sort UI (Select dropdown)
- ✅ Client-side sorting (simple and performant)
- ⏳ Remember sort preference (future: localStorage persistence)

---

## 10. View Preferences Persistence ✅ COMPLETE

**Priority:** Medium  
**Complexity:** Low  
**Impact:** Better UX, remembers preferences  
**Status:** ✅ Implemented (2025-11-17)

### Implementation Details
- Created `loadPreferences()` and `savePreferences()` helper functions
- Persists to localStorage with key: `ensemble-dashboard-preferences`
- Saved preferences:
  - View mode (list/grid)
  - Role filter (all/manager/player)
  - Sort by and sort order
  - Recent gigs toggle state
- Loads preferences on component mount
- Saves preferences automatically when they change (useEffect)
- Handles localStorage errors gracefully (try/catch with console warnings)
- SSR-safe (checks `typeof window !== "undefined"`)

### Current State
- ✅ View mode persists across page refreshes
- ✅ Filter preferences remembered
- ✅ Sort preferences remembered
- ✅ Recent gigs section state remembered
- ⏳ Future: Sync to user profile (database) for cross-device sync

### Benefits
- ✅ Remembers user preferences
- ✅ Better UX (no need to reconfigure)
- ✅ Consistent experience
- ✅ Professional feel

### Implementation Notes
- ✅ Uses `useEffect` to save preferences to localStorage
- ✅ Loads preferences on component mount
- ✅ Handles localStorage errors gracefully
- ⏳ Future: Create reusable `useLocalStorage` hook for other components
- ⏳ Future: Sync to user profile (database) for cross-device preferences

---

## Implementation Priority Recommendations

### ✅ Completed Features
1. ✅ **#1 - Server-Side Filtering & Date Range** - Completed November 17, 2024
2. ✅ **#2 - Pagination & Infinite Scroll** - Completed November 17, 2024
3. ✅ **#3 - Search Functionality** - Completed November 17, 2024
4. ✅ **#6 - Recent Gigs Section** - Completed November 17, 2024
5. ✅ **#7 - Quick Actions** - Completed November 17, 2024
6. ✅ **#9 - Sort Options** - Completed November 17, 2024
7. ✅ **#10 - View Preferences Persistence** - Completed November 17, 2024

### Remaining Features (Future Work)
1. **#4 - Status Filter** - Simple addition, useful for managers
2. **#5 - Multiple Roles Display** - Edge case, can wait
3. **#8 - Dashboard Statistics** - Adds significant value, moderate effort

---

## Notes

- All improvements should maintain existing performance safeguards
- TanStack Query cache keys must include `user?.id`
- Keep mobile responsiveness in mind
- Test with large datasets (100+ gigs)
- Consider impact on loading times
- Document any API changes

---

## Related Documentation

- Current dashboard implementation: `app/(app)/dashboard/page.tsx`
- Dashboard API: `lib/api/dashboard-gigs.ts`
- Dashboard components: `components/dashboard-gig-item.tsx`, `components/dashboard-gig-item-grid.tsx`
- Dashboard build documentation: See BUILD_STEPS.md (Step 8)

