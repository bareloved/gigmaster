import localFont from "next/font/local";

// Use local fonts to avoid Google Fonts network dependency during build
export const heebo = localFont({
  src: [
    {
      path: "../public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-heebo",
  display: "swap",
  preload: false,
  fallback: ["system-ui", "sans-serif"],
});

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
  preload: false,
  fallback: ["system-ui", "serif"],
});

// Stage-friendly fonts for setlist PDF/preview
export const antonSC = localFont({
  src: [
    {
      path: "../public/fonts/anton-sc-400.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-anton-sc",
  display: "swap",
  preload: false,
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
  preload: false,
});

// Zalando Sans SemiExpanded - English UI font only (Variable Font)
export const zalandoSansEn = localFont({
  src: "../public/fonts/ZalandoSansSemiExpanded-VariableFont_wght.ttf",
  weight: "100 900",
  variable: "--font-zalando-en",
  display: "swap",
  preload: true,
});

