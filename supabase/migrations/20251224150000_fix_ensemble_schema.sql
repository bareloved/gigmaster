-- Fix Ensemble Schema Compatibility
-- Reconciles the destructive GigPack migration with Ensemble's requirements

-- 0. Restore Projects Table (Critical Dependency)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  band_logo_url TEXT, -- Added for GigPack compatibility
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Restore Projects Policies
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects FOR DELETE USING (auth.uid() = owner_id);

-- Create 'bands' view for GigPack compatibility
CREATE OR REPLACE VIEW bands AS SELECT * FROM projects;

-- 1. Restore Gigs Columns
ALTER TABLE gigs
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS location_name TEXT,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS client_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ILS';

-- Sync GigPack venue fields to Ensemble location fields
UPDATE gigs SET location_name = venue_name WHERE location_name IS NULL;
UPDATE gigs SET location_address = venue_address WHERE location_address IS NULL;

-- 2. Restore Gig Roles Columns & Fix Structure
ALTER TABLE gig_roles
ADD COLUMN IF NOT EXISTS musician_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS agreed_fee NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS player_notes TEXT,
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notes TEXT, 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Sync GigPack user_id/status to Ensemble columns
UPDATE gig_roles SET musician_id = user_id WHERE musician_id IS NULL AND user_id IS NOT NULL;
UPDATE gig_roles SET invitation_status = status WHERE invitation_status = 'pending' AND status IS NOT NULL;

-- 3. Restore Missing Tables (if they were dropped)

-- Gig Invitations
CREATE TABLE IF NOT EXISTS gig_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  gig_role_id UUID NOT NULL REFERENCES gig_roles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gig_invitations_token ON gig_invitations(token);
CREATE INDEX IF NOT EXISTS idx_gig_invitations_email ON gig_invitations(email);
CREATE INDEX IF NOT EXISTS idx_gig_invitations_gig ON gig_invitations(gig_id);

-- Gig Activity Log
CREATE TABLE IF NOT EXISTS gig_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gig_activity_log_gig ON gig_activity_log(gig_id);

-- Gig Readiness
CREATE TABLE IF NOT EXISTS gig_readiness (
  gig_id UUID PRIMARY KEY REFERENCES gigs(id) ON DELETE CASCADE,
  is_ready BOOLEAN DEFAULT FALSE,
  missing_items TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

-- Calendar Sync Log
CREATE TABLE IF NOT EXISTS calendar_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Setlist Items & Sections Compatibility
CREATE TABLE IF NOT EXISTS setlist_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
ALTER TABLE setlist_sections ENABLE ROW LEVEL SECURITY;

ALTER TABLE setlist_items
ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES setlist_sections(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS artist TEXT,
ADD COLUMN IF NOT EXISTS is_medley BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reference_url TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tempo TEXT;

-- 5. GigPack Specific Tables
CREATE TABLE IF NOT EXISTS gig_shares (
  token TEXT PRIMARY KEY,
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE gig_shares ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gig_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE NOT NULL,
  time TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
ALTER TABLE gig_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gig_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
ALTER TABLE gig_materials ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gig_packing_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID REFERENCES gigs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  sort_order INT DEFAULT 0
);
ALTER TABLE gig_packing_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Fixes
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view gigs" ON gigs;
DROP POLICY IF EXISTS "Users can manage own gigs" ON gigs;
DROP POLICY IF EXISTS "Users can insert gigs" ON gigs;
DROP POLICY IF EXISTS "Users can update gigs" ON gigs;
DROP POLICY IF EXISTS "Users can delete gigs" ON gigs;

-- Comprehensive Gigs Policy
-- View: Owner OR Project Owner OR Assigned Player
CREATE POLICY "Users can view gigs" ON gigs
FOR SELECT USING (
  owner_id = auth.uid()
  OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))
  OR EXISTS (SELECT 1 FROM gig_roles WHERE gig_roles.gig_id = gigs.id AND gig_roles.musician_id = auth.uid())
);

-- Manage: Owner OR Project Owner
CREATE POLICY "Users can manage own gigs" ON gigs
FOR ALL USING (
  owner_id = auth.uid()
  OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))
);

-- Allow inserting if authenticated (must be owner or project owner)
CREATE POLICY "Users can insert gigs" ON gigs
FOR INSERT WITH CHECK (
  owner_id = auth.uid()
  OR (project_id IS NOT NULL AND EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))
);

-- Helper Policies
CREATE POLICY "Users can manage schedule items" ON gig_schedule_items
USING (EXISTS (SELECT 1 FROM gigs WHERE gigs.id = gig_schedule_items.gig_id AND (gigs.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))));

CREATE POLICY "Users can manage materials" ON gig_materials
USING (EXISTS (SELECT 1 FROM gigs WHERE gigs.id = gig_materials.gig_id AND (gigs.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))));

CREATE POLICY "Users can manage packing items" ON gig_packing_items
USING (EXISTS (SELECT 1 FROM gigs WHERE gigs.id = gig_packing_items.gig_id AND (gigs.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))));

CREATE POLICY "Users can manage setlist sections" ON setlist_sections
USING (EXISTS (SELECT 1 FROM gigs WHERE gigs.id = setlist_sections.gig_id AND (gigs.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM projects WHERE projects.id = gigs.project_id AND projects.owner_id = auth.uid()))));

-- 7. Grant access to 'bands' view (postgres quirks sometimes require this?)
-- Views inherit permissions of the underlying table, so RLS on projects should work.
