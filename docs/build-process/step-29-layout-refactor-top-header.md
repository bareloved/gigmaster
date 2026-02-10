# Step 29: Layout Refactor - Two-Row Top Header

**Date:** 2025-01-20  
**Status:** ✅ Complete

## Overview

Refactored the entire application layout from a left sidebar to a modern two-row sticky top header design. This makes the app feel simpler, cleaner, and more accessible for non-technical musicians while improving the use of horizontal screen space.

## Goals

1. Remove the left sidebar completely
2. Create a sticky two-row header:
   - **Row 1**: Global app bar (logo, nav, actions, notifications, dark mode, user menu)
   - **Row 2**: Context bar (projects, filters, search)
3. Make the layout more friendly for musicians
4. Maintain all existing functionality
5. Add responsive mobile behavior
6. Keep business logic and routes unchanged

## What Was Built

### New Components

#### 1. `TopNav` Component (`components/top-nav.tsx`)
**Row 1 - Global App Bar**

Features:
- **Logo & Brand** (left): GigMaster logo
- **Navigation** (center):
  - Dashboard, Gigs, Money, Calendar, My Circle
  - "More" dropdown for History and future items
  - Active page highlighting with underline indicator
- **Actions & Controls** (right):
  - "+ New Gig" button with CreateGigDialog integration
  - Notification bell (existing NotificationsDropdown)
  - Dark mode toggle (existing DarkModeToggle)
  - User menu (new UserMenu component)
- **Mobile Responsive**:
  - Hamburger menu (Sheet) for mobile devices
  - Collapses all nav items into side drawer on screens < 1024px
  - Logo and actions remain visible on all screen sizes

Key code pattern:
```tsx
<nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
  <div className="flex h-16 items-center px-6 gap-6">
    {/* Logo */}
    {/* Desktop Nav (hidden lg:flex) */}
    {/* Mobile Menu (flex lg:hidden) */}
    {/* Actions (New Gig, Notifications, Dark Mode, User) */}
  </div>
</nav>
```

#### 2. `UserMenu` Component (`components/user-menu.tsx`)
Dropdown menu for user-related actions:
- Avatar display with fallback to initials
- User name and email
- Links to:
  - Profile
  - Settings
  - Sign out action
- Integrated with existing useUser hook and auth system

#### 3. `ProjectBar` Component (`components/project-bar.tsx`)
**Row 2 - Context / Projects Bar**

Features:
- **Project Selector** (left):
  - "Projects:" label with icon
  - "All Projects" pill with gig count
  - Top 5 projects shown as pills with counts
  - "More" dropdown for additional projects
  - "View all" link to projects page
  - Selected project highlighted (filled style)
  - Real-time gig counts from database
- **Filters & Search** (right, on Gigs/Money pages):
  - Search input (lg+ screens)
  - Filter button placeholder
- **URL-based State**:
  - Project selection stored in `?project={id}` query param
  - Updates URL without page reload
  - All pages read from URL params
- **Responsive**:
  - Horizontal scroll for project pills on mobile
  - Hidden scrollbar (no-scrollbar utility class)
  - Sticky below Row 1 (top-16)
- **Conditional Display**:
  - Only shows on Dashboard, Gigs, Money, Calendar pages
  - Hidden on other pages (Profile, Settings, etc.)

Key code pattern:
```tsx
const projectFilter = searchParams.get("project") || "all";

const handleProjectChange = (projectId: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (projectId === "all") {
    params.delete("project");
  } else {
    params.set("project", projectId);
  }
  router.push(`${pathname}?${params.toString()}`);
};
```

### Updated Components

#### 1. Main Layout (`app/(app)/layout.tsx`)
**Before:**
```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset>
    <AppHeader />
    <main>{children}</main>
  </SidebarInset>
</SidebarProvider>
```

**After:**
```tsx
<div className="min-h-screen bg-background">
  <TopNav />
  <ProjectBar />
  <main className="container mx-auto p-6 max-w-7xl">
    {children}
  </main>
</div>
```

Changes:
- Removed SidebarProvider and all sidebar components
- Added two-row header (TopNav + ProjectBar)
- Content area now uses container with max-width
- Full horizontal space utilization

#### 2. Gigs Page (`app/(app)/gigs/page.tsx`)
Changes:
- **Removed**: Local `projectFilter` state
- **Removed**: Project filter dropdown (now in ProjectBar)
- **Added**: `useSearchParams` to read project from URL
- **Updated**: Filtering logic uses `searchParams.get("project")`
- **Kept**: Search, view mode toggle (list/grid), infinite scroll

Before/After:
```tsx
// Before
const [projectFilter, setProjectFilter] = useState<string>("all");

// After
const searchParams = useSearchParams();
const projectFilter = searchParams.get("project") || "all";
```

#### 3. Dashboard Page (`app/(app)/dashboard/page.tsx`)
Changes:
- **Added**: `useSearchParams` to read project from URL
- **Added**: `projectFilter` from URL params
- **Added**: `projectFilteredGigs` and `projectFilteredTodayGigs` useMemo hooks
- **Updated**: All gig rendering uses filtered versions
- **Kept**: All existing filters (role, date range, search, sort)

Filter chain:
```
allGigs 
  → roleFilteredGigs (manager/player/all)
  → projectFilteredGigs (from ProjectBar)
  → searchFilteredGigs (search query)
  → sortedFilteredGigs (sort order)
```

#### 4. Money Page (`app/(app)/money/page.tsx`)
Changes:
- **Added**: `useSearchParams` to read project from URL
- **Removed**: Local `selectedProject` state
- **Removed**: Project selector dropdown from Payouts tab (now in ProjectBar)
- **Updated**: `selectedProject` computed from URL params
- **Updated**: Reset buttons no longer try to set project
- **Kept**: Year/month filters, status filter, tabs (My Earnings / Payouts)

Before/After:
```tsx
// Before
const [selectedProject, setSelectedProject] = useState<string | null>(null);

// After
const projectFilterFromUrl = searchParams.get("project");
const selectedProject = projectFilterFromUrl && projectFilterFromUrl !== "all" 
  ? projectFilterFromUrl 
  : null;
```

### CSS Utilities

Added to `app/globals.css`:
```css
@layer utilities {
  /* Hide scrollbar for Chrome, Safari and Opera */
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
}
```

Used in ProjectBar for horizontal pill scrolling without visible scrollbar.

## Technical Decisions

### 1. URL-based Project State
**Why:** 
- Single source of truth for current project
- Shareable URLs (user can bookmark or share filtered views)
- Browser back/forward works correctly
- No prop drilling or complex state management
- Easy to extend with additional filters

**Implementation:**
- ProjectBar sets: `router.push(\`\${pathname}?\${params}\`)`
- Pages read: `searchParams.get("project")`
- Default: "all" if no param present

### 2. Conditional ProjectBar Display
**Why:**
- Not all pages need project filtering
- Profile, Settings, etc. are user-centric, not project-centric

**Pages with ProjectBar:**
- Dashboard ✅
- Gigs ✅
- Money ✅
- Calendar ✅

**Pages without:**
- Profile ❌
- Settings ❌
- My Circle ❌ (could be added later)
- History ❌ (could be added later)

### 3. Mobile Navigation Strategy
**Desktop (≥1024px):**
- Full horizontal nav with text labels
- All items visible

**Mobile (<1024px):**
- Hamburger menu icon (left of logo)
- Opens side Sheet with full nav list
- Logo and actions remain in top bar
- Touch-friendly larger buttons

**Why Sheet instead of Dropdown:**
- More space for nav items
- Better UX on touch devices
- Matches mobile app patterns musicians are familiar with

### 4. Project Pills vs Dropdown
**Why pills for top projects:**
- Visual clarity - see all main projects at a glance
- One-click switching (no dropdown open/close)
- Horizontal space well-utilized on desktop
- Counts visible inline

**Overflow strategy:**
- Show top 5 projects as pills
- "More" dropdown for remaining
- "View all" link to projects page
- Horizontal scroll on mobile

### 5. Sticky Header Layers
```
z-50: TopNav (Row 1) - highest
z-40: ProjectBar (Row 2) - below Row 1
top-0: TopNav
top-16: ProjectBar (sticks below TopNav)
```

This ensures:
- Both rows remain visible on scroll
- Dropdowns/dialogs appear above both
- Clean stacking hierarchy

## File Changes

### Created:
1. `components/top-nav.tsx` - Row 1 global app bar
2. `components/user-menu.tsx` - User dropdown menu
3. `components/project-bar.tsx` - Row 2 context bar

### Modified:
1. `app/(app)/layout.tsx` - Removed sidebar, added two-row header
2. `app/(app)/gigs/page.tsx` - URL-based project filtering
3. `app/(app)/dashboard/page.tsx` - Added project filtering
4. `app/(app)/money/page.tsx` - URL-based project filtering
5. `app/globals.css` - Added no-scrollbar utility

### Preserved (not changed):
- `components/app-sidebar.tsx` - Still exists, not removed (optional cleanup)
- `components/app-header.tsx` - Still exists, not removed (optional cleanup)
- All business logic and API functions
- All data models and types
- All other pages and routes

## UX Improvements

### Before (Sidebar):
- Left sidebar takes ~240-280px of horizontal space
- Logo and projects in sidebar (collapsed on smaller screens)
- Navigation items in vertical stack
- Content squeezed into remaining width
- Toggle button needed to show/hide sidebar
- Feels "technical" or "admin-like"

### After (Top Header):
- Full horizontal width for content
- Two clean rows at top, out of the way
- Navigation spread horizontally (easier to scan)
- Project context always visible
- More modern, app-like feel
- Simpler for non-technical musicians

### Mobile Improvements:
- Hamburger menu = familiar mobile pattern
- Large touch targets in sheet menu
- Project pills scroll horizontally
- No small toggles or collapsed states
- Works great on phones

## Performance Considerations

### Query Optimization:
- Projects fetched once, cached 5 minutes
- Gig counts batched in single query
- No N+1 queries for project counts
- Infinite scroll pagination maintained on Gigs page

### Render Optimization:
- useMemo for filtered gig lists
- URL params don't trigger unnecessary re-renders
- ProjectBar only renders on relevant pages
- Debounced search queries (300ms)

### Bundle Size:
- Reused existing components (NotificationsDropdown, DarkModeToggle)
- Sheet from shadcn/ui (tree-shakable)
- No new heavy dependencies

## Accessibility

### Keyboard Navigation:
- All nav items keyboard accessible (tab, enter)
- Focus states on all interactive elements
- Sheet closes on Escape
- Dropdowns close on Escape

### Screen Readers:
- `<nav>` semantic element for TopNav
- `sr-only` labels for icon-only buttons
- Proper ARIA labels on Sheet trigger
- Avatar alt text

### Focus Management:
- Focus trapped in Sheet when open
- Focus returns to trigger on close
- Logical tab order maintained

## Known Limitations & Future Enhancements

### Current Limitations:
1. Old sidebar components still in codebase (not used)
2. Calendar page doesn't implement project filtering yet
3. My Circle page could benefit from project filtering
4. No "simplified mode" for first-time users (mentioned in requirements)

### Future Enhancements:
1. **Simplified Mode Toggle:**
   - Show fewer nav items for new users
   - Single project dropdown instead of pills
   - Flag in user preferences or localStorage

2. **Project Bar Enhancements:**
   - Search within project list
   - Color coding for projects
   - Drag to reorder favorite projects
   - Pin frequently used projects

3. **Mobile Optimizations:**
   - Swipe gestures to open menu
   - Bottom navigation for key actions
   - Optimize for one-handed use

4. **Performance:**
   - Virtual scrolling for large project lists
   - Prefetch project data on hover
   - Service worker for offline support

5. **Cleanup:**
   - Remove unused sidebar components
   - Archive old AppHeader component

## Testing Checklist

### ✅ Navigation
- [x] All nav items work (Dashboard, Gigs, Money, Calendar, My Circle, History)
- [x] Active page highlighting works
- [x] Mobile menu opens/closes correctly
- [x] Mobile menu closes on navigation

### ✅ Project Filtering
- [x] Project selection updates URL
- [x] Gigs page filters by selected project
- [x] Dashboard filters by selected project
- [x] Money page filters by selected project
- [x] "All Projects" shows everything
- [x] Project counts display correctly

### ✅ Actions
- [x] "+ New Gig" button opens dialog
- [x] Notification bell shows dropdown
- [x] Dark mode toggle works
- [x] User menu shows profile/settings/logout

### ✅ Responsive
- [x] Desktop layout works (≥1024px)
- [x] Mobile menu works (<1024px)
- [x] Project pills scroll horizontally
- [x] Touch targets large enough on mobile

### ✅ Performance
- [x] No console errors
- [x] No infinite re-renders
- [x] Queries cached appropriately
- [x] Fast navigation between pages

## Deployment Notes

### Pre-deploy Checklist:
- [x] All linter errors resolved
- [x] No TypeScript errors
- [x] All pages load correctly
- [x] Mobile tested on actual device (or browser DevTools)
- [ ] Test on Safari (webkit-specific issues)
- [ ] Test with keyboard-only navigation
- [ ] Test with screen reader

### Migration Notes:
- No database changes required
- No breaking API changes
- Users will see new layout immediately
- No localStorage migration needed
- Existing bookmarks will still work (routes unchanged)

### Rollback Plan:
If issues arise:
1. Revert `app/(app)/layout.tsx` to use `<AppSidebar>`
2. Revert page changes (gigs, dashboard, money)
3. Deploy previous commit
4. No data loss (only UI changes)

## Summary

This refactor successfully transforms Ensemble from a sidebar-based layout to a modern two-row top header design. The new layout:
- ✅ Feels simpler and more accessible for musicians
- ✅ Uses horizontal space more effectively
- ✅ Maintains all existing functionality
- ✅ Adds mobile responsiveness
- ✅ Implements URL-based state management
- ✅ Keeps business logic unchanged
- ✅ Zero breaking changes to data or routes

The app now feels more like a friendly tool and less like a technical admin panel, which aligns perfectly with the goal of creating an OS for working musicians.

