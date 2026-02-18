'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { getPlayerPaymentInfo, updatePersonalEarnings } from '@/lib/api/personal-earnings';
import { formatCurrency } from '@/lib/utils/currency';
import { Lock, Banknote, CalendarClock, CreditCard, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];

interface PaymentSectionProps {
  gigId: string;
}

export function PaymentSection({ gigId }: PaymentSectionProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();

  const { data: paymentData, isLoading } = useQuery({
    queryKey: ['player-payment', gigId, user?.id],
    queryFn: () => getPlayerPaymentInfo(gigId),
    enabled: !!user && !!gigId,
  });

  // Personal tracking form state
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('ILS');
  const [notes, setNotes] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>('');
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form when data loads
  if (paymentData && !formInitialized) {
    const pe = paymentData.payment.personalEarnings;
    setAmount(pe.amount != null ? String(pe.amount) : '');
    setCurrency(pe.currency || 'ILS');
    setNotes(pe.notes || '');
    setPaidAt(pe.paidAt ? pe.paidAt.split('T')[0] : '');
    setFormInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!paymentData) throw new Error('No role found');
      return updatePersonalEarnings(paymentData.roleId, {
        amount: amount ? parseFloat(amount) : null,
        currency,
        notes: notes || null,
        paidAt: paidAt || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['player-payment', gigId] });
      toast.success('Earnings saved');
    },
    onError: () => {
      toast.error('Failed to save earnings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveMutation.mutate();
  };

  // Don't render if no user or still loading with no data
  if (!user) return null;
  if (isLoading) {
    return (
      <div className="border border-border/50 rounded-xl p-5 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-4" />
        <div className="space-y-3">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (!paymentData) return null;

  const { payment } = paymentData;
  const hasManagerData = payment.agreedFee != null;

  // Payment status for manager-set fee
  let statusText = '';
  let statusColor = '';
  if (hasManagerData) {
    if (payment.isPaid) {
      statusText = 'Paid';
      statusColor = 'text-green-600 dark:text-green-400';
    } else if (payment.expectedPaymentDate) {
      const dueDate = new Date(payment.expectedPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        statusText = 'Overdue';
        statusColor = 'text-red-600 dark:text-red-400';
      } else {
        statusText = `Due ${dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        statusColor = 'text-amber-600 dark:text-amber-400';
      }
    } else {
      statusText = 'Pending';
      statusColor = 'text-amber-600 dark:text-amber-400';
    }
  }

  return (
    <div className="border border-border/50 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Payment</h3>
        <div className="flex items-center gap-1 ml-auto text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="text-[11px]">Only visible to you</span>
        </div>
      </div>

      {/* Manager-set payment info (read-only) */}
      {hasManagerData && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Agreed Fee</span>
            <span className="font-semibold">{formatCurrency(payment.agreedFee!, payment.currency)}</span>
          </div>
          {payment.paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Method
              </span>
              <span className="text-sm">{payment.paymentMethod}</span>
            </div>
          )}
          {payment.expectedPaymentDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                Expected
              </span>
              <span className="text-sm">
                {new Date(payment.expectedPaymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
          </div>
          {payment.isPaid && payment.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Paid on</span>
              <span className="text-sm">
                {new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-xs text-muted-foreground flex items-center gap-1">
            <StickyNote className="h-3 w-3" />
            My Tracking
          </span>
        </div>
      </div>

      {/* Personal earnings form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pe-amount" className="text-xs">Amount</Label>
            <Input
              id="pe-amount"
              type="number"
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9"
            />
          </div>
          <div>
            <Label htmlFor="pe-currency" className="text-xs">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="pe-currency" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="pe-paid-at" className="text-xs">Payment Date</Label>
          <Input
            id="pe-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="pe-notes" className="text-xs">Notes</Label>
          <Textarea
            id="pe-notes"
            placeholder="Payment notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="w-full"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </form>
    </div>
  );
}
