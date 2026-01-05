/**
 * Phone number utilities
 * Helpers for formatting phone numbers with country codes
 */

/**
 * Common country codes
 */
export const COUNTRY_CODES = [
  { value: '+1', label: '+1 (USA/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+972', label: '+972 (Israel)' },
  { value: '+33', label: '+33 (France)' },
  { value: '+49', label: '+49 (Germany)' },
  { value: '+39', label: '+39 (Italy)' },
  { value: '+34', label: '+34 (Spain)' },
  { value: '+31', label: '+31 (Netherlands)' },
  { value: '+32', label: '+32 (Belgium)' },
  { value: '+41', label: '+41 (Switzerland)' },
  { value: '+61', label: '+61 (Australia)' },
  { value: '+64', label: '+64 (New Zealand)' },
  { value: '+81', label: '+81 (Japan)' },
  { value: '+86', label: '+86 (China)' },
  { value: '+91', label: '+91 (India)' },
  { value: '+55', label: '+55 (Brazil)' },
  { value: '+52', label: '+52 (Mexico)' },
  { value: '+27', label: '+27 (South Africa)' },
];

/**
 * Ensure phone number has country code
 * If it starts with a country code, return as-is
 * Otherwise, prepend the default country code
 */
export function ensureCountryCode(
  phone: string,
  defaultCountryCode: string = '+972'
): string {
  if (!phone) return '';
  
  const trimmed = phone.trim();
  
  // Already has country code (starts with +)
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  
  // Remove leading zeros if any
  const withoutLeadingZeros = trimmed.replace(/^0+/, '');
  
  // Prepend default country code
  return `${defaultCountryCode}${withoutLeadingZeros}`;
}

/**
 * Format phone number for display
 * If it starts with the default country code, remove it for cleaner display
 * Otherwise, show full international format
 */
export function formatPhoneForDisplay(
  phone: string | null,
  defaultCountryCode: string = '+972'
): string {
  if (!phone) return '';
  
  const trimmed = phone.trim();
  
  // If starts with default country code, remove it for cleaner display
  if (trimmed.startsWith(defaultCountryCode)) {
    return trimmed.substring(defaultCountryCode.length);
  }
  
  return trimmed;
}

/**
 * Format phone number for storage (full international format)
 */
export function formatPhoneForStorage(
  phone: string,
  defaultCountryCode: string = '+972'
): string {
  return ensureCountryCode(phone, defaultCountryCode);
}

/**
 * Basic phone number validation
 * Checks if the phone number has reasonable length and format
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Should start with + and have at least 10 digits total (including country code)
  return cleaned.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 16;
}

