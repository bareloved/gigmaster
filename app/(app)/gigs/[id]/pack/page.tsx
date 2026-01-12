'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Edit, Share2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getGigPackFull } from '@/lib/api/gig-pack';
import { useUser } from '@/lib/providers/user-provider';
import { MinimalLayout } from '@/components/gigpack/layouts/minimal-layout';
import { GigPackShareDialog } from '@/components/gigpack/gigpack-share-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { GigPack } from '@/lib/gigpack/types';

export default function GigPackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const gigId = params.id as string;
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { user } = useUser();
  
  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // Smart polling state
  const [isUserActive, setIsUserActive] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const { data: gigPack, isLoading, error, refetch } = useQuery({
    queryKey: ['gig-pack-full', gigId],
    queryFn: () => getGigPackFull(gigId),
    enabled: !!gigId,
    staleTime: 5 * 1000, // 5 seconds - data is considered stale quickly for live updates
  });

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

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view this gig.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4">
        <Skeleton className="h-[400px] w-full rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
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
          <Link href={isOwner ? `/gigs/${gigId}?returnUrl=${encodeURIComponent(returnUrl)}` : returnUrl}>
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {isOwner ? 'Manage Gig' : 'Back'}
            </Button>
          </Link>
          
          {isOwner && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      </div>

      {/* GigPack MinimalLayout */}
      <MinimalLayout 
        gigPack={gigPack as Omit<GigPack, "internal_notes" | "owner_id">} 
        openMaps={openMaps} 
        slug={gigPack.public_slug || gigId}
        locale="en"
      />
      
      {/* Live status indicator */}
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-card border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw 
            className={`h-3 w-3 transition-all ${
              isPolling 
                ? 'animate-spin text-primary' 
                : isUserActive 
                  ? 'text-green-500' 
                  : 'text-orange-500'
            }`} 
          />
          <span className="hidden sm:inline">
            {isUserActive ? 'Live' : 'Idle'} • Updated {lastUpdated.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </span>
          <span className="sm:hidden">
            {isUserActive ? '🟢' : '🟠'}
          </span>
        </div>
      </div>
      
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
