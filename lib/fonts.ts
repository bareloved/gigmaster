import localFont from "next/font/local";

// Primary UI font - Zalando Sans (preload for critical rendering)
export const zalandoSansEn = localFont({
  src: "../public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf",
  weight: "100 900",
  variable: "--font-zalando-en",
  display: "swap",
  preload: true, // Only preload the primary UI font
  fallback: ["system-ui", "sans-serif"],
});

// Secondary/Display fonts - Load on demand for setlist/print views
export const anton = localFont({
  src: [
    {
      path: "../public/fonts/anton-sc-400.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-anton",
  display: "swap",
  preload: false, // Don't preload - used only in specific views
  fallback: ["system-ui", "serif"],
});

export const notoSansHebrew = localFont({
  src: [
    {
      path: "../public/fonts/noto-sans-hebrew-800.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-noto-sans-hebrew",
  display: "swap",
  preload: false, // Don't preload - used only for Hebrew content
});

// Aliases for backwards compatibility
export const heebo = zalandoSansEn; // Heebo was duplicate of Zalando Sans
export const antonSC = anton; // antonSC was duplicate of anton

