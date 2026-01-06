import { createClient } from "@/lib/supabase/client";
import type { Band } from "@/lib/types/gigpack";

/**
 * Fetch all bands for the current user
 */
export async function listUserBands(): Promise<Band[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bands")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch bands");

  // Map database fields to Band interface
  return (data || []).map((b) => ({
    ...b,
    created_at: b.created_at as string, // View type is nullable but always has a value
    updated_at: b.updated_at as string, // View type is nullable but always has a value
    hero_image_url: b.hero_image_url || null,
    accent_color: b.accent_color || null,
    poster_skin: (b.poster_skin as "clean" | "paper" | "grain") || "clean",
    default_lineup: (b.default_lineup as any) || [],
  }));
}

/**
 * Delete a band by ID
 */
export async function deleteBand(bandId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("bands")
    .delete()
    .eq("id", bandId);

  if (error) throw new Error(error.message || "Failed to delete band");
}
