"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useKeyboardSubmit } from "@/hooks/use-keyboard-submit";
import { KeyboardShortcutHint } from "@/components/shared/keyboard-shortcut-hint";
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
import { createGig } from "@/lib/api/gigs";
import { useUser } from "@/lib/providers/user-provider";

interface CreateGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (gigId: string) => void;
}

export function CreateGigDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateGigDialogProps) {
  const { user } = useUser();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Enable Cmd+Enter / Ctrl+Enter to submit
  useKeyboardSubmit(open);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date) {
      setError("Title and date are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const gig = await createGig({
        title: title.trim(),
        date,
        start_time: startTime || null,
        end_time: null,
        location_name: locationName.trim() || null,
        location_address: null,
        internal_notes: notes.trim() || null,
        status: "draft",
      });

      setTitle("");
      setDate("");
      setStartTime("");
      setLocationName("");
      setNotes("");
      onSuccess(gig.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create gig");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Gig</DialogTitle>
            <DialogDescription>
              Add a new gig.
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
                          setDatePickerOpen(false); // Close popover after selecting
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
                  {loading ? "Creating..." : "Create Gig"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
