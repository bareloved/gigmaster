// Adapted from vendor/gigpack/lib/userTemplates.ts
// Stub implementation to avoid DB errors since user_templates table is not yet restored/migrated

import { 
  UserTemplate, 
  UserTemplateInsert, 
  UserTemplateUpdate,
  GigPackTemplateDefaultValues,
  GigPack 
} from "./types";

export async function getUserTemplates(): Promise<{ data: UserTemplate[] | null; error: Error | null }> {
  // Return empty list for now
  return { data: [], error: null };
}

export async function getUserTemplateById(
  templateId: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  return { data: null, error: new Error("Templates not implemented yet") };
}

export async function createUserTemplate(
  name: string,
  defaultValues: GigPackTemplateDefaultValues,
  description?: string,
  icon?: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  return { data: null, error: new Error("Templates not implemented yet") };
}

export async function updateUserTemplate(
  templateId: string,
  updates: UserTemplateUpdate
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  return { data: null, error: new Error("Templates not implemented yet") };
}

export async function deleteUserTemplate(
  templateId: string
): Promise<{ success: boolean; error: Error | null }> {
  return { success: false, error: new Error("Templates not implemented yet") };
}

export async function createTemplateFromGigPack(
  gigPack: GigPack,
  name: string,
  description?: string,
  icon?: string
): Promise<{ data: UserTemplate | null; error: Error | null }> {
  return { data: null, error: new Error("Templates not implemented yet") };
}

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

