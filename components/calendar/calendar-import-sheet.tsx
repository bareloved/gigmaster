"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  MapPin,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { format, addDays, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface GoogleCalendarInfo {
  id: string;
  name: string;
  color: string;
  primary: boolean;
}

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  htmlLink?: string;
  status: string;
}

type DatePreset =
  | "next7"
  | "next30"
  | "next90"
  | "next365"
  | "past30"
  | "past90";

const DATE_PRESETS: { value: DatePreset; label: string; group: "future" | "past" }[] = [
  { value: "next7", label: "Next 7 days", group: "future" },
  { value: "next30", label: "Next 30 days", group: "future" },
  { value: "next90", label: "Next 3 months", group: "future" },
  { value: "next365", label: "Next year", group: "future" },
  { value: "past30", label: "Past 30 days", group: "past" },
  { value: "past90", label: "Past 3 months", group: "past" },
];

function getDateRange(preset: DatePreset): { from: Date; to: Date } {
  const today = new Date();
  switch (preset) {
    case "next7":
      return { from: today, to: addDays(today, 7) };
    case "next30":
      return { from: today, to: addDays(today, 30) };
    case "next90":
      return { from: today, to: addDays(today, 90) };
    case "next365":
      return { from: today, to: addDays(today, 365) };
    case "past30":
      return { from: subDays(today, 30), to: today };
    case "past90":
      return { from: subDays(today, 90), to: today };
  }
}

function formatEventDate(event: GoogleCalendarEvent): string {
  const start = event.start.dateTime || event.start.date;
  if (!start) return "Unknown date";
  try {
    const date = new Date(start);
    if (event.start.date && !event.start.dateTime) {
      return format(date, "EEE, MMM d");
    }
    return format(date, "EEE, MMM d 'at' h:mm a");
  } catch {
    return start;
  }
}

interface CalendarImportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarImportSheet({
  open,
  onOpenChange,
}: CalendarImportSheetProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Connection state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  // Calendar list state
  const [allCalendars, setAllCalendars] = useState<GoogleCalendarInfo[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    new Set()
  );
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(false);

  // Date range
  const [datePreset, setDatePreset] = useState<DatePreset>("next30");

  // Events state
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isFetchingEvents, setIsFetchingEvents] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Selection + import state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(
    new Set()
  );
  const [importedMap, setImportedMap] = useState<Map<string, string>>(
    new Map()
  );
  const [isImporting, setIsImporting] = useState(false);

  // Check connection status on open
  useEffect(() => {
    if (!open || !user) return;

    async function checkConnection() {
      const supabase = createClient();
      const { data: connection } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("user_id", user!.id)
        .eq("provider", "google")
        .single();

      setIsConnected(!!connection);
    }

    checkConnection();
  }, [open, user]);

  // Fetch calendar list when connected
  useEffect(() => {
    if (!open || !isConnected) return;

    async function loadCalendars() {
      setIsLoadingCalendars(true);
      try {
        const res = await fetch("/api/calendar/calendars");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to fetch calendars");
        }
        const data = await res.json();
        setAllCalendars(data.calendars || []);

        // Restore saved selections, or default to primary
        if (data.selectedCalendars && data.selectedCalendars.length > 0) {
          setSelectedCalendarIds(
            new Set(data.selectedCalendars.map((c: GoogleCalendarInfo) => c.id))
          );
        } else {
          // Default: select all calendars
          const allIds = (data.calendars || []).map(
            (c: GoogleCalendarInfo) => c.id
          );
          setSelectedCalendarIds(new Set(allIds));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load calendars";
        if (msg.includes("not connected") || msg.includes("disconnected") || msg.includes("reconnect")) {
          setIsConnected(false);
          toast.error("Google Calendar disconnected. Please reconnect.");
        } else {
          toast.error(msg);
        }
      } finally {
        setIsLoadingCalendars(false);
      }
    }

    loadCalendars();
  }, [open, isConnected]);

  // Check which events are already imported
  const checkAlreadyImported = useCallback(
    async (eventIds: string[]) => {
      if (!user || eventIds.length === 0) return;

      const supabase = createClient();
      const { data: existing } = await supabase
        .from("gigs")
        .select("id, external_calendar_event_id")
        .in("external_calendar_event_id", eventIds)
        .eq("owner_id", user.id)
        .is("deleted_at", null);

      if (existing) {
        const map = new Map<string, string>();
        for (const g of existing) {
          if (g.external_calendar_event_id) {
            map.set(g.external_calendar_event_id, g.id);
          }
        }
        setImportedMap(map);
      }
    },
    [user]
  );

  // Fetch events
  const handleFetchEvents = useCallback(async () => {
    if (selectedCalendarIds.size === 0) {
      toast.error("Please select at least one calendar");
      return;
    }

    setIsFetchingEvents(true);
    setEvents([]);
    setSelectedEventIds(new Set());
    setHasFetched(false);

    try {
      const { from, to } = getDateRange(datePreset);
      const calendarIds = Array.from(selectedCalendarIds);

      const res = await fetch(
        `/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}&calendarIds=${calendarIds.join(",")}`
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch events");
      }

      const data = await res.json();
      const fetched = data.events || [];
      setEvents(fetched);
      setHasFetched(true);

      if (fetched.length === 0) {
        toast.info("No events found for this date range");
      }

      // Check already imported
      await checkAlreadyImported(fetched.map((e: GoogleCalendarEvent) => e.id));

      // Auto-select all non-imported events
      const importedIds = new Set(importedMap.keys());
      const autoSelected = new Set<string>(
        fetched
          .filter((e: GoogleCalendarEvent) => !importedIds.has(e.id))
          .map((e: GoogleCalendarEvent) => e.id)
      );
      setSelectedEventIds(autoSelected);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch events";
      if (msg.includes("expired") || msg.includes("reconnect")) {
        setIsConnected(false);
        toast.error("Google Calendar session expired. Please reconnect.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsFetchingEvents(false);
    }
  }, [selectedCalendarIds, datePreset, checkAlreadyImported, importedMap]);

  // Save calendar selections
  const handleSaveCalendars = useCallback(async () => {
    const selected = allCalendars.filter((c) => selectedCalendarIds.has(c.id));
    try {
      await fetch("/api/calendar/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendars: selected }),
      });
    } catch {
      // Non-critical — don't block the user
    }
  }, [allCalendars, selectedCalendarIds]);

  // Toggle calendar selection
  const toggleCalendar = (calId: string) => {
    setSelectedCalendarIds((prev) => {
      const next = new Set(prev);
      if (next.has(calId)) {
        next.delete(calId);
      } else {
        next.add(calId);
      }
      return next;
    });
  };

  // Toggle event selection
  const toggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Select all / deselect all events (excluding already imported)
  const selectableEvents = useMemo(
    () => events.filter((e) => !importedMap.has(e.id)),
    [events, importedMap]
  );

  const allSelected =
    selectableEvents.length > 0 &&
    selectableEvents.every((e) => selectedEventIds.has(e.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(selectableEvents.map((e) => e.id)));
    }
  };

  // Batch import
  const handleImport = async () => {
    if (selectedEventIds.size === 0) return;

    const eventsToImport = events.filter((e) => selectedEventIds.has(e.id));
    setIsImporting(true);

    try {
      const res = await fetch("/api/calendar/import-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: eventsToImport }),
      });

      if (!res.ok) throw new Error("Failed to import events");

      const data = await res.json();
      const results = data.results || [];

      // Update imported map
      const newMap = new Map(importedMap);
      for (const r of results) {
        newMap.set(r.eventId, r.gigId);
      }
      setImportedMap(newMap);
      setSelectedEventIds(new Set());

      const newCount = results.filter(
        (r: { duplicate: boolean }) => !r.duplicate
      ).length;
      toast.success(
        `Imported ${newCount} ${newCount === 1 ? "gig" : "gigs"} from Google Calendar`
      );

      // Invalidate gig queries
      queryClient.invalidateQueries({ queryKey: ["all-gigs"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-gigs"] });
    } catch (err) {
      console.error("Batch import error:", err);
      toast.error("Failed to import events");
    } finally {
      setIsImporting(false);
    }
  };

  // Connect handler
  const handleConnect = async () => {
    try {
      const res = await fetch("/api/calendar/connect");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to initiate connection");
    }
  };

  // Reset state on close
  const handleOpenChange = (v: boolean) => {
    if (!v) {
      // Save calendar selections before closing
      if (selectedCalendarIds.size > 0) {
        handleSaveCalendars();
      }
    }
    onOpenChange(v);
  };

  const selectedCount = selectedEventIds.size;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-xl w-full flex flex-col p-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-1">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Import from Google Calendar
          </SheetTitle>
          <SheetDescription>
            Select calendars and a date range, then import events as gigs.
          </SheetDescription>
        </SheetHeader>

        {/* Not Connected State */}
        {isConnected === false && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Unplug className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Google Calendar not connected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Connect your calendar to import events as gigs.
                </p>
              </div>
              <Button onClick={handleConnect}>Connect Google Calendar</Button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isConnected === null && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Connected State */}
        {isConnected && (
          <>
            {/* Controls Bar */}
            <div className="px-6 py-3 border-b space-y-3">
              <div className="flex items-center gap-2">
                {/* Calendar Picker */}
                <Popover
                  open={calendarPickerOpen}
                  onOpenChange={setCalendarPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-9"
                      disabled={isLoadingCalendars}
                    >
                      {isLoadingCalendars ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Calendar className="h-3.5 w-3.5" />
                      )}
                      <span className="max-w-[120px] truncate">
                        {selectedCalendarIds.size === allCalendars.length
                          ? "All calendars"
                          : `${selectedCalendarIds.size} calendar${selectedCalendarIds.size !== 1 ? "s" : ""}`}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-64 p-2 z-[60]"
                    align="start"
                    side="bottom"
                  >
                    <div className="space-y-1">
                      {allCalendars.map((cal) => (
                        <label
                          key={cal.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedCalendarIds.has(cal.id)}
                            onCheckedChange={() => toggleCalendar(cal.id)}
                          />
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cal.color }}
                          />
                          <span className="text-sm truncate">{cal.name}</span>
                          {cal.primary && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px] px-1 py-0"
                            >
                              Primary
                            </Badge>
                          )}
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Date Range Select */}
                <Select
                  value={datePreset}
                  onValueChange={(v) => setDatePreset(v as DatePreset)}
                >
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectGroup>
                      <SelectLabel>Future</SelectLabel>
                      {DATE_PRESETS.filter((p) => p.group === "future").map(
                        (p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Past</SelectLabel>
                      {DATE_PRESETS.filter((p) => p.group === "past").map(
                        (p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        )
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>

                {/* Fetch Button */}
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleFetchEvents}
                  disabled={
                    isFetchingEvents ||
                    isLoadingCalendars ||
                    selectedCalendarIds.size === 0
                  }
                >
                  {isFetchingEvents ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Event List */}
            <ScrollArea className="flex-1">
              {isFetchingEvents && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Fetching events...
                    </p>
                  </div>
                </div>
              )}

              {!isFetchingEvents && hasFetched && events.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      No events found for this range.
                    </p>
                  </div>
                </div>
              )}

              {!isFetchingEvents && events.length > 0 && (
                <div className="px-6 py-3 space-y-1">
                  {/* Select All header */}
                  <div className="flex items-center justify-between py-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={selectableEvents.length === 0}
                      />
                      <span className="text-sm font-medium">
                        {allSelected ? "Deselect all" : "Select all"}
                      </span>
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {events.length} event{events.length !== 1 ? "s" : ""}
                      {importedMap.size > 0 &&
                        ` (${importedMap.size} already imported)`}
                    </span>
                  </div>

                  {/* Event rows */}
                  {events.map((event) => {
                    const isImported = importedMap.has(event.id);
                    const isSelected = selectedEventIds.has(event.id);

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                          isImported
                            ? "opacity-50 bg-muted/30"
                            : isSelected
                              ? "border-primary/30 bg-primary/5"
                              : "hover:bg-muted/50"
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleEvent(event.id)}
                          disabled={isImported}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-medium text-sm truncate",
                                isImported && "line-through"
                              )}
                            >
                              {event.summary}
                            </span>
                            {isImported && (
                              <Badge
                                variant="outline"
                                className="text-green-600 border-green-600 shrink-0 text-[10px] px-1.5 py-0"
                              >
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                Imported
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatEventDate(event)}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Initial empty state (before first fetch) */}
              {!isFetchingEvents && !hasFetched && events.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <Download className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Choose your calendars and date range, then fetch events.
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Sticky Footer */}
            {events.length > 0 && selectableEvents.length > 0 && (
              <SheetFooter className="px-6 py-4 border-t flex-row items-center justify-between sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} selected
                </span>
                <Button
                  onClick={handleImport}
                  disabled={selectedCount === 0 || isImporting}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Import {selectedCount > 0 ? selectedCount : ""}{" "}
                      {selectedCount === 1 ? "Gig" : "Gigs"}
                    </>
                  )}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
