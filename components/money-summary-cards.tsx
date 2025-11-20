'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

interface MoneySummaryCardsProps {
  totalEarned: number;
  totalUnpaid: number;
  gigCount: number;
  currency?: string;
}

export function MoneySummaryCards({
  totalEarned,
  totalUnpaid,
  gigCount,
  currency = 'ILS',
}: MoneySummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalEarned, currency)}
          </div>
          <p className="text-xs text-muted-foreground">Paid gigs</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalUnpaid, currency)}
          </div>
          <p className="text-xs text-muted-foreground">Pending payment</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gigs</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{gigCount}</div>
          <p className="text-xs text-muted-foreground">
            {gigCount === 1 ? 'gig' : 'gigs'} with payment info
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

