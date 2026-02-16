"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  archiveAllNotifications,
  clearAllNotifications,
  subscribeToNotifications,
} from "@/lib/api/notifications";
import type { Notification } from "@/lib/types/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { NotificationItem } from "./notification-item";
import { cn } from "@/lib/utils";

type Tab = "all" | "invitations" | "archive";

export function NotificationsDropdown() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("all");

  // Fetch notifications (includes archived)
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getMyNotifications(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: () => getUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  // Client-side filtered lists
  const activeNotifications = useMemo(
    () => notifications.filter((n) => !n.archived_at),
    [notifications]
  );

  const invitationNotifications = useMemo(
    () =>
      activeNotifications.filter((n) => n.type === "invitation_received"),
    [activeNotifications]
  );

  const archivedNotifications = useMemo(
    () => notifications.filter((n) => n.archived_at),
    [notifications]
  );

  // Unread counts per tab
  const allUnread = useMemo(
    () => activeNotifications.filter((n) => !n.read_at).length,
    [activeNotifications]
  );

  const invitationUnread = useMemo(
    () => invitationNotifications.filter((n) => !n.read_at).length,
    [invitationNotifications]
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["notifications", user?.id],
      refetchType: "active",
    });
    queryClient.invalidateQueries({
      queryKey: ["notifications-unread-count", user?.id],
      refetchType: "active",
    });
  };

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: invalidateAll,
  });

  // Archive all mutation
  const archiveAllMutation = useMutation({
    mutationFn: () => archiveAllNotifications(user!.id),
    onSuccess: invalidateAll,
  });

  // Clear archive mutation (permanently deletes archived)
  const clearArchiveMutation = useMutation({
    mutationFn: () => clearAllNotifications(user!.id),
    onSuccess: invalidateAll,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      queryClient.setQueryData(
        ["notifications", user.id],
        (old: Notification[] | undefined) => [notification, ...(old || [])]
      );
      queryClient.setQueryData(
        ["notifications-unread-count", user.id],
        (old: number) => (old || 0) + 1
      );
    });

    return unsubscribe;
  }, [user, queryClient]);

  if (!user) return null;

  // Which list to show based on active tab
  const displayedNotifications =
    activeTab === "archive"
      ? archivedNotifications
      : activeTab === "invitations"
        ? invitationNotifications
        : activeNotifications;

  const emptyMessage =
    activeTab === "archive"
      ? "No archived notifications"
      : activeTab === "invitations"
        ? "No invitation notifications"
        : "No notifications yet";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-lg font-bold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 px-4 pb-2">
          <TabButton
            active={activeTab === "all"}
            onClick={() => setActiveTab("all")}
            count={allUnread}
          >
            All
          </TabButton>
          <TabButton
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
            count={invitationUnread}
          >
            Invitations
          </TabButton>
          <TabButton
            active={activeTab === "archive"}
            onClick={() => setActiveTab("archive")}
            muted
          >
            Archive
          </TabButton>
        </div>

        {/* Notification list */}
        <ScrollArea className="h-96">
          {displayedNotifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            displayedNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={() => setOpen(false)}
                isArchived={activeTab === "archive"}
              />
            ))
          )}
        </ScrollArea>

        {/* Footer actions */}
        {activeTab !== "archive" && activeNotifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <button
              onClick={() => archiveAllMutation.mutate()}
              disabled={archiveAllMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Archive all
            </button>
          </div>
        )}
        {activeTab === "archive" && archivedNotifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <button
              onClick={() => clearArchiveMutation.mutate()}
              disabled={clearArchiveMutation.isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear archive
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Custom tab button to match the reference design */
function TabButton({
  active,
  onClick,
  count,
  muted,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-muted text-foreground font-medium"
          : muted
            ? "text-muted-foreground/60 hover:text-muted-foreground font-normal"
            : "text-muted-foreground hover:text-foreground font-medium"
      )}
    >
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-semibold",
            active
              ? "bg-foreground text-background"
              : "bg-muted-foreground/20 text-muted-foreground"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
