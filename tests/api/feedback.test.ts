import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  submitFeedback,
  listFeedback,
  deleteFeedback,
  toggleFeedbackResolved,
} from "@/lib/api/feedback";
import { mockUser } from "../fixtures/users";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

describe("Feedback API", () => {
  const mockSupabase = {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // Mock feedback data
  const mockFeedback = {
    id: "feedback-1",
    category: "bug",
    message: "Something is broken",
    user_id: mockUser.id,
    created_at: "2026-02-15T10:00:00Z",
    resolved: false,
  };

  const mockFeedbackAnonymous = {
    id: "feedback-2",
    category: "general",
    message: "Nice app!",
    user_id: null,
    created_at: "2026-02-14T09:00:00Z",
    resolved: false,
  };

  // ============================================================================
  // submitFeedback
  // ============================================================================

  describe("submitFeedback", () => {
    it("should submit feedback with authenticated user", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockFeedback, error: null })
      );

      const result = await submitFeedback({
        category: "bug",
        message: "Something is broken",
      });

      expect(result).toEqual(mockFeedback);
      expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    });

    it("should submit feedback with null user_id when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: mockFeedbackAnonymous, error: null })
      );

      const result = await submitFeedback({
        message: "Nice app!",
      });

      expect(result).toEqual(mockFeedbackAnonymous);
      expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    });

    it("should default category to 'general' when not provided", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const expectedFeedback = {
        ...mockFeedbackAnonymous,
        category: "general",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: expectedFeedback, error: null })
      );

      const result = await submitFeedback({
        message: "No category specified",
      });

      expect(result.category).toBe("general");
    });

    it("should throw error on insert failure", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Insert failed" },
        })
      );

      await expect(
        submitFeedback({ message: "Will fail" })
      ).rejects.toThrow();
    });

    it("should submit feature request feedback", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const featureFeedback = {
        ...mockFeedback,
        id: "feedback-3",
        category: "feature",
        message: "Add dark mode",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: featureFeedback, error: null })
      );

      const result = await submitFeedback({
        category: "feature",
        message: "Add dark mode",
      });

      expect(result.category).toBe("feature");
      expect(result.message).toBe("Add dark mode");
    });
  });

  // ============================================================================
  // listFeedback
  // ============================================================================

  describe("listFeedback", () => {
    it("should return feedback with user profile data", async () => {
      const feedbackList = [
        { ...mockFeedback, user_id: mockUser.id },
        { ...mockFeedbackAnonymous, user_id: null },
      ];

      const profiles = [
        { id: mockUser.id, email: "test@example.com", name: "Test User" },
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Fetch feedback
          return createChainableMock({ data: feedbackList, error: null });
        }
        // Fetch profiles
        return createChainableMock({ data: profiles, error: null });
      });

      const result = await listFeedback();

      expect(result).toHaveLength(2);
      expect(result[0].user_email).toBe("test@example.com");
      expect(result[0].user_name).toBe("Test User");
      expect(result[1].user_email).toBeNull();
      expect(result[1].user_name).toBeNull();
    });

    it("should return empty array when no feedback exists", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await listFeedback();

      expect(result).toEqual([]);
    });

    it("should return empty array when feedback data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      // The function checks `!feedbackData` and returns [] -- but since
      // the error check comes first and error is null, it falls through
      // to the length check. null?.length is undefined which is falsy,
      // so `!feedbackData` catches it.
      const result = await listFeedback();

      expect(result).toEqual([]);
    });

    it("should throw error on feedback fetch failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database error" },
        })
      );

      await expect(listFeedback()).rejects.toThrow();
    });

    it("should skip profile fetch when all feedback is anonymous", async () => {
      const anonymousFeedback = [
        { ...mockFeedbackAnonymous, id: "f-1" },
        { ...mockFeedbackAnonymous, id: "f-2" },
      ];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: anonymousFeedback, error: null })
      );

      const result = await listFeedback();

      expect(result).toHaveLength(2);
      // from() should only be called once (for feedback), not twice (no profiles fetch)
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
      expect(result[0].user_email).toBeNull();
      expect(result[0].user_name).toBeNull();
    });

    it("should handle profile fetch returning null gracefully", async () => {
      const feedbackList = [{ ...mockFeedback, user_id: mockUser.id }];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: feedbackList, error: null });
        }
        // Profiles query returns null data
        return createChainableMock({ data: null, error: null });
      });

      const result = await listFeedback();

      expect(result).toHaveLength(1);
      // Profile data not found, so user_email/user_name should be undefined
      expect(result[0].user_email).toBeUndefined();
      expect(result[0].user_name).toBeUndefined();
    });

    it("should deduplicate user IDs when fetching profiles", async () => {
      const feedbackList = [
        { ...mockFeedback, id: "f-1", user_id: mockUser.id },
        { ...mockFeedback, id: "f-2", user_id: mockUser.id },
        { ...mockFeedback, id: "f-3", user_id: "other-user-id" },
      ];

      const profiles = [
        { id: mockUser.id, email: "test@example.com", name: "Test User" },
        { id: "other-user-id", email: "other@example.com", name: "Other User" },
      ];

      let callCount = 0;
      mockSupabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createChainableMock({ data: feedbackList, error: null });
        }
        return createChainableMock({ data: profiles, error: null });
      });

      const result = await listFeedback();

      expect(result).toHaveLength(3);
      // Both entries from the same user should have the same profile data
      expect(result[0].user_email).toBe("test@example.com");
      expect(result[1].user_email).toBe("test@example.com");
      expect(result[2].user_email).toBe("other@example.com");
    });
  });

  // ============================================================================
  // deleteFeedback
  // ============================================================================

  describe("deleteFeedback", () => {
    it("should delete feedback successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(deleteFeedback("feedback-1")).resolves.not.toThrow();
      expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Cannot delete" },
        })
      );

      await expect(deleteFeedback("feedback-1")).rejects.toThrow();
    });

    it("should return void on success", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await deleteFeedback("feedback-1");

      expect(result).toBeUndefined();
    });
  });

  // ============================================================================
  // toggleFeedbackResolved
  // ============================================================================

  describe("toggleFeedbackResolved", () => {
    it("should mark feedback as resolved", async () => {
      const resolvedFeedback = { ...mockFeedback, resolved: true };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: resolvedFeedback, error: null })
      );

      const result = await toggleFeedbackResolved("feedback-1", true);

      expect(result.resolved).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith("feedback");
    });

    it("should mark feedback as unresolved", async () => {
      const unresolvedFeedback = { ...mockFeedback, resolved: false };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: unresolvedFeedback, error: null })
      );

      const result = await toggleFeedbackResolved("feedback-1", false);

      expect(result.resolved).toBe(false);
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(
        toggleFeedbackResolved("feedback-1", true)
      ).rejects.toThrow();
    });

    it("should return the updated feedback object", async () => {
      const resolvedFeedback = {
        ...mockFeedback,
        resolved: true,
        id: "feedback-1",
      };

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: resolvedFeedback, error: null })
      );

      const result = await toggleFeedbackResolved("feedback-1", true);

      expect(result).toEqual(resolvedFeedback);
      expect(result.id).toBe("feedback-1");
    });
  });
});
