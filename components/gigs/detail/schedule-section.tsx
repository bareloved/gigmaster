'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { getGig } from '@/app/(app)/gigs/actions';
import { useUser } from '@/lib/providers/user-provider';

interface GigScheduleSectionProps {
  gigId: string;
}

export function GigScheduleSection({ gigId }: GigScheduleSectionProps) {
  // Use the same query key as page.tsx to leverage the loaded GigPack data
  const {
    data: gig,
    isLoading,
  } = useQuery({
    queryKey: ['gig', gigId],
    queryFn: () => getGig(gigId),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Handle both array (GigPack) and legacy string formats defensively
  const scheduleItems = Array.isArray(gig?.schedule) ? gig.schedule : [];
  const hasSchedule = scheduleItems.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Schedule
            </CardTitle>
            <CardDescription>
              Timeline and important times for this gig
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {hasSchedule ? (
          <div className="space-y-4">
            {scheduleItems.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-center gap-4 py-2 border-b last:border-0">
                <div className="w-24 flex-shrink-0 font-medium font-mono text-sm text-muted-foreground">
                  {item.time}
                </div>
                <div className="font-medium">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No schedule added yet. Click "Edit" above to add timeline information.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

