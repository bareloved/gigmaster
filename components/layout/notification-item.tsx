"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import { markAsRead, deleteNotification } from "@/lib/api/notifications";
import type { Notification } from "@/lib/types/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: () => markAsRead(notification.id),
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteNotification(notification.id),
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

  const handleClick = () => {
    if (!notification.read_at) {
      markReadMutation.mutate();
    }
    if (notification.link_url) {
      router.push(notification.link_url);
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors group",
        !notification.read_at && "bg-muted/30"
      )}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-none">{notification.title}</p>
          {!notification.read_at && (
            <div className="h-2 w-2 rounded-full bg-blue-500 mt-1 flex-shrink-0" />
          )}
        </div>
        {notification.message && (
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {notification.created_at 
            ? formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
            : 'Just now'}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={handleDelete}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

