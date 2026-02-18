'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bulkSetPayment } from '@/lib/api/role-payment';
import { createClient } from '@/lib/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];

interface BulkPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gigId: string;
  bandId: string | null;
  onSaved: () => void;
}

export function BulkPaymentDialog({
  open,
  onOpenChange,
  gigId,
  bandId,
  onSaved,
}: BulkPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Set Payment for All Musicians
          </DialogTitle>
          <DialogDescription className="text-sm">
            Set payment details for all lineup members who don&apos;t have payment set yet.
          </DialogDescription>
        </DialogHeader>

        {/* Inner form mounts/unmounts with open, naturally resetting state */}
        {open && (
          <BulkPaymentForm
            gigId={gigId}
            bandId={bandId}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BulkPaymentForm({
  gigId,
  bandId,
  onOpenChange,
  onSaved,
}: {
  gigId: string;
  bandId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  // Form state — fresh on every mount
  const [agreedFee, setAgreedFee] = useState<string>('');
  const [currency, setCurrency] = useState<string>('ILS');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  // Fetch count of roles without payment + band defaults
  const { data: info, isLoading } = useQuery({
    queryKey: ['bulk-payment-info', gigId, bandId],
    queryFn: async () => {
      const supabase = createClient();

      // Count roles without agreed_fee
      const { count } = await supabase
        .from('gig_roles')
        .select('id', { count: 'exact', head: true })
        .eq('gig_id', gigId)
        .is('agreed_fee', null);

      // Get band defaults if applicable
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

  // Pre-fill from band defaults (render-body pattern)
  if (info?.bandDefaults && !defaultsApplied && !agreedFee && !paymentMethod) {
    if (info.bandDefaults.default_fee != null) {
      setAgreedFee(String(info.bandDefaults.default_fee));
    }
    if (info.bandDefaults.default_currency) {
      setCurrency(info.bandDefaults.default_currency);
    }
    if (info.bandDefaults.default_payment_method) {
      setPaymentMethod(info.bandDefaults.default_payment_method);
    }
    setDefaultsApplied(true);
  }

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      return bulkSetPayment(gigId, {
        agreedFee: agreedFee ? parseFloat(agreedFee) : null,
        currency,
        paymentMethod: paymentMethod || null,
        expectedPaymentDate: expectedDate || null,
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
    e.stopPropagation(); // Portal bubbling fix
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Count badge */}
      <Badge variant="secondary" className="text-xs">
        {info?.eligibleCount ?? 0} musician{(info?.eligibleCount ?? 0) !== 1 ? 's' : ''} without payment
      </Badge>

      {info?.eligibleCount === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          All musicians already have payment set.
        </p>
      ) : (
        <>
          {/* Fee + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bp-fee" className="text-xs">Agreed Fee</Label>
              <Input
                id="bp-fee"
                type="number"
                step="0.01"
                placeholder="0"
                value={agreedFee}
                onChange={(e) => setAgreedFee(e.target.value)}
                className="h-9"
              />
            </div>
            <div>
              <Label htmlFor="bp-currency" className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="bp-currency" className="h-9">
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

          {/* Payment Method */}
          <div>
            <Label htmlFor="bp-method" className="text-xs">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="bp-method" className="h-9">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Date */}
          <div>
            <Label htmlFor="bp-date" className="text-xs">Expected Payment Date</Label>
            <Input
              id="bp-date"
              type="date"
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
              className="h-9"
            />
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        {(info?.eligibleCount ?? 0) > 0 && (
          <Button
            type="submit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : `Set for ${info?.eligibleCount ?? 0}`}
          </Button>
        )}
      </div>
    </form>
  );
}
