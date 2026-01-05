import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import {
  markAsPaid,
  markAsUnpaid,
  acceptInvitation,
  declineInvitation,
  updateGigStatus,
} from "@/lib/api/gig-actions";
import { saveGigPack } from "@/app/(app)/gigs/actions";
import type { DashboardGig } from "@/lib/types/shared";
import type { GigPack } from "@/lib/gigpack/types";

/**
 * Shared mutation hooks for gig actions
 * Provides optimistic updates and SURGICAL cache invalidation
 *
 * PERFORMANCE: Each mutation only invalidates the queries it actually affects.
 * Optimistic updates handle immediate UI feedback, so we only need to refresh
 * the data that the server might have changed.
 */

// ============================================
// SURGICAL INVALIDATION FUNCTIONS
// ============================================

/**
 * For payment mutations (markAsPaid/markAsUnpaid)
 * Only refreshes earnings data - optimistic update handles dashboard UI
 */
function invalidatePaymentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  // Only earnings data needs server refresh
  queryClient.invalidateQueries({
    queryKey: ["my-earnings", userId],
    refetchType: 'active'
  });

  // Also refresh player money summary for Money page
  queryClient.invalidateQueries({
    queryKey: ["player-money-summary", userId],
    refetchType: 'active'
  });
}

/**
 * For invitation mutations (acceptInvitation/declineInvitation)
 * Only refreshes KPIs (pending invitation count) - optimistic update handles gig list UI
 */
function invalidateInvitationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  // Refresh KPIs to update pending invitation count
  queryClient.invalidateQueries({
    queryKey: ["dashboard-kpis", userId],
    refetchType: 'active'
  });
}

/**
 * For gig status mutations (updateGigStatus)
 * Minimal invalidation - optimistic update handles everything
 */
function invalidateGigStatusQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  gigId: string
) {
  // Only refresh the specific gig detail if it's being viewed
  queryClient.invalidateQueries({
    queryKey: ["gig", gigId],
    refetchType: 'active'
  });
}

/**
 * Full invalidation - ONLY for saveGigPack which changes many things
 * This is the only mutation that legitimately needs to refresh everything
 */
function invalidateAllGigQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  queryClient.invalidateQueries({
    queryKey: ["dashboard-gigs", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["all-gigs", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["recent-past-gigs", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["all-past-gigs", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["gig"],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["my-earnings", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["dashboard-kpis", userId],
    refetchType: 'active'
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Hook for marking a gig role as paid
 * Includes optimistic update for instant UI feedback
 */
export function useMarkAsPaid() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: markAsPaid,
    onMutate: async (gigRoleId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });

      // Snapshot previous value
      const previousGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );

      // Optimistically update to paid
      if (previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          {
            ...previousGigs,
            pages: previousGigs.pages.map(page => ({
              ...page,
              gigs: page.gigs.map(gig =>
                gig.playerGigRoleId === gigRoleId
                  ? { ...gig, paymentStatus: "paid" as const }
                  : gig
              ),
            })),
          }
        );
      }

      return { previousGigs };
    },
    onSuccess: () => {
      // SURGICAL: Only refresh earnings data
      invalidatePaymentQueries(queryClient, user?.id);
      toast.success("Marked as paid");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousGigs
        );
      }
      toast.error(`Failed to mark as paid: ${error.message}`);
    },
  });
}

/**
 * Hook for marking a gig role as unpaid
 * Includes optimistic update for instant UI feedback
 */
export function useMarkAsUnpaid() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: markAsUnpaid,
    onMutate: async (gigRoleId) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });

      const previousGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );

      if (previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          {
            ...previousGigs,
            pages: previousGigs.pages.map(page => ({
              ...page,
              gigs: page.gigs.map(gig =>
                gig.playerGigRoleId === gigRoleId
                  ? { ...gig, paymentStatus: "unpaid" as const }
                  : gig
              ),
            })),
          }
        );
      }

      return { previousGigs };
    },
    onSuccess: () => {
      // SURGICAL: Only refresh earnings data
      invalidatePaymentQueries(queryClient, user?.id);
      toast.success("Marked as unpaid");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousGigs
        );
      }
      toast.error(`Failed to mark as unpaid: ${error.message}`);
    },
  });
}

/**
 * Hook for accepting a gig invitation
 * Includes optimistic update for instant UI feedback
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: acceptInvitation,
    onMutate: async (gigRoleId) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });

      const previousGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );

      if (previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          {
            ...previousGigs,
            pages: previousGigs.pages.map(page => ({
              ...page,
              gigs: page.gigs.map(gig =>
                gig.playerGigRoleId === gigRoleId
                  ? { ...gig, invitationStatus: "accepted" as const }
                  : gig
              ),
            })),
          }
        );
      }

      return { previousGigs };
    },
    onSuccess: () => {
      // SURGICAL: Only refresh KPIs (pending invitation count)
      invalidateInvitationQueries(queryClient, user?.id);
      toast.success("Invitation accepted");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousGigs
        );
      }
      toast.error(`Failed to accept invitation: ${error.message}`);
    },
  });
}

/**
 * Hook for declining a gig invitation
 * Includes optimistic update for instant UI feedback
 */
export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: declineInvitation,
    onMutate: async (gigRoleId) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });

      const previousGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );

      if (previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          {
            ...previousGigs,
            pages: previousGigs.pages.map(page => ({
              ...page,
              gigs: page.gigs.map(gig =>
                gig.playerGigRoleId === gigRoleId
                  ? { ...gig, invitationStatus: "declined" as const }
                  : gig
              ),
            })),
          }
        );
      }

      return { previousGigs };
    },
    onSuccess: () => {
      // SURGICAL: Only refresh KPIs (pending invitation count)
      invalidateInvitationQueries(queryClient, user?.id);
      toast.success("Invitation declined");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousGigs
        );
      }
      toast.error(`Failed to decline invitation: ${error.message}`);
    },
  });
}

/**
 * Hook for updating gig status
 * Includes optimistic update for instant UI feedback
 */
export function useUpdateGigStatus() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: ({ gigId, status }: { gigId: string; status: "draft" | "confirmed" | "cancelled" | "completed" }) =>
      updateGigStatus(gigId, status),
    onMutate: async ({ gigId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });

      const previousGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );

      if (previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          {
            ...previousGigs,
            pages: previousGigs.pages.map(page => ({
              ...page,
              gigs: page.gigs.map(gig =>
                gig.gigId === gigId
                  ? { ...gig, status }
                  : gig
              ),
            })),
          }
        );
      }

      return { previousGigs, gigId };
    },
    onSuccess: (_, { gigId }) => {
      // SURGICAL: Only refresh the specific gig detail view
      invalidateGigStatusQueries(queryClient, gigId);
      toast.success("Gig status updated");
    },
    onError: (error: Error, variables, context) => {
      if (context?.previousGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousGigs
        );
      }
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Hook for creating or updating a gig pack
 * This is the ONLY mutation that needs full cache invalidation
 * because it can change title, date, location, roles, setlist, etc.
 */
export function useSaveGigPack() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: ({
      data,
      isEditing,
      gigId
    }: {
      data: Partial<GigPack>;
      isEditing: boolean;
      gigId?: string;
    }) => saveGigPack(data, isEditing, gigId),
    onSuccess: (result, variables) => {
      // FULL invalidation - this mutation can change many things
      invalidateAllGigQueries(queryClient, user?.id);
      toast.success(variables.isEditing ? "Gig updated successfully" : "Gig created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save gig: ${error.message}`);
    },
  });
}
