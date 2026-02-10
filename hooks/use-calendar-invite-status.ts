"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";

export type CalendarInviteStatus =
  | "not_connected"
  | "read_only"
  | "write_no_invites"
  | "enabled";

interface CalendarInviteStatusResult {
  status: CalendarInviteStatus;
  isLoading: boolean;
}

async function fetchCalendarInviteStatus(): Promise<CalendarInviteStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "not_connected";

  const { data: connection } = await supabase
    .from("calendar_connections")
    .select("write_access, send_invites_enabled")
    .eq("user_id", user.id)
    .eq("provider", "google")
    .single();

  if (!connection) return "not_connected";
  if (!connection.write_access) return "read_only";
  if (!connection.send_invites_enabled) return "write_no_invites";
  return "enabled";
}

export function useCalendarInviteStatus(): CalendarInviteStatusResult {
  const { user } = useUser();

  const { data, isLoading } = useQuery({
    queryKey: ["calendar-invite-status", user?.id],
    queryFn: fetchCalendarInviteStatus,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  return {
    status: data ?? "not_connected",
    isLoading,
  };
}
