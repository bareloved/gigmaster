# Step 1 Instructions - Database Setup

## ✅ What I've Done So Far

1. **Created Supabase client utilities:**
   - `lib/supabase/client.ts` - Browser client
   - `lib/supabase/server.ts` - Server client (for API routes and Server Components)

2. **Created TypeScript types:**
   - `lib/types/database.ts` - Full type definitions for all tables

3. **Created SQL migration:**
   - `supabase/migrations/20241111_initial_schema.sql` - Complete schema with:
     - `profiles` table
     - `projects` table
     - `gigs` table
     - All indexes for performance
     - Row Level Security (RLS) policies
     - Automatic `updated_at` triggers

4. **Installed packages:**
   - `@supabase/ssr` for server-side rendering support

5. **Created test page:**
   - `/app/(app)/test-db/page.tsx` - To verify database connection

---

## 🔧 What You Need To Do Now

### Step 1: Create `.env.local` File

The `.env.local` file is blocked by security settings, so you need to create it manually:

1. **Create a new file** at the root of your project called `.env.local`
2. **Paste this content:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://doqngbugrnlruzegdvyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvcW5nYnVncm5scnV6ZWdkdnlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTAxNjUsImV4cCI6MjA3ODQ2NjE2NX0.vBWTLhdUbMpUiU2cV7Zt8jId3G9WO4Jzwynzj0QnEEE
```

3. **Save the file**

### Step 2: Run the SQL Migration in Supabase

1. **Go to your Supabase dashboard:**
   - https://supabase.com/dashboard/project/doqngbugrnlruzegdvyd

2. **Click "SQL Editor"** in the left sidebar

3. **Click "New query"**

4. **Copy the entire contents** of `supabase/migrations/20241111_initial_schema.sql`

5. **Paste into the SQL editor**

6. **Click "Run"** (or press Cmd/Ctrl + Enter)

7. **Wait for success message** - should say "Success. No rows returned"

### Step 3: Verify Tables Were Created

In Supabase dashboard:

1. **Click "Table Editor"** in the left sidebar
2. You should now see 3 tables:
   - `profiles`
   - `projects`
   - `gigs`

### Step 4: Test the Connection

1. **Restart your dev server:**
   ```bash
   # Stop the current server (Ctrl+C if running)
   npm run dev
   ```

2. **Visit the test page:**
   ```
   http://localhost:3000/test-db
   ```

3. **You should see:**
   - ✅ "Database connection successful!" message
   - "Found 0 projects" (empty is expected)
   - "Found 0 gigs" (empty is expected)
   - No error messages

---

## ✅ Success Criteria

Step 1 is complete when:
- [ ] `.env.local` file exists with your credentials
- [ ] SQL migration ran successfully in Supabase
- [ ] You can see 3 tables in Supabase Table Editor
- [ ] `/test-db` page shows green success message
- [ ] No errors in browser console or terminal

---

## 🐛 Troubleshooting

### If you see "Error: relation 'projects' does not exist"
→ The migration hasn't been run yet. Go back to Step 2.

### If you see "Invalid API key"
→ Double-check your `.env.local` file has the correct credentials.

### If you see "Failed to fetch"
→ Restart your dev server after creating `.env.local`.

---

## 📝 What's Next (Step 2)

Once this works, we'll:
1. Add authentication (sign up / sign in)
2. Create actual UI for managing projects
3. Build the gig creation flow
4. Add role management for musicians

---

**Let me know when you've completed these steps!** 🚀

