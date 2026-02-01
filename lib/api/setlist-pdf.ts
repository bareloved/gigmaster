import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "gig-assets";
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates a setlist PDF file before upload.
 * @returns Error message if invalid, null if valid.
 */
export function validateSetlistPDF(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "File must be a PDF";
  }
  if (file.size > MAX_PDF_SIZE) {
    return `File size must be less than ${MAX_PDF_SIZE / 1024 / 1024}MB`;
  }
  return null;
}

/**
 * Uploads a setlist PDF to Supabase Storage.
 * Path: gig-assets/{userId}/setlists/setlist-{timestamp}.pdf
 * Uses a user-scoped path so uploads work before the gig is saved.
 */
export async function uploadSetlistPDF(
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  const validationError = validateSetlistPDF(file);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();
  const timestamp = Date.now();
  const filePath = `${userId}/setlists/setlist-${timestamp}.pdf`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (error) {
    console.error("PDF upload error:", error);
    return { error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

  return { url: publicUrl };
}

/**
 * Deletes a setlist PDF from Supabase Storage.
 * Extracts the storage path from the full public URL.
 */
export async function deleteSetlistPDF(pdfUrl: string): Promise<boolean> {
  const supabase = createClient();

  // Extract path from URL
  const parts = pdfUrl.split(`${BUCKET_NAME}/`);
  const storagePath = parts[parts.length - 1];
  if (!storagePath) return false;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    console.error("PDF delete error:", error);
    return false;
  }

  return true;
}
