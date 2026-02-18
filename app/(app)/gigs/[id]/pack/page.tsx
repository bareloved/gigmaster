'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, Edit, Share2, RefreshCw, ExternalLink, CalendarSync, Check } from 'lucide-react';
import { GigPackSkeleton } from '@/components/gigpack/gigpack-skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getGigPackFull } from '@/lib/api/gig-pack';
import { useUser } from '@/lib/providers/user-provider';
import { GigPackLayout } from '@/components/gigpack/layouts/gigpack-layout';
import { GigPackShareDialog } from '@/components/gigpack/gigpack-share-dialog';
import { InvitationBanner } from '@/components/gigpack/invitation-banner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { GigPack } from '@/lib/gigpack/types';
import type { CalendarRefreshDiff } from '@/lib/types/shared';
import { PaymentSection } from '@/components/gigpack/payment-section';
import { toast } from 'sonner';

export default function GigPackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const gigId = params.id as string;
  const returnUrl = searchParams.get('returnUrl') || '/gigs';
  const { user } = useUser();
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // External gig refresh state
  const [refreshing, setRefreshing] = useState(false);
  const [refreshDiff, setRefreshDiff] = useState<CalendarRefreshDiff | null>(null);
  const [refreshDialogOpen, setRefreshDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleRefreshFromCalendar = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/calendar/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to refresh');
      }
      const diff: CalendarRefreshDiff = await res.json();
      if (diff.hasChanges) {
        setRefreshDiff(diff);
        setRefreshDialogOpen(true);
      } else {
        toast.success('Already up to date');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setRefreshing(false);
    }
  };

  const handleApplyChanges = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/calendar/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gigId, confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply changes');
      }
      toast.success('Changes applied');
      setRefreshDialogOpen(false);
      setRefreshDiff(null);
      queryClient.invalidateQueries({ queryKey: ['gig-pack-full', gigId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  // Smart polling state
  const [isUserActive, setIsUserActive] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: gigPack, isLoading, error } = useQuery({
    queryKey: ['gig-pack-full', gigId],
    queryFn: () => getGigPackFull(gigId),
    enabled: !!gigId,
    staleTime: 5 * 1000, // 5 seconds - data is considered stale quickly for live updates
  });

  useDocumentTitle(gigPack?.title ?? "Gig Pack");

  // Sync Google Calendar attendee responses on page load.
  // This is a reliable fallback to webhooks — fetches current response
  // statuses directly from Google Calendar and updates the DB if needed.
  const isOwnerForSync = gigPack?.owner_id === user?.id;
  useEffect(() => {
    if (!gigId || !isOwnerForSync) return;

    let cancelled = false;

    const syncResponses = async () => {
      try {
        const res = await fetch('/api/calendar/sync-responses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gigId }),
        });
        if (!res.ok) return;
        const { updated } = await res.json();
        if (updated > 0 && !cancelled) {
          queryClient.invalidateQueries({ queryKey: ['gig-pack-full', gigId] });
        }
      } catch {
        // Silent — this is a background sync
      }
    };

    syncResponses();

    return () => { cancelled = true; };
  }, [gigId, isOwnerForSync, queryClient]);

  // Smart polling for live updates
  const poll = useCallback(async () => {
    if (!isUserActive || document.hidden || !gigId) return;
    
    setIsPolling(true);
    try {
      const res = await fetch(`/api/gig/${gigId}/pack`);
      if (res.ok) {
        const newData = await res.json();
        // Compare updated_at to detect changes
        if (newData.updated_at !== gigPack?.updated_at) {
          // Invalidate and refetch to update the cache
          queryClient.setQueryData(['gig-pack-full', gigId], newData);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error("Error polling gig pack:", error);
    } finally {
      setIsPolling(false);
    }
  }, [gigId, gigPack?.updated_at, isUserActive, queryClient]);

  // Set up smart polling with activity detection
  useEffect(() => {
    let activityTimeout: NodeJS.Timeout;

    const resetActivityTimeout = () => {
      setIsUserActive(true);
      clearTimeout(activityTimeout);
      // Mark user as idle after 30 seconds of no activity
      activityTimeout = setTimeout(() => {
        setIsUserActive(false);
      }, 30000);
    };

    // Start with active state
    resetActivityTimeout();

    // Set up activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetActivityTimeout, { passive: true });
    });

    // Poll immediately when becoming visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetActivityTimeout();
        poll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set polling interval based on activity state
    // Poll every 10 seconds when active, every 60 seconds when idle
    const intervalTime = isUserActive && !document.hidden ? 10000 : 60000;
    const pollIntervalId = setInterval(poll, intervalTime);

    return () => {
      clearInterval(pollIntervalId);
      clearTimeout(activityTimeout);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetActivityTimeout);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [poll, isUserActive]);

  // Check if user has a pending invitation for this gig
  const pendingInvitationRole = useMemo(() => {
    if (!gigPack?.lineup || !user?.id) return null;
    return gigPack.lineup.find(
      (m) => (m.userId === user.id || m.linkedUserId === user.id) &&
        (m.invitationStatus === 'invited' || m.invitationStatus === 'pending')
    ) ?? null;
  }, [gigPack?.lineup, user?.id]);

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view this gig.</p>
      </div>
    );
  }

  if (isLoading) {
    return <GigPackSkeleton />;
  }

  if (error || !gigPack) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-2 pt-6">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Failed to load gig pack. Please try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if user is the gig owner
  const isOwner = gigPack.owner_id === user?.id;
  const isExternal = gigPack.is_external ?? false;
  const externalEventUrl = gigPack.external_event_url ?? null;

  const openMaps = () => {
    if (gigPack.venue_maps_url) {
      window.open(gigPack.venue_maps_url, "_blank");
    }
  };

  return (
    <div className="relative">
      {/* Top navigation bar - fixed on top */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={isOwner && !isExternal ? `/gigs/${gigId}?returnUrl=${encodeURIComponent(returnUrl)}` : returnUrl}>
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {isOwner && !isExternal ? 'Manage Gig' : 'Back'}
              </Button>
            </Link>
            {isExternal && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <CalendarSync className="h-3 w-3" />
                External Gig
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isExternal && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={refreshing}
                  onClick={handleRefreshFromCalendar}
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Checking...' : 'Check for updates'}
                </Button>
                {externalEventUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(externalEventUrl, '_blank', 'noopener,noreferrer')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Google Calendar</span>
                  </Button>
                )}
              </>
            )}
            {isOwner && !isExternal && (
              <>
                <Link href={`/gigs/${gigId}/edit`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Invitation banner for invited players */}
      {pendingInvitationRole?.gigRoleId && (
        <InvitationBanner
          roleId={pendingInvitationRole.gigRoleId}
          gigId={gigId}
          roleName={pendingInvitationRole.role ?? undefined}
          agreedFee={pendingInvitationRole.agreedFee}
          currency={pendingInvitationRole.currency}
        />
      )}

      {/* GigPack Layout */}
      <GigPackLayout
        gigPack={gigPack as Omit<GigPack, "internal_notes" | "owner_id">}
        openMaps={openMaps}
        slug={gigPack.public_slug || gigId}
        locale="en"
        paymentSection={<PaymentSection gigId={gigId} />}
      />
      
      {/* Refresh Diff Dialog */}
      <Dialog open={refreshDialogOpen} onOpenChange={setRefreshDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Updates from Google Calendar</DialogTitle>
            <DialogDescription>
              The following fields have changed since last sync.
            </DialogDescription>
          </DialogHeader>
          {refreshDiff && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {refreshDiff.changes.map((change) => (
                <div key={change.field} className="rounded-lg border p-3">
                  <div className="text-xs font-medium text-muted-foreground capitalize mb-1">
                    {change.field.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm">
                    <span className="line-through text-muted-foreground">{change.oldValue || '(empty)'}</span>
                    <span className="mx-2 text-muted-foreground/50">&rarr;</span>
                    <span className="font-medium">{change.newValue || '(empty)'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRefreshDialogOpen(false)}>
              Dismiss
            </Button>
            <Button onClick={handleApplyChanges} disabled={applying}>
              {applying ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <GigPackShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        gigPack={{
          id: gigPack.id,
          title: gigPack.title,
          band_name: gigPack.band_name,
          date: gigPack.date,
          venue_name: gigPack.venue_name,
          public_slug: gigPack.public_slug || gigId,
        }}
        locale="en"
      />
    </div>
  );
}
