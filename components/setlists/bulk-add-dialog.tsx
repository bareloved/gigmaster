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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { addSetlistItem } from "@/lib/api/setlist-items";
import { parseSetlistText, type ParsedSong } from "@/lib/utils/setlist-parser";
import { formatMusicalKey } from "@/lib/utils/text-formatting";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/shared/keyboard-shortcut-hint";

interface BulkAddSetlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gigId: string;
}

const EXAMPLE_SETLIST = `Intro – Bm
I got a feelin - G
I will survive - Gm
YMCA – Gb
Gimme Gimme Gimme - Dm`;

export function BulkAddSetlistDialog({
  open,
  onOpenChange,
  gigId,
  onSuccess,
}: BulkAddSetlistDialogProps) {
  const [rawText, setRawText] = useState("");
  const [parsedSongs, setParsedSongs] = useState<ParsedSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  // Note: This dialog doesn't have a traditional form, but we can make it work
  // by triggering handleAddAll when parsedSongs exist
  useKeyboardSubmit(open);

  const handleParse = () => {
    if (!rawText.trim()) {
      setError("Please paste your setlist first");
      return;
    }

    try {
      const songs = parseSetlistText(rawText);
      
      if (songs.length === 0) {
        setError("No songs found. Make sure each song is on a separate line.");
        return;
      }

      setParsedSongs(songs);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse setlist");
    }
  };

  const handleTryExample = () => {
    setRawText(EXAMPLE_SETLIST);
    setParsedSongs([]);
    setError(null);
  };

  const handleRemoveSong = (index: number) => {
    setParsedSongs(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSong = (index: number, field: keyof ParsedSong, value: any) => {
    setParsedSongs(prev =>
      prev.map((song, i) =>
        i === index ? { ...song, [field]: value } : song
      )
    );
  };

  const handleAddAll = async () => {
    if (parsedSongs.length === 0) {
      setError("No songs to add");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: This component needs updating - setlist items now belong to sections, not gigs
      // Batch insert all songs in parallel for better performance
      await Promise.all(
        parsedSongs.map((song) =>
          addSetlistItem({
            section_id: gigId, // FIXME: Should be section_id, not gig_id
            sort_order: song.position,
            title: song.title,
            key: song.key,
            tempo: song.bpm ? String(song.bpm) : null, // Changed from bpm (number) to tempo (string)
            notes: null,
          })
        )
      );

      // Reset form
      setRawText("");
      setParsedSongs([]);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add songs");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setRawText("");
      setParsedSongs([]);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Songs</DialogTitle>
          <DialogDescription>
            Paste your setlist and we'll parse it for you. One song per line.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {parsedSongs.length === 0 ? (
            // Step 1: Paste and Parse
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="setlistText">Paste Your Setlist</Label>
                <Textarea
                  id="setlistText"
                  placeholder={`Intro – Bm\nI got a feelin - G\nYMCA – Gb\n...\n\nSupported formats:\n• Song Title - Key\n• Song Title + Another Song - Key\n• Song Title (without key)`}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleParse}
                  disabled={loading || !rawText.trim()}
                  className="flex-1"
                >
                  Parse Setlist
                </Button>
                <Button
                  onClick={handleTryExample}
                  variant="outline"
                  disabled={loading}
                >
                  Try Example
                </Button>
              </div>
            </div>
          ) : (
            // Step 2: Review and Edit
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Review Songs ({parsedSongs.length})
                </Label>
                <Button
                  onClick={() => setParsedSongs([])}
                  variant="ghost"
                  size="sm"
                >
                  ← Back to Edit
                </Button>
              </div>

              <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Key</TableHead>
                      <TableHead className="w-24">BPM</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedSongs.map((song, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground font-mono">
                          {song.position}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={song.title}
                            onChange={(e) =>
                              handleUpdateSong(index, "title", e.target.value)
                            }
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={song.key || ""}
                            onChange={(e) =>
                              handleUpdateSong(index, "key", e.target.value || null)
                            }
                            onBlur={(e) => {
                              const formatted = formatMusicalKey(e.target.value);
                              handleUpdateSong(index, "key", formatted || null);
                            }}
                            placeholder="-"
                            className="h-8 font-mono"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={song.bpm || ""}
                            onChange={(e) =>
                              handleUpdateSong(
                                index,
                                "bpm",
                                e.target.value ? parseInt(e.target.value, 10) : null
                              )
                            }
                            placeholder="-"
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSong(index)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-sm text-muted-foreground">
                Tip: You can edit any field or remove songs before adding them.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center gap-3 w-full">
            {parsedSongs.length > 0 && <KeyboardShortcutHint />}
            <div className="flex gap-2 ml-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              {parsedSongs.length > 0 && (
                <Button onClick={handleAddAll} disabled={loading}>
                  {loading ? "Adding..." : `Add ${parsedSongs.length} Song${parsedSongs.length !== 1 ? 's' : ''}`}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

