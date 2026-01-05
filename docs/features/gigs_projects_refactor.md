# Gigs vs Projects Refactor – Architecture & UX Notes

Last updated: 2025-11-20

## 1. Context

Right now the data model and UX are:

- Users must **create a Project first**, then create **Gigs inside that Project**.
- `gigs` has a **required** `project_id`.
- RLS and queries are heavily tied to `projects` as the parent entity.

This causes problems:

- Feels like a **limitation**: musicians just want to add “a gig on Friday”, not think about projects/folders first.
- Hard to handle imported / quick-added gigs that don’t naturally belong to a project.
- RLS becomes tangled because access to gigs is chained through projects.

We want to fix this so that:

> **Gigs are the primary entity.**  
> **Projects are optional organization.**

---

## 2. New Mental Model

### Core idea

- A **Gig** is the atomic thing: date, time, location, lineup, money, etc.
- A **Project** is an *optional* way to group gigs (like **bands**, **acts**, **clients**, or **folders**).

Behavioral changes:

- Users **can create gigs without a project**.
- A gig **may optionally** be attached to a project (e.g. “80s Cover Band”, “Corporate Funk Project”, “DJ Live Act”).
- Access control (RLS) is driven by **gig-level membership**, not by project membership.

---

## 3. Target Design (High-Level)

### 3.1 Database / Schema

1. **`gigs` table**

   - Keep the table, but:
     - `project_id` becomes **nullable** instead of required.
     - `project_id` is now just for grouping/filtering, not required for creation.

   Example fields (conceptual, not code):

   - `id`
   - `project_id` (nullable)
   - `created_by` (user who created the gig)
   - `date`, `time`, `location`, `title`, etc.

2. **`projects` table**

   - Keep as-is conceptually, but its role changes:
     - A project is a **band / act / client / folder** that can have many gigs.
     - It is not required for a gig to exist.
   - Existing gigs already connected to projects stay as-is.

3. **`gig_memberships` table**

   Introduce or use an existing table to model who is involved in each gig:

   - `id`
   - `gig_id`
   - `user_id`
   - `role` (examples: `manager`, `player`, `client`, etc.)

   Purpose:

   - Define who can see/edit a gig.
   - Represent the lineup and manager/player roles.

### 3.2 RLS (Row Level Security) – Conceptual

**Goal:** Access to gigs is defined at the gig level.

A user can access a gig if:

1. They **created** the gig  
   – `gigs.created_by = auth.uid()`

2. OR they are listed in `gig_memberships`  
   – There exists a row where `gig_memberships.gig_id = gigs.id`  
   and `gig_memberships.user_id = auth.uid()`.

Projects have their own RLS, but they are **not the gatekeeper** for gig visibility anymore.

Important implications:

- You can fetch all gigs visible to a user without going through projects.
- You can still filter gigs by project, but it’s optional.

---

## 4. UX Changes

### 4.1 Gig Creation Flow

Current:  
- Forced: “Choose/Create Project → Create Gig under Project”.

New flow:

1. **Step 1 – Gig Basics**
   - Title (e.g. “Wedding – Aviv & Noy”)
   - Date & time
   - Location

2. **Step 2 – Lineup & Invites**
   - Add musicians / colleagues:
     - Each one creates a `gig_memberships` row (with role, maybe pay later).
   - This defines who can see the gig and what their role is.

3. **Step 3 – Optional Project**
   Small section:

   > **Project (optional)**  
   > - None  
   > - Select existing project  
   > - Quick-create project (name only, e.g. “80s Cover Band”)

User can skip this and still create the gig.  
A gig with `project_id = null` is perfectly valid.

### 4.2 Dashboard UX

New default behavior:

- **Main view:** “All My Gigs”  
  - Upcoming and recent gigs where:
    - user is `created_by` OR
    - user is in `gig_memberships`.

- **Filters:**
  - Role: manager / player / both
  - Project: dropdown list → “All Projects / 80s Band / DJ Live / …”
  - Date range (this week, this month, etc.)

Key point:

> Musicians think “what gigs do I have coming up?”  
> not “which project am I currently inside?”

This supports that mental model.

---

## 5. Migration Strategy (Conceptual)

1. **Relax the schema**
   - Change `gigs.project_id` to allow null.
   - Update any foreign key constraint to allow nulls.

2. **Update RLS**
   - Move access logic from `projects` → `gigs` using:
     - `gigs.created_by`
     - `gig_memberships`.

3. **Update queries and API**
   - Any queries that assume `project_id` is present must:
     - Handle `project_id` possibly being `null`.
     - Optionally filter by `project_id` if needed, but not require it.

4. **Keep existing data**
   - Existing gigs that already have `project_id` stay the same.
   - No need to backfill `project_id` for new gigs; they can start null.
   - Later, add UI actions like “Attach to project” / “Move to project”.

---

## 6. Naming Notes (Optional Future Work)

Right now the term **Project** might be confusing for musicians.

Possible alternative names depending on the direction:

- **Band** – if it always represents a specific group of musicians.
- **Act** – for a performance concept (e.g. “80s Show”, “Wedding Band”).
- **Client** – if you’re grouping by production company or client.
- **Project** – if you want a more generic umbrella.

This can be revisited later, but the architecture above works with any of these labels.

---

## 7. Cursor Agent Usage – Prompt Snippet

You can reference this file in Cursor as context and then give the agent a prompt like:

> **Prompt for Cursor agent:**  
>  
> You are working on my gig management app.  
> I have a markdown file in the repo that describes how I want to refactor the relationship between gigs and projects: `docs/gigs_projects_refactor.md`.  
>  
> 1. Read and fully understand that file.  
> 2. Inspect the current database schema, RLS policies, and main gig/project components.  
> 3. Implement the refactor so that:
>    - `gigs.project_id` is optional (nullable).
>    - RLS on `gigs` uses `created_by` and a `gig_memberships` table for access control.
>    - Projects are only an optional grouping/tagging mechanism.
>    - The UI supports creating gigs without a project and filters gigs by project on the dashboard.  
> 4. Work step-by-step, explaining what you’re changing and why.

---
