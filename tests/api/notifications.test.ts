import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@/lib/supabase/client";
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  archiveNotification,
  archiveAllNotifications,
  createNotification,
  subscribeToNotifications,
} from "@/lib/api/notifications";
import type { Notification, NotificationInsert } from "@/lib/types/shared";
import { createChainableMock } from "../mocks/supabase";

// Mock the Supabase client module
vi.mock("@/lib/supabase/client");

// ============================================================================
// Fixtures
// ============================================================================

const TEST_USER_ID = "test-user-id-123";
const TEST_NOTIFICATION_ID = "notif-abc-123";

const mockNotification: Notification = {
  id: TEST_NOTIFICATION_ID,
  user_id: TEST_USER_ID,
  type: "invitation_received",
  title: "Invitation: Jazz Night",
  message: "You've been invited to play Keys at Jazz Night",
  link: "/gigs/gig-123",
  gig_id: "gig-123",
  gig_role_id: "role-456",
  metadata: null,
  read_at: null,
  archived_at: null,
  created_at: "2024-12-15T10:00:00Z",
};

const mockReadNotification: Notification = {
  ...mockNotification,
  id: "notif-def-456",
  type: "gig_updated",
  title: "Gig Updated: Club Night",
  read_at: "2024-12-15T12:00:00Z",
};

// ============================================================================
// Tests
// ============================================================================

describe("Notifications API", () => {
  const mockSupabase = {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createClient).mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof createClient>
    );
  });

  // ============================================================================
  // getMyNotifications
  // ============================================================================

  describe("getMyNotifications", () => {
    it("should return notifications sorted by created_at descending", async () => {
      const notifications = [mockNotification, mockReadNotification];

      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: notifications, error: null })
      );

      const result = await getMyNotifications(TEST_USER_ID);

      expect(result).toEqual(notifications);
      expect(result).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should return empty array when user has no notifications", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      const result = await getMyNotifications(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      const result = await getMyNotifications(TEST_USER_ID);

      expect(result).toEqual([]);
    });

    it("should use default limit of 50", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      await getMyNotifications(TEST_USER_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.limit).toHaveBeenCalledWith(50);
    });

    it("should accept a custom limit", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: [], error: null })
      );

      await getMyNotifications(TEST_USER_ID, 10);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.limit).toHaveBeenCalledWith(10);
    });

    it("should throw error on database failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Database connection failed" },
        })
      );

      await expect(getMyNotifications(TEST_USER_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Database connection failed" })
      );
    });
  });

  // ============================================================================
  // getUnreadCount
  // ============================================================================

  describe("getUnreadCount", () => {
    it("should return the count of unread notifications", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null, count: 5 })
      );

      // The chainable mock resolves with { data, error } but getUnreadCount
      // destructures { count, error }. We need a custom mock for count.
      const countMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 5, error: null }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(countMock);

      const result = await getUnreadCount(TEST_USER_ID);

      expect(result).toBe(5);
      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should return 0 when count is null", async () => {
      const countMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: null, error: null }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(countMock);

      const result = await getUnreadCount(TEST_USER_ID);

      expect(result).toBe(0);
    });

    it("should return 0 when there are no unread notifications", async () => {
      const countMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 0, error: null }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(countMock);

      const result = await getUnreadCount(TEST_USER_ID);

      expect(result).toBe(0);
    });

    it("should filter by read_at and archived_at being null", async () => {
      const countMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ count: 3, error: null }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(countMock);

      await getUnreadCount(TEST_USER_ID);

      expect(countMock.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(countMock.is).toHaveBeenCalledWith("read_at", null);
      expect(countMock.is).toHaveBeenCalledWith("archived_at", null);
    });

    it("should throw error on database failure", async () => {
      const countMock = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({
            count: null,
            error: { message: "Connection refused" },
          }).then(resolve),
      };
      mockSupabase.from.mockReturnValue(countMock);

      await expect(getUnreadCount(TEST_USER_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Connection refused" })
      );
    });
  });

  // ============================================================================
  // markAsRead
  // ============================================================================

  describe("markAsRead", () => {
    it("should mark a notification as read", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        markAsRead(TEST_NOTIFICATION_ID)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should update with a read_at timestamp", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await markAsRead(TEST_NOTIFICATION_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          read_at: expect.any(String),
        })
      );
      expect(chainedMock.eq).toHaveBeenCalledWith("id", TEST_NOTIFICATION_ID);
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Notification not found" },
        })
      );

      await expect(markAsRead(TEST_NOTIFICATION_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Notification not found" })
      );
    });
  });

  // ============================================================================
  // markAllAsRead
  // ============================================================================

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(markAllAsRead(TEST_USER_ID)).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should filter by user_id and read_at being null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await markAllAsRead(TEST_USER_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ read_at: expect.any(String) })
      );
      expect(chainedMock.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(chainedMock.is).toHaveBeenCalledWith("read_at", null);
    });

    it("should throw error on update failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Update failed" },
        })
      );

      await expect(markAllAsRead(TEST_USER_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Update failed" })
      );
    });
  });

  // ============================================================================
  // deleteNotification
  // ============================================================================

  describe("deleteNotification", () => {
    it("should delete a notification successfully", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        deleteNotification(TEST_NOTIFICATION_ID)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should call delete with correct id filter", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await deleteNotification(TEST_NOTIFICATION_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.delete).toHaveBeenCalled();
      expect(chainedMock.eq).toHaveBeenCalledWith("id", TEST_NOTIFICATION_ID);
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Cannot delete" },
        })
      );

      await expect(
        deleteNotification(TEST_NOTIFICATION_ID)
      ).rejects.toEqual(
        expect.objectContaining({ message: "Cannot delete" })
      );
    });
  });

  // ============================================================================
  // clearAllNotifications
  // ============================================================================

  describe("clearAllNotifications", () => {
    it("should delete all notifications for a user", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        clearAllNotifications(TEST_USER_ID)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should filter by user_id", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await clearAllNotifications(TEST_USER_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.delete).toHaveBeenCalled();
      expect(chainedMock.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    });

    it("should throw error on delete failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Bulk delete failed" },
        })
      );

      await expect(clearAllNotifications(TEST_USER_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Bulk delete failed" })
      );
    });
  });

  // ============================================================================
  // archiveNotification
  // ============================================================================

  describe("archiveNotification", () => {
    it("should archive a single notification", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        archiveNotification(TEST_NOTIFICATION_ID)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should update with an archived_at timestamp", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await archiveNotification(TEST_NOTIFICATION_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.update).toHaveBeenCalledWith(
        expect.objectContaining({
          archived_at: expect.any(String),
        })
      );
      expect(chainedMock.eq).toHaveBeenCalledWith("id", TEST_NOTIFICATION_ID);
    });

    it("should throw error on archive failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Archive failed" },
        })
      );

      await expect(
        archiveNotification(TEST_NOTIFICATION_ID)
      ).rejects.toEqual(
        expect.objectContaining({ message: "Archive failed" })
      );
    });
  });

  // ============================================================================
  // archiveAllNotifications
  // ============================================================================

  describe("archiveAllNotifications", () => {
    it("should archive all non-archived notifications for a user", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await expect(
        archiveAllNotifications(TEST_USER_ID)
      ).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith("notifications");
    });

    it("should filter by user_id and archived_at being null", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({ data: null, error: null })
      );

      await archiveAllNotifications(TEST_USER_ID);

      const chainedMock = mockSupabase.from.mock.results[0].value;
      expect(chainedMock.update).toHaveBeenCalledWith(
        expect.objectContaining({ archived_at: expect.any(String) })
      );
      expect(chainedMock.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
      expect(chainedMock.is).toHaveBeenCalledWith("archived_at", null);
    });

    it("should throw error on archive failure", async () => {
      mockSupabase.from.mockReturnValue(
        createChainableMock({
          data: null,
          error: { message: "Bulk archive failed" },
        })
      );

      await expect(archiveAllNotifications(TEST_USER_ID)).rejects.toEqual(
        expect.objectContaining({ message: "Bulk archive failed" })
      );
    });
  });

  // ============================================================================
  // createNotification
  // ============================================================================

  describe("createNotification", () => {
    const mockInsertData: NotificationInsert = {
      user_id: TEST_USER_ID,
      type: "invitation_received",
      title: "Invitation: Jazz Night",
      message: "You've been invited to play Keys",
      link: "/gigs/gig-123",
      gig_id: "gig-123",
      gig_role_id: "role-456",
      metadata: null,
    };

    it("should call the create_or_update_notification RPC", async () => {
      const rpcMock = {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      };
      mockSupabase.rpc.mockReturnValue(rpcMock);

      await createNotification(mockInsertData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "create_or_update_notification",
        {
          p_user_id: TEST_USER_ID,
          p_type: "invitation_received",
          p_title: "Invitation: Jazz Night",
          p_message: "You've been invited to play Keys",
          p_link: "/gigs/gig-123",
          p_gig_id: "gig-123",
          p_gig_role_id: "role-456",
          p_metadata: undefined,
        }
      );
    });

    it("should handle nullable fields by passing undefined", async () => {
      const rpcMock = {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      };
      mockSupabase.rpc.mockReturnValue(rpcMock);

      const minimalData: NotificationInsert = {
        user_id: TEST_USER_ID,
        type: "gig_updated",
        title: "Gig Updated",
      };

      await createNotification(minimalData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "create_or_update_notification",
        {
          p_user_id: TEST_USER_ID,
          p_type: "gig_updated",
          p_title: "Gig Updated",
          p_message: undefined,
          p_link: undefined,
          p_gig_id: undefined,
          p_gig_role_id: undefined,
          p_metadata: undefined,
        }
      );
    });

    it("should log error but not throw on RPC failure", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const rpcMock = {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({
            error: {
              message: "RPC function failed",
              code: "P0001",
              details: "some details",
              hint: "check params",
            },
          }).then(resolve),
      };
      mockSupabase.rpc.mockReturnValue(rpcMock);

      // Should NOT throw
      await expect(createNotification(mockInsertData)).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to create notification:",
        {
          message: "RPC function failed",
          code: "P0001",
          details: "some details",
          hint: "check params",
        }
      );

      consoleErrorSpy.mockRestore();
    });

    it("should not log when RPC succeeds", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const rpcMock = {
        then: (resolve: (value: unknown) => void) =>
          Promise.resolve({ error: null }).then(resolve),
      };
      mockSupabase.rpc.mockReturnValue(rpcMock);

      await createNotification(mockInsertData);

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // subscribeToNotifications
  // ============================================================================

  describe("subscribeToNotifications", () => {
    it("should subscribe to the correct channel and return cleanup function", () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      const onNotification = vi.fn();
      const cleanup = subscribeToNotifications(TEST_USER_ID, onNotification);

      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `notifications:${TEST_USER_ID}`
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${TEST_USER_ID}`,
        },
        expect.any(Function)
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect(typeof cleanup).toBe("function");
    });

    it("should call onNotification callback when a new notification arrives", () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      const onNotification = vi.fn();
      subscribeToNotifications(TEST_USER_ID, onNotification);

      // Extract the callback passed to .on() and invoke it
      const callback = mockChannel.on.mock.calls[0][2];
      const payload = { new: mockNotification };
      callback(payload);

      expect(onNotification).toHaveBeenCalledWith(mockNotification);
    });

    it("should remove the channel when cleanup is called", () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      };
      mockSupabase.channel.mockReturnValue(mockChannel);

      const onNotification = vi.fn();
      const cleanup = subscribeToNotifications(TEST_USER_ID, onNotification);

      cleanup();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });
});
