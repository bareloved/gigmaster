'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MyEarningsSummaryCards } from '@/components/dashboard/earnings-summary';
import { MyEarningsTable } from '@/components/money/earnings-table';
import { PayoutsTable } from '@/components/money/payouts-table';
import { SummaryCardsSkeleton, MoneyTableSkeleton } from '@/components/money/table-skeleton';
import { getMyEarnings, getPayouts, checkIsManager } from '@/lib/api/money';
import { useUser } from '@/lib/providers/user-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { PaymentStatus } from '@/lib/types/shared';

export default function MoneyPage() {
  const { user } = useUser();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Filter state for My Earnings
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | null>(null);

  // Filter state for Payouts
  const [payoutsYear, setPayoutsYear] = useState(currentYear);
  const [payoutsMonth, setPayoutsMonth] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | null>(null);

  // Generate year options (current year and 2 years back)
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];
  const monthOptions = [
    { value: 'all', label: 'All Year' },
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Check if user is a manager
  const { data: isManager = false } = useQuery({
    queryKey: ['is-manager', user?.id],
    queryFn: () => checkIsManager(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch My Earnings data
  const {
    data: earningsData,
    isLoading: earningsLoading,
    error: earningsError,
  } = useQuery({
    queryKey: ['my-earnings', user?.id, year, month],
    queryFn: () => getMyEarnings(year, month),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch Payouts data
  const {
    data: payoutsData,
    isLoading: payoutsLoading,
    error: payoutsError,
  } = useQuery({
    queryKey: ['payouts', user?.id, payoutsYear, payoutsMonth, selectedStatus],
    queryFn: () => getPayouts(payoutsYear, payoutsMonth, selectedStatus),
    enabled: !!user?.id && isManager,
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
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Money</h1>
          <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300">
            In Progress
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Track your earnings and payments across all gigs
        </p>
      </div>

      <Tabs defaultValue="player" className="space-y-4">
        <TabsList>
          <TabsTrigger value="player">As Player</TabsTrigger>
          {isManager && <TabsTrigger value="manager">As Manager</TabsTrigger>}
        </TabsList>

        {/* AS PLAYER TAB */}
        <TabsContent value="player" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Year</label>
                  <Select
                    value={year.toString()}
                    onValueChange={(v) => setYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Month</label>
                  <Select
                    value={month?.toString() || 'all'}
                    onValueChange={(v) => setMonth(v === 'all' ? null : parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setYear(currentYear);
                      setMonth(currentMonth);
                    }}
                  >
                    This Month
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setYear(currentYear);
                      setMonth(null);
                    }}
                  >
                    This Year
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          {earningsLoading ? (
            <SummaryCardsSkeleton count={3} />
          ) : earningsError ? (
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 pt-6">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">
                  Failed to load summary data
                </p>
              </CardContent>
            </Card>
          ) : earningsData?.summary ? (
            <MyEarningsSummaryCards summary={earningsData.summary} />
          ) : null}

          {/* Gigs Table */}
          <Card>
            <CardHeader>
              <CardTitle>My Earnings</CardTitle>
              <CardDescription>
                All gigs where you have a role with payment information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <MoneyTableSkeleton rows={5} />
              ) : earningsError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <p className="text-sm">Failed to load gigs</p>
                </div>
              ) : earningsData ? (
                <MyEarningsTable gigs={earningsData.gigs} />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AS MANAGER TAB */}
        {isManager && (
          <TabsContent value="manager" className="space-y-4">
            {/* Filter Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium mb-2 block">Year</label>
                    <Select
                      value={payoutsYear.toString()}
                      onValueChange={(v) => setPayoutsYear(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium mb-2 block">Month</label>
                    <Select
                      value={payoutsMonth?.toString() || 'all'}
                      onValueChange={(v) => setPayoutsMonth(v === 'all' ? null : parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[150px]">
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select
                      value={selectedStatus || 'all'}
                      onValueChange={(v) => setSelectedStatus(v === 'all' ? null : (v as PaymentStatus))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPayoutsYear(currentYear);
                        setPayoutsMonth(currentMonth);
                        setSelectedStatus(null);
                      }}
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPayoutsYear(currentYear);
                        setPayoutsMonth(null);
                        setSelectedStatus(null);
                      }}
                    >
                      This Year
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payouts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payouts</CardTitle>
                <CardDescription>
                  Musicians you need to pay for gigs you manage
                </CardDescription>
              </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <MoneyTableSkeleton rows={5} />
              ) : payoutsError ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm">Failed to load payouts</p>
                  </div>
                ) : payoutsData ? (
                  <PayoutsTable payouts={payoutsData} />
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
