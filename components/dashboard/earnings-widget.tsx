'use client';

import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { getEarningsSummary } from '@/lib/api/player-earnings';
import { formatCurrency } from '@/lib/utils/currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function EarningsWidget() {
  const { user } = useUser();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['earnings-summary', user?.id],
    queryFn: () => getEarningsSummary(user!.id),
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const thisMonth = summary?.thisMonth;
  const hasData = thisMonth && thisMonth.gigCount > 0;

  return (
    <Link href="/money" className="block">
      <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="h-4 w-4 text-muted-foreground" />
            Earnings This Month
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              <p className="text-2xl font-bold">
                {formatCurrency(thisMonth.total, thisMonth.currency)}
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {thisMonth.gigCount} gig{thisMonth.gigCount !== 1 ? 's' : ''}
                </span>
              </p>
              {thisMonth.pending > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  {formatCurrency(thisMonth.pending, thisMonth.currency)} pending
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start tracking your earnings &rarr;
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
