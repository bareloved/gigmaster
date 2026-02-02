"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { X, Check, XIcon } from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import { markAsRead, deleteNotification } from "@/lib/api/notifications";
import { useInvitationAction } from "@/lib/hooks/use-invitation-action";
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

  // Local state to track response for invitation notifications
  const [respondedStatus, setRespondedStatus] = useState<'accepted' | 'declined' | null>(null);

  // Invitation action hook
  const isInvitation = notification.type === 'invitation_received' && !!notification.gig_role_id;
  const invitationMutation = useInvitationAction({
    gigId: notification.gig_id ?? undefined,
    onSuccess: (status) => {
      setRespondedStatus(status);
      // Remove the invitation notification after responding - it's been acted upon.
      // Brief "Confirmed"/"Declined" label shows via respondedStatus before it disappears.
      deleteMutation.mutate();
    },
  });

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
    if (notification.link) {
      router.push(notification.link);
      onClose();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate();
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.gig_role_id) return;
    invitationMutation.mutate({ roleId: notification.gig_role_id, status: 'accepted' });
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.gig_role_id) return;
    invitationMutation.mutate({ roleId: notification.gig_role_id, status: 'declined' });
  };

  const showInvitationButtons = isInvitation && !respondedStatus;
  const isResponding = invitationMutation.isPending;

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

        {/* Invitation action buttons */}
        {showInvitationButtons && (
          <div className="flex items-center gap-2 pt-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-green-600/40 text-green-600 hover:bg-green-600/10 hover:text-green-600"
              onClick={handleAccept}
              disabled={isResponding}
            >
              <Check className="h-3 w-3 mr-1" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs border-red-600/40 text-red-600 hover:bg-red-600/10 hover:text-red-600"
              onClick={handleDecline}
              disabled={isResponding}
            >
              <XIcon className="h-3 w-3 mr-1" />
              Decline
            </Button>
          </div>
        )}

        {/* Responded state */}
        {respondedStatus && (
          <p className={cn(
            "text-xs font-medium pt-1",
            respondedStatus === 'accepted' ? "text-green-600" : "text-red-600"
          )}>
            {respondedStatus === 'accepted' ? 'Confirmed' : 'Declined'}
          </p>
        )}
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
