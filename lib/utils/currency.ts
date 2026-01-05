/**
 * Currency utility functions
 * Shared helpers for currency symbol mapping and number formatting
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  JPY: '¥',
  CHF: 'CHF ',
  ILS: '₪',
};

/**
 * Get currency symbol for a given currency code
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'ILS')
 * @returns Currency symbol (e.g., '$', '₪')
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || `${currency} `;
}

/**
 * Format a number as currency with proper decimal places and thousand separators
 * @param amount - The amount to format
 * @param currency - ISO 4217 currency code
 * @returns Formatted currency string (e.g., "₪1,500.00")
 */
export function formatCurrency(amount: number, currency: string = 'ILS'): string {
  const symbol = getCurrencySymbol(currency);
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

/**
 * Format a number with thousand separators
 * @param num - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string (e.g., "1,500.00")
 */
export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

