'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PayoutRow, PaymentStatus } from '@/lib/types/shared';
import { updatePaymentStatus } from '@/lib/api/money';
import { format } from 'date-fns';
import { AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils/currency';

function getStatusBadge(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return <Badge variant="default" className="bg-green-600">Paid</Badge>;
    case 'partial':
      return <Badge variant="secondary">Partial</Badge>;
    case 'overdue':
      return <Badge variant="destructive">Overdue</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
}

export function PayoutsTable({ payouts }: { payouts: PayoutRow[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const markAsPaidMutation = useMutation({
    mutationFn: updatePaymentStatus,
    onSuccess: () => {
      toast.success('Marked as paid');
      queryClient.invalidateQueries({ 
        queryKey: ['payouts'],
        refetchType: 'active'
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update payment status');
    },
  });

  const handleMarkAsPaid = (payout: PayoutRow) => {
    markAsPaidMutation.mutate({
      gigRoleId: payout.gigRoleId,
      paymentStatus: 'paid',
      paidAmount: payout.feeAmount || 0,
      paidDate: new Date().toISOString().split('T')[0],
    });
  };

  if (payouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No payouts found for the selected period
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Gig</TableHead>
            <TableHead>Musician</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Paid Amount</TableHead>
            <TableHead>Paid Date</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow
              key={payout.gigRoleId}
              className={payout.paymentStatus === 'overdue' ? 'bg-red-50' : ''}
            >
              <TableCell>{format(new Date(payout.date), 'MMM d, yyyy')}</TableCell>
              <TableCell 
                className="font-medium text-primary hover:underline cursor-pointer"
                onClick={() => router.push(`/gigs/${payout.gigId}?from=money`)}
              >
                {payout.gigTitle}
              </TableCell>
              <TableCell>{payout.musicianName || '—'}</TableCell>
              <TableCell>{payout.roleName}</TableCell>
              <TableCell className="text-right">
                {payout.feeAmount ? formatCurrency(payout.feeAmount) : '—'}
              </TableCell>
              <TableCell>
                {payout.paymentStatus === 'overdue' && (
                  <AlertCircle className="inline-block mr-1 h-4 w-4 text-red-600" />
                )}
                {getStatusBadge(payout.paymentStatus)}
              </TableCell>
              <TableCell>
                {payout.paidAmount ? formatCurrency(payout.paidAmount) : '—'}
              </TableCell>
              <TableCell>
                {payout.paidDate ? format(new Date(payout.paidDate), 'MMM d, yyyy') : '—'}
              </TableCell>
              <TableCell>
                {payout.paymentStatus !== 'paid' ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleMarkAsPaid(payout)}
                    disabled={markAsPaidMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Paid
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

