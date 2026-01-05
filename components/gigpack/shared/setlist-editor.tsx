"use client";

import { useState } from "react";
import { SetlistSection, SetlistSong } from "@/lib/types/gigpack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, X, ChevronUp, ChevronDown, Music2, Link2 } from "lucide-react";

interface SetlistEditorProps {
  value: SetlistSection[];
  onChange: (sections: SetlistSection[]) => void;
  disabled?: boolean;
}

/**
 * SetlistEditor Component
 * 
 * Allows managers to create structured setlists with:
 * - Multiple sections (Set 1, Set 2, Encore, etc.)
 * - Songs with title, artist, key, tempo, and notes
 * - Reordering capabilities (move up/down)
 * 
 * Used in the GigPack form to replace the simple textarea setlist.
 */
export function SetlistEditor({ value, onChange, disabled = false }: SetlistEditorProps) {
  const [expandedSongs, setExpandedSongs] = useState<Set<string>>(new Set());

  // Generate unique IDs
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Section management
  const addSection = () => {
    const newSectionNumber = value.length + 1;
    const newSection: SetlistSection = {
      id: generateId(),
      name: `Set ${newSectionNumber}`,
      songs: [],
    };
    onChange([...value, newSection]);
  };

  const removeSection = (sectionId: string) => {
    onChange(value.filter(s => s.id !== sectionId));
  };

  const updateSectionName = (sectionId: string, name: string) => {
    onChange(
      value.map(section =>
        section.id === sectionId ? { ...section, name } : section
      )
    );
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...value];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    onChange(newSections);
  };

  const moveSectionDown = (index: number) => {
    if (index === value.length - 1) return;
    const newSections = [...value];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    onChange(newSections);
  };

  // Song management
  const addSong = (sectionId: string) => {
    onChange(
      value.map(section =>
        section.id === sectionId
          ? {
              ...section,
              songs: [
                ...section.songs,
                {
                  id: generateId(),
                  title: "",
                  artist: "",
                  key: "",
                  tempo: "",
                  notes: "",
                },
              ],
            }
          : section
      )
    );
  };

  const removeSong = (sectionId: string, songId: string) => {
    onChange(
      value.map(section =>
        section.id === sectionId
          ? { ...section, songs: section.songs.filter(s => s.id !== songId) }
          : section
      )
    );
  };

  const updateSong = (
    sectionId: string,
    songId: string,
    field: keyof SetlistSong,
    fieldValue: string
  ) => {
    onChange(
      value.map(section =>
        section.id === sectionId
          ? {
              ...section,
              songs: section.songs.map(song =>
                song.id === songId ? { ...song, [field]: fieldValue } : song
              ),
            }
          : section
      )
    );
  };

  const moveSong = (sectionId: string, songIndex: number, direction: "up" | "down") => {
    onChange(
      value.map(section => {
        if (section.id !== sectionId) return section;

        const newSongs = [...section.songs];
        const targetIndex = direction === "up" ? songIndex - 1 : songIndex + 1;

        if (targetIndex < 0 || targetIndex >= newSongs.length) return section;

        [newSongs[songIndex], newSongs[targetIndex]] = [newSongs[targetIndex], newSongs[songIndex]];

        return { ...section, songs: newSongs };
      })
    );
  };

  const toggleSongExpanded = (songId: string) => {
    setExpandedSongs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(songId)) {
        newSet.delete(songId);
      } else {
        newSet.add(songId);
      }
      return newSet;
    });
  };

  // Handle empty state - show a helpful message instead of auto-initializing
  if (value.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Music2 className="h-4 w-4" />
            <span>Build your setlist with sections and songs</span>
          </div>
        </div>
        
        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
          <Music2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-4">
            No sections yet. Add your first set to get started.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={addSection}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add first section
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Music2 className="h-4 w-4" />
          <span>Build your setlist with sections and songs</span>
        </div>
      </div>

      {/* Sections */}
      {value.map((section, sectionIndex) => (
        <Card key={section.id} className="p-4 space-y-4 border-2">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveSectionUp(sectionIndex)}
                disabled={disabled || sectionIndex === 0}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => moveSectionDown(sectionIndex)}
                disabled={disabled || sectionIndex === value.length - 1}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>

            <Input
              value={section.name}
              onChange={(e) => updateSectionName(section.id, e.target.value)}
              placeholder="Set 1, Encore, etc."
              className="font-semibold text-base uppercase"
              disabled={disabled}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSection(section.id)}
              disabled={disabled || value.length === 1}
              className="text-destructive hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Songs in this section */}
          <div className="space-y-3 pl-4 border-l-2 border-muted">
            {section.songs.length === 0 && (
              <div className="text-sm text-muted-foreground italic py-2">
                No songs yet. Add your first one below.
              </div>
            )}

            {section.songs.map((song, songIndex) => {
              const isExpanded = expandedSongs.has(song.id);
              const songNumber = section.songs.slice(0, songIndex + 1).length;

              return (
                <Card key={song.id} className="p-3 space-y-3 bg-muted/30">
                  {/* Song Main Row */}
                  <div className="flex items-start gap-2">
                    {/* Song Number */}
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary/10 rounded text-sm font-bold text-primary">
                      {songNumber}
                    </div>

                    {/* Song Title (Main Input) */}
                    <div className="flex-1">
                      <Input
                        value={song.title}
                        onChange={(e) => updateSong(section.id, song.id, "title", e.target.value)}
                        placeholder="Song title"
                        className="font-semibold"
                        disabled={disabled}
                      />
                    </div>

                    {/* Move & Delete Controls */}
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSong(section.id, songIndex, "up")}
                        disabled={disabled || songIndex === 0}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => moveSong(section.id, songIndex, "down")}
                        disabled={disabled || songIndex === section.songs.length - 1}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeSong(section.id, song.id)}
                        disabled={disabled}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Song Details - Inline compact fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <Label htmlFor={`artist-${song.id}`} className="text-xs text-muted-foreground">
                        Artist
                      </Label>
                      <Input
                        id={`artist-${song.id}`}
                        value={song.artist || ""}
                        onChange={(e) => updateSong(section.id, song.id, "artist", e.target.value)}
                        placeholder="Artist"
                        className="h-8 text-sm"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`key-${song.id}`} className="text-xs text-muted-foreground">
                        Key
                      </Label>
                      <Input
                        id={`key-${song.id}`}
                        value={song.key || ""}
                        onChange={(e) => updateSong(section.id, song.id, "key", e.target.value)}
                        placeholder="C, Dm, etc."
                        className="h-8 text-sm"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`tempo-${song.id}`} className="text-xs text-muted-foreground">
                        Tempo
                      </Label>
                      <Input
                        id={`tempo-${song.id}`}
                        value={song.tempo || ""}
                        onChange={(e) => updateSong(section.id, song.id, "tempo", e.target.value)}
                        placeholder="120, ballad"
                        className="h-8 text-sm"
                        disabled={disabled}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs w-full"
                        onClick={() => toggleSongExpanded(song.id)}
                        disabled={disabled}
                      >
                        {isExpanded ? "Hide notes" : "Add notes"}
                      </Button>
                    </div>
                  </div>

                  {/* Reference URL field - Compact single row */}
                  <div className="text-sm">
                    <Label htmlFor={`reference-${song.id}`} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Link2 className="h-3 w-3" />
                      Reference track (YouTube, Spotify, etc.)
                    </Label>
                    <Input
                      id={`reference-${song.id}`}
                      value={song.referenceUrl || ""}
                      onChange={(e) => updateSong(section.id, song.id, "referenceUrl", e.target.value)}
                      placeholder="https://youtu.be/... or spotify link"
                      className="h-8 text-sm mt-1"
                      disabled={disabled}
                      type="url"
                    />
                  </div>

                  {/* Expandable Notes Section */}
                  {isExpanded && (
                    <div className="pt-2 border-t">
                      <Label htmlFor={`notes-${song.id}`} className="text-xs text-muted-foreground">
                        Notes for the band
                      </Label>
                      <Textarea
                        id={`notes-${song.id}`}
                        value={song.notes || ""}
                        onChange={(e) => updateSong(section.id, song.id, "notes", e.target.value)}
                        placeholder="Watch-outs, cues, who takes the solo, etc."
                        rows={2}
                        className="text-sm mt-1"
                        disabled={disabled}
                      />
                    </div>
                  )}
                </Card>
              );
            })}

            {/* Add Song Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addSong(section.id)}
              disabled={disabled}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add song
            </Button>
          </div>
        </Card>
      ))}

      {/* Add Section Button */}
      <Button
        type="button"
        variant="outline"
        onClick={addSection}
        disabled={disabled}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add another section
      </Button>
    </div>
  );
}

