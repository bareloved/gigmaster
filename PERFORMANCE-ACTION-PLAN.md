# Performance Overhaul Plan - Ensemble/GigMaster

**Updated:** January 5, 2026
**Status:** 🟢 Phase 1-3 TypeScript changes complete, SQL pending deployment
**Goal:** Improve all pages to 85+ score, fix perceived slowness across all interactions

## Completed Work Summary

### Phase 1 ✅ (Quick Wins)
- [x] 1.1 Remove redundant notification polling
- [x] 1.2 Increase global staleTime (1min → 3min)
- [x] 1.3 Fix image priority on Gigs page (priority for first 4, blur placeholder)
- [x] 1.4 Fix CLS on Dashboard (min-heights on KPI cards)

### Phase 2 ✅ (Medium Effort)
- [x] 2.1 Surgical query invalidation (6 refetches → 1-2)
- [x] 2.2 Server-side pagination (RPC functions ready, **SQL needs deployment**)
- [x] 2.3 Add React.memo to list items
- [x] 2.4 Batch role operations (fire-and-forget contact linking)
- [x] 2.5 Fix N+1 in Dashboard KPIs (single JOIN query)

### Phase 3 ✅ (Partial - TypeScript changes)
- [x] 3.1 Lazy load heavy dialogs (ConflictWarningDialog, GigPackShareDialog)
- [x] 3.3 Convert server-safe UI components (Separator simplified)

### Pending
- [x] **Deploy SQL RPC functions** (list_dashboard_gigs, list_past_gigs) via Supabase Dashboard ✅
- [ ] 3.2 Image optimization infrastructure (optional)
- [ ] Re-run Lighthouse after SQL deployment

---

## Current State

| Page | Score | Critical Issues |
|------|-------|-----------------|
| **Gigs List** | 70 🔴 | LCP 5.1s (CRITICAL), 4.6 MB page weight |
| **Dashboard** | 73 🟡 | CLS 0.24 (layout shifts) |
| **Individual Gig** | 87 🟢 | Minor TBT issues |
| **Sign-in** | 100 ✅ | Perfect baseline |

**Pain Points Identified:**
- Initial page load (slow)
- Navigation between pages (sluggish)
- Specific pages (Gigs, Dashboard)
- Actions/mutations (delayed response)

## Target Metrics

| Metric | Before | After |
|--------|--------|-------|
| Dashboard Score | 73 | 85+ |
| Gigs List Score | 70 | 85+ |
| LCP | 5.1s | <2.5s |
| CLS | 0.24 | <0.1 |
| Page Weight | 4.6MB | <1.5MB |
| Mutation Response | 6 query refetches | 1-2 query refetches |

---

## Phase 1: Quick Wins (Today - 1-2 hours)

### 1.1 Remove Redundant Notification Polling ⚡
**File:** `components/layout/notifications-dropdown.tsx`
**Line 43:** Remove `refetchInterval: 30000`

**Why:** Already has Supabase Realtime subscription (lines 77-94). Polling is redundant and wasteful.

**Impact:** Eliminate 120 requests/hour per user, reduce server load

```typescript
// BEFORE (line 43):
refetchInterval: 30000, // Poll every 30 seconds

// AFTER:
// Remove this line entirely - Realtime handles updates
```

---

### 1.2 Increase Global staleTime ⚡
**File:** `lib/providers/query-provider.tsx`
**Line 12:** Change `staleTime: 60 * 1000` to `staleTime: 3 * 60 * 1000`

**Why:** Most queries already override to 2-5 min. Global default (1 min) is too aggressive.

**Impact:** Fewer background refetches, faster perceived navigation

```typescript
// BEFORE:
staleTime: 60 * 1000, // 1 minute

// AFTER:
staleTime: 3 * 60 * 1000, // 3 minutes
```

---

### 1.3 Fix Image Priority on Gigs Page
**File:** `components/dashboard/gig-item-grid.tsx`

**Changes:**
- Add `priority={true}` to first 4 images (above fold)
- Add `placeholder="blur"` with placeholder data
- Reduce `quality` from 75 to 60 for list views

```typescript
// For first 4 items (above fold):
<Image
  src={heroImage}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  quality={60}
  priority={index < 4}  // Only first 4 images
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
/>
```

**Impact:** LCP 5.1s → ~2.5s, page weight reduction

---

### 1.4 Fix CLS on Dashboard
**Files:**
- `components/dashboard/kpi-cards.tsx`
- `app/(app)/dashboard/page.tsx`

**Changes:** Ensure skeleton heights exactly match loaded content

```typescript
// Add explicit min-heights to prevent layout shifts
<Card className="min-h-[112px]">  {/* Match KPI card actual height */}
  {isLoading ? (
    <Skeleton className="h-[112px]" />
  ) : (
    <CardContent>...</CardContent>
  )}
</Card>
```

**Impact:** CLS 0.24 → <0.1

---

## Phase 2: Medium Effort (This Week - 4-6 hours)

### 2.1 Surgical Query Invalidation 🔴 HIGH PRIORITY
**File:** `hooks/use-gig-mutations.ts`

**Problem (lines 24-60):** `invalidateDashboardQueries` invalidates 6 query families on EVERY mutation:
- `dashboard-gigs`
- `all-gigs`
- `recent-past-gigs`
- `all-past-gigs`
- `gig`
- `my-earnings`

**Solution:** Create action-specific invalidation functions:

```typescript
// For markAsPaid/markAsUnpaid: only earnings + specific gig
function invalidatePaymentQueries(queryClient, userId, gigId) {
  queryClient.invalidateQueries({ queryKey: ["my-earnings", userId] });
  queryClient.invalidateQueries({ queryKey: ["gig", gigId] });
}

// For acceptInvitation/declineInvitation: only dashboard-gigs
function invalidateInvitationQueries(queryClient, userId) {
  queryClient.invalidateQueries({ queryKey: ["dashboard-gigs", userId] });
}

// For updateGigStatus: dashboard + specific gig
function invalidateGigStatusQueries(queryClient, userId, gigId) {
  queryClient.invalidateQueries({ queryKey: ["dashboard-gigs", userId] });
  queryClient.invalidateQueries({ queryKey: ["gig", gigId] });
}
```

**Impact:** 50-70% reduction in post-mutation refetches

---

### 2.2 Server-Side Pagination
**File:** `lib/api/dashboard-gigs.ts`

**Problem (lines 52-79):** Fetches 100 gigs, then filters/paginates client-side

```typescript
// CURRENT (bad):
const { data: allGigs } = await supabase
  .from("gigs")
  .select(...)
  .limit(100);  // Fetches 100, filters client-side
```

**Solution:** Use `.range()` for server-side pagination:

```typescript
// BETTER:
const { data: gigs, count } = await supabase
  .from("gigs")
  .select("*", { count: "exact" })
  .gte("date", fromStr)
  .lte("date", toStr)
  .order("date", { ascending: true })
  .range(offset, offset + limit - 1);
```

**Impact:** 80% less data transferred, faster client-side processing

---

### 2.3 Add React.memo to List Items
**Files:**
- `components/dashboard/gig-item-grid.tsx`
- `components/dashboard/gig-item.tsx`

**Change:** Wrap components with `React.memo()`:

```typescript
export const DashboardGigItemGrid = React.memo(function DashboardGigItemGrid({
  gig,
  onViewGig,
  // ... props
}: DashboardGigItemGridProps) {
  // component body unchanged
});
```

**Impact:** Prevent unnecessary re-renders when parent state changes

---

### 2.4 Batch Role Operations
**File:** `lib/api/gig-roles.ts`

**Problem (lines 54-99):** 4 sequential DB calls per role add:
1. Insert role
2. Find contact by name
3. Update role with contact_id
4. Increment contact usage stats

**Solution:** Return role immediately, handle contact linking async:

```typescript
export async function addRoleToGig(...) {
  // Insert role first
  const { data: role } = await supabase.from("gig_roles").insert(data)...

  // Return immediately for fast UX
  // Handle contact linking in background (fire-and-forget)
  if (role.musician_name?.trim()) {
    linkContactToRole(user.id, role).catch(console.error);
  }

  return role;
}
```

**Impact:** 60% faster role creation (1 blocking call vs 4)

---

### 2.5 Fix N+1 in Dashboard KPIs
**File:** `lib/api/dashboard-kpis.ts`

**Problem (lines 318-337):** Sequential gig fetch + activity query (N+1 pattern)

```typescript
// CURRENT (N+1):
const { data: userGigs } = await supabase.from("gigs").select("id").limit(100);
const { data: activities } = await supabase.from("gig_activity_log")
  .in("gig_id", gigIds);  // Second query
```

**Solution:** Use existing RPC `get_user_activity_since` or single JOIN:

```typescript
// BETTER - use RPC (already exists in migrations)
const { data } = await supabase.rpc('get_user_activity_since', {
  user_id: userId,
  since_date: lastVisit.toISOString()
});

// OR use JOIN:
const { data: activities } = await supabase
  .from("gig_activity_log")
  .select(`activity_type, gigs!inner(id)`)
  .gte("created_at", lastVisit.toISOString());
```

**Impact:** 50% faster KPI load

---

## Phase 3: Larger Refactors (Next Week - 6-8 hours)

### 3.1 Lazy Load Heavy Dialogs
**Files to update:**
- `components/dashboard/gig-item-grid.tsx` - lazy load `GigPackShareDialog`, `ConflictWarningDialog`

```typescript
// BEFORE:
import { GigPackShareDialog } from "@/components/gigpack/gigpack-share-dialog";

// AFTER:
const GigPackShareDialog = dynamic(
  () => import("@/components/gigpack/gigpack-share-dialog").then(m => m.GigPackShareDialog),
  { ssr: false }
);
```

**Impact:** 20-50KB reduction per page initial bundle

---

### 3.2 Image Optimization Infrastructure
**New file:** `lib/utils/image-utils.ts`

**Changes:**
- Create blur placeholder generation utility
- Create Supabase image loader with auto-resizing

```typescript
// lib/utils/image-utils.ts
export function getBlurDataURL(imageUrl: string): string {
  // For Supabase storage images, use transformation API
  // Or use static blur placeholders for fallback images
}

export const supabaseImageLoader = ({ src, width, quality }) => {
  return `${src}?width=${width}&quality=${quality || 75}`;
};
```

**Impact:** Page weight 4.6MB → <1.5MB

---

### 3.3 Convert Server-Safe UI Components
**Files to audit in `components/ui/`:**

| File | Has "use client" | Actually Needs It? |
|------|------------------|-------------------|
| `separator.tsx` | Yes | No - pure presentational |
| `badge.tsx` | Check | Likely no |
| `card.tsx` | Check | Likely no |
| `avatar.tsx` | No | Good |

Remove "use client" from components that don't use:
- `useState` / `useEffect`
- Event handlers
- Browser APIs

**Impact:** Smaller client bundle, faster hydration

---

### 3.4 Database View for Dashboard
**New migration file**

Create Postgres view `dashboard_gigs_view` with pre-computed fields:

```sql
CREATE VIEW dashboard_gigs_view AS
SELECT
  g.id as gig_id,
  g.title,
  g.date,
  g.start_time,
  g.end_time,
  g.location_name,
  g.status,
  g.owner_id,
  g.owner_id = auth.uid() as is_manager,
  EXISTS(
    SELECT 1 FROM gig_roles gr
    WHERE gr.gig_id = g.id
    AND gr.musician_id = auth.uid()
    AND gr.invitation_status NOT IN ('pending', 'declined')
  ) as is_player,
  (SELECT json_build_object(
    'total', COUNT(*),
    'invited', COUNT(*) FILTER (WHERE invitation_status = 'invited'),
    'accepted', COUNT(*) FILTER (WHERE invitation_status = 'accepted')
  ) FROM gig_roles WHERE gig_id = g.id) as role_stats
FROM gigs g;
```

**Impact:** 70% less client-side processing

---

## Implementation Priority

| # | Task | Impact | Time | Files |
|---|------|--------|------|-------|
| 1 | Remove polling | High | 5 min | `notifications-dropdown.tsx` |
| 2 | Increase staleTime | Med | 5 min | `query-provider.tsx` |
| 3 | Image priority/blur | High | 30 min | `gig-item-grid.tsx` |
| 4 | Fix CLS | High | 20 min | `kpi-cards.tsx`, `dashboard/page.tsx` |
| 5 | Surgical invalidation | High | 2 hr | `use-gig-mutations.ts` |
| 6 | React.memo | Med | 30 min | `gig-item*.tsx` |
| 7 | Server pagination | High | 3 hr | `dashboard-gigs.ts` |
| 8 | Batch role ops | Med | 1 hr | `gig-roles.ts` |
| 9 | Fix N+1 KPIs | Med | 1 hr | `dashboard-kpis.ts` |
| 10 | Lazy dialogs | Med | 1 hr | various |
| 11 | Image infrastructure | High | 4 hr | new files |

---

## Testing Commands

```bash
# Lighthouse audit (public pages)
./scripts/run-lighthouse.sh

# Lighthouse audit (authenticated)
TEST_EMAIL=xxx TEST_PASSWORD=xxx node scripts/lighthouse-auth.js

# Bundle analysis
ANALYZE=true npm run build
```

---

## Critical Files Summary

1. `components/layout/notifications-dropdown.tsx` - Remove redundant polling
2. `lib/providers/query-provider.tsx` - Increase global staleTime
3. `hooks/use-gig-mutations.ts` - Surgical query invalidation (biggest perceived improvement)
4. `components/dashboard/gig-item-grid.tsx` - Images + React.memo
5. `lib/api/dashboard-gigs.ts` - Server-side pagination
6. `lib/api/dashboard-kpis.ts` - Fix N+1 query pattern
7. `lib/api/gig-roles.ts` - Batch database operations

---

## Success Criteria

After completing Phase 1-2:
- [ ] Dashboard Lighthouse score: 85+
- [ ] Gigs List Lighthouse score: 85+
- [ ] LCP under 2.5 seconds
- [ ] CLS under 0.1
- [ ] Mutations feel instant (no visible loading)
- [ ] Navigation feels snappy (no delays between pages)

---

## Notes

### What's Already Optimized (Don't Touch)
- Edge-side auth via middleware ✅
- Server-first app layout ✅
- Dynamic imports for GigEditorPanel ✅
- Optimistic updates infrastructure ✅
- Route-based code splitting ✅
- RLS performance optimization ✅

### Root Causes of Current Slowness
1. **Cache invalidation overkill** - Every mutation triggers 6 query refetches
2. **Client-side data processing** - Fetching 100 gigs then filtering in browser
3. **Image optimization missing** - Raw images without lazy loading or blur
4. **Layout shifts** - Skeletons don't match actual content heights
5. **Redundant polling** - Polling when Realtime already handles updates

**Start with Phase 1 today - these quick wins alone should provide noticeable improvement!**
