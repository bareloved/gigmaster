"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Check, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";

function SettingsContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();

  // Google Calendar connection state
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
      toast.success("Google Calendar connected (read-only)");
      setGoogleConnected(true);
    } else if (success === "connected_write") {
      toast.success("Google Calendar connected with full access!");
      setGoogleConnected(true);
      setHasWriteAccess(true);
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
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
      const response = await fetch("/api/calendar/connect");
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
    if (!confirm("Disconnect Google Calendar? You'll no longer be able to import events or check for conflicts with your calendar.")) {
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
      toast.success(newValue ? "Calendar invites enabled" : "Calendar invites disabled");
    } catch (error) {
      console.error("Error toggling invites:", error);
      toast.error("Failed to update setting");
    } finally {
      setIsTogglingInvites(false);
    }
  };

  if (userLoading || isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your integrations and preferences
        </p>
      </div>

      {/* Google Calendar Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Google Calendar Connection
          </CardTitle>
          <CardDescription>
            Connect your Google Calendar to import events and detect conflicts with external calendar events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleConnected ? (
            <>
              <Alert>
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-sm">
                  <strong>Connected.</strong> Your Google Calendar is connected
                  {hasWriteAccess ? " with full access" : " (read-only)"}.
                  {lastSynced && (
                    <span className="block text-xs text-gray-600 mt-1">
                      Last synced: {new Date(lastSynced).toLocaleString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              {/* Calendar Invites Toggle - only show if write access */}
              {hasWriteAccess && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-0.5">
                    <Label htmlFor="send-invites" className="text-base">
                      Send Google Calendar invites
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      When you create a gig, lineup members receive calendar invitations
                    </p>
                  </div>
                  <Button
                    id="send-invites"
                    variant={sendInvitesEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleInvites}
                    disabled={isTogglingInvites}
                  >
                    {isTogglingInvites ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : sendInvitesEnabled ? (
                      "Enabled"
                    ) : (
                      "Disabled"
                    )}
                  </Button>
                </div>
              )}

              {/* Upgrade to write access */}
              {!hasWriteAccess && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Want to send calendar invites?</strong> Upgrade your connection to send
                    Google Calendar invitations to your lineup members.
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto ml-2"
                      onClick={handleUpgradeToWriteAccess}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? "Upgrading..." : "Upgrade permissions"}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/calendar/import"}
                >
                  Import Events
                </Button>
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
            </>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <strong>Benefits of connecting:</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Import existing calendar events as gigs</li>
                  <li>Full conflict detection (checks both GigMaster and Google Calendar)</li>
                  <li>Read-only access (we never modify your calendar)</li>
                </ul>
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

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Privacy:</strong> We only request read-only access to your calendar.
                  We never create, modify, or delete your calendar events.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
