import { Badge } from '@/components/ui/badge';
import type { GigStatus } from '@/lib/types/shared';

interface GigStatusBadgeProps {
  status: GigStatus | string;
  className?: string;
}

export function GigStatusBadge({ status, className }: GigStatusBadgeProps) {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft':
        return 'Pending';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const getCustomClasses = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50';
      case 'confirmed':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/50';
      case 'completed':
        return 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-200/50 dark:border-slate-700/50';
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-200/50 dark:border-red-800/50';
      default:
        return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  return (
    <Badge
      variant="outline"
      className={`${getCustomClasses(status)} ${className || ''}`}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}

