import { createClient } from "@/lib/supabase/client";
import type { GigFile, GigFileInsert, GigFileUpdate } from "@/lib/types/shared";

export async function listFilesForGig(gigId: string): Promise<GigFile[]> {
  const supabase = createClient();

  const { data: files, error } = await supabase
    .from("gig_materials")
    .select("*")
    .eq("gig_id", gigId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message || "Failed to fetch gig files");
  return files || [];
}

export async function addFileToGig(
  data: Omit<GigFileInsert, "id">
): Promise<GigFile> {
  const supabase = createClient();

  const { data: file, error } = await supabase
    .from("gig_materials")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to add gig file");
  return file;
}

export async function updateGigFile(
  fileId: string,
  data: GigFileUpdate
): Promise<GigFile> {
  const supabase = createClient();

  const { data: file, error } = await supabase
    .from("gig_materials")
    .update(data)
    .eq("id", fileId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update gig file");
  return file;
}

export async function deleteGigFile(fileId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("gig_materials")
    .delete()
    .eq("id", fileId);

  if (error) throw new Error(error.message || "Failed to delete gig file");
}

