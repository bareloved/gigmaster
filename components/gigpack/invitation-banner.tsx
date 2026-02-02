'use client';

import { useState } from 'react';
import { Check, XIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInvitationAction } from '@/lib/hooks/use-invitation-action';
import { cn } from '@/lib/utils';

interface InvitationBannerProps {
  roleId: string;
  gigId: string;
  roleName?: string;
}

export function InvitationBanner({ roleId, gigId, roleName }: InvitationBannerProps) {
  const [respondedStatus, setRespondedStatus] = useState<'accepted' | 'declined' | null>(null);

  const invitationMutation = useInvitationAction({
    gigId,
    onSuccess: (status) => {
      setRespondedStatus(status);
    },
  });

  const isResponding = invitationMutation.isPending;

  if (respondedStatus) {
    return (
      <div className={cn(
        "mx-auto max-w-6xl px-4 py-3",
      )}>
        <div className={cn(
          "rounded-lg border px-4 py-3 text-sm font-medium text-center",
          respondedStatus === 'accepted'
            ? "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-400"
            : "border-red-600/30 bg-red-600/10 text-red-700 dark:text-red-400"
        )}>
          {respondedStatus === 'accepted'
            ? "You confirmed this gig!"
            : "You declined this gig."}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-3">
      <div className="rounded-lg border border-blue-600/30 bg-blue-600/10 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            You&apos;re invited to this gig{roleName ? ` as ${roleName}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs border-green-600/40 text-green-600 hover:bg-green-600/10 hover:text-green-600"
            onClick={() => invitationMutation.mutate({ roleId, status: 'accepted' })}
            disabled={isResponding}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Accept
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs border-red-600/40 text-red-600 hover:bg-red-600/10 hover:text-red-600"
            onClick={() => invitationMutation.mutate({ roleId, status: 'declined' })}
            disabled={isResponding}
          >
            <XIcon className="h-3.5 w-3.5 mr-1.5" />
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
