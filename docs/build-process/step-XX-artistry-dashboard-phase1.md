# Step XX: Artistry Dashboard - Phase 1 Implementation

**Date**: November 21, 2025  
**Status**: ✅ Complete  
**Phase**: Phase 1 - Real Data Integration

## Overview

Converted the artistry dashboard preview (`/dashboard-artistry-preview`) into the production dashboard (`/dashboard`) using real API calls and existing backend infrastructure.

## What Was Built

### 1. Artist-Focused Dashboard Layout

Replaced the existing dashboard with a new artist-first design that emphasizes gig preparation over analytics:

- **Next Gig Hero Card**: Large, prominent card showing the user's next upcoming gig
- **This Week on Stage List**: Filterable list of gigs in the next 7 days
- **Money Snapshot**: Small, de-emphasized financial summary
- **Focus Mode**: UI-only toggle to hide distractions
- **Top KPI Cards**: Quick stats (gigs this week, unpaid count, monthly total)

### 2. Real API Integration

Connected all features to existing APIs:

**Gigs Data**:
- API: `lib/api/dashboard-gigs.ts` - `listDashboardGigs()`
- Query: Next 7 days of gigs
- Includes: Manager/player perspective, roles, payment status
- Caching: TanStack Query with 2-minute stale time

**Money Data**:
- API: `lib/api/player-money.ts` - `getPlayerMoneySummary()`
- Query: Current month earnings
- Shows: Total expected, unpaid amount, gig count
- Caching: 5-minute stale time

**Role Filtering**:
- Filters: All, Hosted, Playing, Subbing, MD
- Logic: Client-side filtering on `isManager`, `isPlayer`, `invitationStatus`, `playerRoleName`

**Project Filtering**:
- Integration: Reads `?project=X` from URL params (set by ProjectBar)
- Filters gigs by `projectId` when not "all"

### 3. Features Implemented (Working Now)

✅ **Next Gig Display**:
- Date pill (weekday + day number)
- Gig title, project name, location
- Start/end times
- User's role (if playing)
- "Hosted by You" badge (if managing)
- Status badges (gig status, invitation status, payment status)
- Quick action buttons with links

✅ **Quick Actions**:
- "View Gig Details" → `/gigs/[id]`
- "Open Gig Pack" → `/gigs/[id]/pack`
- Keyboard shortcut hints on hover (G, P keys)
- Tooltips explaining shortcuts

✅ **This Week on Stage**:
- Scrollable list of upcoming gigs (7 days)
- Role filters (All/Hosted/Playing/Subbing/MD)
- Each card shows: date, title, project, location, role, status
- Click to navigate to gig detail
- Empty state when no gigs match filters

✅ **Money Snapshot**:
- Monthly total (earned + unpaid)
- Unpaid amount badge
- Gig count
- "Go to Money view" link
- Visually de-emphasized (dashed border, small size)

✅ **Focus Mode** (UI Only):
- Toggle button in header
- Hides: KPI cards, This Week list, Money snapshot, "Coming Soon" card
- Shows: Only Next Gig hero
- Blue indicator banner when active
- State persists during session (not saved to localStorage yet)

✅ **Top KPIs**:
- Gigs this week count
- Hosted vs Playing breakdown
- Total gigs (next 7 days)
- Unpaid gigs count
- Monthly total expected

### 4. Features Placeholders (Not Built Yet)

These appear as visual elements but have no backend:

❌ **Readiness Tracking**:
- No DB schema exists yet
- Would need: `gig_readiness` table or JSONB field
- Fields: songs learned, charts ready, sounds ready, travel checked, gear packed

❌ **Practice Focus**:
- No learning status tracking
- Would need: `setlist_learning_status` table
- Relationship: musician → setlist_item → learned status

❌ **Activity Feed** ("Band & Changes"):
- No activity log system
- Would need: `activity_log` table
- Track: setlist changes, file uploads, role changes, notes

❌ **Prep Status Auto-Calculation**:
- Would derive from readiness data
- Values: "ready" | "in_progress" | "needs_sub"

A "Coming Soon" card appears in the sidebar showing these placeholder features.

## Technical Decisions

### Data Fetching Strategy

**Why 7-day window?**
- Balances performance with usefulness
- Most musicians care about "this week" not "next month"
- Can paginate or extend range if needed

**Why TanStack Query?**
- Already used throughout app for consistency
- Built-in caching reduces API calls
- Automatic refetching on window focus
- Easy invalidation after mutations

**Why client-side filtering?**
- Role filter: Simple boolean logic, no performance impact
- Project filter: Already fetched, no need to re-query
- Keeps UI responsive with instant filter changes

### Component Structure

**Monolithic page component:**
- All logic in one file for now
- Easier to understand data flow
- Can refactor to smaller components later if needed

**Dynamic imports:**
- `CreateGigDialog` lazy-loaded (only when clicking "Create Gig")
- Reduces initial bundle size
- Improves page load performance

### User Experience

**Focus Mode Design:**
- Inspired by Notion's focus mode, Figma's presentation mode
- Addresses musician need: "Just show me what I need to prep"
- No localStorage persistence yet (can add later if users want it)

**Money De-Emphasis:**
- Intentional: Dashboard is about prep, not finances
- Dashed border, small size, muted colors
- Placed in sidebar, not main column
- Link to full money page for details

**Empty States:**
- "No upcoming gigs" state with "Create a Gig" CTA
- "No gigs match filters" when filters exclude everything
- Prevents confusion when list is empty

## Files Modified

### Created
- None (only modified existing dashboard page)

### Modified
- `app/(app)/dashboard/page.tsx` - Complete rewrite with new design

### Dependencies
- Uses existing APIs: `dashboard-gigs.ts`, `player-money.ts`
- Uses existing components: `GigStatusBadge`, `CreateGigDialog`, shadcn/ui
- Uses existing hooks: `useUser`, TanStack Query

## Database Schema

No database changes needed! All features use existing schema:

- `gigs` table: date, times, location, status
- `gig_roles` table: musician assignments, payment status
- `projects` table: ownership for manager/player determination
- `profiles` table: user data

## Performance Considerations

### Query Optimization

✅ **Limited date range**: Only 7 days of gigs fetched  
✅ **Pagination support**: `listDashboardGigs` supports limit/offset (using limit=50)  
✅ **Caching**: 2-minute stale time prevents excessive refetches  
✅ **Lazy loading**: CreateGigDialog loaded on demand  

### Rendering Optimization

✅ **useMemo for filtering**: Role/project filters use memoization  
✅ **Skeleton states**: Show loading skeletons while fetching  
✅ **No N+1 queries**: Single query fetches gigs with roles/projects  

### Future Optimizations

When needed:
- Add virtual scrolling if gig list grows large
- Implement infinite scroll for longer date ranges
- Add request debouncing if filters become complex
- Consider server-side filtering for large datasets

## Security Considerations

✅ **RLS Policies**: All gigs fetched respect Row Level Security  
✅ **User context**: Only shows gigs where user is manager or player  
✅ **No sensitive data exposure**: Money summary only shows user's own earnings  
✅ **Client-side validation**: Filter logic prevents unauthorized access  

## Testing Checklist

Manual testing completed:

- [x] Dashboard loads with real gigs
- [x] Next Gig displays correct data
- [x] Quick action buttons navigate correctly
- [x] Role filters work (All/Hosted/Playing/Subbing/MD)
- [x] Project filter works (from ProjectBar URL param)
- [x] Money snapshot shows accurate totals
- [x] Focus mode toggle hides/shows sections
- [x] Empty states display when no gigs
- [x] Keyboard shortcut hints appear on hover
- [x] Loading states show during fetch
- [x] Create Gig dialog opens and creates gigs
- [x] Navigation to gig detail pages works
- [x] No linter errors
- [x] No console errors
- [x] Responsive on mobile/tablet/desktop

## Known Limitations

1. **No readiness tracking** - Placeholder only, needs backend
2. **No practice focus** - Placeholder only, needs learning status schema
3. **No activity feed** - Placeholder only, needs activity log system
4. **No keyboard shortcuts active** - Only hints shown, no event listeners
5. **Focus mode not persisted** - State resets on page refresh
6. **7-day limit** - No way to extend range beyond 7 days currently

## Next Steps (Phase 2)

To implement the placeholder features:

### Task 2A: Readiness Tracking Backend
- [ ] Design `gig_readiness` schema (per gig or per musician-per-gig?)
- [ ] Create migration
- [ ] Build API functions (get/update readiness)
- [ ] Add RLS policies
- [ ] Wire to dashboard UI

### Task 2B: Practice Tracking Backend
- [ ] Design learning status schema
- [ ] Create `setlist_learning_status` table
- [ ] Build API for marking songs learned
- [ ] Create "Practice Focus" widget
- [ ] Allow marking songs complete

### Task 2C: Activity Feed Backend
- [ ] Design `activity_log` table
- [ ] Create triggers for auto-logging changes
- [ ] Build API to fetch recent activity
- [ ] Create "Band & Changes" widget
- [ ] Optional: Add real-time subscriptions

### Phase 3: Polish & UX
- [ ] Add keyboard shortcut event listeners (G, P, S, F keys)
- [ ] Save focus mode preference to localStorage
- [ ] Add segmented progress bar for readiness
- [ ] Add expand/collapse for breakdown
- [ ] Smooth transitions and animations

## Documentation Links

- Main spec: `/docs/features/artistry-dashboard-preview.md`
- Implementation plan: Created in chat during Phase 1 kick-off
- API docs: See inline comments in `lib/api/dashboard-gigs.ts`

## Lessons Learned

1. **Start with real data first** - Building the preview with mocks was helpful for UX, but wiring real data immediately validates the design works
2. **Existing APIs are powerful** - `listDashboardGigs` already provided manager/player perspective, no changes needed
3. **Client-side filtering is fast** - For 7 days of gigs, filtering in React is instant
4. **Empty states matter** - "No gigs" state needed CTA to create first gig
5. **Gradual feature rollout works** - Showing "Coming Soon" card sets expectations without blocking launch

## Success Metrics (When Live)

Track these to measure adoption:
- % of users who visit dashboard daily
- Average time spent on dashboard
- % who use Focus Mode
- Click-through rate on quick actions
- "Create Gig" conversions from dashboard empty state

---

**Phase 1 Complete!** ✅

The dashboard now has a musician-first design with real data. Phase 2 will add the backend features (readiness, practice, activity feed).

