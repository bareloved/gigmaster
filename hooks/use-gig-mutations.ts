import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUser } from "@/lib/providers/user-provider";
import {
  acceptInvitation,
  declineInvitation,
  updateGigStatus,
} from "@/lib/api/gig-actions";
import { deleteGig, restoreGig, permanentDeleteGig } from "@/lib/api/gigs";
import { saveGigPack } from "@/app/(app)/gigs/actions";
import type { GigPack } from "@/lib/gigpack/types";
import type { DashboardGig } from "@/lib/types/shared";

// ============================================
// CENTRALIZED INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all gig list queries across every view.
 *
 * Uses `predicate` with `queryKey[0]` matching so it works regardless of how
 * many extra segments the key has (e.g. ["dashboard-gigs", userId, date1, date2]).
 */
function invalidateAllGigListQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string
) {
  const listKeys = ["dashboard-gigs", "all-gigs", "calendar-gigs", "trashed-gigs"];
  for (const key of listKeys) {
    queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey[0] === key &&
        (userId == null || query.queryKey[1] === userId),
    });
  }
  queryClient.invalidateQueries({
    queryKey: ["dashboard-kpis", userId],
  });
}

/**
 * Invalidate detail-level queries for a specific gig.
 */
function invalidateGigDetailQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  gigId: string
) {
  queryClient.invalidateQueries({ queryKey: ["gig", gigId] });
  queryClient.invalidateQueries({ queryKey: ["gig-pack-full", gigId] });
  queryClient.invalidateQueries({ queryKey: ["gig-editor", gigId] });
}

// ============================================
// REUSABLE HOOK FOR RAW API CALLERS
// ============================================

/**
 * Hook that exposes the centralized invalidation helpers.
 * Use this in components that call Supabase directly (e.g. calendar quick-create)
 * so they can invalidate the same set of queries the mutation hooks do.
 */
export function useInvalidateGigQueries() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return {
    invalidateAll: () => invalidateAllGigListQueries(queryClient, user?.id),
    invalidateDetail: (gigId: string) =>
      invalidateGigDetailQueries(queryClient, gigId),
  };
}

// ============================================
// MUTATION HOOKS
// ============================================

/** Accept a gig invitation */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: acceptInvitation,
    onSuccess: () => {
      invalidateAllGigListQueries(queryClient, user?.id);
      toast.success("Invitation accepted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to accept invitation: ${error.message}`);
    },
  });
}

/** Decline a gig invitation */
export function useDeclineInvitation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: declineInvitation,
    onSuccess: () => {
      invalidateAllGigListQueries(queryClient, user?.id);
      toast.success("Invitation declined");
    },
    onError: (error: Error) => {
      toast.error(`Failed to decline invitation: ${error.message}`);
    },
  });
}

/** Update a gig's status (confirmed / tentative / cancelled) */
export function useUpdateGigStatus() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: ({
      gigId,
      status,
    }: {
      gigId: string;
      status: "confirmed" | "tentative" | "cancelled";
    }) => updateGigStatus(gigId, status),
    onSuccess: (_, { gigId }) => {
      invalidateAllGigListQueries(queryClient, user?.id);
      invalidateGigDetailQueries(queryClient, gigId);
      toast.success("Gig status updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}

/**
 * Create or update a gig pack.
 *
 * NOTE: We use refetchQueries for list queries instead of invalidateQueries.
 * invalidateQueries marks cache as stale but only refetches "active" queries.
 * When editing from a Sheet overlay the background list query becomes inactive,
 * so invalidate alone won't refresh it. refetchQueries forces the refresh.
 */
export function useSaveGigPack() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: ({
      data,
      isEditing,
      gigId,
    }: {
      data: Partial<GigPack>;
      isEditing: boolean;
      gigId?: string;
    }) => saveGigPack(data, isEditing, gigId),

    onSuccess: (result, variables) => {
      const gigId = result?.id || variables.gigId;

      // Force-refetch list queries (may be inactive behind Sheet overlay)
      const listKeys = ["dashboard-gigs", "all-gigs", "calendar-gigs"];
      for (const key of listKeys) {
        queryClient.refetchQueries({
          predicate: (query) =>
            query.queryKey[0] === key &&
            (user?.id == null || query.queryKey[1] === user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["dashboard-kpis", user?.id],
      });

      if (gigId) {
        invalidateGigDetailQueries(queryClient, gigId);
      }

      toast.success(
        variables.isEditing
          ? "Gig updated successfully"
          : "Gig created successfully"
      );
    },

    onError: (error: Error) => {
      toast.error(`Failed to save gig: ${error.message}`);
    },
  });
}

/** Delete a gig with optimistic UI removal (cancels Google Calendar events first) */
export function useDeleteGig() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: async (gigId: string) => {
      // Cancel Google Calendar events BEFORE deleting the gig
      // (we need gig_roles to still exist to find the event IDs)
      try {
        await fetch("/api/calendar/cancel-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gigId }),
        });
      } catch {
        // Non-fatal — continue with deletion even if calendar cancel fails
        console.warn("Failed to cancel calendar events for gig:", gigId);
      }

      return deleteGig(gigId);
    },

    onMutate: async (gigId: string) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return ["dashboard-gigs", "all-gigs", "calendar-gigs"].includes(key);
        },
      });

      // Snapshot all affected caches for rollback
      const previousData = new Map<string, unknown>();
      const filterGig = (gigs: DashboardGig[]) =>
        gigs.filter((g) => g.gigId !== gigId);

      // dashboard-gigs: shape is { gigs: DashboardGig[]; hasMore: boolean; total: number }
      queryClient
        .getQueriesData<{ gigs: DashboardGig[]; hasMore: boolean; total: number }>({
          predicate: (query) => query.queryKey[0] === "dashboard-gigs",
        })
        .forEach(([queryKey, data]) => {
          if (data?.gigs) {
            previousData.set(JSON.stringify(queryKey), data);
            const filtered = filterGig(data.gigs);
            queryClient.setQueryData(queryKey, {
              ...data,
              gigs: filtered,
              total: data.total - (data.gigs.length - filtered.length),
            });
          }
        });

      // calendar-gigs: shape is DashboardGig[] (unwrapped in the hook)
      queryClient
        .getQueriesData<DashboardGig[]>({
          predicate: (query) => query.queryKey[0] === "calendar-gigs",
        })
        .forEach(([queryKey, data]) => {
          if (Array.isArray(data)) {
            previousData.set(JSON.stringify(queryKey), data);
            queryClient.setQueryData(queryKey, filterGig(data));
          }
        });

      // all-gigs: infinite query — each page is { gigs: DashboardGig[]; nextPage?: number }
      queryClient
        .getQueriesData<{
          pages: { gigs: DashboardGig[]; nextPage?: number }[];
          pageParams: unknown[];
        }>({
          predicate: (query) => query.queryKey[0] === "all-gigs",
        })
        .forEach(([queryKey, data]) => {
          if (data?.pages) {
            previousData.set(JSON.stringify(queryKey), data);
            queryClient.setQueryData(queryKey, {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                gigs: filterGig(page.gigs),
              })),
            });
          }
        });

      return { previousData };
    },

    onError: (error: Error, _gigId, context) => {
      // Roll back all caches to their pre-delete state
      if (context?.previousData) {
        context.previousData.forEach((data, keyStr) => {
          queryClient.setQueryData(JSON.parse(keyStr), data);
        });
      }
      toast.error(`Failed to delete gig: ${error.message}`);
    },

    onSuccess: () => {
      toast.success("Gig moved to trash");
    },

    onSettled: () => {
      // Always re-sync with server to ensure consistency
      invalidateAllGigListQueries(queryClient, user?.id);
    },
  });
}

/** Restore a gig from trash */
export function useRestoreGig() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (gigId: string) => restoreGig(gigId),
    onSuccess: () => {
      invalidateAllGigListQueries(queryClient, user?.id);
      toast.success("Gig restored");
    },
    onError: (error: Error) => {
      toast.error(`Failed to restore gig: ${error.message}`);
    },
  });
}

/** Permanently delete a gig (cannot be undone) */
export function usePermanentDeleteGig() {
  const queryClient = useQueryClient();
  const { user } = useUser();

  return useMutation({
    mutationFn: (gigId: string) => permanentDeleteGig(gigId),
    onSuccess: () => {
      invalidateAllGigListQueries(queryClient, user?.id);
      toast.success("Gig permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to permanently delete gig: ${error.message}`);
    },
  });
}
