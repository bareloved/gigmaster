'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { getPlayerPaymentInfo, updatePersonalEarnings } from '@/lib/api/personal-earnings';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/currency';
import { Lock, Banknote, CalendarClock, CreditCard, StickyNote, ChevronDown, Coins, CircleDot, CalendarDays, MessageSquareText, CircleCheckBig, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];

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
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paidAt, setPaidAt] = useState<string>('');
  const [showCurrency, setShowCurrency] = useState(false);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form when data loads
  if (paymentData && !formInitialized) {
    const pe = paymentData.payment.personalEarnings;
    setAmount(pe.amount != null ? String(pe.amount) : '');
    setCurrency(pe.currency || 'ILS');
    setPaymentMethod(pe.paymentMethod || '');
    setNotes(pe.notes || '');
    setPaidAt(pe.paidAt ? pe.paidAt.split('T')[0] : '');
    if (pe.currency && pe.currency !== 'ILS') setShowCurrency(true);
    // Auto-expand if no manager data, or if player already has tracking
    const hasManager = paymentData.payment.agreedFee != null;
    const hasTracking = pe.amount != null;
    setTrackingOpen(!hasManager || hasTracking);
    setFormInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!paymentData) throw new Error('No role found');
      return updatePersonalEarnings(paymentData.roleId, {
        amount: amount ? parseFloat(amount) : null,
        currency,
        paymentMethod: paymentMethod || null,
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

  // Quick mark-as-paid: copies manager fee and saves directly
  const [markAsPaidPending, setMarkAsPaidPending] = useState(false);
  const handleMarkAsPaid = async () => {
    if (!paymentData || !paymentData.payment.agreedFee) return;
    const p = paymentData.payment;
    const today = new Date().toISOString().split('T')[0];

    setMarkAsPaidPending(true);
    try {
      await updatePersonalEarnings(paymentData.roleId, {
        amount: p.agreedFee!,
        currency: p.currency,
        paymentMethod: p.paymentMethod || null,
        notes: notes || null,
        paidAt: today,
      });
      // Update local form state to reflect the save
      setAmount(String(p.agreedFee!));
      setCurrency(p.currency);
      if (p.paymentMethod) setPaymentMethod(p.paymentMethod);
      setPaidAt(today);
      if (p.currency !== 'ILS') setShowCurrency(true);
      queryClient.invalidateQueries({ queryKey: ['player-payment', gigId] });
      toast.success('Marked as paid');
    } catch {
      toast.error('Failed to save');
    } finally {
      setMarkAsPaidPending(false);
    }
  };

  // Don't render if no user or still loading with no data
  if (!user) return null;
  if (isLoading) {
    return (
      <div className="relative border border-border/50 rounded-xl p-5 pt-6 animate-pulse">
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background px-2 text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span className="text-[11px]">Only visible to you</span>
        </div>
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
    <div className="relative border border-border/50 rounded-xl p-5 pt-6">
      {/* "Only visible to you" legend on the border */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background px-2 text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span className="text-[11px]">Only visible to you</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Payment</h3>
      </div>

      {/* Manager-set payment info (read-only) */}
      {hasManagerData && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5" />
              Agreed Fee
            </span>
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
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CircleDot className="h-3.5 w-3.5" />
              Status
            </span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
          </div>
          {payment.isPaid && payment.paidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CircleCheckBig className="h-3.5 w-3.5" />
                Paid on
              </span>
              <span className="text-sm">
                {new Date(payment.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick "Mark as Paid" — copies manager fee into personal tracking and saves */}
      {hasManagerData && !amount && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 mb-2"
          disabled={markAsPaidPending}
          onClick={handleMarkAsPaid}
        >
          <CircleCheck className="h-3.5 w-3.5" />
          {markAsPaidPending ? 'Saving...' : 'Mark Agreed Fee as Paid'}
        </Button>
      )}

      {/* Divider — clickable toggle when manager data exists */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center">
          {hasManagerData ? (
            <button
              type="button"
              onClick={() => setTrackingOpen(prev => !prev)}
              className="bg-background px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <StickyNote className="h-3 w-3" />
              My Tracking
              <ChevronDown className={`h-3 w-3 transition-transform ${trackingOpen ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <span className="bg-background px-2 text-xs text-muted-foreground flex items-center gap-1">
              <StickyNote className="h-3 w-3" />
              My Tracking
            </span>
          )}
        </div>
      </div>

      {/* Personal earnings form */}
      <form onSubmit={handleSubmit} className={`space-y-3 overflow-hidden transition-all duration-200 ${trackingOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex items-center gap-1.5">
          <Input
            inputMode="decimal"
            placeholder="Amount"
            value={amount ? Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
            onChange={(e) => {
              const raw = e.target.value.replace(/,/g, '');
              if (raw === '' || /^\d*\.?\d*$/.test(raw)) setAmount(raw);
            }}
            className="h-9 text-sm flex-1 px-3"
          />
          {showCurrency ? (
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-9 w-[60px] text-xs px-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{getCurrencySymbol(c).trim()} {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button
              type="button"
              onClick={() => setShowCurrency(true)}
              className="text-sm text-muted-foreground hover:text-foreground shrink-0"
            >
              {getCurrencySymbol(currency).trim()}<ChevronDown className="inline h-3 w-3 ml-0.5" />
            </button>
          )}
        </div>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m} value={m} className="text-sm">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <Label htmlFor="pe-paid-at" className="text-xs flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-muted-foreground" />
            Payment Date
          </Label>
          <Input
            id="pe-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="pe-notes" className="text-xs flex items-center gap-1">
            <MessageSquareText className="h-3 w-3 text-muted-foreground" />
            Notes
          </Label>
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
