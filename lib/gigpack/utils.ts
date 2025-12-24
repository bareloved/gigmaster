import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  
  // Add random suffix to ensure uniqueness
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `${base}-${randomSuffix}`;
}

/**
 * Format a date for display
 * @param date - Date string or Date object
 * @param locale - Locale code (default: "en")
 */
export function formatDate(date: string | Date | null, locale: string = "en"): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const localeCode = locale === "he" ? "he-IL" : "en-US";
  return d.toLocaleDateString(localeCode, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Get the full public URL for a GigPack
 * @param slug - The public slug of the GigPack
 * @param locale - The locale code (default: "en")
 * @returns The full URL to the public GigPack page
 */
export function getPublicGigPackUrl(slug: string, locale: string = "en"): string {
  // Try to get from environment variable first
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (appUrl) {
    return `${appUrl}/${locale}/g/${slug}`;
  }
  
  // Fallback to window.location.origin on client side
  if (typeof window !== "undefined") {
    return `${window.location.origin}/${locale}/g/${slug}`;
  }
  
  // Development fallback
  return `http://localhost:3000/${locale}/g/${slug}`;
}

