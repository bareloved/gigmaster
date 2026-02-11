/**
 * Utilities for detecting and converting between plain-text and HTML setlists.
 * The `gig.setlist` column stores either raw text (legacy) or HTML (new editor).
 */

/** Returns true if the string looks like HTML (contains common tags). */
export function isHtmlSetlist(content: string): boolean {
  return /<\/?(?:p|br|div|strong|em|u|h[1-6])\b/i.test(content);
}

/** Escape HTML entities in a plain string. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Convert a plain-text setlist (newline-separated) into simple HTML
 * that Tiptap can edit. Each line becomes a `<p>`.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => `<p>${escapeHtml(line) || "<br>"}</p>`)
    .join("");
}

/**
 * Strip HTML to plain text. Converts `<p>`, `<br>`, and `<div>` boundaries
 * to newlines, then removes remaining tags.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
