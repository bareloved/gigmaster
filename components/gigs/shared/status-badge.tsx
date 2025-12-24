import { Badge } from '@/components/ui/badge';
import type { GigStatus } from '@/lib/types/shared';

interface GigStatusBadgeProps {
  status: GigStatus | string;
  className?: string;
}

export function GigStatusBadge({ status, className }: GigStatusBadgeProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft':
        return 'secondary'; // Gray
      case 'confirmed':
        return 'default'; // Green (we'll use custom class)
      case 'completed':
        return 'secondary'; // Slate/muted
      case 'cancelled':
        return 'destructive'; // Red
      default:
        return 'secondary';
    }
  };

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
      case 'confirmed':
        return 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-300';
      case 'completed':
        return 'bg-slate-100 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
      default:
        return '';
    }
  };

  const variant = getStatusVariant(status);
  const customClasses = getCustomClasses(status);

  return (
    <Badge 
      variant={variant} 
      className={`${customClasses} ${className || ''}`}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}

