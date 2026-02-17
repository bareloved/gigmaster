import localFont from "next/font/local";

// ==============================================================================
// CLEAN MINIMAL DESIGN - TYPOGRAPHY
// Helvetica Now Display for Latin characters, Ploni for Hebrew characters
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

// Hebrew font: Ploni
// unicode-range restricts this font to the Hebrew Unicode blocks so the browser
// always uses Ploni for Hebrew characters regardless of fallback-stack order.
// Helvetica Now Display contains some Hebrew glyphs which would otherwise win
// because it appears first in the font-sans stack.
//
// Ranges covered:
//   U+0590-05FF  Hebrew block (alef-bet, vowels, cantillation marks, punctuation)
//   U+FB1D-FB4F  Hebrew Presentation Forms (precomposed ligatures used in some fonts)
//   U+200F        Right-to-Left Mark (RTL control character — keeps spacing correct)
export const ploni = localFont({
  src: [
    {
      path: "../public/fonts/ploni-ultralight-aaa.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-light-aaa.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-regular-aaa.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-medium-aaa.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-demibold-aaa.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-bold-aaa.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-ultrabold-aaa.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/ploni-black-aaa.otf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-ploni",
  display: "swap",
  preload: false,
  declarations: [
    {
      prop: "unicode-range",
      value:
        "U+0590-05FF, U+200F, U+FB1D-FB4F",
    },
  ],
});
