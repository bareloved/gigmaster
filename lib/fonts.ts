import localFont from "next/font/local";

// ==============================================================================
// CLEAN MINIMAL DESIGN - TYPOGRAPHY
// Helvetica Now Display for everything, Noto Sans Hebrew for Hebrew characters
// ==============================================================================

// Primary Font: Helvetica Now Display
export const helveticaNow = localFont({
  src: [
    {
      path: "../public/fonts/HelveticaNowDisplay-Light.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/HelveticaNowDisplay-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/HelveticaNowDisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-helvetica-now",
  display: "swap",
  preload: true,
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

// Hebrew characters support
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
