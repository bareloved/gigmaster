"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  X,
  Mail,
  UserCheck,
  Calendar,
  CalendarX,
  DollarSign,
} from "lucide-react";
import { useUser } from "@/lib/providers/user-provider";
import {
  markAsRead,
  deleteNotification,
  archiveNotification,
} from "@/lib/api/notifications";
import { useInvitationAction } from "@/lib/hooks/use-invitation-action";
import type { Notification } from "@/lib/types/shared";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
  isArchived?: boolean;
}

/** Icon + background color for each notification type */
function getTypeIcon(type: string) {
  switch (type) {
    case "invitation_received":
      return { Icon: Mail, bg: "bg-amber-100 text-amber-600" };
    case "status_changed":
      return { Icon: UserCheck, bg: "bg-blue-100 text-blue-600" };
    case "gig_updated":
      return { Icon: Calendar, bg: "bg-purple-100 text-purple-600" };
    case "gig_cancelled":
      return { Icon: CalendarX, bg: "bg-red-100 text-red-600" };
    case "payment_received":
      return { Icon: DollarSign, bg: "bg-green-100 text-green-600" };
    default:
      return { Icon: Mail, bg: "bg-gray-100 text-gray-600" };
  }
}

export function NotificationItem({
  notification,
  onClose,
  isArchived = false,
}: NotificationItemProps) {
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [respondedStatus, setRespondedStatus] = useState<
    "accepted" | "declined" | null
  >(null);

  const { Icon, bg } = getTypeIcon(notification.type);

  const isInvitation =
    notification.type === "invitation_received" && !!notification.gig_role_id;

  const invitationMutation = useInvitationAction({
    gigId: notification.gig_id ?? undefined,
    onSuccess: (status) => {
      setRespondedStatus(status);
      deleteMutation.mutate();
    },
  });

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

  const markReadMutation = useMutation({
    mutationFn: () => markAsRead(notification.id),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteNotification(notification.id),
    onSuccess: invalidateAll,
  });

  const archiveMutation = useMutation({
    mutationFn: () => archiveNotification(notification.id),
    onSuccess: invalidateAll,
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

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isArchived) {
      deleteMutation.mutate();
    } else {
      archiveMutation.mutate();
    }
  };

  const handleAccept = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.gig_role_id) return;
    invitationMutation.mutate({
      roleId: notification.gig_role_id,
      status: "accepted",
    });
  };

  const handleDecline = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!notification.gig_role_id) return;
    invitationMutation.mutate({
      roleId: notification.gig_role_id,
      status: "declined",
    });
  };

  const showInvitationButtons = isInvitation && !respondedStatus;
  const isResponding = invitationMutation.isPending;

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors group",
        !notification.read_at && !isArchived && "bg-muted/30",
        isArchived && "opacity-50"
      )}
    >
      {/* Icon avatar */}
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          bg
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm leading-snug">
          {notification.title.includes(':') ? (
            <>
              <span className="font-semibold">
                {notification.title.split(':')[0]}:
              </span>
              {notification.title.substring(notification.title.indexOf(':') + 1)}
            </>
          ) : (() => {
            const suffixes = [' accepted', ' declined', ' needs a sub'];
            const match = suffixes.find(s => notification.title.endsWith(s));
            if (match) {
              return (
                <>
                  <span className="font-semibold">
                    {notification.title.slice(0, -match.length)}
                  </span>
                  {match}
                </>
              );
            }
            return <span className="font-semibold">{notification.title}</span>;
          })()}
        </p>
        <p className="text-xs text-muted-foreground">
          {notification.created_at
            ? formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
              })
            : "Just now"}
          {notification.message && (
            <>
              {' \u00B7 '}
              {(() => {
                const idx = notification.message.lastIndexOf(' in ');
                if (idx !== -1) {
                  return (
                    <>
                      {notification.message.slice(0, idx + 4)}
                      <span className="font-semibold text-foreground/70">
                        {notification.message.slice(idx + 4)}
                      </span>
                    </>
                  );
                }
                return notification.message;
              })()}
            </>
          )}
        </p>

        {/* Invitation action buttons */}
        {showInvitationButtons && (
          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={handleAccept}
              disabled={isResponding}
              className="h-7 px-4 rounded-full text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Accept
            </button>
            <button
              onClick={handleDecline}
              disabled={isResponding}
              className="h-7 px-4 rounded-full text-xs font-medium border border-foreground/20 hover:bg-muted transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        )}

        {/* Responded state */}
        {respondedStatus && (
          <p
            className={cn(
              "text-xs font-medium pt-1",
              respondedStatus === "accepted"
                ? "text-green-600"
                : "text-red-600"
            )}
          >
            {respondedStatus === "accepted" ? "Confirmed" : "Declined"}
          </p>
        )}
      </div>

      {/* Unread dot */}
      {!notification.read_at && !isArchived && (
        <div className="h-2 w-2 rounded-full bg-amber-600 shrink-0 mt-1.5" />
      )}

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="h-6 w-6 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
