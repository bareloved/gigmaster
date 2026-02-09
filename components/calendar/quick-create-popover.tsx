"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createGig } from "@/lib/api/gigs";
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
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [bandId, setBandId] = useState<string>("");
  const [creating, setCreating] = useState(false);

  // Auto-focus title input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Close on outside click / escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
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
        start_time: time,
        end_time: endTime || null,
        band_id: bandId || null,
      });
      // Invalidate calendar queries
      queryClient.invalidateQueries({ queryKey: ["calendar-gigs"] });
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
    const params = new URLSearchParams({ date: dateStr, startTime: time });
    if (endTime) params.set("endTime", endTime);
    router.push(`/gigs/new?${params.toString()}`);
    onClose();
  }

  // Position
  const popoverWidth = 260;
  const popoverHeight = 200;
  let top = 100;
  let left = 100;

  if (anchorRect) {
    top = anchorRect.top;
    left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
    if (left < 8) left = 8;
    if (left + popoverWidth > window.innerWidth - 8)
      left = window.innerWidth - popoverWidth - 8;
    if (top + popoverHeight > window.innerHeight - 8)
      top = anchorRect.top - popoverHeight;
  }

  const dateLabel = format(date, "EEE, MMM d");
  const timeLabel = endTime ? `${time} – ${endTime}` : time;

  return (
    <div
      ref={ref}
      className="fixed z-[70] w-[260px] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ top, left }}
    >
      <div className="p-3 space-y-2.5">
        <p className="text-xs text-muted-foreground">
          {dateLabel} at {timeLabel}
        </p>

        <Input
          ref={inputRef}
          placeholder="Gig title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />

        {bands.length > 0 && (
          <select
            value={bandId}
            onChange={(e) => setBandId(e.target.value)}
            className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">No band (personal)</option>
            {bands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={handleCreate}
            disabled={!title.trim() || creating}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleMoreDetails}
          >
            More details
          </Button>
        </div>
      </div>
    </div>
  );
}
