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
import { Copy, Loader2 } from "lucide-react";

interface DuplicateGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceGig: {
    gigId: string;
    gigTitle: string;
    date: string;
  };
  onConfirm: (newTitle: string, newDate: string) => void | Promise<void>;
  isPending?: boolean;
}

export function DuplicateGigDialog({
  open,
  onOpenChange,
  sourceGig,
  onConfirm,
  isPending = false,
}: DuplicateGigDialogProps) {
  // Initialize with default values, reset on open via key prop
  const defaultTitle = `Copy of ${sourceGig.gigTitle}`;
  const defaultDate = sourceGig.date;

  const [title, setTitle] = useState(defaultTitle);
  const [date, setDate] = useState(defaultDate);

  // Reset form when dialog opens by using onOpenChange callback
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to defaults when opening
      setTitle(`Copy of ${sourceGig.gigTitle}`);
      setDate(sourceGig.date);
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(title, date);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Gig
            </DialogTitle>
            <DialogDescription>
              Create a copy of this gig including its lineup, setlist, files, and schedule.
              Invitation and payment statuses will be reset to pending.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-title">Title</Label>
              <Input
                id="duplicate-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter gig title"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duplicate-date">Date</Label>
              <Input
                id="duplicate-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title || !date}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Duplicating...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
