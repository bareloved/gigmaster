'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/providers/user-provider';
import { getPersonalEarnings, updatePersonalEarnings } from '@/lib/api/personal-earnings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'ILS', label: 'ILS (₪)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
];

interface PersonalEarningsFormProps {
  gigId: string;
}

export function PersonalEarningsForm({ gigId }: PersonalEarningsFormProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['personal-earnings', gigId, user?.id],
    queryFn: () => getPersonalEarnings(gigId),
    enabled: !!user,
  });

  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState('ILS');
  const [notes, setNotes] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize form values when data loads
  if (data && !initialized) {
    setAmount(data.earnings.amount != null ? String(data.earnings.amount) : '');
    setCurrency(data.earnings.currency || 'ILS');
    setNotes(data.earnings.notes || '');
    setPaidAt(data.earnings.paidAt ? data.earnings.paidAt.split('T')[0] : '');
    setInitialized(true);
  }

  const mutation = useMutation({
    mutationFn: (params: { roleId: string; amount: number | null; currency: string; notes: string | null; paidAt: string | null; paymentMethod: string | null }) =>
      updatePersonalEarnings(params.roleId, {
        amount: params.amount,
        currency: params.currency,
        notes: params.notes,
        paidAt: params.paidAt,
        paymentMethod: params.paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personal-earnings', gigId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast.success('Earnings saved');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.roleId) return;

    mutation.mutate({
      roleId: data.roleId,
      amount: amount ? parseFloat(amount) : null,
      currency,
      notes: notes || null,
      paidAt: paidAt ? new Date(paidAt).toISOString() : null,
      paymentMethod: null,
    });
  };

  if (isLoading) return null;
  if (!data) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="h-4 w-4" />
          My Earnings
          {data.earnings.amount != null && (
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {CURRENCIES.find(c => c.value === (data.earnings.currency || 'ILS'))?.label.split(' ')[0]}{' '}
              {data.earnings.amount.toLocaleString()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="earnings-amount" className="text-xs">Amount</Label>
              <Input
                id="earnings-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="earnings-currency" className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="earnings-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="earnings-paid" className="text-xs">Payment Date</Label>
            <Input
              id="earnings-paid"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="earnings-notes" className="text-xs">Notes</Label>
            <Textarea
              id="earnings-notes"
              placeholder="e.g. Cash, Bit transfer..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={mutation.isPending}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4 mr-1" />
                Saved
              </>
            ) : mutation.isPending ? (
              'Saving...'
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Save Earnings
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
