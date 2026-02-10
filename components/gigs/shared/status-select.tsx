'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { GigStatus } from '@/lib/types/shared';
import { useUpdateGigStatus } from '@/hooks/use-gig-mutations';
import { GigStatusBadge } from '@/components/gigs/shared/status-badge';

const ALL_STATUSES: GigStatus[] = ['confirmed', 'tentative', 'cancelled'];

interface GigStatusSelectProps {
  gigId: string;
  currentStatus: GigStatus | string;
  onStatusChange?: () => void;
  disabled?: boolean;
}

export function GigStatusSelect({ gigId, currentStatus, onStatusChange, disabled }: GigStatusSelectProps) {
  const mutation = useUpdateGigStatus();

  const handleStatusSelect = (newStatus: string) => {
    const status = newStatus as GigStatus;
    if (status === currentStatus) return;

    mutation.mutate(
      { gigId, status },
      { onSuccess: () => onStatusChange?.() }
    );
  };

  if (disabled) {
    return <GigStatusBadge status={currentStatus} />;
  }

  const otherStatuses = ALL_STATUSES.filter((s) => s !== currentStatus);

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusSelect}
      disabled={mutation.isPending}
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

        {/* Other statuses */}
        <div className="h-px bg-border my-1" />
        {otherStatuses.map((status) => (
          <SelectItem key={status} value={status} className="text-xs">
            <GigStatusBadge status={status} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
