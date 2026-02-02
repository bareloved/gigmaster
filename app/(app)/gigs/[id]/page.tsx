'use client';

import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getGig } from '@/app/(app)/gigs/actions';
import { deleteGig } from '@/lib/api/gigs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useUser } from '@/lib/providers/user-provider';

// Lazy load editor panel with full page loading state
const GigEditorPanel = dynamic(
  () => import('@/components/gigpack/editor/gig-editor-panel').then((mod) => ({ default: mod.GigEditorPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-full w-full" />
      </div>
    )
  }
);

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gigId = params.id as string;
  const { user } = useUser();
  const queryClient = useQueryClient();

  // Fetch gig details
  const {
    data: gig,
    isLoading,
    error: gigError,
  } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => getGig(gigId),
  });

  // Check ownership via gig.owner_id
  const isOwner = gig?.owner_id === user?.id;

  // Redirect non-owners and external gig owners to the read-only gig pack view
  // External gigs are managed in Google Calendar, not editable here
  const isExternal = gig?.is_external ?? false;
  useEffect(() => {
    if (gig && (!isOwner || isExternal)) {
      router.replace(`/gigs/${gigId}/pack`);
    }
  }, [gig, isOwner, isExternal, gigId, router]);

  const handleDeleteGig = async () => {
    if (!gigId) return;

    // Cancel all queries for this gig to prevent refetches after deletion
    queryClient.cancelQueries({ queryKey: ['gig', gigId] });
    queryClient.cancelQueries({ queryKey: ['gig-roles', gigId] });
    queryClient.cancelQueries({ queryKey: ['setlist', gigId] });
    queryClient.cancelQueries({ queryKey: ['gig-files', gigId] });

    await deleteGig(gigId);

    // Remove the deleted gig from cache immediately
    queryClient.removeQueries({ queryKey: ['gig', gigId] });
    queryClient.removeQueries({ queryKey: ['gig-roles', gigId] });
    queryClient.removeQueries({ queryKey: ['setlist', gigId] });
    queryClient.removeQueries({ queryKey: ['gig-files', gigId] });

    // Invalidate related caches (but don't refetch - we're navigating away)
    queryClient.invalidateQueries({
      queryKey: ['dashboard-gigs', user?.id],
      refetchType: 'none'
    });
    queryClient.invalidateQueries({
      queryKey: ['recent-past-gigs', user?.id],
      refetchType: 'none'
    });
    queryClient.invalidateQueries({
      queryKey: ['all-gigs', user?.id],
      refetchType: 'none'
    });

    // Navigate to returnUrl if provided, otherwise default to dashboard
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    router.push(returnUrl);
  };

  // Loading state handled inside GigEditorPanel for a smoother sliding experience
  if (isLoading) {
    return (
      <div className="pb-6">
        <GigEditorPanel
          mode="sheet"
          loading={true}
          isEditing={true}
          open={true}
          onOpenChange={() => { }}
        />
      </div>
    );
  }

  // Not found / Error
  if (gigError || (!gig && !isLoading)) {
    const error = gigError instanceof Error ? gigError.message : null;
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            {gig ? (
              // If gig is loaded but we are redirecting (non-owner), showing nothing or generic msg
              <div className="space-y-4 text-center">
                <h3 className="text-lg font-semibold">Accessing Gig Pack...</h3>
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">Gig Not Found</h3>
                <p className="text-destructive mb-4">{error || "This gig may have been deleted or doesn't exist."}</p>
                <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Non-owner or external gig loading (while redirect handles it)
  if (gig && (!isOwner || isExternal)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <GigEditorPanel
        mode="sheet"
        loading={isLoading}
        isEditing={true}
        gigPack={gig ?? undefined}
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            const returnUrl = searchParams.get('returnUrl') || '/gigs';
            router.push(returnUrl);
          }
        }}
        onDelete={handleDeleteGig}
        onUpdateSuccess={() => {
          // Invalidate and refetch gig data
          queryClient.invalidateQueries({
            queryKey: ['gig', gigId],
            refetchType: 'active'
          });
          // Also invalidate related queries that might show this gig
          queryClient.invalidateQueries({
            queryKey: ['gig-pack', gigId],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({
            queryKey: ['gigs'],
            refetchType: 'active'
          });
          queryClient.invalidateQueries({
            queryKey: ['dashboard-gigs'],
            refetchType: 'active'
          });
        }}
      />
    </div>
  );
}
