"use client";

import { SVGProps } from "react";

/**
 * Hand-drawn SVG accent components for artistic, DIY aesthetic
 * 
 * Note: Uses fixed variations to avoid hydration mismatches between
 * server and client rendering. Multiple path options are kept for
 * future use or manual variation selection via props.
 */

interface HandDrawnProps extends SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
  /** Optional variation index (0-based) to select a specific path style */
  variation?: number;
}

/**
 * Hand-drawn squiggle line - replaces straight line accents
 * Used in section headers
 */
export function HandDrawnSquiggle({ className = "", color = "currentColor", variation = 0, ...props }: HandDrawnProps) {
  const paths = [
    // Variation 1: wavy squiggle
    "M2,8 Q10,2 18,8 T34,8",
    // Variation 2: loose wave
    "M2,10 Q8,4 16,10 Q24,16 32,10",
    // Variation 3: tight zigzag
    "M2,8 Q6,12 10,8 Q14,4 18,8 Q22,12 26,8 Q30,4 34,8",
    // Variation 4: casual curve
    "M2,6 Q12,12 22,6 Q28,3 34,8",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="36"
      height="16"
      viewBox="0 0 36 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-drawn arrow - points to important elements
 */
export function HandDrawnArrow({ className = "", color = "currentColor", variation = 0, ...props }: HandDrawnProps) {
  const paths = [
    // Variation 1: curved arrow
    "M2,12 Q8,8 14,12 L14,12 L11,10 M14,12 L11,14",
    // Variation 2: straight-ish arrow
    "M2,12 L15,12 M15,12 L11,9 M15,12 L11,15",
    // Variation 3: bouncy arrow
    "M2,10 Q6,14 10,10 Q12,8 16,10 M16,10 L13,8 M16,10 L13,12",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-drawn underline - appears on hover for links
 */
export function HandDrawnUnderline({ className = "", color = "currentColor", width = "100%", variation = 0, ...props }: HandDrawnProps & { width?: string | number }) {
  const paths = [
    // Variation 1: wavy underline
    "M0,4 Q25,8 50,4 T100,4",
    // Variation 2: slightly uneven
    "M0,6 Q20,4 40,6 Q60,8 80,5 Q90,4 100,6",
    // Variation 3: casual swoop
    "M0,5 Q30,3 60,6 Q80,8 100,5",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width={width}
      height="10"
      viewBox="0 0 100 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
      style={{ position: 'absolute', bottom: '-4px', left: 0 }}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Hand-drawn corner bracket - decorates card corners
 */
export function HandDrawnCornerBracket({ className = "", color = "currentColor", variation = 0, ...props }: HandDrawnProps) {
  const paths = [
    // Variation 1: curved L bracket
    "M20,2 Q4,2 2,2 Q2,4 2,18",
    // Variation 2: angular bracket
    "M22,2 L4,2 Q2,2 2,4 L2,20",
    // Variation 3: loose bracket
    "M20,3 Q6,2 3,3 Q2,4 2,8 L2,22",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Hand-drawn circle - for setlist bullets
 */
export function HandDrawnCircle({ 
  className = "", 
  color = "currentColor", 
  children,
  variation = 0,
  ...props 
}: HandDrawnProps & { children?: React.ReactNode }) {
  const paths = [
    // Variation 1: slightly egg-shaped
    "M12,2 Q18,4 20,12 Q18,20 12,22 Q6,20 4,12 Q6,4 12,2 Z",
    // Variation 2: imperfect circle
    "M12,3 Q17,3 20,8 Q22,12 20,16 Q17,21 12,21 Q7,21 4,16 Q2,12 4,8 Q7,3 12,3 Z",
    // Variation 3: wobbly circle
    "M12,2 Q19,5 21,12 Q19,19 12,22 Q5,19 3,12 Q5,5 12,2 Z",
    // Variation 4: casual oval
    "M12,3 Q16,3 19,9 Q21,12 19,15 Q16,21 12,21 Q8,21 5,15 Q3,12 5,9 Q8,3 12,3 Z",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {children && (
        <text
          x="12"
          y="16"
          textAnchor="middle"
          className="text-xs font-bold"
          fill="currentColor"
        >
          {children}
        </text>
      )}
    </svg>
  );
}

/**
 * Hand-drawn star - decorative accent
 */
export function HandDrawnStar({ className = "", color = "currentColor", variation = 0, ...props }: HandDrawnProps) {
  const paths = [
    // Variation 1: classic 5-point star
    "M12,2 L14,9 L21,9 L16,13 L18,20 L12,15 L6,20 L8,13 L3,9 L10,9 Z",
    // Variation 2: sketchy star
    "M12,3 Q13,8 14,8 L20,9 Q17,11 16,13 Q17,17 18,20 Q14,17 12,16 Q10,17 6,20 Q7,17 8,13 Q7,11 4,9 L10,8 Q11,8 12,3 Z",
    // Variation 3: hand-drawn wobbly
    "M12,2 L13,8 L14,9 L21,10 L16,12 L17,13 L18,19 L12,16 L11,15 L6,19 L7,13 L8,12 L3,10 L10,9 L11,8 Z",
  ];
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
        fillOpacity="0.1"
      />
    </svg>
  );
}

/**
 * Hand-drawn doodle - various small decorative elements
 */
export function HandDrawnDoodle({ className = "", color = "currentColor", type = "sparkle", variation = 0, ...props }: HandDrawnProps & { type?: "sparkle" | "note" | "heart" }) {
  const sparkles = [
    "M12,2 L13,11 L12,12 L11,11 Z M2,12 L11,13 L12,12 L11,13 Z M12,22 L13,13 L12,12 L11,13 Z M22,12 L13,13 L12,12 L13,11 Z",
    "M12,3 L12,11 M3,12 L11,12 M12,21 L12,13 M21,12 L13,12 M8,8 L10,10 M16,8 L14,10 M16,16 L14,14 M8,16 L10,14",
  ];

  const notes = [
    "M8,16 L8,6 Q8,4 10,4 L10,14 Q10,16 8,16 Z M16,12 L16,4 L18,4 L18,12 Q18,14 16,14 Q14,14 14,12",
    "M6,14 L6,6 Q6,5 7,5 Q8,5 8,6 L8,14 Q8,15 7,15 Q6,15 6,14 M14,10 L14,4 L16,3 L16,10 Q16,12 14,12",
  ];

  const hearts = [
    "M12,20 Q8,17 6,14 Q4,12 4,10 Q4,6 8,6 Q10,6 12,9 Q14,6 16,6 Q20,6 20,10 Q20,12 18,14 Q16,17 12,20 Z",
    "M12,19 Q9,17 7,14 Q5,12 5,10 Q5,7 8,7 Q10,7 12,10 Q14,7 16,7 Q19,7 19,10 Q19,12 17,14 Q15,17 12,19",
  ];

  const paths = type === "sparkle" ? sparkles : type === "note" ? notes : hearts;
  const safeVariation = Math.abs(variation) % paths.length;

  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <path
        d={paths[safeVariation]}
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
