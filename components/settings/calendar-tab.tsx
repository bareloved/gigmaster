"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  RefreshCw,
  Check,
  Link as LinkIcon,
  Unlink,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";

export function CalendarTab() {
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();

  const [isLoading, setIsLoading] = useState(true);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const [sendInvitesEnabled, setSendInvitesEnabled] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isTogglingInvites, setIsTogglingInvites] = useState(false);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "connected") {
      toast.success("Google Calendar connected!");
      setGoogleConnected(true);
      window.history.replaceState({}, "", "/settings?tab=calendar");
    } else if (success === "connected_write") {
      toast.success("Google Calendar connected!");
      setGoogleConnected(true);
      setHasWriteAccess(true);
      window.history.replaceState({}, "", "/settings?tab=calendar");
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, "", "/settings?tab=calendar");
    }
  }, [searchParams]);

  // Check Google connection on mount
  useEffect(() => {
    async function init() {
      if (!user) return;

      try {
        const supabase = createClient();
        const { data: connection } = await supabase
          .from("calendar_connections")
          .select("last_synced_at, write_access, send_invites_enabled")
          .eq("user_id", user.id)
          .eq("provider", "google")
          .single();

        if (connection) {
          setGoogleConnected(true);
          setLastSynced(connection.last_synced_at);
          setHasWriteAccess(connection.write_access ?? false);
          setSendInvitesEnabled(connection.send_invites_enabled ?? false);
        }
      } catch (error) {
        console.error("Error initializing settings:", error);
        toast.error("Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    }

    if (user && !userLoading) {
      init();
    }
  }, [user, userLoading]);

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      // Always request full access (read + write) so users don't need two connections
      const response = await fetch("/api/calendar/connect?writeAccess=true");
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate connection");
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      toast.error("Failed to connect calendar");
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (
      !confirm(
        "Disconnect Google Calendar? You'll no longer be able to import events or check for conflicts."
      )
    ) {
      return;
    }

    try {
      setIsDisconnecting(true);
      const response = await fetch("/api/calendar/disconnect", {
        method: "POST",
      });

      if (response.ok) {
        setGoogleConnected(false);
        setLastSynced(null);
        setHasWriteAccess(false);
        setSendInvitesEnabled(false);
        toast.success("Google Calendar disconnected");
      } else {
        toast.error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect calendar");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleUpgradeToWriteAccess = async () => {
    try {
      setIsUpgrading(true);
      const response = await fetch("/api/calendar/connect?writeAccess=true");
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to initiate upgrade");
        setIsUpgrading(false);
      }
    } catch (error) {
      console.error("Error upgrading:", error);
      toast.error("Failed to upgrade permissions");
      setIsUpgrading(false);
    }
  };

  const handleToggleInvites = async () => {
    if (!user) return;

    try {
      setIsTogglingInvites(true);
      const supabase = createClient();

      const newValue = !sendInvitesEnabled;
      const { error } = await supabase
        .from("calendar_connections")
        .update({ send_invites_enabled: newValue })
        .eq("user_id", user.id)
        .eq("provider", "google");

      if (error) throw error;

      setSendInvitesEnabled(newValue);
      toast.success(
        newValue ? "Calendar invites enabled" : "Calendar invites disabled"
      );
    } catch (error) {
      console.error("Error toggling invites:", error);
      toast.error("Failed to update setting");
    } finally {
      setIsTogglingInvites(false);
    }
  };

  if (userLoading || isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Google Calendar Connection */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-semibold">Google Calendar</h3>
            <p className="text-sm text-muted-foreground">
              Import events and detect scheduling conflicts
            </p>
          </div>

          {googleConnected ? (
            <>
              {/* Connection status */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Connected{hasWriteAccess ? " — full access" : " — read-only"}
                  </p>
                  {lastSynced && (
                    <p className="text-sm text-muted-foreground">
                      Last synced {new Date(lastSynced).toLocaleString()}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGoogle}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="h-4 w-4 mr-2" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>

              {/* Write access toggle or upgrade prompt */}
              {hasWriteAccess ? (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Send calendar invites</p>
                    <p className="text-sm text-muted-foreground">
                      Lineup members receive Google Calendar invitations
                    </p>
                  </div>
                  <Switch
                    checked={sendInvitesEnabled}
                    onCheckedChange={handleToggleInvites}
                    disabled={isTogglingInvites}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      Want to send calendar invites?
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to full access to invite lineup members
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUpgradeToWriteAccess}
                    disabled={isUpgrading}
                  >
                    {isUpgrading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Upgrade
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Import hint */}
              <div className="rounded-lg border px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  Import events from the <strong>Gigs</strong> or <strong>Calendar</strong> page using the Import button.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Benefits */}
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Import existing calendar events as gigs
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Detect conflicts with your personal schedule
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Send Google Calendar invites to your lineup
                  </p>
                </div>
              </div>

              <Button
                onClick={handleConnectGoogle}
                disabled={isConnecting}
                className="w-full sm:w-auto"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Connect Google Calendar
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
