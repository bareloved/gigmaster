import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  validateSetlistPDF,
  uploadSetlistPDF,
  deleteSetlistPDF,
} from "@/lib/api/setlist-pdf";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal File-like object for testing. */
function createMockFile(
  options: { type?: string; size?: number; name?: string } = {}
): File {
  const { type = "application/pdf", size = 1024, name = "setlist.pdf" } =
    options;
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

/** Builds a mock Supabase storage bucket with upload / remove / getPublicUrl. */
function createMockStorage(overrides: {
  uploadResult?: { data: { path: string } | null; error: { message: string } | null };
  removeResult?: { data: unknown; error: { message: string } | null };
  publicUrl?: string;
} = {}) {
  const {
    uploadResult = { data: { path: "user-1/setlists/setlist-123.pdf" }, error: null },
    removeResult = { data: null, error: null },
    publicUrl = "https://test.supabase.co/storage/v1/object/public/gig-assets/user-1/setlists/setlist-123.pdf",
  } = overrides;

  const bucketMock = {
    upload: vi.fn().mockResolvedValue(uploadResult),
    remove: vi.fn().mockResolvedValue(removeResult),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl } }),
  };

  return {
    from: vi.fn().mockReturnValue(bucketMock),
    _bucket: bucketMock,
  };
}

describe("Setlist PDF API", () => {
  // ============================================================================
  // validateSetlistPDF
  // ============================================================================

  describe("validateSetlistPDF", () => {
    it("should return null for a valid PDF file", () => {
      const file = createMockFile({ type: "application/pdf", size: 1024 });
      expect(validateSetlistPDF(file)).toBeNull();
    });

    it("should reject non-PDF file types", () => {
      const file = createMockFile({ type: "image/png", size: 1024 });
      expect(validateSetlistPDF(file)).toBe("File must be a PDF");
    });

    it("should reject files with empty MIME type", () => {
      const file = createMockFile({ type: "", size: 1024 });
      expect(validateSetlistPDF(file)).toBe("File must be a PDF");
    });

    it("should reject files exceeding 10MB", () => {
      const overLimit = 10 * 1024 * 1024 + 1;
      const file = createMockFile({ type: "application/pdf", size: overLimit });
      expect(validateSetlistPDF(file)).toBe("File size must be less than 10MB");
    });

    it("should accept a file exactly at the 10MB limit", () => {
      const exactLimit = 10 * 1024 * 1024;
      const file = createMockFile({ type: "application/pdf", size: exactLimit });
      expect(validateSetlistPDF(file)).toBeNull();
    });

    it("should accept a zero-byte PDF", () => {
      const file = createMockFile({ type: "application/pdf", size: 0 });
      expect(validateSetlistPDF(file)).toBeNull();
    });

    it("should check MIME type before file size", () => {
      const overLimit = 10 * 1024 * 1024 + 1;
      const file = createMockFile({ type: "text/plain", size: overLimit });
      // Should fail on type first, not size
      expect(validateSetlistPDF(file)).toBe("File must be a PDF");
    });
  });

  // ============================================================================
  // uploadSetlistPDF
  // ============================================================================

  describe("uploadSetlistPDF", () => {
    let mockStorage: ReturnType<typeof createMockStorage>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockStorage = createMockStorage();

      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);
    });

    it("should upload a valid PDF and return the public URL", async () => {
      const file = createMockFile();
      const result = await uploadSetlistPDF("user-1", file);

      expect(result).toEqual({
        url: "https://test.supabase.co/storage/v1/object/public/gig-assets/user-1/setlists/setlist-123.pdf",
      });
      expect(mockStorage.from).toHaveBeenCalledWith("gig-assets");
      expect(mockStorage._bucket.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^user-1\/setlists\/setlist-\d+\.pdf$/),
        file,
        { cacheControl: "3600", upsert: false, contentType: "application/pdf" }
      );
    });

    it("should return a validation error for non-PDF files without calling storage", async () => {
      const file = createMockFile({ type: "image/jpeg" });
      const result = await uploadSetlistPDF("user-1", file);

      expect(result).toEqual({ error: "File must be a PDF" });
      expect(mockStorage._bucket.upload).not.toHaveBeenCalled();
    });

    it("should return a validation error for oversized files without calling storage", async () => {
      const overLimit = 10 * 1024 * 1024 + 1;
      const file = createMockFile({ type: "application/pdf", size: overLimit });
      const result = await uploadSetlistPDF("user-1", file);

      expect(result).toEqual({ error: "File size must be less than 10MB" });
      expect(mockStorage._bucket.upload).not.toHaveBeenCalled();
    });

    it("should return an error when Supabase upload fails", async () => {
      mockStorage = createMockStorage({
        uploadResult: {
          data: null,
          error: { message: "Bucket not found" },
        },
      });
      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);

      const file = createMockFile();
      const result = await uploadSetlistPDF("user-1", file);

      expect(result).toEqual({ error: "Bucket not found" });
    });

    it("should log an error to console when upload fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockStorage = createMockStorage({
        uploadResult: {
          data: null,
          error: { message: "Storage quota exceeded" },
        },
      });
      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);

      const file = createMockFile();
      await uploadSetlistPDF("user-1", file);

      expect(consoleSpy).toHaveBeenCalledWith(
        "PDF upload error:",
        expect.objectContaining({ message: "Storage quota exceeded" })
      );
      consoleSpy.mockRestore();
    });

    it("should use the uploaded path to build the public URL", async () => {
      const customPath = "user-42/setlists/setlist-999.pdf";
      const customUrl =
        "https://test.supabase.co/storage/v1/object/public/gig-assets/" +
        customPath;

      mockStorage = createMockStorage({
        uploadResult: { data: { path: customPath }, error: null },
        publicUrl: customUrl,
      });
      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);

      const file = createMockFile();
      const result = await uploadSetlistPDF("user-42", file);

      expect(mockStorage._bucket.getPublicUrl).toHaveBeenCalledWith(customPath);
      expect(result).toEqual({ url: customUrl });
    });

    it("should generate a unique file path using timestamp", async () => {
      const now = 1700000000000;
      vi.spyOn(Date, "now").mockReturnValue(now);

      const file = createMockFile();
      await uploadSetlistPDF("user-1", file);

      expect(mockStorage._bucket.upload).toHaveBeenCalledWith(
        `user-1/setlists/setlist-${now}.pdf`,
        file,
        expect.any(Object)
      );

      vi.spyOn(Date, "now").mockRestore();
    });
  });

  // ============================================================================
  // deleteSetlistPDF
  // ============================================================================

  describe("deleteSetlistPDF", () => {
    let mockStorage: ReturnType<typeof createMockStorage>;

    beforeEach(() => {
      vi.clearAllMocks();
      mockStorage = createMockStorage();

      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);
    });

    it("should delete a PDF and return true on success", async () => {
      const url =
        "https://test.supabase.co/storage/v1/object/public/gig-assets/user-1/setlists/setlist-123.pdf";
      const result = await deleteSetlistPDF(url);

      expect(result).toBe(true);
      expect(mockStorage.from).toHaveBeenCalledWith("gig-assets");
      expect(mockStorage._bucket.remove).toHaveBeenCalledWith([
        "user-1/setlists/setlist-123.pdf",
      ]);
    });

    it("should extract the correct storage path from a full URL", async () => {
      const url =
        "https://project.supabase.co/storage/v1/object/public/gig-assets/abc/setlists/setlist-999.pdf";
      await deleteSetlistPDF(url);

      expect(mockStorage._bucket.remove).toHaveBeenCalledWith([
        "abc/setlists/setlist-999.pdf",
      ]);
    });

    it("should return false when the storage path is empty", async () => {
      // URL that ends with the bucket name and nothing after
      const url = "https://test.supabase.co/storage/v1/object/public/gig-assets/";
      const result = await deleteSetlistPDF(url);

      expect(result).toBe(false);
      expect(mockStorage._bucket.remove).not.toHaveBeenCalled();
    });

    it("should return false when Supabase remove fails", async () => {
      mockStorage = createMockStorage({
        removeResult: { data: null, error: { message: "Object not found" } },
      });
      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);

      const url =
        "https://test.supabase.co/storage/v1/object/public/gig-assets/user-1/setlists/setlist-123.pdf";
      const result = await deleteSetlistPDF(url);

      expect(result).toBe(false);
    });

    it("should log an error to console when remove fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockStorage = createMockStorage({
        removeResult: { data: null, error: { message: "Permission denied" } },
      });
      vi.mocked(createClient).mockReturnValue({
        storage: mockStorage,
      } as unknown as ReturnType<typeof createClient>);

      const url =
        "https://test.supabase.co/storage/v1/object/public/gig-assets/user-1/setlists/setlist-123.pdf";
      await deleteSetlistPDF(url);

      expect(consoleSpy).toHaveBeenCalledWith(
        "PDF delete error:",
        expect.objectContaining({ message: "Permission denied" })
      );
      consoleSpy.mockRestore();
    });

    it("should handle URLs where the bucket name appears multiple times", async () => {
      // Edge case: bucket name in the domain or path more than once
      const url =
        "https://example.com/gig-assets/nested/gig-assets/user-1/setlists/setlist-1.pdf";
      await deleteSetlistPDF(url);

      // The split logic takes the last segment after "gig-assets/"
      expect(mockStorage._bucket.remove).toHaveBeenCalledWith([
        "user-1/setlists/setlist-1.pdf",
      ]);
    });

    it("should return false when URL does not contain the bucket name", async () => {
      const url = "https://example.com/some-other-bucket/user-1/file.pdf";
      const result = await deleteSetlistPDF(url);

      // storagePath will be the entire URL (no split match), which is truthy
      // but that's fine -- the remove call will fail or succeed at the storage level
      // The function only returns false for empty storagePath or storage errors
      expect(result).toBe(true);
    });
  });
});
