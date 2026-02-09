"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { updateGig, deleteGig } from "@/lib/api/gigs";
import type { DashboardGig } from "@/lib/types/shared";

interface EventPreviewPopoverProps {
  gig: DashboardGig;
  color: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

function formatTime24(time: string): string {
  try {
    const d = parse(time, "HH:mm:ss", new Date());
    return format(d, "HH:mm");
  } catch {
    try {
      const d = parse(time, "HH:mm", new Date());
      return format(d, "HH:mm");
    } catch {
      return time;
    }
  }
}

function statusVariant(status: string | null) {
  switch (status) {
    case "confirmed":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "cancelled":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function EventPreviewPopover({
  gig,
  color,
  anchorRect,
  onClose,
}: EventPreviewPopoverProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(gig.gigTitle);
  const [editStartTime, setEditStartTime] = useState(
    gig.startTime ? formatTime24(gig.startTime) : ""
  );
  const [editEndTime, setEditEndTime] = useState(
    gig.endTime ? formatTime24(gig.endTime) : ""
  );
  const [saving, setSaving] = useState(false);

  const isOwner = gig.isManager;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteGig(gig.gigId);
      queryClient.invalidateQueries({ queryKey: ["calendar-gigs"] });
      toast.success("Gig deleted");
      onClose();
    } catch (err) {
      console.error("Failed to delete gig:", err);
      toast.error("Failed to delete gig");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) return;
    setSaving(true);
    try {
      await updateGig(gig.gigId, {
        title: editTitle.trim(),
        start_time: editStartTime || null,
        end_time: editEndTime || null,
      });
      queryClient.invalidateQueries({ queryKey: ["calendar-gigs"] });
      toast.success("Gig updated");
      setEditing(false);
    } catch (err) {
      console.error("Failed to update gig:", err);
      toast.error("Failed to update gig");
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditTitle(gig.gigTitle);
    setEditStartTime(gig.startTime ? formatTime24(gig.startTime) : "");
    setEditEndTime(gig.endTime ? formatTime24(gig.endTime) : "");
    setEditing(false);
  }

  // Position the popover near the anchor
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

  // Calculate position
  const popoverWidth = 280;
  const popoverHeight = editing ? 320 : 220;
  let top = anchorRect.bottom + 8;
  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;

  // Keep within viewport
  if (left < 8) left = 8;
  if (left + popoverWidth > window.innerWidth - 8) {
    left = window.innerWidth - popoverWidth - 8;
  }
  if (top + popoverHeight > window.innerHeight - 8) {
    top = anchorRect.top - popoverHeight - 8;
  }

  const dateStr = format(new Date(gig.date + "T00:00:00"), "EEE, MMM d, yyyy");

  function handleViewGig() {
    router.push(`/gigs/${gig.gigId}/pack?returnUrl=/calendar`);
  }

  return (
    <div
      ref={ref}
      className="fixed z-[70] w-[280px] rounded-lg border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
      style={{ top, left }}
    >
      {/* Color bar */}
      <div className="h-1 rounded-t-lg" style={{ backgroundColor: color }} />

      <div className="p-3 space-y-2.5">
        {/* Header row: band name + action icons */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {gig.projectName && (
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {gig.projectName}
                </span>
              </div>
            )}
          </div>
          {isOwner && !confirmDelete && !editing && (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Quick edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete gig"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 space-y-2">
            <p className="text-xs text-destructive font-medium">
              Delete &ldquo;{gig.gigTitle}&rdquo;? This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs flex-1"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Title — editable in edit mode */}
        {editing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="h-8 text-sm font-semibold"
            placeholder="Gig title"
            autoFocus
          />
        ) : (
          <h3 className="font-semibold text-sm leading-tight">{gig.gigTitle}</h3>
        )}

        {/* Date + time — editable in edit mode */}
        {editing ? (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{dateStr}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-0.5 block">Start</label>
                <input
                  type="time"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-muted-foreground mb-0.5 block">End</label>
                <input
                  type="time"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {dateStr}
              {gig.startTime && (
                <>
                  {" "}
                  &middot; {formatTime24(gig.startTime)}
                  {gig.endTime && ` - ${formatTime24(gig.endTime)}`}
                </>
              )}
            </span>
          </div>
        )}

        {/* Venue */}
        {gig.locationName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{gig.locationName}</span>
          </div>
        )}

        {/* Status + role — hidden in edit mode */}
        {!editing && (
          <div className="flex items-center gap-2 flex-wrap">
            {gig.status && (
              <Badge variant={statusVariant(gig.status)} className="text-[10px] h-5">
                {gig.status}
              </Badge>
            )}
            {gig.isPlayer && gig.playerRoleName && (
              <Badge variant="outline" className="text-[10px] h-5">
                {gig.playerRoleName}
              </Badge>
            )}
            {gig.isManager && (
              <Badge variant="outline" className="text-[10px] h-5">
                Managing
              </Badge>
            )}
          </div>
        )}

        {/* Edit mode: Save/Cancel buttons */}
        {editing ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleSaveEdit}
              disabled={!editTitle.trim() || saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        ) : null}

        {/* View/Edit full gig button */}
        <Button
          size="sm"
          variant={editing ? "outline" : "default"}
          className="w-full h-8 text-xs"
          onClick={() => {
            if (editing) {
              router.push(`/gigs/${gig.gigId}/edit?returnUrl=/calendar`);
            } else {
              handleViewGig();
            }
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1.5" />
          {editing ? "Edit Full Gig" : "View Full Gig"}
        </Button>
      </div>
    </div>
  );
}
