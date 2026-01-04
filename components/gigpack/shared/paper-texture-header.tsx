import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface PaperColors {
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  label: string;
}

interface PaperTextureHeaderProps {
  initials: string;
  colors: PaperColors;
  size?: "default" | "small" | "thumbnail" | "compact";
  showGradient?: boolean;
}

// =============================================================================
// COLOR PALETTE
// =============================================================================

/**
 * Soft paper texture color palette
 * Each variant has gentle, low-saturation tones for a cohesive "paper" feel
 */
const PAPER_PALETTE: PaperColors[] = [
  {
    bgLight: "#ddd0bd", // Warm cream (darker)
    bgDark: "#3f3d38",
    textLight: "#3d3630",
    textDark: "#e8e6e0",
    label: "warm-cream",
  },
  {
    bgLight: "#c9d6e0", // Soft blue-gray (darker)
    bgDark: "#364045",
    textLight: "#2d3842",
    textDark: "#dce8f0",
    label: "blue-gray",
  },
  {
    bgLight: "#ccdacc", // Sage green (darker)
    bgDark: "#39423a",
    textLight: "#2f3c30",
    textDark: "#dfe8df",
    label: "sage-green",
  },
  {
    bgLight: "#ddd0bd", // Warm beige (darker)
    bgDark: "#433d37",
    textLight: "#3d332d",
    textDark: "#ede5dd",
    label: "warm-beige",
  },
  {
    bgLight: "#d3cdd9", // Soft lavender (darker)
    bgDark: "#3d3a43",
    textLight: "#37313d",
    textDark: "#e5e2ed",
    label: "soft-lavender",
  },
  {
    bgLight: "#cfd0d5", // Cool gray (darker)
    bgDark: "#3a3c3e",
    textLight: "#34363a",
    textDark: "#e3e5e7",
    label: "cool-gray",
  },
];

// =============================================================================
// COLOR SELECTION LOGIC
// =============================================================================

/**
 * Determine paper colors for a gig based on stable hash
 */
export function getPaperFallbackColors(gig: {
  id: string;
  title: string;
}): PaperColors {

  // Fallback: stable hash from gig.id
  const hash = gig.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PAPER_PALETTE[hash % PAPER_PALETTE.length];
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Paper texture header for gig cards without images
 * Features a subtle noise/texture overlay for an analog, printed feel
 */
export function PaperTextureHeader({
  initials,
  colors,
  size = "default",
  showGradient = true,
}: PaperTextureHeaderProps) {
  const sizeClasses = {
    default: { height: "h-60", text: "text-6xl", rounded: "rounded-t-lg" },
    small: { height: "h-48", text: "text-5xl", rounded: "rounded-t-lg" },
    thumbnail: { height: "h-16 w-16", text: "text-xl", rounded: "rounded-md" },
    compact: { height: "h-10 w-10", text: "text-sm", rounded: "rounded-md" },
  };

  const classes = sizeClasses[size];
  const isSmallVariant = size === "thumbnail" || size === "compact";

  return (
    <div
      className={cn(
        "flex items-center justify-center relative overflow-hidden",
        classes.height,
        classes.rounded,
        !isSmallVariant && "w-full"
      )}
      style={{
        backgroundColor: colors.bgLight,
      }}
    >
      {/* Initials - behind texture for faded effect */}
      <span
        className={cn("font-bold", classes.text)}
        style={{
          color: colors.textLight,
          opacity: 0.6,
          zIndex: 5,
        }}
      >
        <span className="dark:hidden">{initials}</span>
        <span
          className="hidden dark:inline"
          style={{
            color: colors.textDark,
          }}
        >
          {initials}
        </span>
      </span>

      {/* Paper texture overlay using lightweight SVG noise */}
      <div
        className="absolute inset-0 opacity-30 dark:opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
          zIndex: 8,
        }}
      />

      {/* Dark mode overlay */}
      <div
        className="absolute inset-0 opacity-0 dark:opacity-100 transition-opacity"
        style={{
          backgroundColor: colors.bgDark,
          zIndex: 4,
        }}
      />

      {/* Gradient for text readability - Spotify style (optional) */}
      {showGradient && (
        <div className="absolute inset-0 bg-gradient-to-b from-transparent from-30% via-black/30 to-black/60" style={{ zIndex: 9 }} />
      )}
    </div>
  );
}

