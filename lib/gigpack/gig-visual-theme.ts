/**
 * Visual Theme Classifier for Gig Packs
 *
 * This module provides an intelligent classification system for selecting visual themes
 * and fallback background images for gigs based on:
 * 1. Explicit gig type (strongest signal)
 * 2. Venue name keywords (secondary signal)
 * 3. Gig title and band name keywords (tertiary signal)
 * 4. Generic fallback (weakest signal)
 */


/**
 * Visual themes representing different gig aesthetics.
 * Each theme maps to a set of themed fallback images.
 */
export type GigVisualTheme =
  | "weddingParty"
  | "coffeehouse"
  | "barGig"
  | "jazzClub"
  | "clubStage"
  | "corporateEvent"
  | "festivalStage"
  | "rehearsalRoom"
  | "genericMusic";

/**
 * Keyword mappings for venue-based classification (English)
 */
const VENUE_KEYWORDS: Record<GigVisualTheme, string[]> = {
  coffeehouse: ["coffee", "café", "cafe", "roastery", "house", "grind", "barista"],
  barGig: ["bar", "pub", "tavern", "lounge", "taproom"],
  jazzClub: ["jazz", "note", "stage", "theatre", "theater", "hall"],
  corporateEvent: ["hotel", "ballroom", "conference", "center", "convention", "center", "event space"],
  festivalStage: ["park", "arena", "stadium", "square", "festival", "fairground"],
  weddingParty: [],
  clubStage: [],
  rehearsalRoom: [],
  genericMusic: [],
};

/**
 * Keyword mappings for venue-based classification (Hebrew)
 */
const VENUE_KEYWORDS_HE: Record<GigVisualTheme, string[]> = {
  coffeehouse: ["קפה", "בית קפה", "קליה", "ביסטרו"],
  barGig: ["בר", "פאב", "טברנה", "לאונז"],
  jazzClub: ["ג'אז", "מועדון", "סטודיו", "תאטרון", "אולם"],
  corporateEvent: ["מלון", "אולם", "כנס", "מרכז", "אירוע חברתי"],
  festivalStage: ["פסטיבל", "גן", "ארנה", "רחוב", "פתח אוויר"],
  weddingParty: [],
  clubStage: [],
  rehearsalRoom: [],
  genericMusic: [],
};

/**
 * Keyword mappings for content-based classification (English)
 */
const CONTENT_KEYWORDS: Record<GigVisualTheme, string[]> = {
  jazzClub: ["jazz", "trio", "quartet", "swing"],
  coffeehouse: ["acoustic", "unplugged", "duo", "solo"],
  weddingParty: ["wedding", "chuppah", "simcha", "ceremony", "bride", "groom"],
  corporateEvent: ["corporate", "gala", "awards", "conference"],
  festivalStage: ["festival", "open air", "outdoor"],
  clubStage: ["hip hop", "funk", "party", "night", "club", "dj"],
  barGig: [],
  rehearsalRoom: [],
  genericMusic: [],
};

/**
 * Keyword mappings for content-based classification (Hebrew)
 */
const CONTENT_KEYWORDS_HE: Record<GigVisualTheme, string[]> = {
  jazzClub: ["ג'אז", "ג'ז", "טריו", "קוורטט", "סווינג"],
  coffeehouse: ["אקוסטי", "אקוסטית", "דואו", "סולו", "שירה אקוסטית"],
  weddingParty: ["חתונה", "חופה", "סימחה", "טקס", "חתן", "כלה"],
  corporateEvent: ["חברתי", "קורפורטיבי", "גאלה", "כנס", "אירוע"],
  festivalStage: ["פסטיבל", "פסטיבלים", "פתוח", "פתח אוויר"],
  clubStage: ["מועדון", "ריקודים", "דיסקו", "מסיבה", "פסטה"],
  barGig: [],
  rehearsalRoom: [],
  genericMusic: [],
};

/**
 * Fallback image paths for each theme.
 * Supports multiple images per theme for variety.
 * Files are located in public/gig-fallbacks/
 */
const THEME_IMAGES: Record<GigVisualTheme, string[]> = {
  weddingParty: ["/gig-fallbacks/wedding-1.jpeg", "/gig-fallbacks/wedding-2.jpeg"],
  coffeehouse: ["/gig-fallbacks/coffeehouse-1.jpeg", "/gig-fallbacks/coffeehouse-2.jpeg"],
  barGig: ["/gig-fallbacks/bar-1.jpeg", "/gig-fallbacks/bar-2.jpeg"],
  jazzClub: ["/gig-fallbacks/jazz-club-1.jpeg", "/gig-fallbacks/jazz-club-2.jpeg"],
  clubStage: ["/gig-fallbacks/club-stage-1.jpeg", "/gig-fallbacks/club-stage-2.jpeg"],
  corporateEvent: ["/gig-fallbacks/corporate-1.jpeg", "/gig-fallbacks/corporate-2.jpeg"],
  festivalStage: ["/gig-fallbacks/festival-1.jpeg", "/gig-fallbacks/festival-2.jpeg"],
  rehearsalRoom: ["/gig-fallbacks/rehearsal-1.jpeg"],
  genericMusic: ["/gig-fallbacks/generic-1.jpeg", "/gig-fallbacks/generic-2.jpeg"],
};

/**
 * Map explicit gig types to visual themes
 */
function mapGigTypeToTheme(gigType: string | null): GigVisualTheme | null {
  if (!gigType) return null;

  const mapping: Record<string, GigVisualTheme> = {
    wedding: "weddingParty",
    club_show: "clubStage",
    corporate: "corporateEvent",
    bar_gig: "barGig",
    coffee_house: "coffeehouse",
    concert_hall: "jazzClub",
    festival: "festivalStage",
    rehearsal: "rehearsalRoom",
  };

  return mapping[gigType] || null;
}

/**
 * Search for keywords in a string (case-insensitive)
 */
function hasKeywords(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}

/**
 * Simplified gig data for theme classification
 */
interface GigForTheme {
  title: string;
  venue_name?: string | null;
  band_name?: string | null;
  gig_type?: string | null;
}

/**
 * Classify gig visual theme based on gig type, venue name, and title/band name
 *
 * @param gig - Gig data for classification
 * @returns GigVisualTheme representing the visual style for this gig
 *
 * Decision tree priority:
 * 1. Gig type (if explicitly set)
 * 2. Venue name keywords (English and Hebrew)
 * 3. Gig title + band name keywords (English and Hebrew)
 * 4. Generic music (fallback)
 */
export function classifyGigVisualTheme(gig: GigForTheme): GigVisualTheme {
  // Priority 1: Gig type (strongest signal)
  const typeTheme = mapGigTypeToTheme(gig.gig_type || null);
  if (typeTheme) {
    return typeTheme;
  }

  // Priority 2: Venue name (secondary signal)
  if (gig.venue_name) {
    // Check English venue keywords
    for (const [theme, keywords] of Object.entries(VENUE_KEYWORDS)) {
      if (keywords.length > 0 && hasKeywords(gig.venue_name, keywords)) {
        return theme as GigVisualTheme;
      }
    }
    // Check Hebrew venue keywords
    for (const [theme, keywords] of Object.entries(VENUE_KEYWORDS_HE)) {
      if (keywords.length > 0 && hasKeywords(gig.venue_name, keywords)) {
        return theme as GigVisualTheme;
      }
    }
  }

  // Priority 3: Gig title and band name (tertiary signal)
  const contentText = [gig.title, gig.band_name]
    .filter(Boolean)
    .join(" ");

  if (contentText) {
    // Check English content keywords
    for (const [theme, keywords] of Object.entries(CONTENT_KEYWORDS)) {
      if (keywords.length > 0 && hasKeywords(contentText, keywords)) {
        return theme as GigVisualTheme;
      }
    }
    // Check Hebrew content keywords
    for (const [theme, keywords] of Object.entries(CONTENT_KEYWORDS_HE)) {
      if (keywords.length > 0 && hasKeywords(contentText, keywords)) {
        return theme as GigVisualTheme;
      }
    }
  }

  // Priority 4: Fallback to generic
  return "genericMusic";
}

/**
 * Pick a fallback image URL for a given visual theme
 * Uses deterministic selection based on gig ID for consistent results
 *
 * @param theme - GigVisualTheme to get fallback image for
 * @param gigId - Gig ID to ensure consistent selection across refreshes
 * @returns Path to the fallback image (relative to public directory)
 */
export function pickFallbackImageForTheme(theme: GigVisualTheme, gigId?: string): string {
  const images = THEME_IMAGES[theme];
  if (!images || images.length === 0) {
    // Fallback to generic if theme not found
    return THEME_IMAGES.genericMusic[0];
  }

  // If only one image available, return it
  if (images.length === 1) {
    return images[0];
  }

  // Use deterministic selection based on gig ID to ensure consistency
  if (gigId) {
    // Create a simple hash from the gig ID
    let hash = 0;
    for (let i = 0; i < gigId.length; i++) {
      const char = gigId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % images.length;
    return images[index];
  }

  // Fallback to first image if no gigId provided
  return images[0];
}

/**
 * Get the fallback image for a gig based on its visual theme classification
 *
 * @param gig - Gig data for classification
 * @param gigId - Gig ID for deterministic image selection
 * @returns Path to the fallback image
 */
export function getGigFallbackImage(gig: GigForTheme, gigId?: string): string {
  const theme = classifyGigVisualTheme(gig);
  return pickFallbackImageForTheme(theme, gigId);
}

