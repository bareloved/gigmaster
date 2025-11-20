"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/keyboard-shortcut-hint";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TimePickerInput } from "@/components/ui/time-picker-input";
import { cn } from "@/lib/utils";
import { updateGig } from "@/lib/api/gigs";
import type { Gig } from "@/lib/types/shared";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  gig: Gig;
}

export function EditGigDialog({
  open,
  onOpenChange,
  onSuccess,
  gig,
}: EditGigDialogProps) {
  const { user } = useUser();
  const [title, setTitle] = useState(gig.title);
  const [date, setDate] = useState(gig.date);
  const [startTime, setStartTime] = useState(gig.start_time || "");
  const [locationName, setLocationName] = useState(gig.location_name || "");
  const [notes, setNotes] = useState(gig.notes || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(gig.project_id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  // Fetch user's projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("owner_id", user!.id)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  // Update form when gig changes
  useEffect(() => {
    setTitle(gig.title);
    setDate(gig.date);
    setStartTime(gig.start_time || "");
    setLocationName(gig.location_name || "");
    setNotes(gig.notes || "");
    setSelectedProjectId(gig.project_id);
  }, [gig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date) {
      setError("Title and date are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await updateGig(gig.id, {
        title: title.trim(),
        date,
        start_time: startTime || null,
        end_time: null,
        location_name: locationName.trim() || null,
        location_address: null,
        schedule: null,
        notes: notes.trim() || null,
        project_id: selectedProjectId || null,
      });

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update gig");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 pr-8">
              <DialogTitle>Edit Gig</DialogTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="project" className="text-sm text-muted-foreground font-normal">
                  Project
                </Label>
                <Select
                  value={selectedProjectId || "none"}
                  onValueChange={(value) => setSelectedProjectId(value === "none" ? null : value)}
                  disabled={loading}
                >
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="My Gigs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      My Gigs
                    </SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id} className="text-xs">
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogDescription>
              Update gig details.
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
                Gig Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Dana's Wedding, Ibiza Rooftop Set"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-destructive">*</span>
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                      disabled={loading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(new Date(date), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date ? new Date(date) : undefined}
                      onSelect={(selectedDate) => {
                        if (selectedDate) {
                          setDate(format(selectedDate, "yyyy-MM-dd"));
                          setDatePickerOpen(false);
                        }
                      }}
                      disabled={loading}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Start Time</Label>
                <TimePickerInput
                  value={startTime}
                  onChange={setStartTime}
                  disabled={loading}
                  placeholder="Pick start time"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationName">Venue Name and Address</Label>
              <Input
                id="locationName"
                placeholder="Search for venue (Google Places API integration coming soon)"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes, instructions, or information about this gig..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                rows={4}
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
                  onClick={() => onOpenChange(false)}
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
