// Adapted from vendor/gigpack/lib/gig-visual-theme.ts
import type { GigPack, Band } from "./types";

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

function mapGigTypeToTheme(gigType: string | null): GigVisualTheme | null {
  if (!gigType) return null;

  const mapping: Record<string, GigVisualTheme> = {
    wedding: "weddingParty",
    club_show: "clubStage",
    corporate: "corporateEvent",
    bar_gig: "barGig",
    coffee_house: "coffeehouse",
    festival: "festivalStage",
    rehearsal: "rehearsalRoom",
  };

  return mapping[gigType] || null;
}

function hasKeywords(text: string | null | undefined, keywords: string[]): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => lowerText.includes(keyword));
}

export function classifyGigVisualTheme(options: {
  gig: GigPack;
  band?: Band | null;
}): GigVisualTheme {
  const { gig, band } = options;

  const typeTheme = mapGigTypeToTheme(gig.gig_type);
  if (typeTheme) {
    return typeTheme;
  }

  if (gig.venue_name) {
    for (const [theme, keywords] of Object.entries(VENUE_KEYWORDS)) {
      if (keywords.length > 0 && hasKeywords(gig.venue_name, keywords)) {
        return theme as GigVisualTheme;
      }
    }
    for (const [theme, keywords] of Object.entries(VENUE_KEYWORDS_HE)) {
      if (keywords.length > 0 && hasKeywords(gig.venue_name, keywords)) {
        return theme as GigVisualTheme;
      }
    }
  }

  const contentText = [gig.title, gig.band_name, band?.name]
    .filter(Boolean)
    .join(" ");

  if (contentText) {
    for (const [theme, keywords] of Object.entries(CONTENT_KEYWORDS)) {
      if (keywords.length > 0 && hasKeywords(contentText, keywords)) {
        return theme as GigVisualTheme;
      }
    }
    for (const [theme, keywords] of Object.entries(CONTENT_KEYWORDS_HE)) {
      if (keywords.length > 0 && hasKeywords(contentText, keywords)) {
        return theme as GigVisualTheme;
      }
    }
  }

  return "genericMusic";
}

export function pickFallbackImageForTheme(theme: GigVisualTheme, gigId?: string): string {
  const images = THEME_IMAGES[theme];
  if (!images || images.length === 0) {
    return THEME_IMAGES.genericMusic[0];
  }

  if (images.length === 1) {
    return images[0];
  }

  if (gigId) {
    let hash = 0;
    for (let i = 0; i < gigId.length; i++) {
      const char = gigId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const index = Math.abs(hash) % images.length;
    return images[index];
  }

  return images[0];
}
