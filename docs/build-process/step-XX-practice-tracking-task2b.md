# Task 2B: Practice Focus / Learning Tracking

**Status**: ✅ Completed  
**Date**: 2025-11-21  
**Related**: Artistry Dashboard Phase 2

## Overview

Built a system for musicians to track which songs they've learned for upcoming gigs. Powers the "Practice Focus" widget on the dashboard showing songs that need attention.

## What Was Built

### 1. Database Schema

**New Table: `setlist_learning_status`**

Tracks per-musician learning status for each setlist item.

```sql
CREATE TABLE setlist_learning_status (
  id UUID PRIMARY KEY,
  setlist_item_id UUID REFERENCES setlist_items(id),
  musician_id UUID REFERENCES profiles(id),
  
  -- Learning status
  learned BOOLEAN DEFAULT false,
  
  -- Practice tracking
  last_practiced_at TIMESTAMPTZ,
  practice_count INTEGER DEFAULT 0,
  
  -- Difficulty & priority
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(setlist_item_id, musician_id)
);
```

**Indexes**:
- `idx_setlist_learning_setlist_item_id` - Fast lookup by song
- `idx_setlist_learning_musician_id` - Fast lookup by musician
- `idx_setlist_learning_learned` - Filter by learned status
- `idx_setlist_learning_musician_learned` - Combined filter (most common query)

**RLS Policies**:
- Musicians can view/manage their own learning status
- Gig managers can view (read-only) learning status for their gigs' songs

### 2. TypeScript Types

**New Types in `lib/types/shared.ts`**:

```typescript
export interface SetlistLearningStatus {
  id: string;
  setlistItemId: string;
  musicianId: string;
  learned: boolean;
  lastPracticedAt: string | null;
  practiceCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  priority: 'low' | 'medium' | 'high';
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PracticeItem {
  setlistItemId: string;
  songTitle: string;
  gigId: string;
  gigTitle: string;
  gigDate: string;
  projectName: string | null;
  key: string | null;
  bpm: number | null;
  learned: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  priority: 'low' | 'medium' | 'high';
  lastPracticedAt: string | null;
  daysUntilGig: number;
}
```

### 3. API Functions

**New File: `lib/api/setlist-learning.ts`**

Core functions:
- `getLearningStatus(setlistItemId, musicianId)` - Get status for one song
- `upsertLearningStatus(data)` - Create or update learning status
- `toggleSongLearned(setlistItemId, musicianId, learned)` - Mark song learned/unlearned
- `recordPracticeSession(setlistItemId, musicianId)` - Increment practice count
- `getMusicianLearningStatuses(musicianId)` - Get all statuses for a musician
- `getPracticeItems(musicianId, limit, priorityFilter)` - Get songs to practice (for dashboard)
- `getLearningStats(musicianId)` - Get learning statistics

**Key Logic in `getPracticeItems()`**:
- Fetches setlist items from musician's upcoming gigs (next 60 days)
- Joins with `gig_roles` to filter only gigs where musician is playing
- Left joins with `setlist_learning_status` to get learning status
- Filters out already-learned songs
- Sorts by priority (high first) then days until gig (sooner first)
- Returns enriched `PracticeItem` objects with gig context

### 4. Migration

**File**: `supabase/migrations/20251121130000_add_setlist_learning_status.sql`

Includes:
- Table creation
- Indexes for performance
- RLS policies
- Trigger for `updated_at` timestamp
- Documentation comments

## Technical Decisions

### Per-Musician vs Per-Gig Tracking

**Decision**: Per-musician tracking (each musician tracks their own learning status for each song)

**Reasoning**:
- Different musicians on the same gig have different skill levels
- A song might be "new" for one musician but familiar for another
- More flexible for future features (practice history, difficulty ratings)

### Difficulty vs Priority Fields

**Decision**: Include both `difficulty` and `priority`

**Reasoning**:
- `difficulty` = subjective assessment by musician ("this song is hard for me")
- `priority` = importance/urgency ("I need to learn this ASAP")
- They're related but distinct (hard songs might be low priority if gig is far away)
- Priority used for sorting in Practice Focus widget

### Practice Count vs Boolean

**Decision**: Track `practice_count` and `last_practiced_at` in addition to `learned` boolean

**Reasoning**:
- Enables future analytics ("How many practice sessions does it take to learn a song?")
- `last_practiced_at` helps identify "rusty" songs that need refreshing
- Minimal storage cost, high future value

### Scope: 60-Day Window

**Decision**: `getPracticeItems()` looks at gigs in the next 60 days

**Reasoning**:
- Far enough to show all "active" gigs
- Not so far that it includes very distant gigs
- Balances relevance with query performance
- Configurable in the future if needed

## Performance Considerations

### Query Optimization

The `getPracticeItems()` function performs a complex join:
```
setlist_items → gigs → gig_roles (filter by musician)
            ↘ projects (get project name)
            ↘ setlist_learning_status (get learning status)
```

**Optimizations**:
- Indexed `musician_id` in `gig_roles` (already exists)
- Indexed `setlist_item_id` and `musician_id` in `setlist_learning_status`
- Combined index on `(musician_id, learned)` for filtering
- Date range filter on gigs (next 60 days) reduces result set
- Ordering done in application (post-fetch) to keep query simple

**Expected Performance**:
- For typical musician with 5-10 upcoming gigs and 10-15 songs per gig
- Result set: ~50-150 setlist items before filtering
- After filtering (unlearned only): ~20-50 items
- Query time: <100ms expected

### Caching Strategy

**For Dashboard**:
- Cache `getPracticeItems()` for 2 minutes (balance freshness vs performance)
- Invalidate on mutation (mark song learned, update priority)
- Use TanStack Query for client-side caching

## Security

### RLS Policies

**Musicians**:
- ✅ Can view/insert/update/delete their own learning statuses
- ❌ Cannot view other musicians' learning statuses (privacy)

**Managers**:
- ✅ Can view learning statuses for songs in their gigs
- ❌ Cannot modify other musicians' learning statuses
- Use case: Manager wants to see if players are prepared

### Data Privacy

Learning status is personal:
- Notes field is private to the musician
- Difficulty assessment is subjective and personal
- Managers can see boolean "learned" but not personal notes

## Files Changed

### New Files
- `supabase/migrations/20251121130000_add_setlist_learning_status.sql`
- `lib/api/setlist-learning.ts`
- `docs/build-process/step-XX-practice-tracking-task2b.md`

### Modified Files
- `lib/types/shared.ts` - Added `SetlistLearningStatus` and `PracticeItem` types

## Testing Checklist

- [ ] Apply migration successfully
- [ ] Verify table created with correct schema
- [ ] Verify indexes created
- [ ] Test RLS policies (musician can CRUD own status)
- [ ] Test RLS policies (manager can read status for their gigs)
- [ ] Test RLS policies (cannot access other musicians' statuses)
- [ ] Test `getPracticeItems()` with upcoming gigs
- [ ] Test `toggleSongLearned()` marks song as learned
- [ ] Test practice items disappear when marked learned
- [ ] Test sorting (high priority first, then by days until gig)
- [ ] Verify performance with realistic data volume

## Next Steps

### Phase 2 - UI Integration

1. **Create Practice Focus Widget Component**
   - Display top 5-10 practice items
   - Show song title, gig name, days until gig
   - One-click mark as learned
   - Link to full setlist view

2. **Add to Dashboard**
   - Place in right sidebar below "Next Gig"
   - Real-time updates on toggle
   - Empty state when no songs to practice

3. **Enhance Setlist View**
   - Add "Mark Learned" checkbox per song
   - Show learning status indicators
   - Quick actions for difficulty/priority

4. **Future Enhancements**
   - Practice history tracking
   - Remind to practice songs X days before gig
   - Stats: "You've learned 45 songs this month!"
   - Song library (songs across all gigs)

## Lessons Learned

1. **Separate Concerns**: Learning status separate from setlist items keeps the schema clean
2. **Rich Metadata**: Adding difficulty/priority/notes early enables future features
3. **Smart Sorting**: Sorting by priority then urgency surfaces most important items
4. **Privacy Matters**: RLS policies ensure personal practice data stays private
5. **Query Complexity**: Complex joins are acceptable when properly indexed

## Related Documentation

- Task 2A: Readiness Tracking (`step-XX-readiness-tracking-task2a.md`)
- Setlist Items API (`lib/api/setlist-items.ts`)
- Dashboard Implementation Plan (`artistry-dashboard-implementation.plan.md`)

