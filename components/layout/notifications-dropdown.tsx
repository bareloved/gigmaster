"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  clearAllNotifications,
  subscribeToNotifications,
} from "@/lib/api/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NotificationItem } from "./notification-item";

export function NotificationsDropdown() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => getMyNotifications(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: () => getUnreadCount(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute - Realtime subscription handles instant updates
  });

  // Mark all as read mutation
  const markAllMutation = useMutation({
    mutationFn: () => markAllAsRead(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["notifications", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["notifications-unread-count", user?.id],
        refetchType: 'active'
      });
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: () => clearAllNotifications(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["notifications", user?.id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["notifications-unread-count", user?.id],
        refetchType: 'active'
      });
    },
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      // Add new notification to cache
      queryClient.setQueryData(
        ["notifications", user.id],
        (old: any[]) => [notification, ...(old || [])]
      );
      // Increment unread count
      queryClient.setQueryData(
        ["notifications-unread-count", user.id],
        (old: number) => (old || 0) + 1
      );
    });

    return unsubscribe;
  }, [user, queryClient]);

  if (!user) return null;

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
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-4">
          <h3 className="font-semibold">Notifications</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllMutation.mutate()}
              >
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAllMutation.mutate()}
                disabled={clearAllMutation.isPending}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>
        <Separator />
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

