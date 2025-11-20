"use client";

import { useState } from "react";
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
import { addSetlistItem } from "@/lib/api/setlist-items";
import { toSmartTitleCase, formatMusicalKey } from "@/lib/utils/text-formatting";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";

interface AddSetlistItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gigId: string;
}

export function AddSetlistItemDialog({
  open,
  onOpenChange,
  onSuccess,
  gigId,
}: AddSetlistItemDialogProps) {
  const [title, setTitle] = useState("");
  const [key, setKey] = useState("");
  const [bpm, setBpm] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Song title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addSetlistItem({
        gig_id: gigId,
        position: 0, // Will be auto-assigned to next position in API
        title: toSmartTitleCase(title.trim()),
        key: key.trim() || null,
        bpm: bpm ? parseInt(bpm, 10) : null,
        notes: notes.trim() || null,
      });

      // Reset form
      setTitle("");
      setKey("");
      setBpm("");
      setNotes("");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add song");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setTitle("");
      setKey("");
      setBpm("");
      setNotes("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Song to Setlist</DialogTitle>
            <DialogDescription>
              Add a new song with key, BPM, and any notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">
                Song Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Superstition, I Want You Back"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Key (optional)</Label>
              <Input
                id="key"
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
              <Label htmlFor="bpm">BPM (optional)</Label>
              <Input
                id="bpm"
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
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
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
                  {loading ? "Adding..." : "Add Song"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

