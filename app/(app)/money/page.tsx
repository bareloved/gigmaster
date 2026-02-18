'use client';

import { useState } from 'react';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import {
  getEarningsSummary,
  getEarningsByBand,
  getEarningsGigList,
} from '@/lib/api/player-earnings';
import { formatCurrency } from '@/lib/utils/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Banknote,
  TrendingUp,
  CalendarDays,
  Music2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import type { EarningsGig } from '@/lib/types/shared';

type Period = 'this-month' | 'last-month' | 'this-year' | 'last-year';

const PERIOD_LABELS: Record<Period, string> = {
  'this-month': 'This Month',
  'last-month': 'Last Month',
  'this-year': 'This Year',
  'last-year': 'Last Year',
};

export default function MoneyPage() {
  useDocumentTitle('Earnings');
  const { user } = useUser();
  const [period, setPeriod] = useState<Period>('this-month');

  // Summary query — all periods at once
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['earnings-summary', user?.id],
    queryFn: () => getEarningsSummary(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Per-band breakdown for selected period
  const { data: bandBreakdown, isLoading: bandsLoading } = useQuery({
    queryKey: ['earnings-by-band', user?.id, period],
    queryFn: () => getEarningsByBand(user!.id, period),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // Gig list for selected period
  const { data: gigList, isLoading: gigsLoading } = useQuery({
    queryKey: ['earnings-gigs', user?.id, period],
    queryFn: () => getEarningsGigList(user!.id, period),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Banknote className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Earnings</h1>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <Skeleton className="h-3 w-20 mb-3" />
                <Skeleton className="h-7 w-28 mb-2" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* This Month */}
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30"
            onClick={() => setPeriod('this-month')}
          >
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">This Month</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.thisMonth.total, summary.thisMonth.currency)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {summary.thisMonth.gigCount} gig{summary.thisMonth.gigCount !== 1 ? 's' : ''}
                </span>
                {summary.thisMonth.pending > 0 && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-600 dark:text-amber-400 border-amber-300">
                    {formatCurrency(summary.thisMonth.pending, summary.thisMonth.currency)} pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Last Month */}
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30"
            onClick={() => setPeriod('last-month')}
          >
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">Last Month</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.lastMonth.total, summary.lastMonth.currency)}
              </p>
              <span className="text-xs text-muted-foreground">
                {summary.lastMonth.gigCount} gig{summary.lastMonth.gigCount !== 1 ? 's' : ''}
              </span>
            </CardContent>
          </Card>

          {/* This Year */}
          <Card
            className="cursor-pointer transition-colors hover:bg-muted/30"
            onClick={() => setPeriod('this-year')}
          >
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-muted-foreground mb-1">This Year</p>
              <p className="text-2xl font-bold">
                {formatCurrency(summary.thisYear.total, summary.thisYear.currency)}
              </p>
              <span className="text-xs text-muted-foreground">
                {summary.thisYear.gigCount} gig{summary.thisYear.gigCount !== 1 ? 's' : ''}
              </span>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Period Toggle */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="this-month">This Month</TabsTrigger>
          <TabsTrigger value="last-month">Last Month</TabsTrigger>
          <TabsTrigger value="this-year">This Year</TabsTrigger>
          <TabsTrigger value="last-year">Last Year</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Per-Band Breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Music2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">By Band</h2>
          <span className="text-xs text-muted-foreground ml-auto">{PERIOD_LABELS[period]}</span>
        </div>

        {bandsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : bandBreakdown && bandBreakdown.length > 0 ? (
          <div className="space-y-2">
            {bandBreakdown.map((band) => (
              <div
                key={band.bandId ?? 'solo'}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {band.bandName ?? 'Solo / No band'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {band.gigCount} gig{band.gigCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <p className="text-sm font-semibold">
                  {formatCurrency(band.total, band.currency)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No earnings recorded for {PERIOD_LABELS[period].toLowerCase()}.
          </p>
        )}
      </div>

      {/* Gig List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Gigs</h2>
          <span className="text-xs text-muted-foreground ml-auto">{PERIOD_LABELS[period]}</span>
        </div>

        {gigsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : gigList && gigList.length > 0 ? (
          <div className="space-y-2">
            {gigList.map((gig) => (
              <GigEarningsRow key={gig.gigId} gig={gig} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No gigs found for {PERIOD_LABELS[period].toLowerCase()}.
            </p>
            <Link
              href="/gigs"
              className="text-sm text-primary hover:underline inline-flex items-center gap-1"
            >
              View your gigs <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function GigEarningsRow({ gig }: { gig: EarningsGig }) {
  const dateStr = new Date(gig.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Status display
  let statusIcon: React.ReactNode = null;
  let statusText = '';
  let statusColor = '';

  if (!gig.hasEarningsData) {
    statusText = 'Not recorded';
    statusColor = 'text-muted-foreground';
  } else if (gig.isPaid) {
    statusIcon = <CheckCircle2 className="h-3.5 w-3.5" />;
    statusText = 'Paid';
    statusColor = 'text-green-600 dark:text-green-400';
  } else if (gig.expectedPaymentDate) {
    const dueDate = new Date(gig.expectedPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      statusIcon = <AlertCircle className="h-3.5 w-3.5" />;
      statusText = 'Overdue';
      statusColor = 'text-red-600 dark:text-red-400';
    } else {
      statusIcon = <Clock className="h-3.5 w-3.5" />;
      statusText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      statusColor = 'text-amber-600 dark:text-amber-400';
    }
  } else {
    statusIcon = <Clock className="h-3.5 w-3.5" />;
    statusText = 'Pending';
    statusColor = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <Link
      href={`/gigs/${gig.gigId}/pack`}
      className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12 shrink-0">{dateStr}</span>
          <p className="text-sm font-medium truncate">{gig.gigTitle}</p>
        </div>
        {gig.bandName && (
          <p className="text-xs text-muted-foreground ml-14 truncate">{gig.bandName}</p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        {gig.hasEarningsData && gig.amount != null ? (
          <span className="text-sm font-semibold">
            {formatCurrency(gig.amount, gig.currency)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground italic">—</span>
        )}
        <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
          {statusIcon}
          {statusText}
        </span>
      </div>
    </Link>
  );
}
