import { Badge } from '@/components/ui/badge';
import type { ContactStatus } from '@/lib/types/shared';
import { UserCheck, Mail, User } from 'lucide-react';

interface ContactStatusBadgeProps {
  status: ContactStatus;
}

export function ContactStatusBadge({ status }: ContactStatusBadgeProps) {
  const config = {
    local_only: {
      label: 'Local',
      variant: 'secondary' as const,
      icon: User,
    },
    invited: {
      label: 'Invited',
      variant: 'outline' as const,
      icon: Mail,
    },
    active_user: {
      label: 'Active',
      variant: 'default' as const,
      icon: UserCheck,
    },
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

