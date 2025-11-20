import { createClient } from "@/lib/supabase/client";
import type { GigFile, GigFileInsert, GigFileUpdate } from "@/lib/types/shared";

export async function listFilesForGig(gigId: string): Promise<GigFile[]> {
  const supabase = createClient();

  const { data: files, error } = await supabase
    .from("gig_files")
    .select("*")
    .eq("gig_id", gigId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch gig files");
  return files || [];
}

export async function addFileToGig(
  data: Omit<GigFileInsert, "id" | "created_at" | "updated_at">
): Promise<GigFile> {
  const supabase = createClient();

  const { data: file, error } = await supabase
    .from("gig_files")
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
    .from("gig_files")
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
    .from("gig_files")
    .delete()
    .eq("id", fileId);

  if (error) throw new Error(error.message || "Failed to delete gig file");
}

