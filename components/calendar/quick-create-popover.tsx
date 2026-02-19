"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePicker } from "@/components/gigpack/ui/time-picker";
import { VenueAutocomplete } from "@/components/gigpack/ui/venue-autocomplete";
import { toast } from "sonner";
import { createGig } from "@/lib/api/gigs";
import { useInvalidateGigQueries } from "@/hooks/use-gig-mutations";
import { PERSONAL_GIG_COLOR } from "@/lib/constants/calendar-colors";
import type { CalendarBand } from "@/hooks/use-calendar-bands";

interface QuickCreatePopoverProps {
  date: Date;
  time: string;
  endTime?: string;
  anchorRect: DOMRect | null;
  bands: CalendarBand[];
  onClose: () => void;
}

export function QuickCreatePopover({
  date,
  time,
  endTime,
  anchorRect,
  bands,
  onClose,
}: QuickCreatePopoverProps) {
  const router = useRouter();
  const { invalidateAll } = useInvalidateGigQueries();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [bandId, setBandId] = useState<string>("");
  const [callTime, setCallTime] = useState("");
  const [onStageTime, setOnStageTime] = useState(time);
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueMapsUrl, setVenueMapsUrl] = useState("");
  const [creating, setCreating] = useState(false);

  // Auto-focus title input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on outside click / escape
  // Skip if click lands inside a Radix portal (Select dropdown, TimePicker popover)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (ref.current && ref.current.contains(target)) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      onClose();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const openPortal = document.querySelector(
        "[data-radix-popper-content-wrapper] [data-state='open']"
      );
      if (openPortal) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function handleCreate() {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      await createGig({
        title: title.trim(),
        date: dateStr,
        start_time: onStageTime || time,
        end_time: endTime || null,
        on_stage_time: onStageTime || time,
        call_time: callTime || null,
        band_id: bandId || null,
        venue_name: venueName.trim() || null,
        venue_address: venueAddress || null,
        venue_maps_url: venueMapsUrl || null,
      });
      invalidateAll();
      toast.success("Gig created");
      onClose();
    } catch (err) {
      console.error("Failed to create gig:", err);
      toast.error("Failed to create gig");
      setCreating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  }

  function handleMoreDetails() {
    const dateStr = format(date, "yyyy-MM-dd");
    const params = new URLSearchParams({ date: dateStr });
    if (onStageTime) params.set("startTime", onStageTime);
    if (endTime) params.set("endTime", endTime);
    if (callTime) params.set("callTime", callTime);
    if (title.trim()) params.set("title", title.trim());
    if (bandId) params.set("band", bandId);
    if (venueName.trim()) params.set("venue", venueName.trim());
    if (venueAddress) params.set("venueAddress", venueAddress);
    if (venueMapsUrl) params.set("venueMapsUrl", venueMapsUrl);
    router.push(`/gigs/new?${params.toString()}`);
    onClose();
  }

  // Position: LEFT of anchor, flip right if no space
  // On mobile (<640px), use compact size centered horizontally
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  const popoverWidth = isMobile ? Math.min(320, window.innerWidth - 16) : 400;
  const popoverHeight = isMobile ? 340 : 380;
  let top = 100;
  let left = 100;

  if (anchorRect) {
    if (isMobile) {
      // Center horizontally on mobile
      left = Math.round((window.innerWidth - popoverWidth) / 2);
      top = anchorRect.bottom + 8;
    } else {
      left = anchorRect.left - popoverWidth - 12;
      top = anchorRect.top;

      if (left < 8) {
        left = anchorRect.right + 12;
      }
    }

    if (left + popoverWidth > window.innerWidth - 8) {
      left = window.innerWidth - popoverWidth - 8;
    }

    if (top + popoverHeight > window.innerHeight - 8) {
      top = window.innerHeight - popoverHeight - 8;
    }
    if (top < 8) top = 8;
  }

  const dateLabel = format(date, "PPP");

  return (
    <div
      ref={ref}
      className="fixed z-[70] rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
      style={{ top, left, width: popoverWidth }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors z-10"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-3 pb-2 sm:p-4 sm:pb-3">
        {/* Title — InlineInput style from gig editor */}
        <div className="pr-6">
          <input
            ref={inputRef}
            placeholder="Your gig's name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent border-none outline-none text-lg sm:text-xl font-semibold leading-snug text-foreground placeholder:text-muted-foreground/50 hover:bg-accent/30 focus:bg-accent/20 rounded px-2 py-0.5 -mx-2 transition-colors"
          />
        </div>

        {/* Band selector — matches editor style */}
        <div className="mt-1 mb-3 sm:mb-4 max-w-[240px]">
          <Select
            value={bandId || "none"}
            onValueChange={(v) => setBandId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="w-full h-auto bg-accent/10 hover:bg-accent/15 border-none shadow-none px-2 py-1 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
              <SelectValue placeholder="Select a band..." />
            </SelectTrigger>
            <SelectContent className="z-[80]">
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PERSONAL_GIG_COLOR }}
                  />
                  No band
                </div>
              </SelectItem>
              {bands.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: b.color }}
                    />
                    {b.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metadata rows — same MetadataRow pattern as gig editor */}
        <div className="space-y-2 sm:space-y-2.5">
          {/* Date */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Date
            </span>
            <div className="flex-1 flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{dateLabel}</span>
            </div>
          </div>

          {/* Soundcheck */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Soundcheck
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="w-16">
                <TimePicker
                  value={callTime}
                  onChange={setCallTime}
                  contentClassName="z-[80]"
                />
              </div>
            </div>
          </div>

          {/* On Stage */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              On Stage
            </span>
            <div className="flex-1 flex items-center gap-2">
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="w-16">
                <TimePicker
                  value={onStageTime}
                  onChange={setOnStageTime}
                  contentClassName="z-[80]"
                />
              </div>
            </div>
          </div>

          {/* Venue */}
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Venue
            </span>
            <div className="flex-1 space-y-1">
              <VenueAutocomplete
                value={venueName}
                onChange={setVenueName}
                onPlaceSelect={(place) => {
                  if (place.address) setVenueAddress(place.address);
                  if (place.mapsUrl) setVenueMapsUrl(place.mapsUrl);
                }}
                placeholder="The Blue Room, Tel Aviv"
              />
              {venueAddress && (
                <p className="text-xs text-muted-foreground truncate">
                  {venueAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 mt-3 sm:mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-sm"
            onClick={handleMoreDetails}
          >
            More options
          </Button>
          <Button
            size="sm"
            className="rounded-full px-5"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            {creating ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
