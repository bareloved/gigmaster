"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, RefreshCw, Calendar, Check, ExternalLink, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { generateICSToken, regenerateICSToken, getICSToken } from "@/lib/api/calendar";
import { createClient } from "@/lib/supabase/client";

function CalendarSettingsContent() {
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Google Calendar connection state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Check for OAuth callback messages
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "connected") {
      toast.success("Google Calendar connected successfully!");
      setGoogleConnected(true);
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
    }
  }, [searchParams]);

  // Fetch or generate token and check Google connection on mount
  useEffect(() => {
    async function init() {
      if (!user) return;

      try {
        // Get ICS token
        const existingToken = await getICSToken(user.id);
        
        if (existingToken) {
          setToken(existingToken);
        } else {
          // Auto-generate token on first visit
          setIsGenerating(true);
          const newToken = await generateICSToken(user.id);
          setToken(newToken);
          setIsGenerating(false);
        }

        // Check Google Calendar connection
        const supabase = createClient();
        const { data: connection } = await supabase
          .from("calendar_connections")
          .select("last_synced_at")
          .eq("user_id", user.id)
          .eq("provider", "google")
          .single();

        if (connection) {
          setGoogleConnected(true);
          setLastSynced(connection.last_synced_at);
        }
      } catch (error) {
        console.error("Error initializing calendar settings:", error);
        toast.error("Failed to load calendar settings");
      } finally {
        setIsLoading(false);
      }
    }

    if (user && !userLoading) {
      init();
    }
  }, [user, userLoading]);

  const calendarUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api/calendar.ics?token=${token}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      toast.success("Calendar URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy URL");
    }
  };

  const handleRegenerate = async () => {
    if (!user) return;

    if (!confirm("Regenerating the URL will invalidate your current calendar subscription. You'll need to re-subscribe in your calendar app. Continue?")) {
      return;
    }

    try {
      setIsRegenerating(true);
      const newToken = await regenerateICSToken(user.id);
      setToken(newToken);
      toast.success("Calendar URL regenerated successfully");
    } catch (error) {
      console.error("Error regenerating token:", error);
      toast.error("Failed to regenerate URL");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setIsConnecting(true);
      const response = await fetch("/api/calendar/connect");
      const data = await response.json();
      
      if (data.url) {
        // Redirect to Google OAuth
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
        <h1 className="text-3xl font-bold">Calendar Settings</h1>
        <p className="text-gray-600 mt-1">
          Subscribe to your Ensemble gigs in Google Calendar, Apple Calendar, or any calendar app
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
                  <strong>Connected.</strong> Your Google Calendar is connected (read-only).
                  {lastSynced && (
                    <span className="block text-xs text-gray-600 mt-1">
                      Last synced: {new Date(lastSynced).toLocaleString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

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
                  <li>Full conflict detection (checks both Ensemble and Google Calendar)</li>
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

      <Separator />

      {/* Calendar Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Subscription
          </CardTitle>
          <CardDescription>
            Use this URL to subscribe to your gigs in your calendar app. Your gigs will appear automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Calendar URL */}
          <div className="space-y-2">
            <Label htmlFor="calendar-url">Calendar Subscription URL</Label>
            <div className="flex gap-2">
              <Input
                id="calendar-url"
                value={calendarUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!token}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Copy this URL and add it as a calendar subscription in your calendar app
            </p>
          </div>

          {/* Regenerate Button */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating || !token}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
              {isRegenerating ? "Regenerating..." : "Regenerate URL"}
            </Button>
            <p className="text-xs text-gray-500">
              Regenerate if your URL has been compromised
            </p>
          </div>

          {/* Security Note */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Keep this URL private.</strong> Anyone with this URL can view your gigs.
              If you accidentally share it, regenerate the URL immediately.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How to Subscribe</CardTitle>
          <CardDescription>
            Follow these instructions for your calendar app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Calendar */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Google Calendar
              <ExternalLink className="h-3 w-3" />
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Open Google Calendar</li>
              <li>Click the "+" next to "Other calendars"</li>
              <li>Select "From URL"</li>
              <li>Paste your calendar subscription URL</li>
              <li>Click "Add calendar"</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              Note: Google Calendar refreshes subscribed calendars every few hours
            </p>
          </div>

          {/* Apple Calendar */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Apple Calendar
              <ExternalLink className="h-3 w-3" />
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Open Calendar app</li>
              <li>Go to File → New Calendar Subscription</li>
              <li>Paste your calendar subscription URL</li>
              <li>Click "Subscribe"</li>
              <li>Choose refresh frequency (recommended: every hour)</li>
            </ol>
          </div>

          {/* Outlook */}
          <div>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              Outlook
              <ExternalLink className="h-3 w-3" />
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              <li>Open Outlook Calendar</li>
              <li>Click "Add calendar" → "Subscribe from web"</li>
              <li>Paste your calendar subscription URL</li>
              <li>Name your calendar (e.g., "Ensemble Gigs")</li>
              <li>Click "Import"</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CalendarSettingsPage() {
  return (
    <Suspense fallback={
      <div className="container max-w-4xl py-8 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    }>
      <CalendarSettingsContent />
    </Suspense>
  );
}

