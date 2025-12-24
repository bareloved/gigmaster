import { createClient } from "@/lib/supabase/client";
import { 
  UserTemplate, 
  UserTemplateInsert, 
  UserTemplateUpdate,
  GigPackTemplateDefaultValues,
  GigPack 
} from "./types";

/**
 * User Templates Data Operations
 * 
 * CRUD operations for user-created GigPack templates stored in Supabase.
 */

/**
 * Fetch all templates for the current user
 */
export async function getUserTemplates(): Promise<{ data: UserTemplate[] | null; error: Error | null }> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("user_templates")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user templates:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Get a single template by ID
 */
export async function getUserTemplateById(
  templateId: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("user_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("Error fetching user template:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Create a new user template
 */
export async function createUserTemplate(
  name: string,
  defaultValues: GigPackTemplateDefaultValues,
  description?: string,
  icon?: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  const templateData: UserTemplateInsert = {
    owner_id: user.id,
    name,
    description: description || null,
    icon: icon || "📋",
    default_values: defaultValues,
  };

  const { data, error } = await supabase
    .from("user_templates")
    .insert(templateData)
    .select("*")
    .single();

  if (error) {
    console.error("Error creating user template:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Update an existing user template
 */
export async function updateUserTemplate(
  templateId: string,
  updates: UserTemplateUpdate
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error("Not authenticated") };
  }

  const { data, error } = await supabase
    .from("user_templates")
    .update(updates)
    .eq("id", templateId)
    .eq("owner_id", user.id) // Extra safety: ensure user owns the template
    .select("*")
    .single();

  if (error) {
    console.error("Error updating user template:", error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Delete a user template
 */
export async function deleteUserTemplate(
  templateId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: new Error("Not authenticated") };
  }

  const { error } = await supabase
    .from("user_templates")
    .delete()
    .eq("id", templateId)
    .eq("owner_id", user.id); // Extra safety: ensure user owns the template

  if (error) {
    console.error("Error deleting user template:", error);
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Create a template from an existing GigPack
 * Extracts relevant fields from the GigPack and saves as a template
 */
export async function createTemplateFromGigPack(
  gigPack: GigPack,
  name: string,
  description?: string,
  icon?: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  // Extract default values from the GigPack
  const defaultValues: GigPackTemplateDefaultValues = {
    title: gigPack.title,
    bandName: gigPack.band_name || undefined,
    theme: gigPack.theme || undefined,
    accentColor: gigPack.accent_color || undefined,
    posterSkin: gigPack.poster_skin || undefined,
    dressCode: gigPack.dress_code || undefined,
    backlineNotes: gigPack.backline_notes || undefined,
    parkingNotes: gigPack.parking_notes || undefined,
    paymentNotes: gigPack.payment_notes || undefined,
    setlistStructured: gigPack.setlist_structured || undefined,
    packingChecklist: gigPack.packing_checklist || undefined,
  };

  // Clean up undefined values
  const cleanedDefaultValues = Object.fromEntries(
    Object.entries(defaultValues).filter(([, value]) => value !== undefined)
  ) as GigPackTemplateDefaultValues;

  return createUserTemplate(name, cleanedDefaultValues, description, icon);
}

/**
 * Extract form values for creating a template from current GigPackForm state
 * This helper creates the defaultValues object from form field values
 */
export function extractFormValuesToTemplateDefaults(formValues: {
  title?: string;
  bandName?: string;
  theme?: string;
  accentColor?: string;
  posterSkin?: string;
  dressCode?: string;
  backlineNotes?: string;
  parkingNotes?: string;
  paymentNotes?: string;
  setlistStructured?: GigPackTemplateDefaultValues["setlistStructured"];
  packingChecklist?: GigPackTemplateDefaultValues["packingChecklist"];
}): GigPackTemplateDefaultValues {
  const defaults: GigPackTemplateDefaultValues = {};

  if (formValues.title) defaults.title = formValues.title;
  if (formValues.bandName) defaults.bandName = formValues.bandName;
  if (formValues.theme) defaults.theme = formValues.theme as GigPackTemplateDefaultValues["theme"];
  if (formValues.accentColor) defaults.accentColor = formValues.accentColor;
  if (formValues.posterSkin) defaults.posterSkin = formValues.posterSkin as GigPackTemplateDefaultValues["posterSkin"];
  if (formValues.dressCode) defaults.dressCode = formValues.dressCode;
  if (formValues.backlineNotes) defaults.backlineNotes = formValues.backlineNotes;
  if (formValues.parkingNotes) defaults.parkingNotes = formValues.parkingNotes;
  if (formValues.paymentNotes) defaults.paymentNotes = formValues.paymentNotes;
  if (formValues.setlistStructured && formValues.setlistStructured.length > 0) {
    defaults.setlistStructured = formValues.setlistStructured;
  }
  if (formValues.packingChecklist && formValues.packingChecklist.length > 0) {
    defaults.packingChecklist = formValues.packingChecklist;
  }

  return defaults;
}

