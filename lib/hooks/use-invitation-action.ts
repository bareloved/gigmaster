'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { updateMyInvitationStatus } from '@/lib/api/gig-roles';
import { toast } from 'sonner';

interface UseInvitationActionOptions {
  /** Gig ID for targeted cache invalidation of gig-specific queries */
  gigId?: string;
  /** Callback after successful status update */
  onSuccess?: (status: 'accepted' | 'declined') => void;
}

export function useInvitationAction(options: UseInvitationActionOptions = {}) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ roleId, status }: { roleId: string; status: 'accepted' | 'declined' }) =>
      updateMyInvitationStatus(roleId, status),
    onSuccess: (_data, { status }) => {
      const label = status === 'accepted' ? 'Gig confirmed!' : 'Gig declined.';
      toast.success(label);

      // Invalidate invitation-related caches
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['declined-invitations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-gigs', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });

      // Gig-specific caches when gigId is available
      const gigId = options.gigId;
      if (gigId) {
        queryClient.invalidateQueries({ queryKey: ['gig-pack-full', gigId] });
        queryClient.invalidateQueries({ queryKey: ['gig-pack', gigId] });
        queryClient.invalidateQueries({ queryKey: ['gig', gigId] });
        queryClient.invalidateQueries({ queryKey: ['gig-roles', gigId] });
      }

      options.onSuccess?.(status);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update invitation status');
    },
  });

  return mutation;
}
