"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateSetlistItem } from "@/lib/api/setlist-items";
import type { SetlistItem } from "@/lib/types/shared";
import { toSmartTitleCase, formatMusicalKey } from "@/lib/utils/text-formatting";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";

interface EditSetlistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  item: SetlistItem | null;
}

export function EditSetlistItemDialog({
  open,
  onOpenChange,
  onSuccess,
  item,
}: EditSetlistItemDialogProps) {
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setKey(item.key || "");
      setBpm(item.bpm ? item.bpm.toString() : "");
      setNotes(item.notes || "");
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!item) return;

    if (!title.trim()) {
      setError("Song title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateSetlistItem(item.id, {
        title: toSmartTitleCase(title.trim()),
        key: key.trim() || null,
        bpm: bpm ? parseInt(bpm, 10) : null,
        notes: notes.trim() || null,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update song");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Song</DialogTitle>
            <DialogDescription>
              Update the song details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Song Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="e.g., Superstition, I Want You Back"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-key">Key (optional)</Label>
              <Input
                id="edit-key"
                placeholder="e.g., C, Bb, E minor"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onBlur={(e) => setKey(formatMusicalKey(e.target.value))}
                disabled={loading}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                The key the song will be played in
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-bpm">BPM (optional)</Label>
              <Input
                id="edit-bpm"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="e.g., 120"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Beats per minute
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Any notes, cues, or special instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <div className="flex items-center gap-3 w-full">
              <KeyboardShortcutHint />
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

