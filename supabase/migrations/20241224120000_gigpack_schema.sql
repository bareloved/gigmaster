-- CLEANUP: Drop existing tables to establish the new clean schema
-- "We do NOT care about migrating any existing database data. We can reset/rebuild schema cleanly."

DROP TABLE IF EXISTS gig_shares CASCADE;
DROP TABLE IF EXISTS gig_packing_items CASCADE;
DROP TABLE IF EXISTS gig_materials CASCADE;
DROP TABLE IF EXISTS setlist_items CASCADE;
DROP TABLE IF EXISTS setlist_sections CASCADE;
DROP TABLE IF EXISTS gig_roles CASCADE;
DROP TABLE IF EXISTS gig_schedule_items CASCADE;
DROP TABLE IF EXISTS gigs CASCADE;
-- These might exist from previous schema and link to gigs, so we drop them too to avoid orphans or conflicts
DROP TABLE IF EXISTS gig_files CASCADE;
DROP TABLE IF EXISTS gig_invitations CASCADE;
DROP TABLE IF EXISTS gig_activity_log CASCADE;
DROP TABLE IF EXISTS gig_readiness CASCADE;
DROP TABLE IF EXISTS setlist_learning_status CASCADE;
DROP TABLE IF EXISTS calendar_sync_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE; -- References gig_roles/gigs

-- Core Gigs Table
create table gigs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date timestamptz not null,
  call_time text,
  on_stage_time text,
  venue_name text,
  venue_address text,
  venue_maps_url text,
  cover_image_path text,
  hero_image_url text, -- For custom hero
  band_name text,
  band_logo_url text,
  gig_type text, -- wedding, club_show, etc.
  theme text default 'minimal', -- minimal, vintage_poster, social_card
  poster_skin text default 'clean', -- clean, paper, grain
  accent_color text, -- For branding
  owner_id uuid references auth.users(id), -- Added owner_id directly
  
  -- Logistics
  dress_code text,
  backline_notes text,
  parking_notes text,

  -- Simple setlist fallback
  setlist text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Public Shares (The "Magic Link" mechanism)
create table gig_shares (
  token text primary key, -- The URL slug/token
  gig_id uuid references gigs(id) on delete cascade not null,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index idx_gig_shares_token on gig_shares(token);

-- Schedule
create table gig_schedule_items (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  time text not null, -- "18:00"
  label text not null,
  sort_order int default 0
);

-- Lineup / Roles
create table gig_roles (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  role_name text not null,
  musician_name text, -- De-normalized for MVP or linked to auth.users later
  user_id uuid references auth.users(id), -- Optional link
  status text default 'pending',
  sort_order int default 0
);

-- Setlists (Structured)
create table setlist_sections (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  name text not null, -- "Set 1", "Encore"
  sort_order int default 0
);

create table setlist_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references setlist_sections(id) on delete cascade not null,
  title text not null,
  artist text,
  key text,
  tempo text, -- "120"
  notes text,
  is_medley boolean default false,
  reference_url text,
  sort_order int default 0
);

-- Materials (Links/Files)
create table gig_materials (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  label text not null,
  url text not null,
  kind text not null, -- rehearsal, performance, charts, reference, other
  sort_order int default 0
);

-- Packing List (Base items for the gig)
create table gig_packing_items (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete cascade not null,
  label text not null,
  sort_order int default 0
);

-- RLS Policies

-- Enable RLS
alter table gigs enable row level security;
alter table gig_shares enable row level security;
alter table gig_schedule_items enable row level security;
alter table gig_roles enable row level security;
alter table setlist_sections enable row level security;
alter table setlist_items enable row level security;
alter table gig_materials enable row level security;
alter table gig_packing_items enable row level security;

-- Policies for Authenticated Users

create policy "Users can manage their own gigs"
  on gigs for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Helper policy for related tables
-- "Users can manage items if they own the gig"

create policy "Users can manage their gig schedule"
  on gig_schedule_items for all
  using (exists (select 1 from gigs where gigs.id = gig_schedule_items.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = gig_schedule_items.gig_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig roles"
  on gig_roles for all
  using (exists (select 1 from gigs where gigs.id = gig_roles.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = gig_roles.gig_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig setlists"
  on setlist_sections for all
  using (exists (select 1 from gigs where gigs.id = setlist_sections.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = setlist_sections.gig_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig setlist items"
  on setlist_items for all
  using (exists (select 1 from setlist_sections join gigs on gigs.id = setlist_sections.gig_id where setlist_sections.id = setlist_items.section_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from setlist_sections join gigs on gigs.id = setlist_sections.gig_id where setlist_sections.id = setlist_items.section_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig materials"
  on gig_materials for all
  using (exists (select 1 from gigs where gigs.id = gig_materials.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = gig_materials.gig_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig packing items"
  on gig_packing_items for all
  using (exists (select 1 from gigs where gigs.id = gig_packing_items.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = gig_packing_items.gig_id and gigs.owner_id = auth.uid()));

create policy "Users can manage their gig shares"
  on gig_shares for all
  using (exists (select 1 from gigs where gigs.id = gig_shares.gig_id and gigs.owner_id = auth.uid()))
  with check (exists (select 1 from gigs where gigs.id = gig_shares.gig_id and gigs.owner_id = auth.uid()));

-- PUBLIC ACCESS
-- Explicitly NO RLS policies for anon. Access will be via Service Role in API.
