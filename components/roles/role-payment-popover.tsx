'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRolePaymentDefaults, updateRolePayment, type RolePaymentData } from '@/lib/api/role-payment';
import { PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];

interface RolePaymentPopoverProps {
  roleId: string;
  bandId: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export function RolePaymentPopoverContent({
  roleId,
  bandId,
  onSaved,
  onClose,
}: RolePaymentPopoverProps) {
  return (
    <PopoverContent align="end" side="bottom" className="w-64 p-3">
      <RolePaymentForm
        roleId={roleId}
        bandId={bandId}
        onSaved={onSaved}
        onClose={onClose}
      />
    </PopoverContent>
  );
}

function RolePaymentForm({
  roleId,
  bandId,
  onSaved,
  onClose,
}: RolePaymentPopoverProps) {
  const queryClient = useQueryClient();
  const [showCurrency, setShowCurrency] = useState(false);

  // Form state — fresh on every mount
  const [agreedFee, setAgreedFee] = useState<string>('');
  const [currency, setCurrency] = useState<string>('ILS');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [paidAt, setPaidAt] = useState<string>('');
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);
  const [formInitialized, setFormInitialized] = useState(false);

  // Fetch defaults
  const { data: defaults, isLoading } = useQuery({
    queryKey: ['role-payment-defaults', roleId, bandId],
    queryFn: () => getRolePaymentDefaults(roleId, bandId),
    enabled: !!roleId,
  });

  // Initialize form from fetched defaults (render-body pattern)
  if (defaults && !formInitialized) {
    if (defaults.current) {
      setAgreedFee(defaults.current.agreedFee != null ? String(defaults.current.agreedFee) : '');
      setCurrency(defaults.current.currency || 'ILS');
      setPaymentMethod(defaults.current.paymentMethod || '');
      setExpectedDate(defaults.current.expectedPaymentDate ? defaults.current.expectedPaymentDate.split('T')[0] : '');
      setIsPaid(defaults.current.isPaid);
      setPaidAt(defaults.current.paidAt ? defaults.current.paidAt.split('T')[0] : '');
      if (defaults.current.currency && defaults.current.currency !== 'ILS') {
        setShowCurrency(true);
      }
    } else if (defaults.lastGig) {
      setAgreedFee(String(defaults.lastGig.agreedFee));
      setCurrency(defaults.lastGig.currency || 'ILS');
      setPaymentMethod(defaults.lastGig.paymentMethod || '');
      setAutoFillSource('Last gig');
      if (defaults.lastGig.currency && defaults.lastGig.currency !== 'ILS') {
        setShowCurrency(true);
      }
    } else if (defaults.bandDefaults) {
      if (defaults.bandDefaults.defaultFee != null) {
        setAgreedFee(String(defaults.bandDefaults.defaultFee));
      }
      if (defaults.bandDefaults.defaultCurrency) {
        setCurrency(defaults.bandDefaults.defaultCurrency);
        if (defaults.bandDefaults.defaultCurrency !== 'ILS') {
          setShowCurrency(true);
        }
      }
      if (defaults.bandDefaults.defaultPaymentMethod) {
        setPaymentMethod(defaults.bandDefaults.defaultPaymentMethod);
      }
      setAutoFillSource('Band default');
    }
    setFormInitialized(true);
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      const data: RolePaymentData = {
        agreedFee: agreedFee ? parseFloat(agreedFee) : null,
        currency,
        paymentMethod: paymentMethod || null,
        expectedPaymentDate: expectedDate || null,
        isPaid,
        paidAt: isPaid && paidAt ? paidAt : null,
      };
      return updateRolePayment(roleId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-payment-defaults', roleId] });
      toast.success('Payment saved');
      onSaved();
    },
    onError: () => {
      toast.error('Failed to save payment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {/* Auto-fill hint */}
      {autoFillSource && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {autoFillSource}
        </Badge>
      )}

      {/* Fee row — inline with currency toggle */}
      <div>
        <Label htmlFor="rp-fee" className="text-[11px] text-muted-foreground">Fee</Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="rp-fee"
            type="number"
            step="0.01"
            placeholder="0"
            value={agreedFee}
            onChange={(e) => setAgreedFee(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          {showCurrency ? (
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="h-7 w-[72px] text-xs px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map(c => (
                  <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <button
              type="button"
              onClick={() => setShowCurrency(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
            >
              {currency} <ChevronDown className="inline h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="rp-method" className="text-[11px] text-muted-foreground">Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger id="rp-method" className="h-7 text-sm">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map(m => (
              <SelectItem key={m} value={m} className="text-sm">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expected Date */}
      <div>
        <Label htmlFor="rp-date" className="text-[11px] text-muted-foreground">Expected date</Label>
        <Input
          id="rp-date"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="h-7 text-sm"
        />
      </div>

      {/* Paid toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="rp-paid" className="text-sm">Paid</Label>
        <Switch
          id="rp-paid"
          checked={isPaid}
          onCheckedChange={(checked) => {
            setIsPaid(checked);
            if (checked && !paidAt) {
              setPaidAt(new Date().toISOString().split('T')[0]);
            }
          }}
        />
      </div>

      {/* Paid date (shown when paid) */}
      {isPaid && (
        <div>
          <Label htmlFor="rp-paid-at" className="text-[11px] text-muted-foreground">Paid on</Label>
          <Input
            id="rp-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="h-7 text-sm"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-1.5 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs px-3"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
