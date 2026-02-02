"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Clock,
  MapPin,
  Download,
  ChevronDown,
  ChevronUp,
  Users,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { parseScheduleFromDescription, extractScheduleItems } from "@/lib/utils/parse-schedule";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  htmlLink?: string;
  status: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
}

interface DateRange {
  from: Date;
  to: Date;
}

export default function CalendarImportPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [importingEvents, setImportingEvents] = useState<Set<string>>(new Set());
  const [importedEvents, setImportedEvents] = useState<Map<string, string>>(new Map()); // eventId -> gigId
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Date range state (default to next 30 days)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: addDays(new Date(), 30),
  });

  // Check if Google Calendar is connected
  useEffect(() => {
    async function checkConnection() {
      if (!user) return;

      try {
        const supabase = createClient();
        const { data: connection } = await supabase
          .from("calendar_connections")
          .select("id")
          .eq("user_id", user.id)
          .eq("provider", "google")
          .single();

        if (connection) {
          setIsConnected(true);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      } finally {
        setIsLoading(false);
      }
    }

    if (user && !userLoading) {
      checkConnection();
    }
  }, [user, userLoading]);

  const handleFetchEvents = async () => {
    if (!user) return;

    if (!isConnected) {
      toast.error("Please connect your Google Calendar first");
      return;
    }

    try {
      setIsFetching(true);

      const response = await fetch(
        `/api/calendar/events?from=${dateRange.from.toISOString()}&to=${dateRange.to.toISOString()}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch events");
      }

      const data = await response.json();
      setEvents(data.events || []);

      if (data.events?.length === 0) {
        toast.info("No events found in the selected date range");
      } else {
        toast.success(`Found ${data.events?.length || 0} events`);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch calendar events";

      if (errorMessage.includes("not connected") || errorMessage.includes("expired") || errorMessage.includes("reconnect")) {
        setIsConnected(false);
        toast.error("Google Calendar connection expired. Redirecting to reconnect...");
        setTimeout(() => {
          router.push("/settings/calendar");
        }, 2000);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleImportEvent = async (event: GoogleCalendarEvent) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    try {
      setImportingEvents(new Set([...importingEvents, event.id]));

      const response = await fetch("/api/calendar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });

      if (!response.ok) {
        throw new Error("Failed to import event");
      }

      const data = await response.json();
      const gigId = data.gigId;

      if (data.duplicate) {
        toast.info(`"${event.summary}" was already imported`, {
          action: {
            label: "View Gig",
            onClick: () => router.push(`/gigs/${gigId}/pack`),
          },
        });
      } else {
        toast.success(`Imported "${event.summary}" from Google Calendar`, {
          action: {
            label: "View Gig Pack",
            onClick: () => router.push(`/gigs/${gigId}/pack`),
          },
        });
      }

      setImportedEvents(new Map([...importedEvents, [event.id, gigId]]));
    } catch (error) {
      console.error("Error importing event:", error);
      toast.error("Failed to import event");
    } finally {
      setImportingEvents((prev) => {
        const next = new Set(prev);
        next.delete(event.id);
        return next;
      });
    }
  };

  const formatEventDate = (event: GoogleCalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "Unknown date";

    try {
      const date = new Date(start);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch {
      return start;
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const setDateRangePreset = (preset: string) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    switch (preset) {
      case 'next7':
        from = today;
        to = addDays(today, 7);
        break;
      case 'next30':
        from = today;
        to = addDays(today, 30);
        break;
      case 'next90':
        from = today;
        to = addDays(today, 90);
        break;
      case 'year':
        from = today;
        to = addDays(today, 365);
        break;
      case 'past30':
        from = subDays(today, 30);
        to = today;
        break;
      case 'past90':
        from = subDays(today, 90);
        to = today;
        break;
      case 'past6months':
        from = subDays(today, 180);
        to = today;
        break;
      case 'pastyear':
        from = subDays(today, 365);
        to = today;
        break;
      default:
        from = today;
        to = addDays(today, 30);
    }

    setDateRange({ from, to });
  };

  if (userLoading || isLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Google Calendar not connected.</strong> Please connect your calendar first to import events.
          </AlertDescription>
        </Alert>

        <Button onClick={() => router.push("/settings/calendar")}>
          Go to Calendar Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Import from Google Calendar</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Import your gigs from Google Calendar. Each event becomes a personal gig you can track.
          </p>
        </div>
      </div>

      {/* Fetch Events */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date Range</CardTitle>
          <CardDescription>
            Choose a date range to load events from your Google Calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset buttons */}
          <div className="space-y-2">
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Future:</span>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('next7')}>
                Next 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('next30')}>
                Next 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('next90')}>
                Next 90 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('year')}>
                Next Year
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center mr-1">Past:</span>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('past30')}>
                Past 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('past90')}>
                Past 90 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('past6months')}>
                Past 6 Months
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRangePreset('pastyear')}>
                Past Year
              </Button>
            </div>
          </div>

          {/* Custom date range */}
          <div className="space-y-2">
            <Label>Or Choose Custom Range</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-sm text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("justify-start text-left font-normal")}>
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Fetch button */}
          <div className="pt-2">
            <Button
              onClick={handleFetchEvents}
              disabled={isFetching || !isConnected}
            >
              {isFetching ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Fetching...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Fetch Events
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Import Events</CardTitle>
            <CardDescription>
              {events.length} {events.length === 1 ? 'event' : 'events'} found. Each will be imported as your personal external gig.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {events.map((event) => {
                const isImporting = importingEvents.has(event.id);
                const isImported = importedEvents.has(event.id);
                const importedGigId = importedEvents.get(event.id);
                const isExpanded = expandedEvents.has(event.id);
                const parsedSchedule = event.description ? parseScheduleFromDescription(event.description) : null;
                const scheduleItems = parsedSchedule?.schedule ? extractScheduleItems(parsedSchedule.schedule) : [];

                return (
                  <div
                    key={event.id}
                    className={cn(
                      "border rounded-lg transition-colors",
                      isImported ? "border-green-200 bg-green-50/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between p-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{event.summary}</h3>
                          {isImported && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Imported
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatEventDate(event)}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Users className="h-3 w-3" />
                              {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                            </div>
                          )}
                        </div>

                        {/* Import info badge */}
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="secondary" className="text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            External Gig
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Your role: Musician
                          </span>
                        </div>

                        {/* Show details button */}
                        {(event.description) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEventExpanded(event.id)}
                            className="mt-1 h-auto p-0 text-sm text-blue-600 hover:text-blue-700 hover:bg-transparent"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Show Details
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {isImported ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/gigs/${importedGigId}/pack`)}
                          >
                            View Gig Pack
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleImportEvent(event)}
                            disabled={isImporting}
                          >
                            {isImporting ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              "Import as My Gig"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible details */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t pt-4 bg-muted/30">
                        {/* Schedule */}
                        {scheduleItems.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Schedule
                            </p>
                            <div className="space-y-1">
                              {scheduleItems.map((item, idx) => (
                                <div key={idx} className="text-sm flex items-start gap-2">
                                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                                    {item.time}
                                  </span>
                                  <span>{item.term}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Description/Notes */}
                        {event.description && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Notes</p>
                            {parsedSchedule?.remainingText ? (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {parsedSchedule.remainingText}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {event.description}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {events.length === 0 && !isFetching && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            No events loaded yet. Select a date range and click &quot;Fetch Events&quot; to load your calendar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
