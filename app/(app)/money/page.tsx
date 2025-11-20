'use client';

import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneySummaryCards } from '@/components/money-summary-cards';
import { PlayerMoneyTable } from '@/components/player-money-table';
import { getPlayerMoneySummary, getPlayerMoneyGigs } from '@/lib/api/player-money';
import { useUser } from '@/lib/providers/user-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';

export default function MoneyPage() {
  const { user } = useUser();

  // Fetch player money summary
  const {
    data: summary,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery({
    queryKey: ['player-money-summary', user?.id],
    queryFn: () => getPlayerMoneySummary(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch player money gigs
  const {
    data: gigs,
    isLoading: gigsLoading,
    error: gigsError,
  } = useQuery({
    queryKey: ['player-money-gigs', user?.id],
    queryFn: () => getPlayerMoneyGigs(user!.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!user) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Please sign in to view your money.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Money</h1>
        <p className="text-muted-foreground">
          Track your earnings and payments across all gigs
        </p>
      </div>

      <Tabs defaultValue="player" className="space-y-4">
        <TabsList>
          <TabsTrigger value="player">As Player</TabsTrigger>
          <TabsTrigger value="manager">As Manager</TabsTrigger>
        </TabsList>

        {/* AS PLAYER TAB */}
        <TabsContent value="player" className="space-y-4">
          {/* Summary Cards */}
          {summaryLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
              <Skeleton className="h-[120px]" />
            </div>
          ) : summaryError ? (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 pt-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Failed to load summary data
                </p>
              </CardContent>
            </Card>
          ) : summary ? (
            <MoneySummaryCards
              totalEarned={summary.totalEarned}
              totalUnpaid={summary.totalUnpaid}
              gigCount={summary.gigCount}
              currency={summary.currency}
            />
          ) : null}

          {/* Gigs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                All gigs where you have a role with payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gigsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : gigsError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">Failed to load gigs</p>
                </div>
              ) : gigs ? (
                <PlayerMoneyTable gigs={gigs} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AS MANAGER TAB (PLACEHOLDER) */}
        <TabsContent value="manager" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manager Money View</CardTitle>
              <CardDescription>Coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground max-w-md">
                  The Manager Money view will let you track client fees, payouts, and
                  profit per project and gig. This feature will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
