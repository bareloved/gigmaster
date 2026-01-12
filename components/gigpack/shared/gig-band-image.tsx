"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { PaperTextureHeader } from "./paper-texture-header";
import { classifyGigVisualTheme, pickFallbackImageForTheme } from "@/lib/gigpack/gig-visual-theme";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GigPack, Band } from "@/lib/gigpack/types";

// Global cache for band data
const bandCache = new Map<string, Band>();

// Import the PaperColors type and getPaperFallbackColors function
import { PaperColors, getPaperFallbackColors as getPaperColors } from "./paper-texture-header";

// Helper function for paper fallback colors
const getPaperFallbackColors = ({ id, title }: { id: string; title: string }): PaperColors => {
  // Use the existing getPaperFallbackColors function from paper-texture-header
  return getPaperColors({ id, title });
};

interface GigBandImageProps {
  gig: GigPack;
  variant?: "card" | "thumbnail" | "compact";
}

/**
 * Component to display band image with fallback
 * - Board view (card): prefers hero_image_url (wide/promotional images)
 * - List/Compact views (thumbnail/compact): prefers band_logo_url (square logos)
 *
 * Priority for card images:
 * 1. Gig's hero_image_url (explicit hero image)
 * 2. Band's hero_image_url (if band_id exists)
 * 3. Themed fallback from visual theme classifier
 * 4. Paper texture with initials (final fallback)
 */
export const GigBandImage = ({
  gig,
  variant = "card",
}: GigBandImageProps) => {
  const [bandData, setBandData] = useState<Band | null>(() => {
    // Check cache first
    if (gig.band_id && bandCache.has(gig.band_id)) {
      return bandCache.get(gig.band_id)!;
    }
    return null;
  });
  const [isLoadingBand, setIsLoadingBand] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Fetch band data if we have band_id and need it for card view
  useEffect(() => {
    if (variant === "card" && gig.band_id && !gig.hero_image_url && !bandData && !isLoadingBand) {
      // Double-check cache
      if (bandCache.has(gig.band_id)) {
        setBandData(bandCache.get(gig.band_id)!);
        return;
      }

      setIsLoadingBand(true);
      const fetchBand = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("bands")
            .select("*")
            .eq("id", gig.band_id!)
            .single();

          if (!error && data) {
            const band = data as unknown as Band;
            // Cache the result
            bandCache.set(gig.band_id!, band);
            setBandData(band);
          }
        } catch (err) {
          console.error("Band fetch error:", err);
        } finally {
          setIsLoadingBand(false);
        }
      };
      fetchBand();
    }
  }, [variant, gig.band_id, gig.hero_image_url, bandData, isLoadingBand]);

  // Determine the background image source with priority fallback chain
  let imageUrl: string | null = null;

  // #region agent log - theme classification
  try {
    // Priority 1: Gig's explicit hero image
    if (gig.hero_image_url) {
      imageUrl = gig.hero_image_url;
    }
    // Priority 2: Band's hero image (for card variant only)
    else if (variant === "card" && bandData?.hero_image_url) {
      imageUrl = bandData.hero_image_url;
    }
    // Priority 3: Themed fallback image (for card variant only)
    else if (variant === "card") {
      const theme = classifyGigVisualTheme({
        title: gig.title,
        band_name: gig.band_name,
        venue_name: gig.venue_name,
        gig_type: gig.gig_type,
      });
      imageUrl = pickFallbackImageForTheme(theme, gig.id);
    }
    // Priority 4: Band logo for list/compact views
    else if (gig.band_logo_url) {
      imageUrl = gig.band_logo_url;
    }
  } catch (err) {
    console.error("Error in GigBandImage theme/image logic:", err);
  }

  // Generate a consistent gradient based on band name (for fallback)
  const _getBandGradient = (bandName: string | null) => {
    if (!bandName) return "from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800";
    const colors = [
      "from-blue-400 to-indigo-500",
      "from-purple-400 to-pink-500",
      "from-green-400 to-teal-500",
      "from-orange-400 to-red-500",
      "from-cyan-400 to-blue-500",
      "from-fuchsia-400 to-purple-500",
    ];
    const hash = bandName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Dimensions based on variant
  const dimensions = {
    card: { width: 400, height: 240, className: "h-60 w-full" },
    thumbnail: { width: 80, height: 80, className: "h-16 w-16" },
    compact: { width: 48, height: 48, className: "h-10 w-10" },
  }[variant];

  // Show loading skeleton while fetching band data
  if (isLoadingBand) {
    return (
      <Skeleton className={cn(dimensions.className, variant === "card" ? "rounded-t-lg" : "rounded-md")} />
    );
  }

  if (imageUrl && !imageLoadFailed) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", dimensions.className, variant === "card" ? "rounded-t-lg" : "rounded-md")}>
        <Image
          src={imageUrl}
          alt={gig.band_name || gig.title}
          fill
          sizes={variant === "card" ? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" : "80px"}
          className="object-cover"
          loading="lazy"
          quality={60}
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
        {/* Gradient overlay for text readability - fade to black */}
        {variant === "card" && (
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
        )}
      </div>
    );
  }

  // Fallback: paper texture with gentle color variations for all variants
  const initials = gig.band_name
    ?.split(" ")
    .map((word: string) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const paperColors = getPaperFallbackColors({
    id: gig.id,
    title: gig.title,
  });

  // Board view (card): Use paper texture with gradient
  if (variant === "card") {
    return <PaperTextureHeader initials={initials} colors={paperColors} showGradient={true} />;
  }

  // List/Compact views: Use paper texture WITHOUT gradient
  return (
    <PaperTextureHeader
      initials={initials}
      colors={paperColors}
      size={variant}
      showGradient={false}
    />
  );
};
