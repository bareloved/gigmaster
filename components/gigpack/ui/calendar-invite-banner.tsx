"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarPlus, ArrowUpRight, Check, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import {
  useCalendarInviteStatus,
  type CalendarInviteStatus,
} from "@/hooks/use-calendar-invite-status";
import { useQueryClient } from "@tanstack/react-query";

export function CalendarInviteBanner() {
  const { user } = useUser();
  const { status, isLoading } = useCalendarInviteStatus();
  const [isToggling, setIsToggling] = useState(false);
  const queryClient = useQueryClient();

  const handleToggleInvites = async () => {
    if (!user) return;

    try {
      setIsToggling(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("calendar_connections")
        .update({ send_invites_enabled: true })
        .eq("user_id", user.id)
        .eq("provider", "google");

      if (error) throw error;

      // Invalidate the status cache so banner updates
      queryClient.invalidateQueries({
        queryKey: ["calendar-invite-status", user.id],
      });

      toast.success("Calendar invites enabled");
    } catch (error) {
      console.error("Error enabling invites:", error);
      toast.error("Failed to update setting");
    } finally {
      setIsToggling(false);
    }
  };

  if (isLoading) return null;

  return <BannerContent status={status} isToggling={isToggling} onToggle={handleToggleInvites} />;
}

interface BannerContentProps {
  status: CalendarInviteStatus;
  isToggling: boolean;
  onToggle: () => void;
}

function BannerContent({ status, isToggling, onToggle }: BannerContentProps) {
  if (status === "enabled") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 mt-3">
        <Check className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
        <span className="text-xs text-muted-foreground">
          Calendar invites will be sent to members with email
        </span>
      </div>
    );
  }

  if (status === "write_no_invites") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 mt-3">
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-foreground">
            Enable calendar invites for your lineup
          </span>
        </div>
        {isToggling ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={false}
            onCheckedChange={onToggle}
            aria-label="Enable calendar invites"
          />
        )}
      </div>
    );
  }

  // not_connected or read_only
  const message =
    status === "read_only"
      ? "Upgrade calendar access to send invites"
      : "Send Google Calendar invites to your lineup";

  return (
    <Link
      href="/settings?tab=calendar"
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 mt-3",
        "hover:bg-accent/50 transition-colors group"
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-xs text-foreground">{message}</span>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
}
