# Artist-Focused Dashboard Preview

## Overview

A visual/UX preview of an artist-focused dashboard that prioritizes gig preparation and artistry over financial tracking. This is a mock page using local dummy data only.

**✨ NEW FEATURES ADDED:**
1. **Segmented Progress Bar** - Visual breakdown by category (songs, charts, sounds, travel, gear)
2. **Focus Mode Toggle** - Hide distractions, show only Next Gig + Practice Focus
3. **Keyboard Shortcuts** - Quick actions on hover (S, F, P, G keys)

## Access

**Route**: `/dashboard-artistry-preview`

Navigate to this route in your browser while the dev server is running.

## Purpose

This dashboard answers one key question:  
**"Am I ready for my upcoming gigs – musically and logistically?"**

It's designed to feel like a cockpit for working musicians, not an accounting dashboard.

## Page Structure

### Top Section: KPI Cards (4 cards)
Artist-focused metrics displayed prominently:
- **Gigs this week** - Count with breakdown (hosted/playing)
- **Songs to learn** - Count across multiple gigs
- **Changes since last visit** - Setlists & notes updates
- **Open sub requests** - Number needing replacement

### Two-Column Layout (Desktop)

#### Left Column (Main - 2/3 width)

**1. Next Gig Hero Card**
- Compact date pill (weekday + date) - non-dominant styling
- Gig title & project/band name
- Hosted badge
- Venue & location
- Call time & stage time
- Your role badge
- Gig type tag
- Quick action buttons:
  - Open Setlist
  - Charts & Files
  - Practice Playlist
  - Open Gig Pack
- **Readiness Section**:
  - Progress bar showing overall readiness percentage
  - Checklist with status indicators:
    - Songs learned (10/13)
    - Charts attached (all songs)
    - Sounds programmed (2 patches missing)
    - Travel plan checked (not yet)
    - Gear checklist (packed)

**2. This Week on Stage List**
- Dense, scannable list of upcoming gigs
- Filter chips:
  - Role: All, Hosted, Playing, Subbing, MD
  - Time: This week, Next 7 days, This month
- Each row shows:
  - Date (compact badge)
  - Gig name + band/project
  - Venue
  - Role badge
  - Prep status (Ready / In progress / Needs sub)
  - Confirmation status

#### Right Column (Side - 1/3 width)

**1. Practice Focus Today**
- Scrollable list of 3-5 practice items
- Derived from upcoming gigs
- Each item shows:
  - Song title
  - Context label (e.g., "New for Saturday's wedding")
  - Type badge (New / Refresh / Section)
  - Icon indicating type
  - Optional "Open" action

**2. Band & Changes**
- Activity feed style
- 4-6 recent events:
  - Setlist updates
  - New files/tracks added
  - Invitations
  - MD notes
  - Confirmations
- Each item:
  - Type icon
  - Message with gig name emphasized
  - Relative time (e.g., "2h ago")

**3. Money Snapshot (Low Emphasis)**
- Small card at bottom
- Intentionally secondary styling (dashed border)
- Shows:
  - This month earnings summary
  - Number of unpaid gigs
  - "Go to Money view" ghost button
- Clear visual hierarchy showing it's not the focus

### Mobile/Tablet
All sections stack vertically in this order:
1. Page title + KPIs
2. Next Gig hero
3. Practice Focus
4. Band & Changes
5. This Week on Stage list
6. Money Snapshot

## Design Philosophy

### Artist-Focused Approach
- Emphasizes preparation, learning, and logistics
- Music-related icons (music notes, headphones, keyboard)
- Clean, simple typography
- Avoids "corporate analytics" feel

### Visual Hierarchy
- Money deliberately de-emphasized (small card, dashed border, bottom placement)
- Next gig hero prominently featured
- Date displays smaller and less calendar-like
- Readiness checklist uses clear status icons (green check, amber warning, grey circle)

### Consistency
- Uses existing shadcn/ui components
- Respects app's color theme
- Integrates with TopNav + ProjectBar layout
- Matches existing design patterns

## Mock Data Structure

All data is hardcoded at the top of the page file:

```typescript
MOCK_NEXT_GIG: {
  date, title, bandName, venueName, city,
  callTime, stageTime, hostedBy, role, gigType,
  readiness: { songsTotal, songsLearned, chartsReady, 
               soundsReady, travelChecked, gearPacked }
}

MOCK_GIGS_THIS_WEEK: [
  { date, title, bandName, venueName, role,
    isHostedByYou, status, prepStatus, prepSummary }
]

MOCK_PRACTICE_ITEMS: [
  { songTitle, gigLabel, type }
]

MOCK_UPDATES: [
  { icon, message, detail, gigName, timeAgo }
]
```

## Interactive Features

### 1. **Segmented Progress Bar with Breakdown** ✨ NEW
- **Visual breakdown** showing 5 category segments:
  - **Blue**: Songs (40% of total weight)
  - **Green**: Charts (15% weight)
  - **Purple**: Sounds (15% weight)
  - **Amber**: Travel (15% weight)
  - **Emerald**: Gear (15% weight)
- **Click to expand** - Chevron button reveals detailed breakdown
- **Expandable legend** shows individual percentages per category
- **Color-coded segments** make it easy to see what needs attention
- **Interactive hint**: "💡 Click items below to mark as complete"

### 2. **Focus Mode Toggle** ✨ NEW
- **Top-right button** with Eye icon toggles focus mode on/off
- **When active**:
  - Hides: KPI cards, "This Week on Stage", "Band & Changes", "Money Snapshot"
  - Shows: Only "Next Gig Hero" + "Practice Focus"
  - Displays blue indicator banner with "Exit" button
- **Tooltip** explains: "Hide distractions - show only Next Gig + Practice Focus"
- **Visual state**: Button changes from outline to solid when active
- **Perfect for**: Deep practice sessions or gig-day focus

### 3. **Keyboard Shortcuts** ✨ NEW
- **Visible on hover**: Keyboard hints appear when hovering over quick action buttons
- **Shortcuts**:
  - `S` - Open Setlist
  - `F` - Charts & Files
  - `P` - Practice Playlist
  - `G` - Open Gig Pack
- **Tooltip on each button** shows the keyboard shortcut
- **Professional UX**: Styled with `<kbd>` tags in monospace font
- **Power user friendly**: Faster navigation for experienced users

### 4. Filters (This Week on Stage)
- **Role filter**: All / Hosted / Playing / Subbing / MD
  - Implements local state filtering
  - Visually indicates active filter
  
### 5. Readiness Calculation
- **Progress percentage** calculated from:
  - Song learning progress (40% weight)
  - Checklist completion (60% weight)
  - Updates dynamically
- **Breakdown available** - Click chevron to see category details

### Status Indicators
- **Prep status badges**:
  - Ready (green)
  - In Progress (amber with summary)
  - Needs Sub (red)
- **Gig status badges**:
  - Confirmed (blue)
  - Pending (grey)
  - Cancelled (red)

## How the New Features Work

### Segmented Progress Bar Implementation
```typescript
// Calculate individual percentages for each category
const readinessData = useMemo(() => {
  const { songsTotal, songsLearned, chartsReady, soundsReady, 
          travelChecked, gearPacked } = MOCK_NEXT_GIG.readiness;
  
  return {
    overall: 69,  // Weighted average
    songs: 77,    // 10/13 songs
    charts: 100,  // All charts ready
    sounds: 0,    // 2 patches missing
    travel: 0,    // Not checked yet
    gear: 100,    // Packed
  };
}, []);

// Render as 5 colored segments with proportional widths
<div className="flex h-3 w-full overflow-hidden rounded-full">
  <div style={{ width: `${(songs / 100) * 40}%` }} className="bg-blue-500" />
  <div style={{ width: `${(charts / 100) * 15}%` }} className="bg-green-500" />
  {/* ... other segments */}
</div>
```

### Focus Mode State Management
```typescript
const [focusMode, setFocusMode] = useState(false);

// Conditionally render sections
{!focusMode && <KPICards />}
{!focusMode && <ThisWeekOnStage />}
{!focusMode && <BandChanges />}
{!focusMode && <MoneySnapshot />}

// Always visible in focus mode
<NextGigHero />
<PracticeFocus />
```

### Keyboard Shortcuts with Tooltips
```typescript
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button className="group">
        Open Setlist
        <kbd className="hidden group-hover:inline-flex">S</kbd>
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      Press <kbd>S</kbd> to open
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Components Used

### shadcn/ui Components
- `Card`, `CardContent`, `CardHeader`, `CardTitle`
- `Badge`
- `Button`
- `ScrollArea`
- `Separator`
- `Progress` (custom implementation)
- `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipContent` ✨ NEW

### Lucide React Icons
- `Music`, `Calendar`, `Clock`, `MapPin`
- `CheckCircle2`, `AlertTriangle`, `Circle`
- `Headphones`, `Repeat2`, `MessageSquare`
- `PlayCircle`, `FileText`, `Briefcase`, `Euro`
- `ChevronRight`, `Plus`, `User`
- `Eye`, `EyeOff`, `ChevronDown`, `ChevronUp`, `Zap` ✨ NEW

## File Location

```
app/(app)/dashboard-artistry-preview/page.tsx
```

## Usage Guide

### Try These Interactions:

1. **Toggle Focus Mode**
   - Click "Focus Mode" button in top-right
   - Notice: Page simplifies to show only essential prep info
   - Blue indicator banner appears with "Exit" option
   - Try it when you want zero distractions

2. **Explore Readiness Breakdown**
   - Find the ⚡ Readiness section in Next Gig card
   - Click the chevron (▼) next to the 69% score
   - See color-coded breakdown: Songs 77%, Charts 100%, etc.
   - Notice which categories need attention (amber/red segments)
   - Click again to collapse

3. **Hover for Keyboard Shortcuts**
   - Move mouse over any quick action button
   - Watch keyboard hint appear (S, F, P, G)
   - See tooltip with shortcut reminder
   - In real implementation, these keys would work!

4. **Filter Gigs by Role**
   - Scroll to "This Week on Stage"
   - Click role filters: All / Hosted / Playing / Subbing / MD
   - Watch gig list update in real-time
   - Notice active filter is highlighted

5. **Test Responsiveness**
   - Resize browser window to mobile size
   - See 2-column layout stack vertically
   - Focus mode still works on mobile
   - All features remain accessible

## Next Steps (Future Real Implementation)

When wiring to real data:
1. Replace mock data with API calls to Supabase
2. Implement actual filtering logic with URL params
3. Add real navigation to gig detail pages
4. Connect quick action buttons to actual features (with real keyboard shortcuts)
5. Calculate readiness from real gig data (auto-update breakdown)
6. Add loading states and error handling
7. Implement real-time updates for Band & Changes feed
8. Store focus mode preference in localStorage
9. Add keyboard shortcut listener for actual navigation
10. Make readiness checklist items clickable to mark complete

## Notes

- This page is completely independent - no backend calls
- All interactions are client-side only
- Button actions are no-ops (onClick handlers do nothing)
- Uses existing app layout, so requires authentication to view
- Designed to be easily convertible to real implementation later

