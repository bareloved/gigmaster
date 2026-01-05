'use client';

import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { GigStatus } from '@/lib/types/shared';
import { updateGigStatus } from '@/lib/api/gig-actions';
import { GigStatusBadge } from '@/components/gigs/shared/status-badge';

interface GigStatusSelectProps {
  gigId: string;
  currentStatus: GigStatus | string;
  onStatusChange?: () => void;
  disabled?: boolean;
}

export function GigStatusSelect({ gigId, currentStatus, onStatusChange, disabled }: GigStatusSelectProps) {
  const [pendingStatus, setPendingStatus] = useState<GigStatus | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get valid transitions from current status
  const getValidTransitions = (status: string): GigStatus[] => {
    switch (status) {
      case 'draft':
        return ['confirmed', 'cancelled'];
      case 'confirmed':
        return ['completed', 'cancelled'];
      case 'completed':
      case 'cancelled':
        return []; // Final states, no transitions
      default:
        return [];
    }
  };

  // Check if a transition needs confirmation
  const needsConfirmation = (newStatus: GigStatus): boolean => {
    return newStatus === 'cancelled' || newStatus === 'completed';
  };

  // Get confirmation dialog details
  const getConfirmationDetails = (status: GigStatus) => {
    switch (status) {
      case 'cancelled':
        return {
          title: 'Cancel Gig',
          description: 'Are you sure you want to cancel this gig? All invited musicians will be notified.',
          confirmText: 'Cancel Gig',
          variant: 'destructive' as const,
        };
      case 'completed':
        return {
          title: 'Mark as Completed',
          description: 'Mark this gig as completed? This will move it to your gig history.',
          confirmText: 'Mark Complete',
          variant: 'default' as const,
        };
      default:
        return {
          title: 'Confirm Status Change',
          description: 'Are you sure you want to change the status?',
          confirmText: 'Confirm',
          variant: 'default' as const,
        };
    }
  };

  const handleStatusSelect = (newStatus: string) => {
    const status = newStatus as GigStatus;
    
    // Don't allow selecting the same status
    if (status === currentStatus) return;

    // Check if this transition needs confirmation
    if (needsConfirmation(status)) {
      setPendingStatus(status);
      setIsConfirmDialogOpen(true);
    } else {
      // Update immediately
      handleStatusUpdate(status);
    }
  };

  const handleStatusUpdate = async (status: GigStatus) => {
    setIsUpdating(true);
    try {
      await updateGigStatus(gigId, status);
      onStatusChange?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update gig status');
    } finally {
      setIsUpdating(false);
      setIsConfirmDialogOpen(false);
      setPendingStatus(null);
    }
  };

  const handleConfirm = () => {
    if (pendingStatus) {
      handleStatusUpdate(pendingStatus);
    }
  };

  const handleCancel = () => {
    setIsConfirmDialogOpen(false);
    setPendingStatus(null);
  };

  const validTransitions = getValidTransitions(currentStatus);
  const isReadOnly = validTransitions.length === 0 || disabled;

  // If read-only (no valid transitions or disabled), show badge only
  if (isReadOnly) {
    return <GigStatusBadge status={currentStatus} />;
  }

  const confirmDetails = pendingStatus ? getConfirmationDetails(pendingStatus) : null;

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={handleStatusSelect}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-auto h-auto px-2 py-1 text-xs border-none bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0">
          <SelectValue>
            <GigStatusBadge status={currentStatus} />
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {/* Current status */}
          <SelectItem value={currentStatus} className="text-xs">
            <div className="flex items-center gap-2">
              <GigStatusBadge status={currentStatus} />
              <span className="text-muted-foreground">(current)</span>
            </div>
          </SelectItem>
          
          {/* Valid transitions */}
          {validTransitions.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              {validTransitions.map((status) => (
                <SelectItem key={status} value={status} className="text-xs">
                  <GigStatusBadge status={status} />
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {/* Confirmation Dialog */}
      {confirmDetails && (
        <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{confirmDetails.title}</DialogTitle>
              <DialogDescription>{confirmDetails.description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={isUpdating}>
                Cancel
              </Button>
              <Button
                variant={confirmDetails.variant}
                onClick={handleConfirm}
                disabled={isUpdating}
              >
                {isUpdating ? 'Updating...' : confirmDetails.confirmText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

