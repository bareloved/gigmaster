# Gig Card Navigation Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ambiguous "click anywhere" card navigation with explicit Edit and GigPack buttons on all gig card types.

**Architecture:** Modify three card components (list, grid, dashboard mini-cards) and their parent pages. Rename the `onClick` prop to `onEdit` to communicate intent. Remove Link/div wrappers from card content. Add a unified button row showing Edit (managers only) and GigPack (everyone).

**Tech Stack:** React, Next.js, shadcn/ui Button, lucide-react icons (Pencil, Package)

---

### Task 1: Update DashboardGigItem (list view) — Remove clickable card body

**Files:**
- Modify: `components/dashboard/gig-item.tsx`

**Step 1: Add Pencil import**

In the lucide-react import (line 24), add `Pencil` to the icon imports.

**Step 2: Rename `onClick` prop to `onEdit`**

Change the interface (line 175) and destructuring (line 183):
```typescript
interface DashboardGigItemProps {
  gig: DashboardGig;
  isPastGig?: boolean;
  returnUrl?: string;
  onEdit?: (gig: DashboardGig) => void;
}
```

**Step 3: Remove Link/onClick wrapper from card content**

Replace lines 303-322 (the conditional Link or onClick div wrapping `<GigInnerContent />`) with a plain, non-clickable div:

```tsx
{/* Non-clickable content */}
<div className="block space-y-2 sm:space-y-0 sm:flex-1 sm:min-w-0">
  <GigInnerContent gig={gig} />
</div>
```

Remove the `Link` import from `next/link` if no longer used elsewhere in the file. (Check — it's still used for GigPack button links, so keep it.)

**Step 4: Restructure desktop button area (right column)**

Replace the `{!isPlayerOnly && (...)}` gate (lines 363-462) and the separate `{isPlayerOnly && ...}` dropdown (lines 464-493) with a single unified section. The new button area shows for ALL users:

```tsx
{/* Desktop right column buttons */}
<div className="flex items-center gap-2">
  {/* Edit button — managers of non-external gigs only */}
  {gig.isManager && !gig.isExternal && onEdit && (
    <Button
      variant="outline"
      size="sm"
      className="h-8 px-2.5 gap-1.5 text-xs"
      onClick={() => onEdit(gig)}
    >
      <Pencil className="h-3.5 w-3.5" />
      Edit
    </Button>
  )}

  {/* GigPack button — always visible */}
  <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`}>
    <Button variant="outline" size="sm" className="h-8 px-2.5 gap-1.5 text-xs">
      <Package className="h-3.5 w-3.5" />
      Gig Pack
    </Button>
  </Link>

  {/* Share button — managers only */}
  {gig.isManager && (
    <Button variant="outline" size="sm" className="gap-1.5 h-8 px-2.5 text-xs" onClick={handleShare} disabled={isLoadingShare}>
      <Share2 className={`h-3.5 w-3.5 ${isLoadingShare ? 'animate-pulse' : ''}`} />
      Share
    </Button>
  )}

  {/* Quick Actions Dropdown — anyone with actions */}
  {(showPlayerActions || showManagerActions) && (
    <DropdownMenu>
      {/* ... keep existing dropdown content unchanged ... */}
    </DropdownMenu>
  )}
</div>
```

**Step 5: Restructure mobile button area**

Replace the `{!isPlayerOnly && (...)}` gate (lines 496-562) and the separate `{isPlayerOnly && ...}` dropdown (lines 564-595) with a unified mobile button section:

```tsx
{/* Mobile-only action buttons */}
<div className="sm:hidden absolute right-0 -bottom-2 flex items-center justify-end gap-1.5">
  {/* Edit button — managers of non-external gigs only */}
  {gig.isManager && !gig.isExternal && onEdit && (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 gap-1 rounded-sm text-muted-foreground text-[11px]"
      onClick={() => onEdit(gig)}
    >
      <Pencil className="h-3 w-3" />
      Edit
    </Button>
  )}

  {/* GigPack button — always visible */}
  <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`}>
    <Button variant="outline" size="sm" className="h-6 px-2 gap-1 rounded-sm text-muted-foreground text-[11px]">
      <Package className="h-3 w-3" />
      Gig Pack
    </Button>
  </Link>

  {/* Dropdown — anyone with actions */}
  {(showPlayerActions || showManagerActions) && (
    <DropdownMenu>
      {/* ... keep existing dropdown content unchanged ... */}
    </DropdownMenu>
  )}
</div>
```

**Step 6: Remove unused `gigUrl` variable**

Delete lines 284-287 (`const gigUrl = ...`) since it's no longer used.

**Step 7: Verify build**

Run: `npm run check`

**Step 8: Commit**

```
feat: update list card — replace clickable body with explicit Edit/GigPack buttons
```

---

### Task 2: Update DashboardGigItemGrid (grid view) — Same treatment

**Files:**
- Modify: `components/dashboard/gig-item-grid.tsx`

**Step 1: Add Pencil import**

Add `Pencil` to the lucide-react import (line 25).

**Step 2: Rename `onClick` prop to `onEdit`**

Change the interface (line 187-193) and destructuring (line 195-201).

**Step 3: Remove Link/onClick wrapper from card content**

Replace lines 323-353 (the conditional Link or onClick div wrapping `<GigGridInnerContent />`) with a plain div:

```tsx
<div className="flex-1 flex flex-col">
  <GigGridInnerContent
    gig={gig}
    gigDate={gigDate}
    formattedDate={formattedDate}
    heroImage={heroImage}
    index={index}
  />
</div>
```

**Step 4: Restructure bottom button area**

Replace the `{!isPlayerOnly && (...)}` gate (lines 358-460) and the separate `{isPlayerOnly && ...}` dropdown (lines 462-493) with a unified section. Also remove the `{isPlayerOnly && <div className="pb-3" />}` padding (line 356).

New button area for ALL cards:

```tsx
{/* Action Buttons — shown for all users */}
<div className="px-2 sm:px-3 pb-2 sm:pb-3 pt-0 mt-auto flex gap-1 sm:gap-2">
  {/* Edit button — managers of non-external gigs only */}
  {gig.isManager && !gig.isExternal && onEdit && (
    <Button
      variant="outline"
      size="sm"
      className="gap-1 sm:gap-2 text-xs h-7 sm:h-8"
      onClick={() => onEdit(gig)}
    >
      <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
      Edit
    </Button>
  )}

  {/* GigPack button — always visible */}
  <Link href={`/gigs/${gig.gigId}/pack?returnUrl=${returnUrl}`} className="flex-1">
    <Button variant="outline" size="sm" className="w-full gap-1 sm:gap-2 text-xs h-7 sm:h-8">
      <Package className="h-3 w-3 sm:h-4 sm:w-4" />
      Gig Pack
    </Button>
  </Link>

  {/* Share button — managers only */}
  {gig.isManager && (
    <Button variant="outline" size="sm" className="gap-1 sm:gap-2 text-xs h-7 sm:h-8" onClick={handleShare} disabled={isLoadingShare}>
      <Share2 className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoadingShare ? 'animate-pulse' : ''}`} />
      Share
    </Button>
  )}

  {/* Dropdown — anyone with actions */}
  {(showPlayerActions || showManagerActions) && (
    <DropdownMenu>
      {/* ... keep existing dropdown content unchanged ... */}
    </DropdownMenu>
  )}
</div>
```

**Step 5: Remove unused `gigUrl` variable**

Delete lines 305-308.

**Step 6: Verify build**

Run: `npm run check`

**Step 7: Commit**

```
feat: update grid card — replace clickable body with explicit Edit/GigPack buttons
```

---

### Task 3: Update gigs/page.tsx — Use new `onEdit` prop

**Files:**
- Modify: `app/(app)/gigs/page.tsx`

**Step 1: Simplify `handleEditGig`**

The function (lines 132-140) currently checks `isManager` to decide between editor and pack. Now it's only called from the Edit button (which is already manager-only), so simplify:

```typescript
const handleEditGig = (gig: DashboardGig) => {
  setEditingGigId(gig.gigId);
  setIsEditorOpen(true);
};
```

**Step 2: Rename prop from `onClick` to `onEdit`**

Update both the list view (line 591) and grid view (line 601):

```tsx
// List view
<DashboardGigItem
  key={gig.gigId}
  gig={gig}
  onEdit={handleEditGig}
/>

// Grid view
<DashboardGigItemGrid
  key={gig.gigId}
  gig={gig}
  onEdit={handleEditGig}
  index={index}
/>
```

**Step 3: Verify build**

Run: `npm run check`

**Step 4: Commit**

```
feat: update gigs page to use onEdit prop for card components
```

---

### Task 4: Update dashboard "This Week" mini-cards

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Step 1: Change mini-card navigation to always go to GigPack**

Replace lines 459-468 (the div with smart-routing onClick) with a Link that always goes to GigPack:

```tsx
{upcomingGigs.map((gig) => (
  <Link
    key={gig.gigId}
    href={`/gigs/${gig.gigId}/pack`}
    className="block animate-fade-in"
  >
    <Card className="overflow-hidden hover:shadow-sm transition-all duration-200 border-l-4 border-l-primary">
      {/* ... keep existing CardContent unchanged ... */}
    </Card>
  </Link>
))}
```

This removes the `cursor-pointer` class (Link handles cursor), removes the `onClick` handler, and replaces the wrapping `<div>` with a `<Link>`.

**Step 2: Verify the hero card**

The hero card (lines 222-417) already has explicit Edit + GigPack buttons. No card-body click exists. No changes needed — just verify.

**Step 3: Verify build**

Run: `npm run check`

**Step 4: Commit**

```
feat: dashboard mini-cards always navigate to GigPack
```

---

### Task 5: Final verification

**Step 1: Full build check**

Run: `npm run build`

Ensure no TypeScript errors, no unused imports, no broken references.

**Step 2: Lint check**

Run: `npm run lint`

**Step 3: Manual testing checklist**

Test in browser:
- [ ] List view card: Edit button visible for manager gigs, hidden for player gigs
- [ ] List view card: GigPack button visible for all gigs
- [ ] List view card: Clicking card body does nothing (no navigation)
- [ ] List view: Edit opens sheet editor
- [ ] List view: GigPack navigates to pack page
- [ ] Grid view: Same checks as list view
- [ ] Dashboard hero: Edit + GigPack buttons work (unchanged)
- [ ] Dashboard "This Week": All cards navigate to GigPack
- [ ] Mobile: Buttons visible and functional on all card types
- [ ] Dropdown menu (status, delete, etc.) still works
- [ ] Invitation actions (Accept/Decline) still work for invited players

**Step 4: Final commit if any fixes needed**
