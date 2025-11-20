# Step 1: Supabase Project & Core Schema Foundation

**Status**: ✅ Complete  
**Date**: November 11, 2025  
**Goal**: Set up Supabase backend, create core database schema, and establish secure data access patterns

---

## Overview

This step established the backend foundation for Ensemble. We created a Supabase project, designed and implemented the core database schema (profiles, projects, gigs), set up Row Level Security policies for secure multi-tenant access, and verified the connection between Next.js and Supabase.

---

## What We Built

### 1. Supabase Project Setup
- Created new Supabase project: `doqngbugrnlruzegdvyd`
- Configured environment variables in `.env.local`
- Set up project URL and anon key

### 2. Database Schema
Created three core tables with proper relationships:

**`profiles` table**
- Extends Supabase auth.users with app-specific data
- Fields: id (UUID, FK to auth.users), name, main_instrument
- Auto-timestamps: created_at, updated_at

**`projects` table**
- Represents bands/acts that users manage
- Fields: id (UUID), owner_id (FK to profiles), name, description, cover_image_url
- Auto-timestamps: created_at, updated_at

**`gigs` table**
- Represents individual performances/shows
- Fields: id (UUID), project_id (FK to projects), title, date, start_time, end_time, location_name, location_address, status
- Auto-timestamps: created_at, updated_at

### 3. Performance Optimizations
Added indexes for common query patterns:
- `idx_projects_owner_id` - Fast lookup of user's projects
- `idx_gigs_project_id` - Fast lookup of project's gigs
- `idx_gigs_date` - Fast date-based queries (upcoming gigs)
- `idx_gigs_status` - Fast filtering by gig status

### 4. Row Level Security (RLS)
Implemented secure, user-scoped access:

**Profiles policies**:
- Users can view their own profile
- Users can update their own profile
- Users can insert their own profile (on signup)

**Projects policies**:
- Users can view/insert/update/delete only their own projects
- Enforced through `owner_id = auth.uid()` checks

**Gigs policies**:
- Users can only access gigs for projects they own
- Uses subquery to verify project ownership

### 5. Automatic Timestamp Updates
Created trigger function that auto-updates `updated_at` on any row modification

### 6. Supabase Client Configuration
**Browser Client** (`lib/supabase/client.ts`):
- For client-side queries
- Uses @supabase/ssr for better SSR support

**Server Client** (`lib/supabase/server.ts`):
- For Server Components and API routes
- Handles cookies for authentication
- Type-safe with Database types

### 7. TypeScript Types
Generated complete type definitions in `lib/types/database.ts`:
- Row types (what you get from SELECT)
- Insert types (what you need for INSERT)
- Update types (what you can modify)
- Relationships between tables

### 8. Connection Test
Created `/test-db` page to verify:
- Environment variables configured correctly
- Database tables exist and are accessible
- RLS policies working (empty results expected for unauthenticated users)
- No connection errors

---

## Technical Decisions

### Why Separate Browser and Server Clients?
- Next.js 15 has strict client/server boundaries
- Server client handles cookies properly for auth
- Different initialization patterns for each context
- Better error messages when used incorrectly

### Why These Tables First?
- **profiles**: Foundation for user data
- **projects**: Core concept (bands/acts)
- **gigs**: Main feature (performances)
- Other tables (roles, setlists, payments) can build on these

### Why These Specific RLS Policies?
- Start with strict, user-scoped access
- Prevents data leaks between users
- Will expand later for shared access (band members)
- Easy to add new policies without changing existing ones

### Why Manual SQL Migration?
- Full control over schema
- Can run in Supabase dashboard directly
- Easy to review before running
- Can be version-controlled
- Alternative: Could use Supabase CLI later for automated migrations

### Field Type Decisions
**UUID vs Integer**:
- UUIDs for all IDs (non-guessable, distributed-friendly)

**Date vs Timestamp**:
- `date` for gig date (day-level precision)
- `time` for start/end times (no timezone, local time)
- `timestamptz` for created_at/updated_at (audit trail)

**Text vs Varchar**:
- `text` for all strings (no length limit, Postgres optimizes anyway)

---

## Files Created/Modified

### New Files
```
.env.local                              - Environment variables (gitignored)
lib/supabase/client.ts                  - Browser Supabase client
lib/supabase/server.ts                  - Server Supabase client
lib/types/database.ts                   - TypeScript database types
supabase/migrations/20241111_initial_schema.sql  - Database schema
app/(app)/test-db/page.tsx              - Connection test page
docs/build-process/
  README.md                             - Build docs index
  step-0-project-setup.md               - Step 0 documentation
  step-1-supabase-database.md           - This file
STEP_1_INSTRUCTIONS.md                  - Setup instructions
```

### Modified Files
```
components/app-sidebar.tsx              - Added "Test DB" nav item
package.json                            - Added @supabase/ssr
```

---

## SQL Schema Details

### Tables Created

```sql
-- profiles: User information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  main_instrument TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- projects: Bands/acts
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- gigs: Performances/shows
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location_name TEXT,
  location_address TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance

```sql
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_gigs_project_id ON gigs(project_id);
CREATE INDEX idx_gigs_date ON gigs(date);
CREATE INDEX idx_gigs_status ON gigs(status);
```

---

## How to Test

### 1. Verify Database Connection
1. Visit http://localhost:3000/test-db
2. Should see: ✅ "Database connection successful!"
3. Should show: "Found 0 projects" and "Found 0 gigs"
4. No error messages

### 2. Verify Tables in Supabase Dashboard
1. Go to Supabase → Table Editor
2. Should see 3 tables: profiles, projects, gigs
3. Click each table to view structure

### 3. Verify RLS Policies
1. Supabase → Authentication → Policies
2. Each table should have policies listed
3. Try queries in SQL editor (should respect policies)

### 4. Test TypeScript Types
```typescript
// This should have full type inference
const { data: projects } = await supabase
  .from("projects")
  .select("*");
// projects is typed as Project[] | null
```

---

## Key Dependencies Added

```json
{
  "@supabase/ssr": "^0.1.0"
}
```

---

## Known Limitations

### Current State
- ❌ No authentication UI yet (can't sign up/log in)
- ❌ No way to create data through UI
- ❌ RLS policies block unauthenticated access (expected)
- ❌ No data seeding/fixtures for development

### Future Enhancements Needed
- Add gig_roles table (for musician assignments)
- Add setlist_items table
- Add files/attachments table
- Add payment tracking tables
- Consider soft deletes instead of hard deletes
- Add more granular status enums
- Add full-text search indexes

---

## Security Considerations

### What We Did Right ✅
- Enabled RLS on all tables immediately
- User-scoped policies from the start
- References to auth.users for profile linking
- CASCADE deletes to prevent orphaned data
- Used anon key (not service role key) in frontend

### Future Security TODOs
- Add email verification requirement
- Implement rate limiting on expensive queries
- Add audit logging for sensitive operations
- Consider adding created_by/updated_by tracking
- Add role-based access for shared projects

---

## Performance Notes

### Query Performance
- Indexes on foreign keys (owner_id, project_id)
- Index on frequently filtered columns (date, status)
- No N+1 query patterns yet (will watch as we add features)

### Expected Query Patterns
```sql
-- Get user's projects (indexed on owner_id)
SELECT * FROM projects WHERE owner_id = auth.uid();

-- Get project's gigs (indexed on project_id)
SELECT * FROM gigs WHERE project_id = 'xxx';

-- Get upcoming gigs (indexed on date)
SELECT * FROM gigs WHERE date >= CURRENT_DATE ORDER BY date;

-- Get gigs by status (indexed on status)
SELECT * FROM gigs WHERE status = 'confirmed';
```

---

## Next Steps Options

### Option A: Authentication (Recommended)
- Set up Supabase Auth
- Create sign up / sign in pages
- Add auth middleware
- Auto-create profile on signup
- Protected routes

### Option B: Projects CRUD
- Create project form
- List projects
- Edit/delete projects
- Project detail page

### Option C: Type Generation Automation
- Set up Supabase CLI
- Auto-generate types from schema
- Add to dev workflow

---

## Database Diagram

```
auth.users (Supabase managed)
    ↓
profiles
    ↓
projects
    ↓
gigs
```

---

## Testing Queries (Run in Supabase SQL Editor)

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

**Completion Criteria Met**: ✅
- [x] Supabase project created
- [x] Environment variables configured
- [x] Core tables created (profiles, projects, gigs)
- [x] Indexes added for performance
- [x] RLS policies implemented
- [x] Supabase clients configured
- [x] TypeScript types generated
- [x] Connection test passing
- [x] No errors in test page

---

*Last updated: November 11, 2025*

