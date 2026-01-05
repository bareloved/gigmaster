import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "gigpack-assets";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Allowed image MIME types
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

export interface ImageUploadResult {
  url: string;
  path: string;
}

export interface ImageUploadError {
  error: string;
}

/**
 * Validates an image file before upload
 * @param file - The file to validate
 * @returns Error message if invalid, null if valid
 */
export function validateImageFile(file: File): string | null {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`;
  }

  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return "File must be an image (JPEG, PNG, WebP, GIF, or SVG)";
  }

  return null;
}

/**
 * Uploads an image to Supabase Storage
 * Images are stored in user-specific folders: {userId}/{timestamp}-{filename}
 * 
 * @param file - The image file to upload
 * @param userId - The user's ID (for folder organization)
 * @param oldPath - Optional: path to old image to delete (for replacements)
 * @returns Promise with public URL or error
 */
export async function uploadImage(
  file: File,
  userId: string,
  oldPath?: string
): Promise<ImageUploadResult | ImageUploadError> {
  // Validate file
  const validationError = validateImageFile(file);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = `${userId}/${fileName}`;

    // Upload the file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return { error: uploadError.message };
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);

    // Delete old image if specified
    if (oldPath) {
      await deleteImage(oldPath);
    }

    return {
      url: publicUrl,
      path: uploadData.path,
    };
  } catch (error) {
    console.error("Error uploading image:", error);
    return {
      error:
        error instanceof Error ? error.message : "Failed to upload image",
    };
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param path - The storage path of the image (not the full URL)
 * @returns Promise<boolean> - true if deleted successfully
 */
export async function deleteImage(path: string): Promise<boolean> {
  const supabase = createClient();

  try {
    // Extract path from URL if a full URL was provided
    let storagePath = path;
    if (path.includes(BUCKET_NAME)) {
      const pathParts = path.split(BUCKET_NAME + "/");
      storagePath = pathParts[pathParts.length - 1];
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting image:", error);
    return false;
  }
}

/**
 * Extracts the storage path from a public URL
 * @param url - The public URL from Supabase Storage
 * @returns The storage path (e.g., "userId/filename.jpg")
 */
export function getPathFromUrl(url: string): string | null {
  if (!url.includes(BUCKET_NAME)) {
    return null;
  }

  const pathParts = url.split(BUCKET_NAME + "/");
  return pathParts[pathParts.length - 1] || null;
}

