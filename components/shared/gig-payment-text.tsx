'use client';

import { formatCurrency } from '@/lib/utils/currency';

interface GigPaymentTextProps {
  agreedFee: number | null | undefined;
  currency: string | null | undefined;
  isPaid: boolean | null | undefined;
  paidAt: string | null | undefined;
  expectedPaymentDate: string | null | undefined;
  personalEarningsAmount: number | null | undefined;
  personalEarningsCurrency: string | null | undefined;
  className?: string;
}

export function GigPaymentText({
  agreedFee,
  currency,
  isPaid,
  expectedPaymentDate,
  personalEarningsAmount,
  personalEarningsCurrency,
  className = '',
}: GigPaymentTextProps) {
  // Determine amount and currency to display
  const amount = agreedFee ?? personalEarningsAmount;
  const displayCurrency = agreedFee != null
    ? (currency || 'ILS')
    : (personalEarningsCurrency || 'ILS');

  if (amount == null) return null;

  const formattedAmount = formatCurrency(amount, displayCurrency);

  // Determine status and color
  let statusText: string;
  let colorClass: string;

  if (agreedFee != null) {
    // Manager-set fee — use manager payment status
    if (isPaid) {
      statusText = 'Paid';
      colorClass = 'text-green-600 dark:text-green-400';
    } else if (expectedPaymentDate) {
      const dueDate = new Date(expectedPaymentDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        statusText = 'Overdue';
        colorClass = 'text-red-600 dark:text-red-400';
      } else {
        const formatted = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        statusText = `Due ${formatted}`;
        colorClass = 'text-amber-600 dark:text-amber-400';
      }
    } else {
      statusText = 'Pending';
      colorClass = 'text-amber-600 dark:text-amber-400';
    }
  } else {
    // Player-recorded only
    statusText = 'Recorded';
    colorClass = 'text-muted-foreground';
  }

  return (
    <span className={`text-xs whitespace-nowrap ${colorClass} ${className}`}>
      {formattedAmount} &middot; {statusText}
    </span>
  );
}
