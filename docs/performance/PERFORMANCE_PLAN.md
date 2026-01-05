# Performance Optimization Plan
## Ensemble (Gigging Musicians App)

**Date:** November 21, 2024  
**Goal:** Transform the app into a much faster, snappier experience without breaking existing features.

---

## 1. Performance Audit

### Critical Issues Found

#### 🔴 **HIGH SEVERITY** - Dashboard Page (`app/(app)/dashboard/page.tsx`)
- **Problem:** Monolithic 810-line component with excessive complexity
- **Issues:**
  - Fetches up to 200 gigs in a single query (line 83 in `dashboard-gigs.ts`)
  - 14 separate `useState` hooks causing frequent re-renders
  - Complex `useMemo` calculations on every render (sorting, filtering, searching)
  - LocalStorage read/write on every state change (line 173-185)
  - Heavy imports: 25+ individual icon imports from lucide-react
  - Client-side date range calculations on every filter change
  - Multiple filters applied sequentially (role → project → search → sort)
- **Impact:** Slow initial load, laggy interactions, poor perceived performance

#### 🔴 **HIGH SEVERITY** - Data Fetching Patterns
- **`dashboard-gigs.ts`:**
  - `listDashboardGigs`: Fetches 200 gigs with nested relations (line 83)
  - `listRecentPastGigs`: Fetches 100 gigs (line 229)
  - `listAllPastGigs`: Fetches 500 gigs (line 341)
  - Complex client-side transformations after fetch (gigMap pattern)
  - No server-side filtering - fetches everything, filters client-side
- **`all-gigs page`:** 
  - Inline Supabase query directly in component (lines 60-103)
  - No abstraction or reusability
  - Transformation logic embedded in component
- **`calendar page`:**
  - Fetches up to 500 gigs per view change (line 74)
  - Date range changes trigger full refetch

#### 🟡 **MEDIUM SEVERITY** - Bundle Size Issues
- **Heavy Dependencies:**
  - `react-big-calendar` + `moment` (~150KB combined) - only used on calendar page
  - `googleapis` (~500KB) - loaded globally
  - No code splitting or lazy loading visible
  - All shadcn components likely loaded upfront
- **Icon Library:**
  - Individual imports from `lucide-react` (25+ icons in dashboard alone)
  - Could use tree-shaking optimization

#### 🟡 **MEDIUM SEVERITY** - Component Rendering Issues
- **`dashboard-gig-item.tsx`:**
  - 450+ lines with complex mutation logic
  - 4 separate mutations with duplicate cache invalidation (lines 50-211)
  - Each mutation invalidates 4 query keys unnecessarily
  - Conflict check API call on every "Accept" click
- **Repeated Patterns:**
  - Same query invalidation code duplicated across all mutations
  - No abstraction for common mutation logic
  - Heavy badge/icon rendering in tight loops

#### 🟡 **MEDIUM SEVERITY** - Layout & Providers
- **`app/(app)/layout.tsx`:**
  - Sequential loading: user fetch → prefetch projects (lines 21-52)
  - Full-screen loading blocks UI until prefetch completes
  - Projects prefetched even if not needed on current page
- **`user-provider.tsx`:**
  - Two sequential queries (auth user, then profile) (lines 33-58)
  - Could be combined into single query or run in parallel
  - Auth listener triggers unnecessary re-fetches

#### 🟢 **LOW SEVERITY** - Minor Issues
- LocalStorage operations without error boundaries
- Console logs in production code
- Inline styles in calendar page (lines 288-320)
- Date formatting repeated multiple times per gig item
- No virtualization for long lists (gigs, money entries)

---

## 2. Performance Targets

### Initial Load Performance
- **Target:** Dashboard usable in < 2 seconds on average hardware
- **Current Estimate:** 4-6 seconds (based on code analysis)
- **Key Metrics:**
  - Time to First Contentful Paint (FCP): < 1.5s
  - Time to Interactive (TTI): < 2.5s
  - Largest Contentful Paint (LCP): < 2.5s

### Interaction Performance
- **Target:** All interactions feel instant (< 200ms response time)
- **Specific Targets:**
  - Filter/sort gigs: < 100ms
  - Search results: < 200ms (with debounce)
  - Navigation between pages: < 100ms (instant feel)
  - Dropdown/modal open: < 16ms (single frame)

### Bundle Size
- **Target:** Reduce initial bundle by 30-40%
- **Current Estimate:** ~1.5MB (uncompressed)
- **Target:** < 1MB (uncompressed)
- **Strategy:** Code splitting, lazy loading, tree shaking

### Data Fetching
- **Target:** Reduce over-fetching by 60-80%
- **Strategy:**
  - Paginate to 20 items max per query
  - Server-side filtering where possible
  - Selective column fetching (no `SELECT *`)

---

## 3. Data Fetching Optimization Plan

### Phase 1: Dashboard API Refactor (High Priority)

**Problem:** Fetching 200+ gigs with nested relations on every dashboard load.

**Solution:**
1. **Reduce default limit to 20** in `listDashboardGigs` (line 83)
2. **Add server-side filtering:**
   ```typescript
   // Add roleFilter param to API function
   listDashboardGigs(userId, {
     from, to, limit, offset,
     roleFilter?: 'all' | 'manager' | 'player'
   })
   ```
3. **Selective column fetching:**
   - Don't fetch `gig_roles` array if user is only manager
   - Don't fetch full project data if not needed
   - Only fetch payment status for player view

**Implementation Files:**
- `lib/api/dashboard-gigs.ts` - Update all query functions
- `app/(app)/dashboard/page.tsx` - Pass roleFilter to API

**Expected Impact:** 60-80% reduction in data transferred per load

---

### Phase 2: Pagination & Infinite Scroll (High Priority)

**Problem:** Loading hundreds of gigs upfront causes slow renders.

**Solution:**
1. **Dashboard already has infinite scroll** - verify it works correctly
2. **Reduce page size from 20 to 10** for initial load
3. **Add pagination to money view** (currently loads all)
4. **Add pagination to history page** (loads 500 at once)

**Implementation Files:**
- `app/(app)/money/page.tsx` - Add pagination
- `app/(app)/history/page.tsx` - Add pagination

**Expected Impact:** 50% faster initial render

---

### Phase 3: Query Deduplication (Medium Priority)

**Problem:** Same gig data fetched multiple times on different pages.

**Solution:**
1. **Leverage TanStack Query cache:**
   - Use consistent query keys across pages
   - Set appropriate staleTime (currently 2 min - good)
   - Implement cache warming for common navigations
2. **Shared hooks for common queries:**
   ```typescript
   // hooks/use-gig-query.ts
   export function useGigQuery(gigId: string) {
     return useQuery({
       queryKey: ['gig', gigId],
       queryFn: () => getGig(gigId),
       staleTime: 1000 * 60 * 5, // 5 min
     });
   }
   ```

**Implementation Files:**
- Create `hooks/use-gig-query.ts`
- Create `hooks/use-project-query.ts`
- Update all components using direct useQuery

**Expected Impact:** Eliminate redundant fetches, faster navigation

---

### Phase 4: Optimize Nested Queries (Medium Priority)

**Problem:** Deeply nested Supabase queries (gigs → projects → profiles → gig_roles).

**Solution:**
1. **Flatten where possible:**
   - Cache project names in gigs table (denormalization)
   - Use database views for common joins
2. **Reduce join depth:**
   - Separate queries for detail vs. list views
   - Only join what's needed for each view
3. **Add database indexes:**
   - Ensure indexes on `gig_roles.musician_id`
   - Ensure indexes on `gigs.date`
   - Ensure indexes on `projects.owner_id`

**Implementation Files:**
- `lib/api/dashboard-gigs.ts` - Simplify joins
- New migration file for indexes (if not exist)

**Expected Impact:** 30-40% faster query execution

---

### Phase 5: Conflict Check Optimization (Low Priority)

**Problem:** `checkGigConflicts` API call on every "Accept" click.

**Solution:**
1. **Client-side check first:**
   - Check against cached dashboard gigs
   - Only call API if potential conflict found
2. **Batch conflict checks:**
   - Check multiple invitations at once
3. **Debounce or throttle:**
   - If user clicks multiple times rapidly

**Implementation Files:**
- `lib/api/calendar.ts` - Add client-side check
- `components/dashboard-gig-item.tsx` - Use optimized check

**Expected Impact:** Faster acceptance flow, better UX

---

## 4. React Rendering & State Management

### Phase 1: Dashboard Component Refactor (High Priority)

**Problem:** 810-line monolithic component with excessive state.

**Solution:**
1. **Split into smaller components:**
   ```
   dashboard/page.tsx (main orchestrator)
   ├── DashboardHeader (filters, create button)
   ├── TodayGigsSection (today's gigs only)
   ├── UpcomingGigsSection (upcoming with filters)
   └── RecentGigsSection (past gigs, collapsible)
   ```

2. **Extract filter logic to custom hook:**
   ```typescript
   // hooks/use-dashboard-filters.ts
   export function useDashboardFilters() {
     // All filter state and logic here
     // Return only what components need
   }
   ```

3. **Move localStorage to separate hook:**
   ```typescript
   // hooks/use-dashboard-preferences.ts
   export function useDashboardPreferences() {
     // Load/save with debouncing
   }
   ```

**Implementation Files:**
- Create `components/dashboard-header.tsx`
- Create `components/today-gigs-section.tsx`
- Create `components/upcoming-gigs-section.tsx`
- Create `hooks/use-dashboard-filters.ts`
- Create `hooks/use-dashboard-preferences.ts`
- Refactor `app/(app)/dashboard/page.tsx`

**Expected Impact:** 50% fewer re-renders, easier to maintain

---

### Phase 2: Mutation Logic Refactor (Medium Priority)

**Problem:** Duplicate mutation code across components.

**Solution:**
1. **Create shared mutation hooks:**
   ```typescript
   // hooks/use-gig-mutations.ts
   export function useGigMutations() {
     const markPaid = useMutation({ ... });
     const acceptInvitation = useMutation({ ... });
     // Shared invalidation logic
     return { markPaid, acceptInvitation, ... };
   }
   ```

2. **Extract invalidation patterns:**
   ```typescript
   // lib/utils/cache-invalidation.ts
   export function invalidateDashboardQueries(
     queryClient,
     userId
   ) {
     // All dashboard-related invalidations
   }
   ```

**Implementation Files:**
- Create `hooks/use-gig-mutations.ts`
- Create `lib/utils/cache-invalidation.ts`
- Update `dashboard-gig-item.tsx`
- Update `dashboard-gig-item-grid.tsx`

**Expected Impact:** Reduce code duplication, consistent cache behavior

---

### Phase 3: Optimize useMemo Dependencies (Medium Priority)

**Problem:** useMemo with large dependency arrays causing frequent recalculations.

**Solution:**
1. **Audit all useMemo usage:**
   - Check if actually needed (profile first!)
   - Reduce dependency arrays where possible
2. **Use refs for stable values:**
   ```typescript
   // Instead of useMemo with many deps
   const stableConfig = useRef(config).current;
   ```
3. **Move expensive calculations to API layer:**
   - Sorting should be server-side where possible
   - Filtering can often be SQL-based

**Implementation Files:**
- `app/(app)/dashboard/page.tsx` - Review all useMemo (lines 228-392)
- `app/(app)/gigs/page.tsx` - Review useMemo
- `app/(app)/calendar/page.tsx` - Review eventStyleGetter

**Expected Impact:** Reduce unnecessary recalculations by 60-70%

---

### Phase 4: Icon & Asset Optimization (Low Priority)

**Problem:** Importing 25+ individual icons in single files.

**Solution:**
1. **Consolidate icon imports:**
   ```typescript
   // Instead of individual imports
   import * as Icons from 'lucide-react';
   
   // Use as: <Icons.Calendar />
   ```
2. **Create icon component registry:**
   ```typescript
   // components/icon.tsx
   export const Icon = {
     Calendar: Calendar,
     Music: Music,
     // etc
   };
   ```
3. **Lazy load icons for rare actions:**
   ```typescript
   const RareIcon = dynamic(() => 
     import('lucide-react').then(m => ({ default: m.Archive }))
   );
   ```

**Implementation Files:**
- All components with heavy icon imports
- Create `components/icon-registry.ts`

**Expected Impact:** Minor bundle size reduction (~5-10KB)

---

## 5. Bundle Size & Lazy Loading

### Phase 1: Code Splitting for Heavy Pages (High Priority)

**Problem:** All pages loaded upfront, including heavy calendar dependencies.

**Solution:**
1. **Lazy load calendar page:**
   ```typescript
   // app/(app)/calendar/page.tsx
   const Calendar = dynamic(() => import('@/components/calendar-view'), {
     loading: () => <CalendarSkeleton />,
     ssr: false
   });
   ```

2. **Lazy load money page components:**
   ```typescript
   const PayoutsTable = dynamic(() => 
     import('@/components/payouts-table')
   );
   ```

3. **Lazy load heavy dialogs:**
   ```typescript
   // Only load when dialog opens
   const CreateGigDialog = dynamic(() => 
     import('@/components/create-gig-dialog')
   );
   ```

**Implementation Files:**
- `app/(app)/calendar/page.tsx` - Lazy load
- `app/(app)/money/page.tsx` - Lazy load tables
- All dialog components - Lazy load

**Expected Impact:** 30-40% reduction in initial bundle size

---

### Phase 2: Replace Heavy Dependencies (Medium Priority)

**Problem:** `react-big-calendar` + `moment` = ~150KB.

**Solution:**
1. **Evaluate alternatives:**
   - Option 1: Build custom calendar view (lighter)
   - Option 2: Use `date-fns` instead of `moment` (already in project!)
   - Option 3: Lazy load calendar page entirely
2. **Remove `moment` dependency:**
   ```typescript
   // Replace moment with date-fns
   import { format } from 'date-fns';
   ```

**Implementation Files:**
- `app/(app)/calendar/page.tsx` - Replace moment with date-fns
- `package.json` - Remove moment if unused elsewhere

**Expected Impact:** Save ~50KB bundle size

---

### Phase 3: Optimize Third-Party Imports (Medium Priority)

**Problem:** `googleapis` loaded globally (500KB+).

**Solution:**
1. **Lazy load google API imports:**
   ```typescript
   // Only load when needed
   const googleCalendar = dynamic(() => 
     import('@/lib/integrations/google-calendar'),
     { ssr: false }
   );
   ```
2. **Use server-side API routes:**
   - Move Google API calls to API routes
   - Keep client bundle thin
3. **Tree shake aggressively:**
   - Only import specific Google APIs needed

**Implementation Files:**
- `lib/integrations/google-calendar.ts` - Keep server-only
- `app/api/calendar/*` - Use for client interactions

**Expected Impact:** Remove 500KB from client bundle

---

### Phase 4: Optimize shadcn/ui Imports (Low Priority)

**Problem:** Potentially loading unused component code.

**Solution:**
1. **Audit used vs. unused components:**
   ```bash
   # Find all shadcn imports
   grep -r "from '@/components/ui" --include="*.tsx"
   ```
2. **Remove unused components:**
   - Delete unused component files
   - Remove from package.json if possible
3. **Lazy load heavy components:**
   - Dialog, Sheet, DropdownMenu can be lazy loaded

**Implementation Files:**
- `components/ui/*` - Remove unused
- All component imports - Lazy load where appropriate

**Expected Impact:** 10-20KB bundle reduction

---

## 6. UI Responsiveness & Perceived Performance

### Phase 1: Loading States & Skeletons (High Priority)

**Problem:** Blank screens during data fetch feel slow.

**Solution:**
1. **Add skeleton screens everywhere:**
   - Dashboard - skeleton for gig cards
   - Money page - skeleton for tables
   - Gig detail - skeleton for sections
2. **Show cached data immediately:**
   - Use TanStack Query's `placeholderData`
   - Show stale data while refetching
3. **Progressive loading:**
   - Load "today" section first
   - Load "upcoming" section second
   - Load "recent" section last (collapsible)

**Implementation Files:**
- `components/dashboard-skeleton.tsx` - Create comprehensive skeleton
- All data-fetching pages - Add loading states

**Expected Impact:** Feels 2-3x faster subjectively

---

### Phase 2: Optimistic Updates (High Priority)

**Problem:** Mutations feel slow due to server roundtrip.

**Solution:**
1. **Add optimistic updates to mutations:**
   ```typescript
   useMutation({
     mutationFn: acceptInvitation,
     onMutate: async (gigRoleId) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries(['dashboard-gigs']);
       
       // Snapshot previous value
       const previous = queryClient.getQueryData(['dashboard-gigs']);
       
       // Optimistically update
       queryClient.setQueryData(['dashboard-gigs'], (old) => {
         // Update invitation status immediately
         return updateInvitationStatus(old, gigRoleId, 'accepted');
       });
       
       return { previous };
     },
     onError: (err, variables, context) => {
       // Rollback on error
       queryClient.setQueryData(
         ['dashboard-gigs'],
         context.previous
       );
     },
   });
   ```

2. **Implement for common actions:**
   - Accept/decline invitation
   - Mark as paid/unpaid
   - Update gig status

**Implementation Files:**
- `hooks/use-gig-mutations.ts` - Add optimistic updates
- All mutation definitions

**Expected Impact:** Actions feel instant (0ms perceived latency)

---

### Phase 3: Debounce & Throttle (Medium Priority)

**Problem:** Search inputs trigger too many re-renders.

**Solution:**
1. **Already has debounce for search (300ms)** - verify working
2. **Add throttle for scroll events:**
   ```typescript
   const handleScroll = useCallback(
     throttle(() => {
       // Scroll logic
     }, 100),
     []
   );
   ```
3. **Add throttle for filter changes:**
   - Debounce localStorage writes
   - Throttle expensive calculations

**Implementation Files:**
- `app/(app)/dashboard/page.tsx` - Throttle scroll, debounce localStorage
- `hooks/use-dashboard-preferences.ts` - Debounce saves

**Expected Impact:** Smoother interactions, less CPU usage

---

### Phase 4: Virtualization for Long Lists (Low Priority)

**Problem:** Rendering 100+ gig items at once is slow.

**Solution:**
1. **Add virtualization for past gigs:**
   ```typescript
   import { useVirtualizer } from '@tanstack/react-virtual';
   
   const virtualizer = useVirtualizer({
     count: gigs.length,
     getScrollElement: () => scrollRef.current,
     estimateSize: () => 100, // Estimated row height
   });
   ```
2. **Only render visible rows:**
   - Dramatically improve scroll performance
   - Reduce initial render time

**Implementation Files:**
- `app/(app)/history/page.tsx` - Add virtualization
- Consider for dashboard if lists grow very large

**Expected Impact:** Smooth scrolling with 1000+ items

---

## 7. Housekeeping & Future Guardrails

### Phase 1: Remove Debug Code (High Priority)

**Problem:** Production code has unnecessary logging and debug logic.

**Solution:**
1. **Audit for console.log:**
   ```bash
   grep -r "console.log" --include="*.ts" --include="*.tsx"
   ```
2. **Remove or wrap in dev check:**
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     console.log('Debug info');
   }
   ```
3. **Remove unused imports and dead code:**
   ```bash
   # Use ESLint to find unused vars
   npm run lint -- --fix
   ```

**Implementation Files:**
- All files - Remove console.logs
- All files - Remove unused imports

**Expected Impact:** Cleaner code, slightly smaller bundle

---

### Phase 2: Performance Monitoring (Medium Priority)

**Problem:** No way to track performance regressions.

**Solution:**
1. **Add basic performance logging:**
   ```typescript
   // lib/utils/performance.ts
   export function measurePageLoad(pageName: string) {
     if (typeof window !== 'undefined') {
       const navTiming = performance.getEntriesByType('navigation')[0];
       console.log(`${pageName} loaded in ${navTiming.loadEventEnd}ms`);
     }
   }
   ```
2. **Add bundle size tracking:**
   - Use `@next/bundle-analyzer`
   - Track in CI/CD
3. **Add query performance tracking:**
   - Log slow queries (>1s)
   - Alert on regressions

**Implementation Files:**
- Create `lib/utils/performance.ts`
- Add to `next.config.ts` - bundle analyzer
- Add to main pages - measure load time

**Expected Impact:** Prevent future regressions

---

### Phase 3: Establish Performance Guidelines (Medium Priority)

**Problem:** Need to prevent performance regressions in future development.

**Guidelines:**

**Data Fetching:**
1. ✅ DO: Always paginate with limit ≤ 20 for lists
2. ✅ DO: Use server-side filtering where possible
3. ✅ DO: Select only needed columns
4. ❌ DON'T: Fetch more than 50 records client-side
5. ❌ DON'T: Do complex transformations in components
6. ❌ DON'T: Fetch same data in multiple places

**React Components:**
1. ✅ DO: Keep components under 300 lines
2. ✅ DO: Split large components into smaller ones
3. ✅ DO: Use `useMemo` only when profiling shows benefit
4. ❌ DON'T: Have more than 10 useState hooks
5. ❌ DON'T: Do expensive calculations in render
6. ❌ DON'T: Inline complex logic in JSX

**Bundle Size:**
1. ✅ DO: Lazy load heavy dependencies (>50KB)
2. ✅ DO: Code split by route
3. ✅ DO: Use dynamic imports for dialogs/modals
4. ❌ DON'T: Import entire libraries for one function
5. ❌ DON'T: Add dependencies without checking size
6. ❌ DON'T: Import rarely-used code in main bundle

**Caching:**
1. ✅ DO: Include user.id in all user-specific query keys
2. ✅ DO: Set appropriate staleTime (2-5 min for stable data)
3. ✅ DO: Use optimistic updates for mutations
4. ❌ DON'T: Invalidate entire cache on single mutation
5. ❌ DON'T: Fetch same data with different query keys
6. ❌ DON'T: Skip query key user.id (causes cache pollution)

---

### Phase 4: Testing & Verification Checklist

**Before declaring "performance work done", verify:**

**Bundle Size:**
- [ ] Main bundle < 1MB uncompressed
- [ ] Each route bundle < 300KB
- [ ] Calendar page lazy-loaded
- [ ] Heavy dependencies isolated
- [ ] Tree shaking working (check bundle analyzer)

**Data Fetching:**
- [ ] No queries fetching >50 records for lists
- [ ] All dashboard queries limited to 20
- [ ] Pagination working on all long lists
- [ ] Query keys include user.id
- [ ] No duplicate fetches for same data

**Rendering Performance:**
- [ ] Dashboard component < 400 lines
- [ ] No components > 500 lines
- [ ] Loading skeletons everywhere
- [ ] Optimistic updates on mutations
- [ ] Smooth scrolling (60fps)

**User Experience:**
- [ ] Initial dashboard load < 2s
- [ ] Navigation feels instant (< 100ms)
- [ ] Filters/search respond < 200ms
- [ ] No blank screens during loading
- [ ] Error states handled gracefully

**Code Quality:**
- [ ] No console.logs in production
- [ ] No unused imports
- [ ] No dead code
- [ ] ESLint passing
- [ ] TypeScript strict mode passing

---

## 8. Implementation Roadmap

### Week 1: Critical Path (Must Do)
**Goal:** Reduce initial load time by 50%

1. ✅ Reduce dashboard API limit to 20
2. ✅ Split dashboard component into sections
3. ✅ Add loading skeletons everywhere
4. ✅ Lazy load calendar page
5. ✅ Remove console.logs
6. ✅ Add optimistic updates to accept/decline

**Expected Impact:** Dashboard load 2-3x faster

---

### Week 2: Bundle & Rendering (Should Do)
**Goal:** Improve perceived performance and bundle size

1. ✅ Replace moment with date-fns in calendar
2. ✅ Extract mutation logic to hooks
3. ✅ Lazy load heavy dialogs
4. ✅ Optimize useMemo dependencies
5. ✅ Add pagination to money view
6. ✅ Debounce localStorage writes

**Expected Impact:** Bundle 30% smaller, smoother interactions

---

### Week 3: Polish & Guardrails (Nice to Have)
**Goal:** Prevent future regressions

1. ✅ Add performance monitoring
2. ✅ Document performance guidelines
3. ✅ Add virtualization to history page
4. ✅ Optimize icon imports
5. ✅ Create reusable hooks for common patterns

**Expected Impact:** Sustainable performance long-term

---

## 9. Success Metrics

### Before (Estimated based on code analysis)
- Dashboard initial load: ~4-6 seconds
- Bundle size (uncompressed): ~1.5MB
- Initial data fetch: 200+ gigs
- Component re-renders: Excessive (14 states)
- Perceived responsiveness: Sluggish

### After (Target)
- Dashboard initial load: < 2 seconds (60-70% improvement)
- Bundle size (uncompressed): < 1MB (33% reduction)
- Initial data fetch: 20 gigs (90% reduction)
- Component re-renders: Minimal (extracted to hooks)
- Perceived responsiveness: Instant feel

### User Experience
- ✅ Dashboard loads 3x faster
- ✅ All interactions feel instant
- ✅ No blank screens (skeletons everywhere)
- ✅ Smooth scrolling on all pages
- ✅ Quick navigation between routes

---

## 10. Trade-offs & Considerations

### Conscious Trade-offs
1. **Pagination vs. "See Everything":**
   - Trade: Can't see all gigs at once
   - Benefit: Much faster initial load
   - Mitigation: Infinite scroll, good search/filter

2. **Lazy Loading vs. Prefetch:**
   - Trade: Slight delay when opening calendar first time
   - Benefit: Much smaller initial bundle
   - Mitigation: Prefetch on hover/intent

3. **Client-side Sorting vs. Server-side:**
   - Trade: More API calls when changing sort
   - Benefit: Less data transferred initially
   - Decision: Keep client-side for < 50 items

### Technical Debt Created
- None! All changes improve code quality
- Better separation of concerns
- More reusable hooks and utilities
- Easier to maintain going forward

### Risks
- **Breaking Changes:** None expected (keeping all APIs same)
- **Cache Invalidation:** Need to test thoroughly
- **Infinite Scroll:** Need to test edge cases
- **Optimistic Updates:** Need rollback logic

---

## 11. Next Steps

1. **Get User Buy-in:** Review plan with user, adjust priorities
2. **Create Task List:** Break into smaller, trackable tasks
3. **Set Up Tooling:** Bundle analyzer, performance monitoring
4. **Implement Week 1:** Focus on critical path first
5. **Test & Measure:** Verify improvements at each step
6. **Document:** Update docs with new patterns
7. **Monitor:** Track performance over time

---

**Plan Created By:** AI Agent  
**Status:** Ready for Implementation  
**Estimated Effort:** 3 weeks (phased approach)  
**Expected ROI:** 3x faster load, much better UX, sustainable codebase

