# Step 3: Projects CRUD (Bands/Acts)

## Overview & Goals
This step implements the full CRUD (Create, Read, Update, Delete) functionality for Projects (bands/acts). Projects are the top-level organizational unit in the app - each project can have multiple gigs, and users can manage multiple projects.

**Specific Goals:**
1. Create reusable API functions for project management
2. Build a responsive Projects page with a grid of project cards
3. Implement a "New Project" dialog with form validation
4. Handle loading and empty states gracefully
5. Maintain performance with client-side rendering (no server round-trips on navigation)

## What We Built

### 1. API Layer (`lib/api/projects.ts`)
Created a centralized module for all project-related database operations:

**Functions implemented:**
- `createProject(data)` - Creates a new project for the authenticated user
- `listUserProjects()` - Fetches all projects owned by the current user
- `getProject(projectId)` - Fetches a single project by ID
- `updateProject(projectId, data)` - Updates project details
- `deleteProject(projectId)` - Deletes a project (cascades to gigs via DB constraint)

**Type exports:**
- `Project` - Full project row type
- `ProjectInsert` - Type for inserting new projects
- `ProjectUpdate` - Type for updating projects

**Key implementation details:**
- All functions use the Supabase client-side SDK
- Automatic owner_id assignment from authenticated user
- Proper TypeScript typing using generated database types
- Error handling with try/catch in consuming components

```typescript
export async function createProject(data: Omit<ProjectInsert, "id" | "created_at" | "updated_at" | "owner_id">) {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      ...data,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return project;
}
```

### 2. Create Project Dialog (`components/create-project-dialog.tsx`)
A reusable modal dialog component for creating new projects:

**Features:**
- Form with name (required) and description (optional) fields
- Client-side validation (name required)
- Loading state during submission
- Error handling with user-friendly messages
- Form reset after successful creation
- Controlled inputs with React state

**Props:**
- `open` - Controls dialog visibility
- `onOpenChange` - Callback when dialog open state changes
- `onSuccess` - Callback after successful project creation

**UX considerations:**
- Clear labeling with required field indicators
- Disabled state during submission to prevent double-clicks
- Error messages displayed prominently
- Auto-closes on success

### 3. Projects Page (`app/(app)/projects/page.tsx`)
A client component that displays and manages user projects:

**States handled:**
1. **Loading**: Shows skeleton cards while fetching projects
2. **Empty**: Displays a call-to-action when no projects exist
3. **Populated**: Grid of project cards

**Features:**
- Responsive grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- "New Project" button in header (always visible)
- Empty state with centered content and icon
- Project cards show:
  - Project name (title)
  - Description (truncated to 2 lines)
  - Upcoming gigs count (placeholder for now)
- Hover effect on project cards
- Automatic reload after creating a project

**Performance considerations:**
- Client component for instant navigation
- Projects loaded once on mount
- Manual reload only after mutations
- No unnecessary re-renders

## Technical Decisions & Why

### Client-Side Rendering for Projects Page
**Decision**: Made the Projects page a Client Component  
**Why**: 
- Aligns with our hybrid architecture from Step 2.5
- Ensures instant navigation from other pages
- Data isn't needed for SEO (behind auth)
- Allows for local state management (dialog open/close, loading)

### API Layer Organization
**Decision**: Created a dedicated `/lib/api/projects.ts` file  
**Why**:
- Centralized data access logic
- Reusable across components and future mobile app
- Easier to test in isolation
- Clear separation between UI and data fetching
- Type safety with exported types

### Dialog vs. Separate Page for Create Flow
**Decision**: Used a Dialog modal instead of a separate page  
**Why**:
- Faster UX - no page navigation needed
- Context preservation - user stays on Projects page
- Common pattern for simple forms
- Less mental overhead (no "back" button needed)

### No Image Upload Yet
**Decision**: Deferred `cover_image_url` implementation  
**Why**:
- Keep Step 3 focused on core CRUD
- Image upload (Supabase Storage) can be added later
- Users can still create functional projects without images
- Reduces complexity for MVP

### RLS Handles Authorization
**Decision**: Rely on Row Level Security instead of API-level checks  
**Why**:
- RLS policies already set up in Step 1
- Supabase automatically enforces permissions
- Reduces code duplication
- More secure (can't be bypassed)

### Projects List Not Paginated Yet
**Decision**: Fetch all projects at once  
**Why**:
- Users unlikely to have hundreds of projects
- Most users will have 1-10 projects
- Can add pagination later if needed
- Simpler initial implementation

## Files Created/Modified

### Created Files
- ✅ `lib/api/projects.ts` - Project CRUD API functions
- ✅ `components/create-project-dialog.tsx` - Project creation modal
- ✅ `docs/build-process/step-3-projects-crud.md` - This documentation

### Modified Files
- ✅ `app/(app)/projects/page.tsx` - Complete rewrite from placeholder to functional page
- ✅ `BUILD_STEPS.md` - Marked Step 3 as complete

## Code Snippets

### Project Card Component (from Projects Page)
```typescript
<Card key={project.id} className="hover:border-primary transition-colors cursor-pointer">
  <CardHeader>
    <CardTitle>{project.name}</CardTitle>
    {project.description && (
      <CardDescription className="line-clamp-2">
        {project.description}
      </CardDescription>
    )}
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">
      Upcoming gigs: 0
    </p>
  </CardContent>
</Card>
```

### Empty State Pattern
```typescript
{projects.length === 0 ? (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-16">
      <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
        Create your first project to start organizing your gigs and managing your bands.
      </p>
      <Button onClick={() => setIsCreateDialogOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Create Project
      </Button>
    </CardContent>
  </Card>
) : (
  // Grid of projects
)}
```

## How to Test

With the dev server running at `http://localhost:3000`:

1. **Navigate to Projects page** (`/projects`)
   - Should see empty state if no projects
   - Loading skeletons should appear briefly

2. **Create a new project:**
   - Click "New Project" button
   - Dialog should open
   - Try submitting without a name → should show validation error
   - Enter a project name (e.g., "The Soul Collective")
   - Optionally add a description
   - Click "Create Project"
   - Dialog should close
   - New project should appear in the grid

3. **Create multiple projects:**
   - Repeat the creation process
   - Verify responsive grid layout (resize browser to see 1/2/3 columns)
   - Verify cards show hover effect

4. **Check navigation performance:**
   - Navigate away from Projects (e.g., to Dashboard)
   - Navigate back to Projects
   - Should be instant (no loading delay)
   - Projects should still be there (no re-fetch needed)

5. **Check database:**
   - Open Supabase dashboard → Table Editor → `projects`
   - Verify projects were created with correct `owner_id`
   - Verify timestamps are set

## Performance Considerations

### Current Performance:
- ✅ Client component = instant navigation
- ✅ Single query on mount (no N+1)
- ✅ No over-fetching (only needed columns)
- ✅ Indexed queries (owner_id has index from Step 1)

### Future Optimizations (when needed):
- Add pagination if users have 50+ projects
- Implement optimistic updates (show project before DB confirms)
- Cache projects list (TanStack Query)
- Add search/filter for large project lists

## Security Considerations

- ✅ RLS policies ensure users only see their own projects
- ✅ `owner_id` automatically set from authenticated user (can't be spoofed)
- ✅ No manual authorization checks needed (RLS handles it)
- ✅ All API functions require authentication
- ✅ Cascading deletes configured at DB level (gigs deleted if project deleted)

## Known Limitations

1. **No image upload yet** - `cover_image_url` is always null
2. **No edit functionality** - Can create but not update projects (will add next)
3. **No delete confirmation** - Delete function exists but no UI for it yet
4. **Gig count is hardcoded to 0** - Will be dynamic in Step 4 when we implement gigs
5. **No search/filter** - Fine for MVP, add later if needed

## Next Steps

Next up: **Step 4 – Gigs Basic CRUD**
- Implement gig creation/editing for projects
- Add gig list view per project
- Build gig detail page
- Connect gigs to projects

This will allow users to start adding actual gigs to their projects and see the app come to life!

