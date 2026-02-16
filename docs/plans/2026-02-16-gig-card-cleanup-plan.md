# Gig Card Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove redundant "You're in" text and role badge from gig cards, replacing the role badge with a desktop-only tooltip on the metadata row.

**Architecture:** Two components need the same treatment — list view (`gig-item.tsx`) and grid view (`gig-item-grid.tsx`). Each has a memoized inner content component where the changes happen. We add a tooltip import, remove the participation status for accepted state, remove the role badge, and wrap the metadata row with a tooltip that shows the role on hover (desktop only).

**Tech Stack:** React, shadcn/ui Tooltip (already installed), Tailwind CSS

---

### Task 1: Clean up list view — `gig-item.tsx`

**Files:**
- Modify: `components/dashboard/gig-item.tsx`

**Step 1: Add Tooltip imports**

Add to the existing imports at top of file:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Step 2: Remove "You're in" for accepted status**

In `GigInnerContent` (lines 104-123), the participation status block currently shows text for ALL invitation statuses. Change it to only render for non-accepted statuses (keeping "Respond", "Declined", etc.):

Replace:
```tsx
      {/* Participation Status (Musician-only) - Shortened on mobile */}
      {gig.isPlayer && gig.invitationStatus && (
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          <span className="sm:hidden">
            {gig.invitationStatus === 'accepted' ? "You're in" :
             gig.invitationStatus === 'invited' ? 'Respond' :
             gig.invitationStatus === 'declined' ? 'Declined' : gig.invitationStatus}
          </span>
          <span className="hidden sm:inline">
            Your status: {
              gig.invitationStatus === 'pending' ? 'Awaiting your response' :
                gig.invitationStatus === 'invited' ? 'Please respond' :
                  gig.invitationStatus === 'accepted' ? "You're in" :
                    gig.invitationStatus === 'declined' ? 'You declined' :
                      gig.invitationStatus === 'tentative' ? 'Tentative' :
                        gig.invitationStatus
            }
          </span>
        </div>
      )}
```

With:
```tsx
      {/* Participation Status (Musician-only) - Only show for non-accepted statuses */}
      {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== 'accepted' && (
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          <span className="sm:hidden">
            {gig.invitationStatus === 'invited' ? 'Respond' :
             gig.invitationStatus === 'declined' ? 'Declined' : gig.invitationStatus}
          </span>
          <span className="hidden sm:inline">
            Your status: {
              gig.invitationStatus === 'pending' ? 'Awaiting your response' :
                gig.invitationStatus === 'invited' ? 'Please respond' :
                  gig.invitationStatus === 'declined' ? 'You declined' :
                    gig.invitationStatus === 'tentative' ? 'Tentative' :
                      gig.invitationStatus
            }
          </span>
        </div>
      )}
```

**Step 3: Remove role badge and add tooltip to metadata row**

In `GigInnerContent` (lines 125-162), the metadata row contains the date, location, role badge, and invitation status badge.

Remove the role badge (lines 141-146). Then wrap the entire metadata `<div>` with a Tooltip that shows the player's role on hover. The tooltip only fires on desktop (pointer devices) since touch doesn't have hover.

Replace:
```tsx
      {/* Role Chips & Metadata - Compact row on mobile */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        {/* Date */}
        <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          <span className="text-[10px] sm:text-sm">{formattedDate}</span>
        </div>

        {/* Location */}
        {gig.locationName && (
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
            <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="truncate max-w-[120px] sm:max-w-none text-[10px] sm:text-sm">{gig.locationName}</span>
          </div>
        )}

        {/* Player Role Badge */}
        {gig.isPlayer && gig.playerRoleName && (
          <Badge variant="outline" className="capitalize text-[10px] sm:text-xs h-5">
            {gig.playerRoleName}
          </Badge>
        )}

        {/* Invitation Status (if player and not accepted) */}
        {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== "accepted" && (
          <Badge
            variant={
              gig.invitationStatus === "declined" || gig.invitationStatus === "needs_sub"
                ? "destructive"
                : "secondary"
            }
            className="capitalize text-[10px] sm:text-xs h-5"
          >
            {gig.invitationStatus === "needs_sub" ? "Need Sub" : gig.invitationStatus}
          </Badge>
        )}

      </div>
```

With:
```tsx
      {/* Metadata row - with role tooltip on desktop */}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              {/* Date */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="text-[10px] sm:text-sm">{formattedDate}</span>
              </div>

              {/* Location */}
              {gig.locationName && (
                <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
                  <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="truncate max-w-[120px] sm:max-w-none text-[10px] sm:text-sm">{gig.locationName}</span>
                </div>
              )}

              {/* Invitation Status (if player and not accepted) */}
              {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== "accepted" && (
                <Badge
                  variant={
                    gig.invitationStatus === "declined" || gig.invitationStatus === "needs_sub"
                      ? "destructive"
                      : "secondary"
                  }
                  className="capitalize text-[10px] sm:text-xs h-5"
                >
                  {gig.invitationStatus === "needs_sub" ? "Need Sub" : gig.invitationStatus}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          {gig.isPlayer && gig.playerRoleName && (
            <TooltipContent>
              <span className="capitalize">Your role: {gig.playerRoleName}</span>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
```

**Step 4: Clean up unused imports**

The `Music2` icon import is unused after removing the role badge. Check if `Badge` is still used (it is — for invitation status, external, host, and status badges). Remove `Music2` from the import line if it's not used elsewhere in the file.

**Step 5: Verify build**

Run: `npm run check`
Expected: No TypeScript errors, no lint errors

**Step 6: Test in browser**

- Open `/gigs` in list view
- Verify "You're in" text is gone for accepted gigs
- Verify role badge is gone
- Hover over the metadata row on desktop — tooltip should show "Your role: Guitar" (or whatever the role is)
- Verify "Respond" / "Please respond" text still shows for invited gigs
- Verify invitation status badges (Invited, Declined, Need Sub) still show

**Step 7: Commit**

```bash
git add components/dashboard/gig-item.tsx
git commit -m "refactor: remove redundant status text and role badge from list view gig card

Replace always-visible role badge with desktop hover tooltip.
Remove 'You're in' text for accepted gigs — only show actionable statuses."
```

---

### Task 2: Clean up grid view — `gig-item-grid.tsx`

**Files:**
- Modify: `components/dashboard/gig-item-grid.tsx`

**Step 1: Add Tooltip imports**

Add to the existing imports at top of file:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
```

**Step 2: Remove "You're in" for accepted status**

In `GigGridInnerContent` (lines 152-159), the participation status renders for all statuses. Change it to skip accepted:

Replace:
```tsx
          {/* Participation Status (Musician-only) - Shortened on mobile */}
          {gig.isPlayer && gig.invitationStatus && (
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {gig.invitationStatus === 'accepted' ? "You're in" :
               gig.invitationStatus === 'invited' ? 'Respond' :
               gig.invitationStatus === 'declined' ? 'Declined' : gig.invitationStatus}
            </div>
          )}
```

With:
```tsx
          {/* Participation Status (Musician-only) - Only show for non-accepted statuses */}
          {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== 'accepted' && (
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {gig.invitationStatus === 'invited' ? 'Respond' :
               gig.invitationStatus === 'declined' ? 'Declined' : gig.invitationStatus}
            </div>
          )}
```

**Step 3: Remove role badge, add tooltip to location row**

In `GigGridInnerContent` (lines 124-183), remove the role badge from the player badges section and add a tooltip to the location row (the most natural hover target in the grid card).

Replace the location row + player badges sections (lines 124-183):

Replace:
```tsx
          {/* Location row with accepted musicians count */}
          <div className="flex items-center justify-between gap-2">
            {gig.locationName ? (
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground flex-1 min-w-0">
                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                <span className="truncate">{gig.locationName}</span>
              </div>
            ) : (
              <div className="flex-1" />
            )}
            {gig.roleStats && gig.roleStats.accepted > 0 && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                <Users className="h-3 w-3" />
                <span>{gig.roleStats.accepted}</span>
              </div>
            )}
          </div>
```

With:
```tsx
          {/* Location row with accepted musicians count — role tooltip on desktop */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-between gap-2">
                  {gig.locationName ? (
                    <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground flex-1 min-w-0">
                      <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0" />
                      <span className="truncate">{gig.locationName}</span>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {gig.roleStats && gig.roleStats.accepted > 0 && (
                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">
                      <Users className="h-3 w-3" />
                      <span>{gig.roleStats.accepted}</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {gig.isPlayer && gig.playerRoleName && (
                <TooltipContent>
                  <span className="capitalize">Your role: {gig.playerRoleName}</span>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
```

Then update the player badges section to remove the role badge (keep only invitation status):

Replace:
```tsx
          {/* Player Badges - only render if there's content */}
          {gig.isPlayer && (gig.playerRoleName || (gig.invitationStatus && gig.invitationStatus !== "accepted")) && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              {gig.playerRoleName && (
                <Badge variant="outline" className="text-[10px] sm:text-xs capitalize h-5">
                  {gig.playerRoleName}
                </Badge>
              )}

              {gig.invitationStatus && gig.invitationStatus !== "accepted" && (
                <Badge
                  variant={
                    gig.invitationStatus === "declined" || gig.invitationStatus === "needs_sub"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[10px] sm:text-xs capitalize h-5"
                >
                  {gig.invitationStatus === "needs_sub" ? "Need Sub" : gig.invitationStatus}
                </Badge>
              )}
            </div>
          )}
```

With:
```tsx
          {/* Invitation Status Badge - only for non-accepted statuses */}
          {gig.isPlayer && gig.invitationStatus && gig.invitationStatus !== "accepted" && (
            <div className="flex flex-wrap gap-1 sm:gap-1.5">
              <Badge
                variant={
                  gig.invitationStatus === "declined" || gig.invitationStatus === "needs_sub"
                    ? "destructive"
                    : "secondary"
                }
                className="text-[10px] sm:text-xs capitalize h-5"
              >
                {gig.invitationStatus === "needs_sub" ? "Need Sub" : gig.invitationStatus}
              </Badge>
            </div>
          )}
```

**Step 4: Clean up unused imports**

Check if `Music2` is still used — remove from import if not.

**Step 5: Verify build**

Run: `npm run check`
Expected: No TypeScript errors, no lint errors

**Step 6: Test in browser**

- Open `/gigs` in grid view
- Verify "You're in" text is gone for accepted gigs
- Verify role badge is gone
- Hover over the location row on desktop — tooltip should show "Your role: Guitar"
- Verify actionable statuses still visible (Respond, Invited, Declined, Need Sub)

**Step 7: Commit**

```bash
git add components/dashboard/gig-item-grid.tsx
git commit -m "refactor: remove redundant status text and role badge from grid view gig card

Same treatment as list view — tooltip for role, remove 'You're in' text."
```

---

### Task 3: Final verification

**Step 1: Full build check**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Cross-view testing**

- Toggle between list and grid views on `/gigs`
- Verify both views are consistent
- Check that manager-only gigs (where you're host) still show all their badges correctly
- Check that player-only gigs with pending invitations show "Respond" text and invitation badges

**Step 3: Commit everything and done**

If any fixes were needed, commit them:
```bash
git add -A
git commit -m "fix: address any remaining issues from gig card cleanup"
```
