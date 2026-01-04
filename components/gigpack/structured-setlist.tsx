"use client";

import { SetlistSection } from "@/lib/gigpack/types";
import { ExternalLink, PlayCircle, Disc3 } from "lucide-react";

interface StructuredSetlistProps {
  sections: SetlistSection[];
  variant?: "minimal" | "vintage" | "social";
  accentColor?: string;
}

/**
 * SongReferenceIcon Component
 * 
 * Displays a small, clickable icon next to song titles when a reference URL exists.
 * Opens the URL in a new tab (YouTube, Spotify, etc.)
 * 
 * Features platform detection:
 * - YouTube: Shows play icon (PlayCircle)
 * - Spotify: Shows music disc icon (Disc3)
 * - Other URLs: Shows generic external link icon
 */
function SongReferenceIcon({ url, accentColor }: { url: string; accentColor?: string }) {
  // Basic URL validation - ensure it starts with http:// or https://
  const isValidUrl = url.startsWith("http://") || url.startsWith("https://");
  const safeUrl = isValidUrl ? url : `https://${url}`;

  // Platform detection
  const lowerUrl = url.toLowerCase();
  const isYouTube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
  const isSpotify = lowerUrl.includes('spotify.com') || lowerUrl.includes('open.spotify');

  // Select icon and tooltip based on platform
  let IconComponent = ExternalLink;
  let tooltipText = "Open reference track";
  
  if (isYouTube) {
    IconComponent = PlayCircle;
    tooltipText = "Open on YouTube";
  } else if (isSpotify) {
    IconComponent = Disc3;
    tooltipText = "Open on Spotify";
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center hover:scale-110 transition-transform ml-2 opacity-70 hover:opacity-100"
      style={{ color: accentColor || "hsl(var(--primary))" }}
      title={tooltipText}
      aria-label={`${tooltipText} in new tab`}
      onClick={(e) => e.stopPropagation()}
    >
      <IconComponent className="h-3.5 w-3.5 md:h-4 md:w-4" />
    </a>
  );
}

/**
 * StructuredSetlist Component
 * 
 * Renders a structured setlist in a "printed setlist" style.
 * Supports different visual variants for each theme.
 * 
 * Features:
 * - Section-based organization
 * - Global song numbering across all sections
 * - Song details: title, artist, key, tempo
 * - Song reference links (YouTube, Spotify) with clickable icons
 * - Rehearsal notes in smaller text
 * - Responsive, mobile-friendly layout
 */
export function StructuredSetlist({ 
  sections, 
  variant = "minimal",
  accentColor = "hsl(var(--primary))"
}: StructuredSetlistProps) {
  // Calculate global song numbers
  let globalSongNumber = 0;

  if (!sections || sections.length === 0) {
    return null;
  }

  // Render based on variant
  if (variant === "vintage") {
    return (
      <div className="space-y-6">
        {sections.map((section) => {
          // Skip empty sections
          if (section.songs.length === 0) return null;

          return (
            <div key={section.id} className="space-y-3">
              {/* Section Header - Vintage stamp style */}
              <div className="flex items-center gap-2 border-t-2 pt-3" style={{ borderColor: accentColor + '40' }}>
                <div className="px-3 py-1.5 rounded border" style={{ backgroundColor: accentColor + '15', borderColor: accentColor + '40' }}>
                  <div className="text-xs uppercase tracking-[0.15em] font-black" style={{ color: accentColor }}>
                    {section.name}
                  </div>
                </div>
              </div>

              {/* Songs Container - Paper-like background */}
              <div className="bg-[hsl(var(--muted))]/60 dark:bg-[hsl(var(--muted))]/40 border-2 border-muted dark:border-muted/50 rounded-lg p-5 md:p-6 shadow-inner">
                <div className="space-y-0.5">
                  {section.songs.map((song) => {
                    globalSongNumber++;
                    
                    return (
                      <div key={song.id} className="py-2 border-b border-dashed border-muted/60 dark:border-muted/40 last:border-0">
                        {/* Song Line */}
                        <div className="flex gap-3 items-baseline">
                          {/* Number */}
                          <span className="font-black min-w-[2rem] text-xs md:text-sm tabular-nums flex-shrink-0" style={{ color: accentColor }}>
                            {String(globalSongNumber).padStart(2, '0')}.
                          </span>
                          
                          {/* Title with optional reference link */}
                          <span className="flex-1 font-bold text-sm md:text-base text-foreground dark:text-foreground tracking-tight leading-snug">
                            {song.title}
                            {song.referenceUrl && (
                              <SongReferenceIcon url={song.referenceUrl} accentColor={accentColor} />
                            )}
                          </span>
                          
                          {/* Meta: Artist, Key, Tempo */}
                          <div className="flex flex-wrap gap-2 text-xs md:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                            {song.artist && <span>{song.artist}</span>}
                            {song.key && <span className="font-semibold">({song.key})</span>}
                            {song.tempo && <span className="opacity-75">{song.tempo}</span>}
                          </div>
                        </div>
                        
                        {/* Notes */}
                        {song.notes && (
                          <div className="mt-1.5 ml-8 text-xs text-muted-foreground dark:text-muted-foreground italic">
                            → {song.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (variant === "social") {
    return (
      <div className="space-y-4">
        {sections.map((section) => {
          // Skip empty sections
          if (section.songs.length === 0) return null;

          return (
            <div key={section.id} className="space-y-3">
              {/* Section Header - Pill style */}
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border-2" style={{ borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '10' }}>
                {section.name}
              </div>

              {/* Songs Container */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="space-y-1">
                  {section.songs.map((song) => {
                    globalSongNumber++;
                    
                    return (
                      <div key={song.id} className="py-2 border-b border-dashed last:border-0">
                        {/* Song Line */}
                        <div className="flex gap-3 items-baseline">
                          {/* Number */}
                          <span className="font-semibold min-w-[2rem] text-sm tabular-nums flex-shrink-0" style={{ color: accentColor }}>
                            {globalSongNumber}.
                          </span>
                          
                          {/* Title with optional reference link */}
                          <span className="flex-1 font-semibold text-sm md:text-base">
                            {song.title}
                            {song.referenceUrl && (
                              <SongReferenceIcon url={song.referenceUrl} accentColor={accentColor} />
                            )}
                          </span>
                          
                          {/* Meta */}
                          {(song.artist || song.key) && (
                            <div className="text-xs text-muted-foreground">
                              {song.artist && <span>{song.artist}</span>}
                              {song.artist && song.key && <span> · </span>}
                              {song.key && <span className="font-semibold">{song.key}</span>}
                            </div>
                          )}
                        </div>
                        
                        {/* Notes */}
                        {song.notes && (
                          <div className="mt-1 ml-8 text-xs text-muted-foreground italic">
                            {song.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Default: minimal variant
  return (
    <div className="space-y-6">
      {sections.map((section) => {
        // Skip empty sections
        if (section.songs.length === 0) return null;

        return (
          <div key={section.id} className="space-y-3">
            {/* Section Header - Clean label */}
            <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground border-b pb-2" style={{ color: accentColor }}>
              {section.name}
            </div>

            {/* Songs Container */}
            <div className="space-y-1">
              {section.songs.map((song) => {
                globalSongNumber++;
                
                return (
                  <div key={song.id} className="py-2 border-b border-dashed last:border-0">
                    {/* Song Line */}
                    <div className="flex gap-3 items-baseline">
                      {/* Number */}
                      <span className="font-semibold min-w-[2rem] text-sm tabular-nums flex-shrink-0" style={{ color: accentColor }}>
                        {String(globalSongNumber).padStart(2, '0')}.
                      </span>
                      
                      {/* Title with optional reference link */}
                      <span className="flex-1 font-medium text-sm md:text-base">
                        {song.title}
                        {song.referenceUrl && (
                          <SongReferenceIcon url={song.referenceUrl} accentColor={accentColor} />
                        )}
                      </span>
                      
                      {/* Meta: Artist and Key inline */}
                      <div className="flex gap-2 text-xs text-muted-foreground flex-wrap justify-end">
                        {song.artist && <span>{song.artist}</span>}
                        {song.key && <span className="font-semibold">({song.key})</span>}
                      </div>
                    </div>
                    
                    {/* Tempo and Notes on second line if present */}
                    {(song.tempo || song.notes) && (
                      <div className="mt-1 ml-8 text-xs text-muted-foreground space-y-0.5">
                        {song.tempo && <div className="opacity-75">Tempo: {song.tempo}</div>}
                        {song.notes && <div className="italic">{song.notes}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

