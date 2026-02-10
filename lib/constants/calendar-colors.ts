/**
 * Calendar color palette for bands.
 * Each band gets a unique color on the calendar, cycled from this palette.
 */

export const CALENDAR_COLORS = [
  "#b07340", // copper (matches primary accent)
  "#5b8a72", // sage
  "#8b6f4e", // walnut
  "#7a6e8a", // dusty plum
  "#a0764a", // caramel
  "#6a8590", // slate teal
  "#946b6b", // rosewood
  "#7a8b5c", // olive
  "#8c7a60", // driftwood
  "#6b7a8c", // storm blue
] as const;

/** Color for gigs with no band (standalone / personal gigs) */
export const PERSONAL_GIG_COLOR = "#9a9088"; // warm gray

/** Get a color from the palette by index (wraps around) */
export function getColorForIndex(index: number): string {
  return CALENDAR_COLORS[index % CALENDAR_COLORS.length];
}
