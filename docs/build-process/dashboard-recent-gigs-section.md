# Dashboard Recent Gigs Section

**Date:** November 17, 2024  
**Status:** ✅ Complete  
**Feature:** Collapsible section showing recent past gigs (last 20 from past 30 days)

## Overview

Implemented a "Recent Gigs" section on the dashboard that displays completed gigs from the past 30 days. The section is collapsible (hidden by default) and provides quick access to recent gig history for payment tracking and context.

## What Was Built

### 1. API Function for Past Gigs

**File:** `lib/api/dashboard-gigs.ts`

- New function: `listRecentPastGigs(userId: string)`
- Fetches gigs from last 30 days (up to yesterday)
- Returns last 20 gigs, sorted by date descending (most recent first)
- Merges manager and player perspectives (same as main dashboard)
- Includes payment status and role information

**Key Implementation:**
```typescript
export async function listRecentPastGigs(
  userId: string
): Promise<DashboardGig[]> {
  // Calculate date range: last 30 days to yesterday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  // Fetch manager and player gigs, merge, sort descending, return last 20
  // ...
}
```

### 2. Dashboard UI Section

**File:** `app/(app)/dashboard/page.tsx`

- Collapsible "Recent Gigs" section after "Upcoming"
- Toggle button with History icon
- ChevronUp/ChevronDown icons for expand/collapse state
- Shows "(Last 30 days)" subtitle
- Loading skeletons while fetching
- Empty state when no recent gigs

**Key Implementation:**
```typescript
// State
const [showRecentGigs, setShowRecentGigs] = useState(false);

// Query (only fetches when section is expanded)
const {
  data: recentPastGigs = [],
  isLoading: isLoadingRecent,
} = useQuery({
  queryKey: ["recent-past-gigs", user?.id],
  queryFn: () => listRecentPastGigs(user!.id),
  enabled: !!user && showRecentGigs,
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

### 3. Collapsible Section UI

- Clickable header button toggles section
- History icon for visual identification
- Chevron icons indicate expand/collapse state
- Section hidden by default (collapsed)
- Smooth expand/collapse animation

**UI Structure:**
```typescript
<section className="space-y-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowRecentGigs(!showRecentGigs)}
        className="gap-2"
      >
        <History className="h-5 w-5" />
        <h3 className="text-xl font-semibold">Recent Gigs</h3>
        {showRecentGigs ? <ChevronUp /> : <ChevronDown />}
      </Button>
      <span className="text-sm text-muted-foreground">
        (Last 30 days)
      </span>
    </div>
  </div>

  {showRecentGigs && (
    // Content: loading, empty, or gig list
  )}
</section>
```

### 4. Data Display

- Uses same `DashboardGigItem` component as upcoming gigs
- Shows all gig details (title, project, location, date, roles, payment status)
- Sorted by date descending (most recent first)
- Limited to 20 gigs maximum

## Critical Patterns Followed

### ✅ Performance

- **Lazy Loading:** Only fetches when section is expanded
- **Query Enabled:** `enabled: !!user && showRecentGigs` prevents unnecessary queries
- **Stale Time:** 5 minutes (past gigs don't change often)
- **Limited Results:** Only 20 gigs to keep response size small

### ✅ UX

- **Collapsed by Default:** Doesn't clutter dashboard
- **Optional Access:** Users can expand when needed
- **Visual Feedback:** Clear icons and states
- **Loading States:** Skeletons while fetching
- **Empty States:** Helpful message when no recent gigs

### ✅ Security

- RLS policies maintained (no changes needed)
- User isolation preserved
- Cache keys include `user?.id`
- No security vulnerabilities introduced

## Features

### Date Range

- **From:** 30 days ago
- **To:** Yesterday (excludes today)
- **Reasoning:** Today's gigs might still be in progress, so we show completed gigs only

### Sorting

- **Primary:** Date descending (most recent first)
- **Secondary:** Start time descending (most recent first)
- **Result:** Most recently completed gigs appear first

### Limit

- **Maximum:** 20 gigs
- **Reasoning:** Keeps response size manageable and UI clean
- **Future:** Could add pagination if needed

### Toggle Behavior

- **Default:** Collapsed (hidden)
- **Action:** Click header to expand/collapse
- **State:** Persists during session (not saved to localStorage)
- **Query:** Only runs when expanded

## Testing Checklist

- [x] Recent section appears after Upcoming
- [x] Section is collapsed by default
- [x] Toggle button works (expand/collapse)
- [x] History icon displays
- [x] Chevron icons change state
- [x] Query only runs when expanded
- [x] Loading skeletons display while fetching
- [x] Past gigs display correctly
- [x] Empty state shows when no recent gigs
- [x] Gigs sorted by date (most recent first)
- [x] Limited to 20 gigs
- [x] Date range correct (last 30 days, up to yesterday)
- [x] Works with manager role
- [x] Works with player role
- [x] Works when user is both manager and player
- [x] TypeScript compilation passed
- [x] No linter errors
- [x] Build succeeded

## Performance Validation

✅ **Build Test:**
- Next.js build succeeded
- TypeScript compilation passed
- No linter errors
- All routes compile successfully

✅ **Query Optimization:**
- Lazy loading (only fetches when expanded)
- 5-minute stale time (appropriate for past data)
- Limited to 20 results
- Efficient merging (same pattern as main dashboard)

✅ **User Experience:**
- Collapsed by default (doesn't impact initial load)
- Fast expand/collapse (no animation lag)
- Clear visual feedback
- Helpful empty states

## Security Validation

✅ **RLS Enforcement:**
- No changes to RLS policies
- User isolation maintained
- Date filtering doesn't bypass security

✅ **Cache Isolation:**
- Cache keys include `user?.id`
- No cross-user data leakage possible
- Each user gets own cache

## Known Limitations

1. **Session-Only State:** Toggle state not persisted (resets on page refresh). Could be enhanced with localStorage.
2. **Fixed Date Range:** Always last 30 days. Could be made configurable.
3. **Fixed Limit:** Always 20 gigs. Could add pagination or "Load More".
4. **No Search:** Recent gigs not searchable (would need separate search implementation).

## Future Enhancements

1. **Persist Toggle State:** Save `showRecentGigs` to localStorage
2. **Configurable Date Range:** Let users choose 7/30/90 days
3. **Pagination:** Add "Load More" for users with many past gigs
4. **Search Integration:** Include recent gigs in search results
5. **Filter Integration:** Apply role filters to recent gigs
6. **Full History Link:** Link to dedicated history page (when built)
7. **Export/Download:** Export recent gigs for record-keeping

## Files Modified

1. `lib/api/dashboard-gigs.ts` - Added `listRecentPastGigs()` function
2. `app/(app)/dashboard/page.tsx` - Added Recent Gigs section UI

## Files Created

1. `docs/build-process/dashboard-recent-gigs-section.md` - This file

## Related Documentation

- Plan: `dashboard-improvements.md` (#6 complete)
- Date range filter: `docs/build-process/dashboard-date-range-filter.md`
- Pagination: `docs/build-process/dashboard-pagination-infinite-scroll.md`
- Search: `docs/build-process/dashboard-search-functionality.md`
- Dashboard build: `BUILD_STEPS.md`

## Summary

Successfully implemented a collapsible "Recent Gigs" section that displays the last 20 completed gigs from the past 30 days. The section is hidden by default, providing optional access to recent history without cluttering the dashboard. Users can quickly view completed gigs for payment tracking and context.

**Key Achievement:** Optional, performant access to recent gig history that doesn't impact dashboard load time or clutter the UI.

