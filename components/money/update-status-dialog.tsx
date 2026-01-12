'use client';

/**
 * Update Payment Status Dialog
 * 
 * NOTE: Currently unused - kept for future complex payment updates
 * 
 * The current Money View uses a simple one-click "Paid" button instead.
 * This dialog provides full control over payment status, amount, and date
 * for more complex scenarios like partial payments or setting specific dates.
 * 
 * May be reintroduced if users need more granular payment control.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { updatePaymentStatus } from '@/lib/api/money';
import { PaymentStatus } from '@/lib/types/shared';
import { toast } from 'sonner';

interface UpdatePaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigRoleId: string;
  gigTitle: string;
  feeAmount: number;
  currentStatus: PaymentStatus;
}

export function UpdatePaymentStatusDialog({
  open,
  onOpenChange,
  gigRoleId,
  gigTitle,
  feeAmount,
  currentStatus,
}: UpdatePaymentStatusDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>(currentStatus);
  const [paidAmount, setPaidAmount] = useState<string>(feeAmount.toString());
  const [paidDate, setPaidDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: updatePaymentStatus,
    onSuccess: () => {
      toast.success('Payment status updated');
      // Invalidate and refetch all earnings and payouts queries
      queryClient.invalidateQueries({ 
        queryKey: ['my-earnings'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['payouts'],
        refetchType: 'active'
      });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to update payment status';
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    mutation.mutate({
      gigRoleId,
      paymentStatus: status,
      paidAmount: (status === 'paid' || status === 'partial') 
        ? parseFloat(paidAmount) 
        : null,
      paidDate: (status === 'paid' || status === 'partial') 
        ? paidDate 
        : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Payment Status</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Gig: {gigTitle}</p>
            <p className="text-sm text-muted-foreground">
              Fee: ₪{feeAmount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Payment Status</Label>
            <RadioGroup value={status} onValueChange={(v) => setStatus(v as PaymentStatus)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pending" id="pending" />
                <Label htmlFor="pending">Pending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="paid" id="paid" />
                <Label htmlFor="paid">Paid</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial">Partial</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="overdue" id="overdue" />
                <Label htmlFor="overdue">Overdue</Label>
              </div>
            </RadioGroup>
          </div>

          {(status === 'paid' || status === 'partial') && (
            <>
              <div className="space-y-2">
                <Label htmlFor="paidAmount">
                  {status === 'paid' ? 'Paid Amount' : 'Partial Amount'}
                </Label>
                <Input
                  id="paidAmount"
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidDate">Paid Date</Label>
                <Input
                  id="paidDate"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

