/**
 * WhatsApp Utilities
 * 
 * Generate WhatsApp deep links for sending invitations
 */

/**
 * Generate WhatsApp link to send invitation
 * Opens WhatsApp with pre-filled message containing magic link
 */
export function generateWhatsAppInviteLink(
  phone: string,
  gigTitle: string,
  hostName: string | null,
  roleName: string,
  magicLink: string
): string {
  // Build invitation message
  const message = `Hi! 🎵

You've been invited to play *${roleName}* for:
${hostName ? `Host: ${hostName}\n` : ''}${gigTitle}

Click here to accept:
${magicLink}

Looking forward to having you on this gig!`;

  // Normalize phone for wa.me (needs country code, digits only)
  const cleanPhone = normalizePhoneForWhatsApp(phone);

  // URL encode the message
  const encodedMessage = encodeURIComponent(message);

  // Return WhatsApp wa.me link
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Normalize a phone number for WhatsApp wa.me links.
 * wa.me expects digits only with country code (no leading + or 0).
 * Israeli local numbers (starting with 0) get 972 prefix automatically.
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  // Strip everything except digits and +
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    // Already has country code — just remove the +
    return cleaned.slice(1);
  }

  if (cleaned.startsWith("0")) {
    // Local Israeli number (e.g. 0501234567) → 972501234567
    return "972" + cleaned.slice(1);
  }

  // Assume it already has a country code without +
  return cleaned;
}

/**
 * Validate phone number format
 * Should be in international format starting with +
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Basic validation: starts with +, then digits, min 10 chars
  const phoneRegex = /^\+\d{10,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ''));
}

/**
 * Format phone number for display
 * Adds spaces for readability
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Return as-is if already formatted or invalid
  if (!cleaned.startsWith('+') || cleaned.length < 10) {
    return phone;
  }
  
  // Format: +XX XXX XXX XXXX (basic formatting)
  const countryCode = cleaned.slice(0, 3);
  const rest = cleaned.slice(3);
  const formatted = rest.match(/.{1,3}/g)?.join(' ') || rest;
  
  return `${countryCode} ${formatted}`;
}

