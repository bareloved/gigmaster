import { SetlistSection, GigPackTheme, GigPackTemplateDefaultValues } from "./types";

/**
 * GigPack Template Type
 * 
 * Represents a pre-configured template that prefills the GigPack form
 * with sensible defaults for common gig scenarios.
 * 
 * Used for both built-in templates and converted user templates.
 */
export interface GigPackTemplate {
  id: string;
  label: string;
  description: string;
  icon: string; // Emoji or simple icon
  defaultValues: GigPackTemplateDefaultValues;
  isUserTemplate?: boolean; // Flag to identify user-created templates
}

/**
 * Helper to generate structured setlist sections with placeholder songs
 */
function createSection(name: string, songTitles: string[] = []): SetlistSection {
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: generateId(),
    name,
    songs: songTitles.map((title, index) => ({
      id: generateId() + `-${index}`,
      title,
      artist: "",
      key: "",
      tempo: "",
      notes: "",
    })),
  };
}

/**
 * Built-in GigPack Templates
 * 
 * These templates provide quick-start configurations for common gig types.
 * Each template includes sensible defaults that users can customize.
 */
export const GIGPACK_TEMPLATES: GigPackTemplate[] = [
  // WEDDING
  {
    id: "wedding",
    label: "Wedding",
    description: "Full wedding night – ceremony + reception with 2–3 sets",
    icon: "💍",
    defaultValues: {
      title: "Wedding – [Couple Names]",
      dressCode: "Smart / semi-formal",
      backlineNotes: "Full backline usually provided. Confirm PA system and monitors.",
      parkingNotes: "Check with venue coordinator for band parking and load-in access.",
      paymentNotes: "Typically 50% deposit, remainder on day. Confirm payment schedule.",
      theme: "minimal",
      accentColor: "#F97316",
      setlistStructured: [
        createSection("Ceremony", []),
        createSection("Cocktail Hour", []),
        createSection("Reception Set 1", []),
        createSection("Reception Set 2", []),
        createSection("Encore / Final Dance", []),
      ],
    },
  },

  // CLUB NIGHT
  {
    id: "club",
    label: "Club Night",
    description: "High-energy club set with multiple sets and encores",
    icon: "🔥",
    defaultValues: {
      title: "Club Night @ [Venue Name]",
      dressCode: "Dark clothing, stage-friendly",
      backlineNotes: "House backline available. Bring your own cymbals, snare, and pedals.",
      parkingNotes: "Street parking or nearby lot. Load-in through back entrance.",
      theme: "minimal",
      accentColor: "#EF4444",
      setlistStructured: [
        createSection("Set 1", []),
        createSection("Set 2", []),
        createSection("Encore", []),
      ],
    },
  },

  // CORPORATE EVENT
  {
    id: "corporate",
    label: "Corporate Event",
    description: "Professional event – background music + party set",
    icon: "✨",
    defaultValues: {
      title: "Corporate Event – [Client Name]",
      dressCode: "Smart casual / business attire",
      backlineNotes: "Full PA and lighting usually provided. Confirm technical rider in advance.",
      parkingNotes: "Valet or designated parking. Ask for load-in instructions.",
      paymentNotes: "Invoice after event. Net-30 payment terms typical.",
      theme: "minimal",
      accentColor: "#3B82F6",
      setlistStructured: [
        createSection("Background Set", []),
        createSection("Party Set", []),
      ],
    },
  },

  // BAR GIG
  {
    id: "bar",
    label: "Bar Gig",
    description: "Classic 3-set bar night",
    icon: "🍺",
    defaultValues: {
      title: "Bar Gig @ [Bar Name]",
      dressCode: "Casual, comfortable",
      backlineNotes: "Usually house PA. Bring your own instruments and pedals.",
      parkingNotes: "Street parking. Load-in through side door.",
      paymentNotes: "Cash at end of night or Venmo/PayPal.",
      theme: "minimal",
      accentColor: "#F59E0B",
      setlistStructured: [
        createSection("Set 1", []),
        createSection("Set 2", []),
        createSection("Set 3", []),
      ],
    },
  },

  // SESSION / STUDIO
  {
    id: "session",
    label: "Session / Studio",
    description: "Recording session or studio call sheet",
    icon: "🎙️",
    defaultValues: {
      title: "Studio Session – [Project Name]",
      dressCode: "Comfortable, quiet clothing (avoid noisy jewelry)",
      backlineNotes: "Studio gear provided. Bring your own instruments if specified.",
      parkingNotes: "Studio parking available. Arrive 15 mins early for setup.",
      paymentNotes: "Session rate: confirm hourly or flat fee.",
      theme: "minimal",
      accentColor: "#8B5CF6",
      setlistStructured: [
        createSection("Tracks to Record", []),
        createSection("Overdubs / Extras", []),
      ],
    },
  },

  // FESTIVAL
  {
    id: "festival",
    label: "Festival",
    description: "Outdoor festival set with stage times and logistics",
    icon: "🎪",
    defaultValues: {
      title: "Festival @ [Festival Name]",
      dressCode: "Weather-appropriate, comfortable for outdoor stage",
      backlineNotes: "Festival backline provided. Submit technical rider early. Expect quick changeover.",
      parkingNotes: "Artist parking pass required. Follow festival load-in schedule.",
      paymentNotes: "Festival contract payment. Confirm schedule and terms.",
      theme: "minimal",
      accentColor: "#10B981",
      setlistStructured: [
        createSection("Festival Set", []),
      ],
    },
  },
];

/**
 * Get a template by its ID
 */
export function getTemplateById(templateId: string): GigPackTemplate | undefined {
  return GIGPACK_TEMPLATES.find((t) => t.id === templateId);
}

/**
 * Get default empty form values (for "blank" template)
 */
export function getEmptyGigPackDefaults() {
  return {
    title: "",
    bandName: "",
    date: "",
    callTime: "",
    onStageTime: "",
    venueName: "",
    venueAddress: "",
    venueMapsUrl: "",
    lineup: [{ role: "", name: "", notes: "" }],
    setlistStructured: [],
    dressCode: "",
    backlineNotes: "",
    parkingNotes: "",
    paymentNotes: "",
    internalNotes: "",
    theme: "minimal" as GigPackTheme,
    accentColor: "",
    bandLogoUrl: "",
    heroImageUrl: "",
  };
}

/**
 * Apply template defaults to form initial values
 */
export function applyTemplateToFormDefaults(template: GigPackTemplate) {
  const baseDefaults = getEmptyGigPackDefaults();
  const { defaultValues } = template;

  // Calculate date if offset is provided
  let calculatedDate = baseDefaults.date;
  if (defaultValues.dateOffsetDays !== undefined) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + defaultValues.dateOffsetDays);
    calculatedDate = targetDate.toISOString().split("T")[0];
  }

  return {
    ...baseDefaults,
    title: defaultValues.title || baseDefaults.title,
    bandName: defaultValues.bandName || baseDefaults.bandName,
    date: calculatedDate,
    theme: defaultValues.theme || baseDefaults.theme,
    accentColor: defaultValues.accentColor || baseDefaults.accentColor,
    dressCode: defaultValues.dressCode || baseDefaults.dressCode,
    backlineNotes: defaultValues.backlineNotes || baseDefaults.backlineNotes,
    parkingNotes: defaultValues.parkingNotes || baseDefaults.parkingNotes,
    paymentNotes: defaultValues.paymentNotes || baseDefaults.paymentNotes,
    setlistStructured: defaultValues.setlistStructured || baseDefaults.setlistStructured,
    gigMood: defaultValues.gigMood || "",
    packingChecklist: defaultValues.packingChecklist || [],
  };
}



