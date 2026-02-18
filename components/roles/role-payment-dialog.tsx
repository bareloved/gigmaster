'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRolePaymentDefaults, updateRolePayment, type RolePaymentData } from '@/lib/api/role-payment';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];

interface RolePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleId: string;
  musicianName: string;
  roleName: string;
  bandId: string | null;
  onSaved: () => void;
}

export function RolePaymentDialog({
  open,
  onOpenChange,
  roleId,
  musicianName,
  roleName,
  bandId,
  onSaved,
}: RolePaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Payment — {musicianName}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {roleName ? `${roleName} role` : 'Set payment details for this musician'}
          </DialogDescription>
        </DialogHeader>

        {/* Inner form mounts/unmounts with open, naturally resetting state */}
        {open && (
          <RolePaymentForm
            roleId={roleId}
            bandId={bandId}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RolePaymentForm({
  roleId,
  bandId,
  onOpenChange,
  onSaved,
}: {
  roleId: string;
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
      setAutoFillSource(null);
    } else if (defaults.lastGig) {
      setAgreedFee(String(defaults.lastGig.agreedFee));
      setCurrency(defaults.lastGig.currency || 'ILS');
      setPaymentMethod(defaults.lastGig.paymentMethod || '');
      setAutoFillSource('From last gig');
    } else if (defaults.bandDefaults) {
      if (defaults.bandDefaults.defaultFee != null) {
        setAgreedFee(String(defaults.bandDefaults.defaultFee));
      }
      if (defaults.bandDefaults.defaultCurrency) {
        setCurrency(defaults.bandDefaults.defaultCurrency);
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
      {/* Auto-fill hint */}
      {autoFillSource && (
        <Badge variant="secondary" className="text-xs">
          {autoFillSource}
        </Badge>
      )}

      {/* Fee + Currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rp-fee" className="text-xs">Agreed Fee</Label>
          <Input
            id="rp-fee"
            type="number"
            step="0.01"
            placeholder="0"
            value={agreedFee}
            onChange={(e) => setAgreedFee(e.target.value)}
            className="h-9"
          />
        </div>
        <div>
          <Label htmlFor="rp-currency" className="text-xs">Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger id="rp-currency" className="h-9">
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
        <Label htmlFor="rp-method" className="text-xs">Payment Method</Label>
        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
          <SelectTrigger id="rp-method" className="h-9">
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
        <Label htmlFor="rp-date" className="text-xs">Expected Payment Date</Label>
        <Input
          id="rp-date"
          type="date"
          value={expectedDate}
          onChange={(e) => setExpectedDate(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Paid toggle */}
      <div className="flex items-center justify-between py-1">
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
          <Label htmlFor="rp-paid-at" className="text-xs">Paid On</Label>
          <Input
            id="rp-paid-at"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="h-9"
          />
        </div>
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
        <Button
          type="submit"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
