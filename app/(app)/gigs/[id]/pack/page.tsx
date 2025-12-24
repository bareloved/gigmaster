'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Edit, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getGigPackFull } from '@/lib/api/gig-pack';
import { useUser } from '@/lib/providers/user-provider';
import { MinimalLayout } from '@/components/gigpack/layouts/minimal-layout';
import { Card, CardContent } from '@/components/ui/card';
import { GigPack } from '@/lib/gigpack/types';

export default function GigPackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gigId = params.id as string;
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';
  const { user } = useUser();

  const { data: gigPack, isLoading, error } = useQuery({
    queryKey: ['gig-pack-full', gigId],
    queryFn: () => getGigPackFull(gigId),
    enabled: !!gigId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

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
              <Button variant="outline" size="sm" className="gap-2">
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
    </div>
  );
}
