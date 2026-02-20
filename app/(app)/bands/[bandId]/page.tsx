"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/lib/providers/user-provider";
import { BandEditorPanel } from "@/components/bands/band-editor-panel";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { getBand, listBandGigs } from "@/lib/api/bands";
import { formatCurrency } from "@/lib/utils/currency";
import { DashboardGigItem } from "@/components/dashboard/gig-item";
import type { DashboardGig } from "@/lib/types/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  Plus,
  Edit,
  Music,
  Calendar,
  TrendingUp,
  Trophy,
  DollarSign,
  Clock,
  Star,
  Flame,
  Target,
} from "lucide-react";

// ============================================================================
// HELPERS
// ============================================================================

const todayStr = () => new Date().toISOString().split("T")[0];
const currentYear = () => new Date().getFullYear().toString();

function getEarnings(gig: DashboardGig): number {
  return gig.playerAgreedFee ?? gig.playerPersonalEarningsAmount ?? 0;
}

function getCurrency(gig: DashboardGig): string {
  return gig.playerCurrency ?? gig.playerPersonalEarningsCurrency ?? "ILS";
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function BandDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="aspect-[3/1] w-full rounded-lg" />
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="h-4 w-4" />
          <span className="text-xs sm:text-sm">{label}</span>
        </div>
        <p className="text-lg sm:text-2xl font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// GIG HISTORY TAB
// ============================================================================

function GigHistoryTab({
  gigs,
  bandId,
}: {
  gigs: DashboardGig[];
  bandId: string;
}) {
  const { upcoming, pastByYear } = useMemo(() => {
    const today = todayStr();
    const upcomingGigs = gigs.filter((g) => g.date >= today && g.status !== "cancelled");
    const pastGigs = gigs.filter((g) => g.date < today || g.status === "cancelled");

    const groups: Record<string, DashboardGig[]> = {};
    for (const gig of pastGigs) {
      const year = gig.date.slice(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(gig);
    }
    return {
      upcoming: upcomingGigs,
      pastByYear: Object.entries(groups).sort(([a], [b]) => b.localeCompare(a)),
    };
  }, [gigs]);

  if (gigs.length === 0) {
    return (
      <Card className="p-6">
        <CardContent className="py-8 px-0">
          <div className="flex flex-col items-center text-center">
            <Music className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold mb-1">No gigs with this band yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first gig to get started.
            </p>
            <Link href={`/gigs/new?band=${bandId}`}>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Gig
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const returnUrl = `/bands/${bandId}`;

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Upcoming
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {upcoming.map((gig) => (
              <DashboardGigItem
                key={gig.gigId}
                gig={gig}
                returnUrl={returnUrl}
              />
            ))}
          </div>
        </div>
      )}

      {pastByYear.map(([year, yearGigs]) => (
        <div key={year} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {year}
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {yearGigs.map((gig) => (
              <DashboardGigItem
                key={gig.gigId}
                gig={gig}
                isPastGig
                returnUrl={returnUrl}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// FINANCIALS TAB
// ============================================================================

function FinancialsTab({ gigs }: { gigs: DashboardGig[] }) {
  const financials = useMemo(() => {
    const nonCancelled = gigs.filter((g) => g.status !== "cancelled");
    const today = todayStr();

    let paid = 0;
    let pending = 0;
    let overdue = 0;
    // TODO: support mixed-currency bands (group by currency before summing)
    let currency = "ILS";

    for (const gig of nonCancelled) {
      const amount = getEarnings(gig);
      if (amount <= 0) continue;
      currency = getCurrency(gig);

      if (gig.playerIsPaid) {
        paid += amount;
      } else if (
        gig.playerExpectedPaymentDate &&
        gig.playerExpectedPaymentDate < today
      ) {
        overdue += amount;
      } else {
        pending += amount;
      }
    }

    // Monthly breakdown — last 12 months
    const months: { key: string; label: string; amount: number; gigCount: number }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      months.push({ key, label, amount: 0, gigCount: 0 });
    }

    for (const gig of nonCancelled) {
      const monthKey = gig.date.slice(0, 7); // "YYYY-MM"
      const month = months.find((m) => m.key === monthKey);
      if (month) {
        month.amount += getEarnings(gig);
        month.gigCount++;
      }
    }

    const maxMonth = Math.max(...months.map((m) => m.amount), 1);

    return { paid, pending, overdue, currency, months, maxMonth };
  }, [gigs]);

  const totalEarnings = financials.paid + financials.pending + financials.overdue;

  if (totalEarnings === 0 && gigs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No financial data yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-green-600 dark:text-green-400 mb-1">Paid</p>
            <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-300 truncate">
              {formatCurrency(financials.paid, financials.currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-amber-600 dark:text-amber-400 mb-1">Pending</p>
            <p className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300 truncate">
              {formatCurrency(financials.pending, financials.currency)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-red-600 dark:text-red-400 mb-1">Overdue</p>
            <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-300 truncate">
              {formatCurrency(financials.overdue, financials.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Monthly Breakdown
        </h3>
        <div className="space-y-2">
          {financials.months.map((month) => (
            <div key={month.key} className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-muted-foreground w-20 sm:w-24 flex-shrink-0 truncate">
                {month.label}
              </span>
              <div className="flex-1 h-6 bg-muted rounded-sm overflow-hidden">
                {month.amount > 0 && (
                  <div
                    className="h-full bg-primary rounded-sm transition-all"
                    style={{
                      width: `${(month.amount / financials.maxMonth) * 100}%`,
                    }}
                  />
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium w-24 sm:w-28 text-right flex-shrink-0 truncate">
                {month.amount > 0
                  ? formatCurrency(month.amount, financials.currency)
                  : "—"}
              </span>
              <span className="text-xs text-muted-foreground w-12 text-right flex-shrink-0 hidden sm:block">
                {month.gigCount > 0
                  ? `${month.gigCount} gig${month.gigCount !== 1 ? "s" : ""}`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MILESTONES TAB
// ============================================================================

const MILESTONE_THRESHOLDS = [1, 10, 25, 50, 100] as const;

function MilestonesTab({ gigs }: { gigs: DashboardGig[] }) {
  const stats = useMemo(() => {
    const nonCancelled = gigs.filter((g) => g.status !== "cancelled");
    const sorted = [...nonCancelled].sort((a, b) => a.date.localeCompare(b.date));
    const today = todayStr();
    const pastGigs = sorted.filter((g) => g.date < today);
    const thisYear = currentYear();

    // Basic stats
    const totalGigs = nonCancelled.length;
    const firstGig = sorted[0] ?? null;
    const latestGig = pastGigs.length > 0 ? pastGigs[pastGigs.length - 1] : null;

    // Year-over-year
    const thisYearGigs = nonCancelled.filter((g) => g.date.startsWith(thisYear));
    const lastYearGigs = nonCancelled.filter((g) =>
      g.date.startsWith(String(Number(thisYear) - 1))
    );

    // Busiest month
    const monthCounts: Record<string, number> = {};
    for (const gig of nonCancelled) {
      const key = gig.date.slice(0, 7);
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    const busiestEntry = Object.entries(monthCounts).sort(
      ([, a], [, b]) => b - a
    )[0];
    let busiestMonth: string | null = null;
    let busiestMonthCount = 0;
    if (busiestEntry) {
      const [key, count] = busiestEntry;
      const d = new Date(key + "-01");
      busiestMonth = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      busiestMonthCount = count;
    }

    // Streak — consecutive months with at least one gig (counting backwards from now)
    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthCounts[key]) {
        streak++;
      } else {
        break;
      }
    }

    return {
      totalGigs,
      firstGig,
      latestGig,
      thisYearGigs: thisYearGigs.length,
      lastYearGigs: lastYearGigs.length,
      thisYear,
      busiestMonth,
      busiestMonthCount,
      streak,
    };
  }, [gigs]);

  if (gigs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Play some gigs to unlock milestones!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Milestone badges */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Milestones
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
          {MILESTONE_THRESHOLDS.map((threshold) => {
            const achieved = stats.totalGigs >= threshold;
            return (
              <Card
                key={threshold}
                className={`text-center ${
                  achieved
                    ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30"
                    : "opacity-40"
                }`}
              >
                <CardContent className="p-3">
                  <Trophy
                    className={`h-6 w-6 mx-auto mb-1 ${
                      achieved
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  />
                  <p className="text-sm font-bold">
                    {threshold === 1 ? "1st" : threshold}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {achieved
                      ? threshold === 1
                        ? "First Gig!"
                        : `${threshold} Gigs!`
                      : `${threshold - stats.totalGigs} more`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Stats grid */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Band Stats
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.firstGig && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Star className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">First gig together</p>
                  <p className="text-sm font-medium">
                    {new Date(stats.firstGig.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.latestGig && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Latest gig</p>
                  <p className="text-sm font-medium">
                    {new Date(stats.latestGig.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.busiestMonth && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Busiest month</p>
                  <p className="text-sm font-medium">
                    {stats.busiestMonth} ({stats.busiestMonthCount} gigs)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <Target className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Year-over-year</p>
                <p className="text-sm font-medium">
                  {stats.thisYear}: {stats.thisYearGigs} gigs
                  {stats.lastYearGigs > 0 && (
                    <span className="text-muted-foreground">
                      {" "}(vs {stats.lastYearGigs} in {Number(stats.thisYear) - 1})
                    </span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          {stats.streak > 1 && (
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Flame className="h-5 w-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Current streak</p>
                  <p className="text-sm font-medium">
                    {stats.streak} months in a row
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BandDetailPage() {
  const { bandId } = useParams<{ bandId: string }>();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);

  const {
    data: band,
    isLoading: bandLoading,
    error: bandError,
  } = useQuery({
    queryKey: ["band", bandId, user?.id],
    queryFn: () => getBand(bandId),
    enabled: !!user && !!bandId,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: gigs = [],
    isLoading: gigsLoading,
  } = useQuery({
    queryKey: ["band-gigs", bandId, user?.id],
    queryFn: () => listBandGigs(bandId, user!.id),
    enabled: !!user && !!bandId,
    staleTime: 2 * 60 * 1000,
  });

  useDocumentTitle(band?.name ?? "Band");

  // Quick stats computed from gigs
  const stats = useMemo(() => {
    const today = todayStr();
    const year = currentYear();
    const nonCancelled = gigs.filter((g) => g.status !== "cancelled");

    const totalGigs = nonCancelled.length;
    const thisYear = nonCancelled.filter((g) => g.date.startsWith(year)).length;
    const upcoming = nonCancelled.filter((g) => g.date >= today).length;
    const totalEarned = nonCancelled.reduce((sum, g) => sum + getEarnings(g), 0);
    const currency = gigs.find((g) => getCurrency(g) !== "ILS")
      ? getCurrency(gigs[0])
      : "ILS";

    return { totalGigs, thisYear, upcoming, totalEarned, currency };
  }, [gigs]);

  const isLoading = bandLoading || gigsLoading;

  if (isLoading) return <BandDetailSkeleton />;

  if (bandError || !band) {
    return (
      <div className="py-12 px-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="text-destructive font-semibold">Band not found</div>
        <p className="text-muted-foreground max-w-md">
          This band may have been deleted or you don&apos;t have access to it.
        </p>
        <Link href="/bands">
          <Button variant="outline" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back to Bands
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/bands"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Bands
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            onClick={() => setEditorOpen(true)}
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit Band</span>
          </Button>
          <Link href={`/gigs/new?band=${band.id}`}>
            <Button size="sm" className="gap-1.5 h-8">
              <Plus className="h-3.5 w-3.5" />
              New Gig
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero / Band info */}
      <div>
        {band.hero_image_url ? (
          <div className="relative aspect-[3/1] rounded-lg overflow-hidden bg-muted mb-4">
            <Image
              src={band.hero_image_url}
              alt={band.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          </div>
        ) : band.band_logo_url ? (
          <div className="flex items-center justify-center aspect-[3/1] rounded-lg bg-muted mb-4">
            <Image
              src={band.band_logo_url}
              alt={band.name}
              width={240}
              height={120}
              className="max-h-24 sm:max-h-32 object-contain"
            />
          </div>
        ) : null}

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{band.name}</h1>
        {band.description && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {band.description}
          </p>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Total Gigs" value={stats.totalGigs} icon={Music} />
        <StatCard label="This Year" value={stats.thisYear} icon={Calendar} />
        <StatCard label="Upcoming" value={stats.upcoming} icon={TrendingUp} />
        <StatCard
          label="Total Earned"
          value={
            stats.totalEarned > 0
              ? formatCurrency(stats.totalEarned, stats.currency)
              : "—"
          }
          icon={DollarSign}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="history">Gig History</TabsTrigger>
          <TabsTrigger value="financials">Financials</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <GigHistoryTab gigs={gigs} bandId={bandId} />
        </TabsContent>

        <TabsContent value="financials" className="mt-4">
          <FinancialsTab gigs={gigs} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <MilestonesTab gigs={gigs} />
        </TabsContent>
      </Tabs>

      {/* Band Editor Panel */}
      <BandEditorPanel
        open={editorOpen}
        onOpenChange={setEditorOpen}
        band={band}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["band", bandId, user?.id] });
          queryClient.invalidateQueries({ queryKey: ["bands", user?.id] });
          setEditorOpen(false);
        }}
      />
    </div>
  );
}
