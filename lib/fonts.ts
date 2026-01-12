import localFont from "next/font/local";
import { Bebas_Neue, Manrope, JetBrains_Mono } from "next/font/google";

// ==============================================================================
// VINTAGE STAGE DESIGN SYSTEM - TYPOGRAPHY
// Bold display fonts meet warm, readable body text
// ==============================================================================

// Display Font: Bebas Neue - Concert poster energy, bold and condensed
export const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
  preload: true,
  fallback: ["Impact", "Arial Black", "sans-serif"],
});

// Body Font: Manrope - Warm, modern, highly readable
export const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  preload: true,
  fallback: ["system-ui", "sans-serif"],
});

// Monospace: JetBrains Mono - For data, dates, numbers, code
export const jetBrainsMono = JetBrains_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
  fallback: ["Consolas", "Monaco", "monospace"],
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

