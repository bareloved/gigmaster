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
import { deleteGig } from "@/lib/api/gigs";
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
 * For gig save mutations (create/update)
 * SURGICAL: Only invalidates gig lists and specific gig detail
 *
 * NOT invalidated (optimistic update handles these, or not affected):
 * - my-earnings: gig creation doesn't change payment status
 * - player-money-summary: not affected by gig save
 * - recent-past-gigs/all-past-gigs: new gigs are future, edits rarely move to past
 */
function invalidateGigSaveQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
  gigId?: string,
  isEditing?: boolean
) {
  // Refresh gig lists - optimistic update showed preview, now get real data
  queryClient.invalidateQueries({
    queryKey: ["dashboard-gigs", userId],
    refetchType: 'active'
  });

  queryClient.invalidateQueries({
    queryKey: ["all-gigs", userId],
    refetchType: 'active'
  });

  // For edits: refresh the specific gig detail view and pack view
  if (isEditing && gigId) {
    queryClient.invalidateQueries({
      queryKey: ["gig", gigId],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({
      queryKey: ["gig-pack-full", gigId],
      refetchType: 'active'
    });
  }

  // For new gigs: refresh KPIs (gig count may have changed)
  if (!isEditing) {
    queryClient.invalidateQueries({
      queryKey: ["dashboard-kpis", userId],
      refetchType: 'active'
    });
  }
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
 * Includes optimistic updates for instant UI feedback
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

    onMutate: async ({ data, isEditing, gigId }) => {
      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["all-gigs", user?.id] });

      // Snapshot previous values for rollback
      const previousDashboardGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );
      const previousAllGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["all-gigs", user?.id]
      );

      // Create optimistic DashboardGig entry
      const optimisticGig: DashboardGig = {
        gigId: gigId || `temp-${Date.now()}`, // Temp ID for new gigs
        gigTitle: data.title || "New Gig",
        date: data.date || new Date().toISOString().split("T")[0],
        startTime: data.on_stage_time || data.call_time || null,
        endTime: null,
        locationName: data.venue_name || null,
        status: data.status || "draft",
        isManager: true,
        isPlayer: false,
        hostId: user?.id || null,
        hostName: user?.user_metadata?.full_name || user?.email || null,
        heroImageUrl: data.hero_image_url || null,
        gigType: data.gig_type || null,
        roleStats: null,
      };

      if (isEditing && gigId) {
        // For edits: update existing gig in cache
        const updateGigInPages = (pages: Array<{ gigs: DashboardGig[] }> | undefined) => {
          if (!pages) return pages;
          return pages.map(page => ({
            ...page,
            gigs: page.gigs.map(gig =>
              gig.gigId === gigId
                ? { ...gig, ...optimisticGig, gigId } // Keep real ID
                : gig
            ),
          }));
        };

        if (previousDashboardGigs) {
          queryClient.setQueryData(
            ["dashboard-gigs", user?.id],
            { ...previousDashboardGigs, pages: updateGigInPages(previousDashboardGigs.pages) }
          );
        }
        if (previousAllGigs) {
          queryClient.setQueryData(
            ["all-gigs", user?.id],
            { ...previousAllGigs, pages: updateGigInPages(previousAllGigs.pages) }
          );
        }
      } else {
        // For new gigs: add to the beginning of the list
        if (previousAllGigs?.pages?.[0]) {
          queryClient.setQueryData(
            ["all-gigs", user?.id],
            {
              ...previousAllGigs,
              pages: [
                {
                  ...previousAllGigs.pages[0],
                  gigs: [optimisticGig, ...previousAllGigs.pages[0].gigs],
                },
                ...previousAllGigs.pages.slice(1),
              ],
            }
          );
        }

        // Also add to dashboard if date is within dashboard range
        if (previousDashboardGigs?.pages?.[0]) {
          queryClient.setQueryData(
            ["dashboard-gigs", user?.id],
            {
              ...previousDashboardGigs,
              pages: [
                {
                  ...previousDashboardGigs.pages[0],
                  gigs: [optimisticGig, ...previousDashboardGigs.pages[0].gigs],
                },
                ...previousDashboardGigs.pages.slice(1),
              ],
            }
          );
        }
      }

      return { previousDashboardGigs, previousAllGigs };
    },

    onSuccess: (result, variables) => {
      // SURGICAL invalidation - only refresh what's needed
      invalidateGigSaveQueries(
        queryClient,
        user?.id,
        result?.id || variables.gigId,
        variables.isEditing
      );
      toast.success(variables.isEditing ? "Gig updated successfully" : "Gig created successfully");
    },

    onError: (error: Error, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousDashboardGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousDashboardGigs
        );
      }
      if (context?.previousAllGigs) {
        queryClient.setQueryData(
          ["all-gigs", user?.id],
          context.previousAllGigs
        );
      }
      toast.error(`Failed to save gig: ${error.message}`);
    },
  });
}

/**
 * For gig deletion
 * Invalidates all gig lists and KPIs
 */
function invalidateDeleteQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  // Refresh all gig lists
  queryClient.invalidateQueries({
    queryKey: ["dashboard-gigs", userId],
    refetchType: 'active'
  });
  queryClient.invalidateQueries({
    queryKey: ["all-gigs", userId],
    refetchType: 'active'
  });
  // Refresh KPIs (gig count changed)
  queryClient.invalidateQueries({
    queryKey: ["dashboard-kpis", userId],
    refetchType: 'active'
  });
  // Refresh earnings if user was also a player
  queryClient.invalidateQueries({
    queryKey: ["my-earnings", userId],
    refetchType: 'active'
  });
  queryClient.invalidateQueries({
    queryKey: ["player-money-summary", userId],
    refetchType: 'active'
  });
}

/**
 * Hook for deleting a gig
 * Includes optimistic update for instant UI feedback
 */
export function useDeleteGig() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: deleteGig,
    onMutate: async (gigId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["dashboard-gigs", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["all-gigs", user?.id] });

      // Snapshot previous values
      const previousDashboardGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["dashboard-gigs", user?.id]
      );
      const previousAllGigs = queryClient.getQueryData<{ pages: Array<{ gigs: DashboardGig[] }> }>(
        ["all-gigs", user?.id]
      );

      // Optimistically remove the gig from lists
      const removeGigFromPages = (pages: Array<{ gigs: DashboardGig[] }> | undefined) => {
        if (!pages) return pages;
        return pages.map(page => ({
          ...page,
          gigs: page.gigs.filter(gig => gig.gigId !== gigId),
        }));
      };

      if (previousDashboardGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          { ...previousDashboardGigs, pages: removeGigFromPages(previousDashboardGigs.pages) }
        );
      }
      if (previousAllGigs) {
        queryClient.setQueryData(
          ["all-gigs", user?.id],
          { ...previousAllGigs, pages: removeGigFromPages(previousAllGigs.pages) }
        );
      }

      return { previousDashboardGigs, previousAllGigs };
    },
    onSuccess: () => {
      invalidateDeleteQueries(queryClient, user?.id);
      toast.success("Gig deleted successfully");
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousDashboardGigs) {
        queryClient.setQueryData(
          ["dashboard-gigs", user?.id],
          context.previousDashboardGigs
        );
      }
      if (context?.previousAllGigs) {
        queryClient.setQueryData(
          ["all-gigs", user?.id],
          context.previousAllGigs
        );
      }
      toast.error(`Failed to delete gig: ${error.message}`);
    },
  });
}
