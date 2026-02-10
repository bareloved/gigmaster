"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigTitle: string;
  onConfirm: () => void | Promise<void>;
}

export function PermanentDeleteDialog({
  open,
  onOpenChange,
  gigTitle,
  onConfirm,
}: PermanentDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Forever</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete &quot;{gigTitle}&quot;?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete Forever
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
