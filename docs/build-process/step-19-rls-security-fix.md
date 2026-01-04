# RLS Security Updates (Nov 19, 2024)

## Overview
We identified and fixed critical RLS (Row Level Security) vulnerabilities and circular dependencies in the database schema.

## Changes Made

### 1. Security Helper Functions
Implemented three `SECURITY DEFINER` functions to bypass RLS recursion and safely check permissions:
- `fn_is_gig_owner(gig_id)`: Checks if user owns the gig or the parent project.
- `fn_is_gig_musician(gig_id)`: Checks if user is assigned to a role in the gig.
- `fn_is_project_participant(project_id)`: Checks if user is a musician in *any* gig for a project.

### 2. Policy Updates
All policies for the following tables were rewritten to use the new helper functions:
- **Gigs**: 
  - Viewable by owners and assigned musicians.
  - Editable only by owners.
- **Gig Roles**: 
  - Viewable by owners and assigned musicians.
  - Editable by owners.
  - Musicians can update their own role (e.g. notes) or accept invitations if email matches.
- **Projects**:
  - Viewable by owners and any musician participating in a project's gig.
  - Editable only by owners.
- **Setlist Items & Files**:
  - Viewable by owners and assigned musicians.
  - Editable only by owners.

## Verification
Policies were verified using `pg_policies` system table. All tables now have explicit `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies (or `ALL` for simpler cases) that rely on the non-recursive helper functions.

## Next Steps
- Monitor application logs for any "infinite recursion" errors (should be eliminated now).
- Proceed with building features knowing that data access is securely scoped.

