// Adapted from vendor/gigpack/lib/types.ts

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface LineupMember {
  role: string;
  name?: string;
  notes?: string;
}

// Structured Setlist Types (Setlist v2)
export interface SetlistSong {
  id: string;
  title: string;
  artist?: string;
  key?: string;
  tempo?: string; // Can be number like "120" or description like "ballad"
  notes?: string; // Rehearsal notes, watch-outs, etc.
  referenceUrl?: string; // For future use
}

export interface SetlistSection {
  id: string;
  name: string; // e.g. "Set 1", "Encore", "Extras"
  songs: SetlistSong[];
}

export type GigPackTheme = "minimal";

export type PosterSkin = "clean" | "paper" | "grain"; // Deprecated, kept for backward compatibility

// Band Types (Mapped to Ensemble Projects)
export interface Band {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  band_logo_url: string | null;
  hero_image_url: string | null; // Missing in DB, will be null
  accent_color: string | null; // Missing in DB, will be null
  poster_skin: PosterSkin | null; // Missing in DB, will be null
  default_lineup: LineupMember[]; // Missing in DB, will be []
  created_at: string;
  updated_at: string;
}

export type BandInsert = Omit<Band, "id" | "created_at" | "updated_at">;
export type BandUpdate = Partial<Omit<Band, "id" | "owner_id" | "created_at">>;

// Materials Types
export type GigMaterialKind =
  | "rehearsal"
  | "performance"
  | "charts"
  | "reference"
  | "other";

export interface GigMaterial {
  id: string;           // string UUID
  label: string;        // e.g. "Rehearsal 1 – 2025-05-10"
  url: string;          // full URL
  kind: GigMaterialKind;
}

// Schedule Types
export interface GigScheduleItem {
  id: string;           // Unique ID (UUID or stable string)
  time: string | null;  // "HH:mm" in 24h format, e.g. "18:30"
  label: string;        // description, e.g. "Soundcheck"
}

// Packing Checklist Types
export interface PackingChecklistItem {
  id: string;      // Unique ID (UUID or stable string)
  label: string;   // e.g. "In-ears", "Sustain pedal"
}

// Local-only state for checkbox values (stored in localStorage)
export type PackingChecklistState = {
  [itemId: string]: boolean;
};

// Mapped to Ensemble 'gigs' + related tables
export interface GigPack {
  id: string;
  owner_id: string;
  owner_name?: string | null; // Added for display
  title: string;
  status: string | null; // Added for display
  band_id: string | null; // project_id
  band_name: string | null; // project name (joined)
  date: string | null;
  call_time: string | null;
  on_stage_time: string | null; // from start_time? or explicit column
  venue_name: string | null; // location_name
  venue_address: string | null; // location_address
  venue_maps_url: string | null;
  lineup: LineupMember[] | null; // gig_roles
  setlist: string | null; // text column
  setlist_structured: SetlistSection[] | null; // setlist_items + sections
  dress_code: string | null;
  backline_notes: string | null;
  parking_notes: string | null;
  payment_notes: string | null; // Missing in DB
  internal_notes: string | null; // Missing in DB (maybe 'notes'?)
  public_slug: string; // Missing? Or use ID? GigPack uses public_slug.
  theme: GigPackTheme | null;
  is_archived: boolean; // status != 'confirmed'?
  created_at: string;
  updated_at: string;
  // Branding fields
  band_logo_url: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  poster_skin: PosterSkin | null;
  // Packing checklist
  packing_checklist: PackingChecklistItem[] | null;
  gig_type: string | null;
  // Materials - links to recordings, charts, etc.
  materials: GigMaterial[] | null;
  // Schedule - timeline for the day
  schedule: GigScheduleItem[] | null;
}

export type GigPackInsert = Omit<GigPack, "id" | "created_at" | "updated_at">;
export type GigPackUpdate = Partial<Omit<GigPack, "id" | "owner_id" | "public_slug" | "created_at">>;

// User Template Types
// Shared type for template default values (used by both built-in and user templates)
export interface GigPackTemplateDefaultValues {
  title?: string;
  bandName?: string;
  theme?: GigPackTheme;
  accentColor?: string;
  posterSkin?: PosterSkin;
  dateOffsetDays?: number;
  dressCode?: string;
  backlineNotes?: string;
  parkingNotes?: string;
  paymentNotes?: string;
  gigMood?: string;
  setlistStructured?: SetlistSection[];
  packingChecklist?: PackingChecklistItem[];
}

// User-created template stored in database
export interface UserTemplate {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  icon: string;
  default_values: GigPackTemplateDefaultValues;
  created_at: string;
  updated_at: string;
}

export type UserTemplateInsert = Omit<UserTemplate, "id" | "created_at" | "updated_at">;
export type UserTemplateUpdate = Partial<Omit<UserTemplate, "id" | "owner_id" | "created_at">>;

export interface SetlistData {
  title?: string;
  location?: string;
  date?: string;
  lines: string[];
  options?: any;
  locale?: string;
}
