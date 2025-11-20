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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addFileToGig } from "@/lib/api/gig-files";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";

interface AddGigFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gigId: string;
}

export function AddGigFileDialog({
  open,
  onOpenChange,
  onSuccess,
  gigId,
}: AddGigFileDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("document");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim()) {
      setError("File label is required");
      return;
    }

    if (!url.trim()) {
      setError("URL is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await addFileToGig({
        gig_id: gigId,
        label: label.trim(),
        url: url.trim(),
        type: type,
      });

      // Reset form
      setLabel("");
      setUrl("");
      setType("document");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add file");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setLabel("");
      setUrl("");
      setType("document");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add File Link</DialogTitle>
            <DialogDescription>
              Add a link to a file stored in Google Drive, Dropbox, or other cloud storage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="label">
                Label <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label"
                placeholder="e.g., Lead Sheet, Backing Track, Lyric Sheet"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={loading}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name for this file
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">
                URL <span className="text-destructive">*</span>
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://drive.google.com/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Link to Google Drive, Dropbox, OneDrive, or any other cloud storage
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select value={type} onValueChange={setType} disabled={loading}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document (PDF, chart, lyrics)</SelectItem>
                  <SelectItem value="audio">Audio (MP3, WAV, backing track)</SelectItem>
                  <SelectItem value="video">Video (performance reference)</SelectItem>
                  <SelectItem value="folder">Folder (multiple files)</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
                  {loading ? "Adding..." : "Add File"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

