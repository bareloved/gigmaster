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
 * Provides optimistic updates and consistent cache invalidation
 */

/**
 * Invalidate all dashboard-related queries
 * Centralized cache invalidation for consistency
 */
function invalidateDashboardQueries(queryClient: ReturnType<typeof useQueryClient>, userId?: string) {
  // Invalidate dashboard queries
  queryClient.invalidateQueries({
    queryKey: ["dashboard-gigs", userId],
    refetchType: 'active'
  });

  // Invalidate all gigs page queries
  queryClient.invalidateQueries({
    queryKey: ["all-gigs", userId],
    refetchType: 'active'
  });

  // Invalidate recent past gigs
  queryClient.invalidateQueries({
    queryKey: ["recent-past-gigs", userId],
    refetchType: 'active'
  });

  // Invalidate all past gigs (history page)
  queryClient.invalidateQueries({
    queryKey: ["all-past-gigs", userId],
    refetchType: 'active'
  });

  // Invalidate individual gig queries
  queryClient.invalidateQueries({
    queryKey: ["gig"],
    refetchType: 'active'
  });

  // Invalidate money queries
  queryClient.invalidateQueries({
    queryKey: ["my-earnings", userId],
    refetchType: 'active'
  });
}

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
      invalidateDashboardQueries(queryClient, user?.id);
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
      invalidateDashboardQueries(queryClient, user?.id);
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
      invalidateDashboardQueries(queryClient, user?.id);
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
      invalidateDashboardQueries(queryClient, user?.id);
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
      
      return { previousGigs };
    },
    onSuccess: () => {
      invalidateDashboardQueries(queryClient, user?.id);
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
 * Includes cache invalidation for immediate UI updates
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
      // Invalidate all gig-related queries to ensure fresh data
      invalidateDashboardQueries(queryClient, user?.id);
      toast.success(variables.isEditing ? "Gig updated successfully" : "Gig created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save gig: ${error.message}`);
    },
  });
}

