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
import { EditGigDialog } from '@/components/edit-gig-dialog';
import { DeleteGigDialog } from '@/components/delete-gig-dialog';
import { GigPeopleSection } from '@/components/gig-people-section';
import { GigSetlistSection } from '@/components/gig-setlist-section';
import { GigResourcesSection } from '@/components/gig-resources-section';
import { GigScheduleSection } from '@/components/gig-schedule-section';
import { GigStatusSelect } from '@/components/gig-status-select';
import { GigStatusBadge } from '@/components/gig-status-badge';
import { useUser } from '@/lib/providers/user-provider';

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gigId = params.id as string;
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch gig details with project info
  const {
    data: gig,
    isLoading,
    error: gigError,
  } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => getGig(gigId),
  });

  // Check ownership via project (gigs no longer have owner_id)
  const isOwner = gig?.projects?.owner_id === user?.id;
  
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

  const handleDeleteGig = async () => {
    if (!gigId) return;
    await deleteGig(gigId);
    
    // Invalidate all related caches (only refetches active/mounted queries)
    queryClient.invalidateQueries({ 
      queryKey: ['dashboard-gigs', user?.id],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({ 
      queryKey: ['recent-past-gigs', user?.id],
      refetchType: 'active'
    });
    
    if (gig?.project_id) {
      queryClient.invalidateQueries({ 
        queryKey: ['gigs', gig.project_id],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['project', gig.project_id],
        refetchType: 'active'
      });
    }
    
    // Wait a tick for invalidation to process
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Navigate back to where the user came from
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

  const project = gig.projects as any;
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
              onClick={() => router.push(returnUrl)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-4 mb-1 flex-wrap">
                <h2 className="text-3xl font-bold tracking-tight">{gig.title}</h2>
                {/* Host Badge */}
                {(() => {
                  const isOwner = project?.owner_id === user?.id;
                  const hostName = project?.owner?.name || null;
                  
                  return isOwner ? (
                    <Badge variant="outline" className="gap-1 text-xs bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
                      <Crown className="h-3 w-3" />
                      Hosted by You
                    </Badge>
                  ) : hostName ? (
                    <Badge variant="outline" className="gap-1 text-xs bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                      <Mail className="h-3 w-3" />
                      Hosted by {hostName}
                    </Badge>
                  ) : null;
                })()}
                {/* Show status select for managers, badge for players */}
                {(() => {
                  // Check if user is owner via project
                  const isOwner = project?.owner_id === user?.id;
                  
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
              {project && !project.is_personal && (
                <p className="text-sm text-muted-foreground">
                  {project.name}
                </p>
              )}
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
          {gig.notes && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Notes</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm whitespace-pre-wrap">
                  {gig.notes}
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
