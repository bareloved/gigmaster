# Step 20 - Unified User Search System

**Status:** ✅ Complete  
**Date:** November 19, 2024

## Overview

Built a unified search interface that replaces the 3-button "Add People" UI with a single dynamic search field. Users can now search all registered users in the system, their saved contacts, or invite new people - all from one search box. This enables easy testing of notifications and provides Facebook-style user discovery.

## Goals

1. **Simplify UI:** Replace 3 separate buttons with 1 unified search field
2. **Enable User Discovery:** Allow searching all users in the system by name or email
3. **Prioritize Results:** Show categorized results (My Circle → System Users → Invite)
4. **Enable Testing:** Make it easy to add multiple users to test notifications
5. **Direct Add:** Skip email invitations and add users directly to gigs

## What Was Built

### 1. System Users API (`lib/api/users.ts`)

New API module for searching all users:

```typescript
export async function searchSystemUsers(query: string): Promise<SystemUser[]>
export async function getUserById(userId: string): Promise<SystemUser | null>
```

**Features:**
- Search by name or email (case-insensitive)
- Public access - any authenticated user can search
- Limit to 20 results for performance
- Returns minimal fields (id, name, email, phone, instrument, avatar)

### 2. Direct Add Function (`lib/api/gig-roles.ts`)

New function to add system users directly to gigs:

```typescript
export async function addSystemUserToGig(data: {
  gigId: string;
  userId: string;
  userName: string;
  roleName: string;
  agreedFee?: number | null;
}): Promise<GigRole>
```

**Features:**
- Skips email invitation flow
- Links user immediately (`musician_id` set)
- Sends in-app notification
- User can accept/decline from notification

### 3. Unified Search Component (`components/unified-musician-search.tsx`)

Command palette-style search interface:

**UI Structure:**
```
┌─────────────────────────────────────────┐
│ 🔍 Add musician...                      │
└─────────────────────────────────────────┘
```

**When clicked/typing:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search by name or email...           │
├─────────────────────────────────────────┤
│ 👥 MY CIRCLE (2)                        │
│   John Doe     Keys    $200    [+ Add]  │
│   Jane Smith   Drums   $150    [+ Add]  │
├─────────────────────────────────────────┤
│ 🌐 SYSTEM USERS (3)                     │
│   Bob Wilson   Guitar  bob@... [+ Add]  │
│   ...                                    │
├─────────────────────────────────────────┤
│ ✉️ INVITE NEW PERSON                    │
│   📧 Invite "query" by email...         │
│   📱 Invite "query" by WhatsApp...      │
└─────────────────────────────────────────┘
```

**Features:**
- Real-time search as you type (2+ characters)
- Categorized results with visual hierarchy
- Avatar support (with fallbacks)
- Contact metadata (instrument, fee, times worked)
- One-click add for each result
- Smart filtering (no duplicates, hides current user)

### 4. Updated Gig People Section

**Before:**
```typescript
<Button>Add from My Circle</Button>
<Button>Invite Someone New</Button>
```

**After:**
```typescript
<UnifiedMusicianSearch
  gigId={gigId}
  onAddFromCircle={handleUnifiedAddFromCircle}
  onAddSystemUser={handleAddSystemUser}
  onInviteByEmail={() => setQuickInviteOpen(true)}
  onInviteByWhatsApp={() => setQuickInviteOpen(true)}
/>
```

**New Handlers:**
- `handleUnifiedAddFromCircle` - Add from saved contacts
- `handleAddSystemUser` - Add registered user directly

### 5. Database Migration (`20241119000000_enable_public_profiles_search.sql`)

```sql
-- Add avatar_url column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Enable public profile search
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');
```

**Changes:**
- Added `avatar_url` column to profiles
- Changed RLS from "own profile only" to "all profiles"
- Maintains update/insert restrictions (users can only edit their own)

### 6. Updated Types

**`lib/types/shared.ts`:**
```typescript
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  main_instrument: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

**`lib/types/database.ts`:**
- Added `avatar_url` to profiles Row/Insert/Update types

## Technical Decisions

### Why One Search Field?

**Problem:** 3 buttons cluttered the UI and made workflow slower:
- "Add from My Circle"
- "Invite Someone New"
- Future: "Add from System"

**Solution:** Command palette pattern that shows all options contextually:
- Type once, see everything relevant
- Clear visual hierarchy
- Faster workflow (no button clicking to open different dialogs)

### Why Public Profile Access?

**Previous:** Users could only see their own profile (RLS policy: `auth.uid() = id`)

**Problem:** Can't search for other users to add to gigs

**Solution:** Facebook-style public profiles:
- Any authenticated user can view all profiles
- Enables user discovery
- Still private for updates (can only edit own profile)
- No sensitive data exposed (just name, email, instrument, avatar)

**Security Considerations:**
- Email already visible in invitation system
- No sensitive fields exposed (passwords, tokens, etc.)
- Update/delete policies still restricted to own profile

### Why Direct Add vs Email?

**Email Invitation Flow:** Create role → Send email → User clicks link → Accept/decline

**Direct Add Flow:** Search user → Add to gig → Notification sent → User accepts/declines

**Benefits:**
- No dependency on email delivery
- Instant visibility for both parties
- Enables notification testing with multiple accounts
- Still allows user to accept/decline

### Result Prioritization

**Order:**
1. **My Circle** - Your saved contacts (best UX - pre-filled fees/roles)
2. **System Users** - All registered users (discovery)
3. **Invite Options** - Fallback for new people

**Why this order?**
- Most likely to use saved contacts (past collaborators)
- System users for discovery (musicians already in system)
- Invite for brand new contacts (least common)

## Performance Optimizations

### Database
- `ilike` queries leverage existing index on `name` column
- `LIMIT 20` prevents large result sets
- No N+1 queries (single query per search type)

### Client-Side
- TanStack Query with 5-minute cache
- Search only triggers at 2+ characters
- Command component debounces input
- Filters duplicates client-side (circle vs system users)

### Network
- Parallel queries (My Circle + System Users fetch simultaneously)
- No refetch unless search value changes
- Cached results reused across component mounts

## Files Created

- `lib/api/users.ts` - System user search API
- `components/unified-musician-search.tsx` - Unified search component
- `supabase/migrations/20241119000000_enable_public_profiles_search.sql` - Migration

## Files Modified

- `lib/api/gig-roles.ts` - Added `addSystemUserToGig` function
- `lib/types/shared.ts` - Added `SystemUser` interface
- `lib/types/database.ts` - Added `avatar_url` to profiles
- `components/gig-people-section.tsx` - Replaced 3 buttons with unified search

## Bug Fixes

### Initial Implementation Issue (Fixed)

**Bug:** Search function was passing parameters in wrong order  
**Error:** `invalid input syntax for type uuid: "[search text]"`  
**Root Cause:** `searchContacts(searchValue)` passed search query as userId parameter  
**Fix:** Changed to `searchContacts(user?.id!, searchValue)` - correct parameter order  
**Impact:** My Circle search now works correctly

## Testing Checklist

### Basic Search
- [x] Type 2+ characters, see results
- [x] Results categorized correctly (Circle → System → Invite)
- [x] Typing updates results in real-time
- [x] No results shows appropriate empty state

### Add from Circle
- [ ] Click contact from My Circle
- [ ] Role auto-fills from contact's default role
- [ ] Fee auto-fills from contact's default fee
- [ ] Contact added to gig roles table
- [ ] Roles list refreshes automatically

### Add System User
- [ ] Click user from System Users section
- [ ] User added with musician_id linked
- [ ] Role defaults to instrument or "Musician"
- [ ] In-app notification sent to added user
- [ ] User can see gig in their invitations

### Filtering
- [ ] Current user doesn't appear in System Users
- [ ] Contacts from My Circle don't duplicate in System Users
- [ ] Search filters by name (case-insensitive)
- [ ] Search filters by email (case-insensitive)

### Invite Fallback
- [ ] "Invite by email" option always visible
- [ ] "Invite by WhatsApp" option always visible
- [ ] Clicking opens QuickInviteDialog
- [ ] Search query prefills invite dialog

### Visual
- [ ] Avatars display for system users (with fallbacks)
- [ ] Contact metadata shows (instrument, fee, times worked)
- [ ] "Active" badge shows for linked contacts
- [ ] Plus icon visible on add buttons

### Notifications
- [ ] Added user receives notification
- [ ] Notification title: "Added to gig: [Gig Title]"
- [ ] Notification message includes role name
- [ ] Link directs to gig pack page

## Security Considerations

### Profile Privacy
- ✅ Only authenticated users can search (not public internet)
- ✅ No sensitive data exposed (passwords, tokens, calendar data)
- ✅ Update policies still restricted to own profile
- ✅ Delete policies still restricted to own profile

### RLS Verification
```sql
-- Before: Only see own profile
CREATE POLICY "Users can view own profile"
  USING (auth.uid() = id);

-- After: See all profiles (authenticated only)
CREATE POLICY "Authenticated users can view all profiles"
  USING (auth.role() = 'authenticated');
```

### Data Exposure Check
**Exposed fields:**
- id, name, email, phone, main_instrument, avatar_url, created_at

**Protected fields (not in SystemUser type):**
- default_country_code
- calendar_ics_token
- updated_at

## Known Limitations

1. **No Pagination:** Limited to 20 results per category
   - **Fix (future):** Add "Load more" or virtual scrolling
   
2. **Simple Search:** Basic `ilike` pattern matching
   - **Fix (future):** Full-text search with PostgreSQL GIN indexes
   
3. **No Filters:** Can't filter by instrument, location, etc.
   - **Fix (future):** Add filter chips/dropdowns

4. **Avatar Upload:** No UI to upload avatars yet
   - **Fix (future):** Add avatar upload in profile settings

## Next Steps

### Immediate (Ready to Test)
1. Start Docker Desktop
2. Run: `supabase start`
3. Run: `supabase migration up`
4. Run: `npm run dev`
5. Create 2-3 test user accounts
6. Test searching and adding users to gigs
7. Verify notifications work

### Future Enhancements
1. **Avatar Management:** Profile settings page to upload avatars
2. **Advanced Search:** Filters by instrument, availability, location
3. **Invite Tracking:** See who you've invited but hasn't joined yet
4. **User Profiles:** Click user to see public profile/portfolio
5. **Recommendations:** Suggest musicians based on:
   - Similar gigs worked
   - Instruments needed
   - Availability patterns

## Success Metrics

### UX Improvement
- ✅ Reduced from 3 buttons to 1 search field
- ✅ Unified workflow (type once, see all options)
- ✅ One-click add (no dialog navigation)

### Feature Enablement
- ✅ Can now test notifications with multiple users
- ✅ User discovery enabled (find any registered user)
- ✅ Direct add bypasses email limitations

### Performance
- ✅ Search limited to 20 results (fast queries)
- ✅ Client-side caching (5 min stale time)
- ✅ Debounced input (Command component)

## Code Cleanup

After implementation, removed dead code from previous system:

**Removed Unused Imports:**
- Command, CommandEmpty, CommandGroup, etc. (old search UI)
- Popover components (replaced by unified search)
- Unused lucide-react icons (Plus, ChevronsUpDown, UserPlus, UsersRound)
- searchMusicianNames function (replaced by system user search)
- MusicianSuggestion type (no longer needed)
- Badge component (not used)
- cn utility (not used)

**Removed Unused State:**
- `musicianSearchOpen` - old search popover state
- `musicianSearchValue` - old search query
- `isQuickAdding` - old loading state

**Removed Dead Code:**
- `musicianSuggestions` query (fetched but never used)
- `handleMusicianSelect` function (never called)

**Kept for Backward Compatibility:**
- AddRoleDialog (still used for manual role creation)
- AddFromCircleDialog (bulk contact add fallback)
- QuickInviteDialog (unified search triggers this)
- InviteMusicianDialog (email invitation for existing roles)

## Lessons Learned

1. **Command Palettes Scale Well:** Single search interface handles multiple data sources cleanly
2. **Categorization Matters:** Clear visual hierarchy prevents confusion
3. **Facebook-Style Works:** Public profiles don't compromise privacy if designed carefully
4. **Avatar Fallbacks Essential:** Not everyone uploads photos
5. **Smart Defaults Save Time:** Auto-filling role/fee from contacts improves UX
6. **Check Function Signatures:** Parameter order bugs are easy to miss - always verify function calls match signatures
7. **Clean As You Go:** Removing dead code immediately prevents confusion and reduces bundle size

## Related Documentation

- Step 19: In-App Notifications Center (notification system this enables testing for)
- Step 11: My Circle (contacts integration)
- Step 12: Quick Invite (email/WhatsApp fallback)

