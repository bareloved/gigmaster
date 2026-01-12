"use client";

import * as React from "react";

const toTitleCaseEn = (value: string): string => {
  if (!value) return value;
  return value
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;

      const alphaOnly = word.replace(/[^A-Za-z]/g, "");
      if (alphaOnly.length > 1 && alphaOnly === alphaOnly.toUpperCase()) {
        return word;
      }

      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const formatKeyTokens = (text: string): string => {
  if (!text) return text;

  // Match standalone key tokens like: em, gm, f#m, bbm, C, D#, Bb, etc.
  // We avoid touching parts of longer words by using "word" boundaries.
  return text.replace(
    /(?<![A-Za-z0-9])([A-Ga-g])([#b♯♭]?)(m?)(?![A-Za-z0-9])/g,
    (_, letter: string, accidental: string, minor: string) => {
      // Base letter: always uppercase (e → E)
      const base = letter.toUpperCase();

      // Normalize accidental to symbols: # → ♯, b → ♭, keep ♯/♭ as-is
      let acc = "";
      if (accidental === "#" || accidental === "♯") {
        acc = "♯";
      } else if (accidental === "b" || accidental === "♭") {
        acc = "♭";
      }

      // Minor marker: accept m or M, normalize to lowercase "m"
      const mPart = minor === "m" || minor === "M" ? "m" : "";

      return `${base}${acc}${mPart}`;
    }
  );
};

export type SetlistAutoPrintProps = {
  title?: string;
  location?: string;
  date?: string;
  lines: string[];
  options?: { numbered?: boolean };
  direction: "rtl" | "ltr";
  align: "left" | "right" | "center";
};

// Font sizing configuration - makes magic numbers explicit and configurable
const FONT_SIZING_CONFIG = {
  baseFontSize: 36,
  minFontSize: 22,
  maxFontSize: 50.7,
  headerMargin: 8,

  // Scaling factors for different song counts
  // These were derived from the original "boost" calculations
  scalingFactors: {
    small: { maxCount: 9, factor: 1.0 },     // 1-9 songs
    medium: { maxCount: 16, factor: 1.15 },  // 10-16 songs
    large: { maxCount: 22, factor: 1.22 },   // 17-22 songs
    xlarge: { maxCount: 24, factor: 1.01 },  // 23-24 songs
    xxlarge: { maxCount: Infinity, factor: 0.96 }, // 25+ songs
  },

  // Special cases for very specific counts
  specialCases: {
    23: 0.98,
    24: 1.04,
    25: { maxSize: 38 },
  },
} as const;

/**
 * Calculate optimal font size for setlist based on available space and content
 */
function calculateOptimalFontSize(
  containerHeight: number,
  headerHeight: number,
  listHeight: number,
  songCount: number
): number {
  const availableHeight = Math.max(0, containerHeight - headerHeight - FONT_SIZING_CONFIG.headerMargin);

  if (availableHeight <= 0 || listHeight <= 0) {
    return FONT_SIZING_CONFIG.baseFontSize;
  }

  const rawScale = availableHeight / listHeight;

  // Get scaling factor based on song count
  let scalingFactor: number = FONT_SIZING_CONFIG.scalingFactors.small.factor;
  for (const [, config] of Object.entries(FONT_SIZING_CONFIG.scalingFactors)) {
    if (songCount <= config.maxCount) {
      scalingFactor = config.factor;
      break;
    }
  }

  // Apply special case adjustments
  if (songCount in FONT_SIZING_CONFIG.specialCases) {
    const specialCase = FONT_SIZING_CONFIG.specialCases[songCount as keyof typeof FONT_SIZING_CONFIG.specialCases];
    if (typeof specialCase === 'number') {
      scalingFactor = specialCase;
    }
  }

  let fontSize = FONT_SIZING_CONFIG.baseFontSize * rawScale * scalingFactor;

  // Apply clamping
  fontSize = Math.max(FONT_SIZING_CONFIG.minFontSize, Math.min(fontSize, FONT_SIZING_CONFIG.maxFontSize));

  // Special case for 25+ songs
  if (songCount >= 25) {
    const maxForLargeSetlists = FONT_SIZING_CONFIG.specialCases[25]?.maxSize || 38;
    fontSize = Math.min(fontSize, maxForLargeSetlists);
  }

  return fontSize;
}

export function SetlistAutoPrint({
  title,
  location,
  date,
  lines,
  options,
  direction,
  align,
}: SetlistAutoPrintProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const headerRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLOListElement | null>(null);

  const [fontSizePx, setFontSizePx] = React.useState<number>(FONT_SIZING_CONFIG.baseFontSize);
  const [hasSized, setHasSized] = React.useState(false);

  const songLines = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed !== "" && trimmed !== "-";
  });
  const songCount = songLines.length;
  const isRTL = direction === "rtl";
  const shouldTitleCase = !isRTL;

  React.useEffect(() => {
    if (!containerRef.current || !headerRef.current || !listRef.current) return;
    if (lines.length === 0) return;
    if (hasSized) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const headerRect = headerRef.current.getBoundingClientRect();
    const listRect = listRef.current.getBoundingClientRect();

    const optimalFontSize = calculateOptimalFontSize(
      containerRect.height,
      headerRect.height,
      listRect.height,
      songCount
    );

    setFontSizePx(optimalFontSize);
    setHasSized(true);
  }, [lines.length, hasSized, songCount]);

  const lineHeight = songCount >= 23 ? 1.05 : 1.1;

  const rawTitle = title?.trim() || "Setlist";
  const displayTitle = shouldTitleCase ? toTitleCaseEn(rawTitle) : rawTitle;

  return (
    <div
      ref={containerRef}
      className="setlist-print-root mx-auto bg-white min-h-screen flex flex-col"
    >
      <div
        dir={direction}
        className={`w-full ${align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"}`}
        style={{ textAlign: align as React.CSSProperties["textAlign"] }}
      >
        <div
          ref={headerRef}
          className="mb-4 pb-2 w-full"
          style={{ pageBreakInside: "avoid" }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-center w-full">
            {displayTitle}
          </h1>
          {(location || date) && (
            <p
              className={`mt-0.25 text-base font-semibold w-full ${
                direction === "rtl" ? "text-right" : "text-center"
              }`}
            >
              {location && date ? `${location} • ${date}` : location || date}
            </p>
          )}
          <div className="mt-3 flex justify-center w-full">
            <div className="w-4/5 border-t border-black" />
          </div>
        </div>

        <main className={`w-full ${direction === "rtl" ? "text-right" : "text-left"}`}>
          {lines.length === 0 ? (
            <p className="text-center text-sm text-gray-500">(No songs in setlist)</p>
          ) : (
            <ol ref={listRef} className="list-none w-full" style={{ margin: 0, padding: 0 }}>
              {(() => {
                let songIndex = 0;
                return lines.map((line, index) => {
                  const trimmed = line.trim();
                  const isBreak = trimmed === "-";

                  if (isBreak) {
                    return (
                      <li key={index} className="my-3 flex justify-center">
                        <div className="w-4/5 border-t-2 border-black" />
                      </li>
                    );
                  }

                  // Skip completely empty lines (in case they sneak in)
                  if (trimmed === "") {
                    return null;
                  }

                  songIndex += 1;
                  
                  const [rawTitlePart, rawNotePart] = line.split("|", 2);
                  const titlePart = (rawTitlePart ?? "").trim();
                  const notePart = (rawNotePart ?? "").trim();

                  const displayTitlePart = shouldTitleCase
                    ? toTitleCaseEn(titlePart || line)
                    : (titlePart || line);
                  
                  const displayNotePart = notePart ? formatKeyTokens(notePart) : "";
                  const noteNodes = displayNotePart
                    ? displayNotePart.split(/(♯|♭)/).map((part, idx) => {
                        if (part === "♯" || part === "♭") {
                          const isSharp = part === "♯";

                          return (
                            <span
                              key={`acc-${idx}`}
                              className="inline-block align-baseline"
                              style={{
                                fontSize: `${fontSizePx * 0.5}px`,
                                fontWeight: 800,
                                position: "relative",
                                top: "-0.25em",
                                marginLeft: isSharp ? "0.02em" : "-0.10em",
                                marginRight: isSharp ? "0.04em" : "-0.04em",
                              }}
                            >
                              {part}
                            </span>
                          );
                        }

                        return <span key={`txt-${idx}`}>{part}</span>;
                      })
                    : null;

                  return (
                    <li
                      key={index}
                      className="font-extrabold w-full"
                      style={{
                        fontSize: fontSizePx,
                        lineHeight,
                        fontWeight: 800,
                        display: 'block',
                      }}
                    >
                      {options?.numbered ? `${songIndex}. ` : ""}
                      <span>{displayTitlePart}</span>
                      {noteNodes && (
                        <span
                          className="text-gray-500"
                          style={{ 
                            fontSize: `${fontSizePx * 0.6}px`, 
                            fontWeight: 600,
                            marginLeft: direction === 'rtl' ? '0' : '0.5rem',
                            marginRight: direction === 'rtl' ? '0.5rem' : '0',
                          }}
                        >
                          • {noteNodes}
                        </span>
                      )}
                    </li>
                  );
                });
              })()}
            </ol>
          )}
        </main>
      </div>
    </div>
  );
}

