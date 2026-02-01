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
  artist?: string | null;
  key?: string | null;
  tempo?: string | null; // Can be number like "120" or description like "ballad"
  notes?: string | null; // Rehearsal notes, watch-outs, etc.
  referenceUrl?: string | null; // For future use
}

export interface SetlistSection {
  id: string;
  name: string; // e.g. "Set 1", "Encore", "Extras"
  songs: SetlistSong[];
}

export type GigPackTheme = "minimal" | "vintage_poster" | "social_card";

export type PosterSkin = "clean" | "paper" | "grain";

// Band Types
export interface Band {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  band_logo_url: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  poster_skin: PosterSkin | null;
  default_lineup: LineupMember[];
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

export interface GigPack {
  id: string;
  owner_id: string;
  title: string;
  band_id: string | null; // Reference to bands table (new)
  band_name: string | null; // Keep for backward compatibility
  date: string | null;
  call_time: string | null;
  on_stage_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  venue_maps_url: string | null;
  lineup: LineupMember[] | null;
  setlist: string | null;
  setlist_pdf_url: string | null; // Uploaded PDF URL
  setlist_structured: SetlistSection[] | null; // Setlist v2
  dress_code: string | null;
  backline_notes: string | null;
  parking_notes: string | null;
  payment_notes: string | null;
  internal_notes: string | null;
  public_slug: string;
  theme: GigPackTheme | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  // Branding fields
  band_logo_url: string | null;
  hero_image_url: string | null;
  accent_color: string | null;
  poster_skin: PosterSkin | null;
  // Packing checklist
  packing_checklist: PackingChecklistItem[] | null;
  // Gig type - category for visual theme classification
  // Expected values: "wedding" | "club_show" | "corporate" | "bar_gig" | "coffee_house" | "festival" | "rehearsal" | "other"
  // Migration: 20251211190354_add_gig_type_to_gig_packs.sql
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

