"use client";

import { ReactNode, useState } from "react";
import { HandDrawnUnderline } from "./accents";

interface HoverUnderlineProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

/**
 * Wrapper component that adds a hand-drawn underline on hover
 * Used for clickable text elements like links and card titles
 */
export function HoverUnderline({ children, className = "", color = "currentColor" }: HoverUnderlineProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <span
      className={`relative inline-block transition-colors duration-200 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      {isHovered && (
        <HandDrawnUnderline 
          color={color} 
          className="animate-in fade-in duration-300"
        />
      )}
    </span>
  );
}

