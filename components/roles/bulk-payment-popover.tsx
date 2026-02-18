'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkSetPayment } from '@/lib/api/role-payment';
import { createClient } from '@/lib/supabase/client';
import { PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, Check } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/utils/currency';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];
const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Immediate' },
  { value: '30+', label: 'Net 30' },
  { value: '60+', label: 'Net 60' },
];

function termToDate(term: string): string | null {
  const now = new Date();
  if (term === 'immediate') return now.toISOString().split('T')[0];
  if (term === '30+') { now.setDate(now.getDate() + 30); return now.toISOString().split('T')[0]; }
  if (term === '60+') { now.setDate(now.getDate() + 60); return now.toISOString().split('T')[0]; }
  return null;
}

interface BulkPaymentPopoverProps {
  gigId: string;
  bandId: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export function BulkPaymentPopoverContent({
  gigId,
  bandId,
  onSaved,
  onClose,
}: BulkPaymentPopoverProps) {
  return (
    <PopoverContent align="end" side="top" className="w-72 p-5 font-sans">
      <div className="mb-4">
        <p className="text-base font-medium">Set Payment for All</p>
        <p className="text-xs text-muted-foreground mt-0.5">Apply to musicians without payment set yet.</p>
      </div>
      <BulkPaymentForm
        gigId={gigId}
        bandId={bandId}
        onSaved={onSaved}
        onClose={onClose}
      />
    </PopoverContent>
  );
}

function BulkPaymentForm({
  gigId,
  bandId,
  onSaved,
  onClose,
}: BulkPaymentPopoverProps) {
  const queryClient = useQueryClient();
  const [showCurrency, setShowCurrency] = useState(false);

  const [agreedFee, setAgreedFee] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const { data: info, isLoading } = useQuery({
    queryKey: ['bulk-payment-info', gigId, bandId],
    queryFn: async () => {
      const supabase = createClient();

      const { count } = await supabase
        .from('gig_roles')
        .select('id', { count: 'exact', head: true })
        .eq('gig_id', gigId)
        .is('agreed_fee', null);

      let bandDefaults = null;
      if (bandId) {
        const { data: band } = await supabase
          .from('bands')
          .select('default_fee, default_currency, default_payment_method')
          .eq('id', bandId)
          .single();
        if (band && (band.default_fee != null || band.default_payment_method != null)) {
          bandDefaults = band;
        }
      }

      return { eligibleCount: count ?? 0, bandDefaults };
    },
    enabled: !!gigId,
  });

  if (info?.bandDefaults && !defaultsApplied && !agreedFee && !paymentMethod) {
    if (info.bandDefaults.default_fee != null) {
      setAgreedFee(String(info.bandDefaults.default_fee));
    }
    if (info.bandDefaults.default_currency) {
      setCurrency(info.bandDefaults.default_currency);
      if (info.bandDefaults.default_currency !== 'ILS') setShowCurrency(true);
    }
    if (info.bandDefaults.default_payment_method) {
      setPaymentMethod(info.bandDefaults.default_payment_method);
    }
    setDefaultsApplied(true);
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      return bulkSetPayment(gigId, {
        agreedFee: agreedFee ? parseFloat(agreedFee) : null,
        currency,
        paymentMethod: paymentMethod || null,
        expectedPaymentDate: termToDate(paymentTerm),
      });
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['bulk-payment-info', gigId] });
      toast.success(`Payment set for ${count} musician${count !== 1 ? 's' : ''}`);
      onSaved();
    },
    onError: () => {
      toast.error('Failed to set payment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (info?.eligibleCount === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-xs text-muted-foreground">All musicians already have payment set.</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs mt-2" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs text-muted-foreground leading-none">
        {info?.eligibleCount ?? 0} musician{(info?.eligibleCount ?? 0) !== 1 ? 's' : ''} without payment
      </p>

      {/* Fee */}
      <div className="flex items-center gap-2">
        <Input
          inputMode="decimal"
          placeholder="Fee"
          value={agreedFee ? Number(agreedFee).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '');
            if (raw === '' || /^\d*\.?\d*$/.test(raw)) setAgreedFee(raw);
          }}
          className="h-9 text-sm flex-1 px-3"
          autoFocus
        />
        {showCurrency ? (
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="h-9 w-[60px] text-xs px-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => (
                <SelectItem key={c} value={c} className="text-sm">{getCurrencySymbol(c).trim()} {c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            type="button"
            onClick={() => setShowCurrency(true)}
            className="text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            {getCurrencySymbol(currency).trim()}<ChevronDown className="inline h-3.5 w-3.5 ml-0.5" />
          </button>
        )}
      </div>

      {/* Method */}
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

      {/* Payment terms */}
      <div className="flex gap-2">
        {PAYMENT_TERMS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPaymentTerm(paymentTerm === t.value ? '' : t.value)}
            className={cn(
              'flex-1 rounded-md border px-2 py-1.5 text-xs text-center transition-colors',
              paymentTerm === t.value
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-sm px-3"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-8 text-sm px-3"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
