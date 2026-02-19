'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRolePaymentDefaults, updateRolePayment, getBandPaymentDefaults } from '@/lib/api/role-payment';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/currency';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChevronDown, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Bit', 'PayBox', 'Check', 'PayPal', 'Other'];
const PAYMENT_TERMS = [
  { value: 'immediate', label: 'Immediate' },
  { value: '30+', label: 'Net 30' },
  { value: '60+', label: 'Net 60' },
];

/** Data shape for local mode (passed to parent state) */
export interface LocalPaymentData {
  agreedFee: number | null;
  currency: string;
  paymentMethod: string | null;
  expectedPaymentDate: string | null;
}

/* ── Discriminated union props ────────────────── */

interface DbModeProps {
  mode: 'db';
  roleId: string;
  bandId: string | null;
  onSaved: () => void;
  onClose: () => void;
}

interface LocalModeProps {
  mode: 'local';
  bandId: string | null;
  initialData?: LocalPaymentData | null;
  onSaveLocal: (data: LocalPaymentData) => void;
  onClose: () => void;
}

type RolePaymentPopoverProps = DbModeProps | LocalModeProps;

export function RolePaymentPopoverContent(props: RolePaymentPopoverProps) {
  return (
    <PopoverContent align="end" side="bottom" className="w-auto min-w-40 max-w-56 px-3.5 py-4 font-sans">
      {props.mode === 'db' ? (
        <DbRolePaymentInner
          roleId={props.roleId}
          bandId={props.bandId}
          onSaved={props.onSaved}
          onClose={props.onClose}
        />
      ) : (
        <LocalRolePaymentInner
          bandId={props.bandId}
          initialData={props.initialData}
          onSaveLocal={props.onSaveLocal}
          onClose={props.onClose}
        />
      )}
    </PopoverContent>
  );
}

/** Convert a term to an ISO date string from today */
function termToDate(term: string): string | null {
  const now = new Date();
  if (term === 'immediate') return now.toISOString().split('T')[0];
  if (term === '30+') { now.setDate(now.getDate() + 30); return now.toISOString().split('T')[0]; }
  if (term === '60+') { now.setDate(now.getDate() + 60); return now.toISOString().split('T')[0]; }
  return null;
}

/** Convert a saved expected_payment_date back to a term */
function dateToTerm(date: string | null): string {
  if (!date) return '';
  const d = new Date(date + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diffDays <= 1) return 'immediate';
  if (diffDays >= 25 && diffDays <= 35) return '30+';
  if (diffDays >= 55 && diffDays <= 65) return '60+';
  return '';
}

/* ── DB mode (existing behaviour) ─────────────── */

function DbRolePaymentInner({
  roleId,
  bandId,
  onSaved,
  onClose,
}: {
  roleId: string;
  bandId: string | null;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const { data: defaults, isLoading } = useQuery({
    queryKey: ['role-payment-defaults', roleId, bandId],
    queryFn: () => getRolePaymentDefaults(roleId, bandId),
    enabled: !!roleId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasPayment = !!defaults?.current;

  if (hasPayment && !editing) {
    const c = defaults.current!;
    return (
      <PaymentSummary
        fee={c.agreedFee}
        currency={c.currency}
        method={c.paymentMethod}
        expectedDate={c.expectedPaymentDate}
        isPaid={c.isPaid}
        onEdit={() => setEditing(true)}
      />
    );
  }

  return (
    <RolePaymentForm
      mode="db"
      roleId={roleId}
      defaults={defaults}
      onSaved={onSaved}
      onClose={hasPayment ? () => setEditing(false) : onClose}
    />
  );
}

/* ── Local mode (pre-save) ────────────────────── */

function LocalRolePaymentInner({
  bandId,
  initialData,
  onSaveLocal,
  onClose,
}: {
  bandId: string | null;
  initialData?: LocalPaymentData | null;
  onSaveLocal: (data: LocalPaymentData) => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);

  const { data: bandDefaults, isLoading } = useQuery({
    queryKey: ['band-payment-defaults', bandId],
    queryFn: () => getBandPaymentDefaults(bandId!),
    enabled: !!bandId && !initialData,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasPayment = initialData && initialData.agreedFee != null;

  if (hasPayment && !editing) {
    return (
      <PaymentSummary
        fee={initialData.agreedFee}
        currency={initialData.currency}
        method={initialData.paymentMethod}
        expectedDate={initialData.expectedPaymentDate}
        isPaid={false}
        hidePaidStatus
        onEdit={() => setEditing(true)}
      />
    );
  }

  return (
    <RolePaymentForm
      mode="local"
      initialData={initialData}
      bandDefaults={bandDefaults}
      onSaveLocal={onSaveLocal}
      onClose={hasPayment ? () => setEditing(false) : onClose}
    />
  );
}

/* ── View mode ─────────────────────────────────── */

function formatExpectedDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - now.getTime()) / 86400000);
  const short = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (diffDays <= 1) return 'Immediate';
  if (diffDays >= 25 && diffDays <= 35) return `Net 30 · ${short}`;
  if (diffDays >= 55 && diffDays <= 65) return `Net 60 · ${short}`;
  return short;
}

function PaymentSummary({
  fee,
  currency,
  method,
  expectedDate,
  isPaid,
  hidePaidStatus,
  onEdit,
}: {
  fee: number | null;
  currency: string;
  method: string | null;
  expectedDate: string | null;
  isPaid: boolean;
  hidePaidStatus?: boolean;
  onEdit: () => void;
}) {
  const timing = formatExpectedDate(expectedDate);

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-base font-medium leading-tight truncate">
          {fee != null ? formatCurrency(fee, currency) : '—'}
        </p>
        <p className="text-xs text-muted-foreground leading-tight mt-2">
          {method && <span>{method}</span>}
          {method && timing && <span> · </span>}
          {timing && <span>{timing}</span>}
        </p>
        {!hidePaidStatus && (
          <p className="text-xs leading-tight mt-0.5">
            {isPaid ? (
              <span className="text-green-600 dark:text-green-400 font-medium">Paid</span>
            ) : fee != null ? (
              <span className="text-red-500 dark:text-red-400">Unpaid</span>
            ) : null}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 mt-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── Edit form (shared between DB and local mode) ── */

type DbFormProps = {
  mode: 'db';
  roleId: string;
  defaults: Awaited<ReturnType<typeof getRolePaymentDefaults>> | undefined;
  onSaved: () => void;
  onClose: () => void;
};

type LocalFormProps = {
  mode: 'local';
  initialData?: LocalPaymentData | null;
  bandDefaults?: { defaultFee: number | null; defaultCurrency: string | null; defaultPaymentMethod: string | null } | null;
  onSaveLocal: (data: LocalPaymentData) => void;
  onClose: () => void;
};

type RolePaymentFormProps = DbFormProps | LocalFormProps;

function RolePaymentForm(props: RolePaymentFormProps) {
  const { mode, onClose } = props;
  const queryClient = useQueryClient();

  const [agreedFee, setAgreedFee] = useState('');
  const [currency, setCurrency] = useState('ILS');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentTerm, setPaymentTerm] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paidAt, setPaidAt] = useState('');
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form from defaults (DB mode)
  if (mode === 'db' && props.defaults && !formInitialized) {
    const defaults = props.defaults;
    if (defaults.current) {
      setAgreedFee(defaults.current.agreedFee != null ? String(defaults.current.agreedFee) : '');
      setCurrency(defaults.current.currency || 'ILS');
      setPaymentMethod(defaults.current.paymentMethod || '');
      setPaymentTerm(dateToTerm(defaults.current.expectedPaymentDate));
      setIsPaid(defaults.current.isPaid);
      setPaidAt(defaults.current.paidAt ? defaults.current.paidAt.split('T')[0] : '');
    } else if (defaults.lastGig) {
      setAgreedFee(String(defaults.lastGig.agreedFee));
      setCurrency(defaults.lastGig.currency || 'ILS');
      setPaymentMethod(defaults.lastGig.paymentMethod || '');
      setAutoFillSource('Last gig');
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

  // Initialize form from initialData or bandDefaults (local mode)
  if (mode === 'local' && !formInitialized) {
    if (props.initialData && props.initialData.agreedFee != null) {
      setAgreedFee(String(props.initialData.agreedFee));
      setCurrency(props.initialData.currency || 'ILS');
      setPaymentMethod(props.initialData.paymentMethod || '');
      setPaymentTerm(dateToTerm(props.initialData.expectedPaymentDate ?? null));
    } else if (props.bandDefaults) {
      if (props.bandDefaults.defaultFee != null) {
        setAgreedFee(String(props.bandDefaults.defaultFee));
      }
      if (props.bandDefaults.defaultCurrency) {
        setCurrency(props.bandDefaults.defaultCurrency);
      }
      if (props.bandDefaults.defaultPaymentMethod) {
        setPaymentMethod(props.bandDefaults.defaultPaymentMethod);
      }
      setAutoFillSource('Band default');
    }
    setFormInitialized(true);
  }

  // DB mode mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (mode !== 'db') throw new Error('Invalid mode');
      const data = {
        agreedFee: agreedFee ? parseFloat(agreedFee) : null,
        currency,
        paymentMethod: paymentMethod || null,
        expectedPaymentDate: termToDate(paymentTerm),
        isPaid,
        paidAt: isPaid && paidAt ? paidAt : null,
      };
      return updateRolePayment(props.roleId, data);
    },
    onSuccess: () => {
      if (mode === 'db') {
        queryClient.invalidateQueries({ queryKey: ['role-payment-defaults', props.roleId] });
        toast.success('Payment saved');
        props.onSaved();
      }
    },
    onError: () => {
      toast.error('Failed to save payment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (mode === 'local') {
      props.onSaveLocal({
        agreedFee: agreedFee ? parseFloat(agreedFee) : null,
        currency,
        paymentMethod: paymentMethod || null,
        expectedPaymentDate: termToDate(paymentTerm),
      });
    } else {
      saveMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {autoFillSource && (
        <p className="text-[11px] text-muted-foreground leading-none">{autoFillSource}</p>
      )}

      {/* Fee */}
      <div className="flex items-center gap-1.5">
        <Input
          inputMode="decimal"
          placeholder="Fee"
          value={agreedFee ? Number(agreedFee).toLocaleString('en-US', { maximumFractionDigits: 2 }) : ''}
          onChange={(e) => {
            const raw = e.target.value.replace(/,/g, '');
            if (raw === '' || /^\d*\.?\d*$/.test(raw)) setAgreedFee(raw);
          }}
          className="h-8 text-sm flex-1 px-3"
          autoFocus
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 h-8 bg-transparent px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {getCurrencySymbol(currency).trim()}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto min-w-[120px] p-1" align="end">
            {CURRENCIES.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent ${c === currency ? 'bg-accent font-medium' : ''}`}
              >
                <span className="w-5 text-center">{getCurrencySymbol(c).trim()}</span>
                {c}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Method */}
      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Method" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_METHODS.map(m => (
            <SelectItem key={m} value={m} className="text-sm">{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payment terms */}
      <div className="flex gap-1.5">
        {PAYMENT_TERMS.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => setPaymentTerm(paymentTerm === t.value ? '' : t.value)}
            className={cn(
              'flex-1 rounded-md border px-1.5 py-1 text-[11px] text-center transition-colors',
              paymentTerm === t.value
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border text-muted-foreground hover:border-primary/50'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Paid toggle — only in DB mode (not relevant before save) */}
      {mode === 'db' && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">Paid</span>
          <Switch
            checked={isPaid}
            onCheckedChange={(checked) => {
              setIsPaid(checked);
              if (checked && !paidAt) {
                setPaidAt(new Date().toISOString().split('T')[0]);
              }
            }}
            className="scale-90"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-1.5 pt-0.5">
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
          className="h-7 text-xs px-2.5"
          disabled={mode === 'db' && saveMutation.isPending}
        >
          {mode === 'db' && saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </form>
  );
}
