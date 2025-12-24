'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, Clock, MapPin, Music, DollarSign, Package, FileText, Trash2, Crown, Mail } from 'lucide-react';
import { getGig, deleteGig } from '@/lib/api/gigs';
import { useQuery, useQueryClient } from '@tanstack/react-query';
// PERFORMANCE: Lazy load heavy dialogs and sections - only loads when needed
import dynamic from 'next/dynamic';
import { GigStatusSelect } from '@/components/gigs/shared/status-select';
import { GigStatusBadge } from '@/components/gigs/shared/status-badge';
import { useUser } from '@/lib/providers/user-provider';

// Lazy load dialogs (only when user clicks)
const EditGigDialog = dynamic(
  () => import('@/components/gigs/dialogs/edit-gig-dialog').then((mod) => ({ default: mod.EditGigDialog })),
  { ssr: false, loading: () => null }
);

const DeleteGigDialog = dynamic(
  () => import('@/components/gigs/dialogs/delete-gig-dialog').then((mod) => ({ default: mod.DeleteGigDialog })),
  { ssr: false, loading: () => null }
);

// Lazy load heavy sections (reduces initial bundle, loads when tab is active)
const GigPeopleSection = dynamic(
  () => import('@/components/gigs/detail/people-section').then((mod) => ({ default: mod.GigPeopleSection })),
  { 
    ssr: false, 
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
);

const GigSetlistSection = dynamic(
  () => import('@/components/gigs/detail/setlist-section').then((mod) => ({ default: mod.GigSetlistSection })),
  { 
    ssr: false, 
    loading: () => <Skeleton className="h-64 w-full" />
  }
);

const GigResourcesSection = dynamic(
  () => import('@/components/gigs/detail/resources-section').then((mod) => ({ default: mod.GigResourcesSection })),
  { 
    ssr: false, 
    loading: () => <Skeleton className="h-48 w-full" />
  }
);

const GigScheduleSection = dynamic(
  () => import('@/components/gigs/detail/schedule-section').then((mod) => ({ default: mod.GigScheduleSection })),
  { 
    ssr: false, 
    loading: () => <Skeleton className="h-32 w-full" />
  }
);

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gigId = params.id as string;
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  
  // Redirect non-owners to the read-only gig pack view (in useEffect to avoid render issues)
  useEffect(() => {
    if (gig && !isOwner) {
      router.replace(`/gigs/${gigId}/pack`);
    }
  }, [gig, isOwner, gigId, router]);

  // Show loading while redirecting non-owners
  if (gig && !isOwner) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Handle case where gig doesn't exist (was deleted or doesn't exist)
  if (!isLoading && !gig && !gigError) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <h3 className="text-lg font-semibold mb-2">Gig Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                This gig may have been deleted or you don't have access to it.
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      refetchType: 'none' // Don't refetch, just mark as stale
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (gigError || !gig) {
    const error = gigError instanceof Error ? gigError.message : null;
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive mb-4">{error || 'Gig not found'}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const gigDate = new Date(gig.date);
  const isUpcoming = gigDate >= new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-4 mb-1 flex-wrap">
                <h2 className="text-3xl font-bold tracking-tight">{gig.title}</h2>
                {/* Host Badge */}
                {(() => {
                  const hostName = (gig as any)?.owner?.name || null;

                  return isOwner ? (
                    <Badge variant="outline" className="gap-1 text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                      <Crown className="h-3 w-3" />
                      You
                    </Badge>
                  ) : hostName ? (
                    <Badge variant="outline" className="gap-1 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                      <Mail className="h-3 w-3" />
                      {hostName}
                    </Badge>
                  ) : null;
                })()}
                {/* Show status select for managers, badge for players */}
                {(() => {
                  return isOwner ? (
                    <GigStatusSelect
                      gigId={gigId}
                      currentStatus={gig.status}
                      onStatusChange={() => {
                        queryClient.invalidateQueries({ 
                          queryKey: ['gig', gigId],
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
                  ) : (
                    <GigStatusBadge status={gig.status} />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/gigs/${gigId}/pack`}>
            <Button variant="default" className="gap-2">
              <Package className="h-4 w-4" />
              Gig Pack
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive focus-visible:ring-2"
            aria-label="Delete gig"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Info
              </CardTitle>
              <CardDescription>Gig details and logistics</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
            >
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </div>
              <p className="font-medium">
                {gigDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {gig.start_time && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Time</span>
                </div>
                <p className="font-medium">
                  {gig.start_time}
                  {gig.end_time && ` - ${gig.end_time}`}
                </p>
              </div>
            )}
          </div>

          {(gig.location_name || gig.location_address) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Location</span>
              </div>
              {gig.location_name && (
                <p className="font-medium">{gig.location_name}</p>
              )}
              {gig.location_address && (
                <p className="text-sm text-muted-foreground">
                  {gig.location_address}
                </p>
              )}
            </div>
          )}

          {/* Notes - if imported from calendar or added by user */}
          {gig.internal_notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Notes</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">
                  {gig.internal_notes}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* People Section (Extracted) */}
      <GigPeopleSection gigId={gigId} gigTitle={gig.title} />

      {/* Schedule Section (Extracted) */}
      <GigScheduleSection gigId={gigId} />

      {/* Placeholder Cards for Future Features */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Money - Step 10 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Money
            </CardTitle>
            <CardDescription>Fees and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Payment tracking coming in Step 10...
            </p>
          </CardContent>
        </Card>

        {/* Setlist Section (Extracted) */}
        <GigSetlistSection gigId={gigId} />

        {/* Resources Section (Extracted) */}
        <GigResourcesSection gigId={gigId} />
      </div>

      {/* Dialogs */}
      {gig && (
        <>
          <EditGigDialog
            gig={gig}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onSuccess={() => {
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
          <DeleteGigDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
            onConfirm={handleDeleteGig}
            gigTitle={gig.title}
          />
        </>
      )}
    </div>
  );
}
