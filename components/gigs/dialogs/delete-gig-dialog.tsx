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

interface DeleteGigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigTitle: string;
  onConfirm: () => void | Promise<void>;
}

export function DeleteGigDialog({
  open,
  onOpenChange,
  gigTitle,
  onConfirm,
}: DeleteGigDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            &quot;{gigTitle}&quot; will be moved to trash and can be restored
            within 30 days. After that, it will be permanently deleted.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
          >
            Move to Trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
