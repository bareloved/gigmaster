import { createClient } from "@/lib/supabase/client";
import type { GigDraftFormData } from "@/hooks/use-gig-draft";

/**
 * Database representation of a gig draft
 */
export interface GigDraft {
  id: string;
  owner_id: string;
  title: string | null;
  form_data: GigDraftFormData;
  created_at: string;
  updated_at: string;
}

/**
 * Save a new gig draft or update an existing one.
 * If draftId is provided, updates the existing draft.
 * If no draftId, creates a new draft.
 */
export async function saveGigDraft(
  formData: GigDraftFormData,
  draftId?: string
): Promise<GigDraft> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  // Extract title for easy identification in the drafts list
  const title = formData.title || null;

  if (draftId) {
    // Update existing draft
    const { data: draft, error } = await supabase
      .from("gig_drafts")
      .update({
        title,
        form_data: formData,
      })
      .eq("id", draftId)
      .eq("owner_id", user.id) // Ensure user owns the draft
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to update draft");
    return draft as GigDraft;
  } else {
    // Create new draft
    const { data: draft, error } = await supabase
      .from("gig_drafts")
      .insert({
        owner_id: user.id,
        title,
        form_data: formData,
      })
      .select()
      .single();

    if (error) throw new Error(error.message || "Failed to save draft");
    return draft as GigDraft;
  }
}

/**
 * List all drafts for the current user.
 * Returns drafts sorted by updated_at descending (most recent first).
 */
export async function listGigDrafts(): Promise<GigDraft[]> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const { data: drafts, error } = await supabase
    .from("gig_drafts")
    .select("*")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to list drafts");
  return (drafts || []) as GigDraft[];
}

/**
 * Get a specific draft by ID.
 * Returns null if the draft doesn't exist or user doesn't own it.
 */
export async function getGigDraft(draftId: string): Promise<GigDraft | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const { data: draft, error } = await supabase
    .from("gig_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("owner_id", user.id) // Ensure user owns the draft
    .single();

  // Handle case where draft doesn't exist or access denied
  if (error) {
    if (
      error.code === "PGRST116" ||
      error.message?.includes("No rows")
    ) {
      return null;
    }
    throw new Error(error.message || "Failed to fetch draft");
  }

  return draft as GigDraft;
}

/**
 * Delete a draft by ID.
 */
export async function deleteGigDraft(draftId: string): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const { error } = await supabase
    .from("gig_drafts")
    .delete()
    .eq("id", draftId)
    .eq("owner_id", user.id); // Ensure user owns the draft

  if (error) throw new Error(error.message || "Failed to delete draft");
}
