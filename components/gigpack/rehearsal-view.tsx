"use client";

import { GigPack } from "@/lib/gigpack/types";
import { Clock, MapPin, Shirt, Package, ExternalLink, PlayCircle, Disc3, StickyNote } from "lucide-react";
import { formatDate } from "@/lib/gigpack/utils";
import { Button } from "@/components/ui/button";
import { PackingChecklist } from "@/components/gigpack/packing-checklist";
import { useTranslations } from "@/components/gigpack/hooks";
import { isHtmlSetlist, htmlToPlainText } from "@/lib/utils/setlist-html";

interface RehearsalViewProps {
  gigPack: Omit<GigPack, "internal_notes" | "owner_id">;
  openMaps: () => void;
  slug: string;
  locale?: string;
}

/**
 * Rehearsal Mode / Stage View
 * 
 * High-contrast, large-font layout optimized for on-stage and rehearsal use.
 * 
 * Features:
 * - Large, readable typography (visible from 1-2 meters away)
 * - High contrast colors
 * - Emphasizes essential information: times, setlist, key logistics
 * - De-emphasizes or hides: payment details, long descriptions, decorative elements
 * - Single-column, focused layout
 * - Works across all themes
 */
export function RehearsalView({ gigPack, openMaps, slug, locale }: RehearsalViewProps) {
  // Use the passed locale prop as the source of truth
  

  const t = useTranslations("publicView");
  const accentColor = gigPack.accent_color || "hsl(var(--primary))";

  return (
    <div className="min-h-screen bg-background">
      <div className={`container max-w-5xl mx-auto px-6 py-8 md:py-12 ${locale === 'he' ? 'rtl' : ''}`} dir={locale === 'he' ? 'rtl' : 'ltr'}>
        {/* Header - Gig Title and Band */}
        <div className="text-center space-y-4 mb-8 md:mb-12 pb-8 border-b-2" style={{ borderColor: accentColor }}>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            {gigPack.title}
          </h1>
          {gigPack.band_name && (
            <p className="text-xl md:text-3xl text-muted-foreground font-medium">
              {gigPack.band_name}
            </p>
          )}
        </div>

        {/* Times Section - Highest Priority */}
        <div className="space-y-6 md:space-y-8 mb-8 md:mb-12">
          {/* Date */}
          {gigPack.date && (
            <div className="text-center">
              <div className="text-lg md:text-xl text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                {t("date")}
              </div>
              <div className="text-3xl md:text-5xl font-bold" style={{ color: accentColor }}>
                {(() => {
                  try {
                    return formatDate(gigPack.date, locale);
                  } catch (error) {
                    console.error("[RehearsalView] formatDate error:", error);
                    return "Error";
                  }
                })()}
              </div>
            </div>
          )}

          {/* Call Time & On Stage Time - Side by side on larger screens */}
          {(gigPack.call_time || gigPack.on_stage_time) && (
            <div className="grid md:grid-cols-2 gap-6 md:gap-8">
              {gigPack.call_time && (
                <div className="bg-muted/50 border-2 rounded-xl p-6 md:p-8 text-center">
                  <div className={`flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground uppercase tracking-wider font-semibold mb-3 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                    <span>{t("callTime")}</span>
                  </div>
                  <div className="text-4xl md:text-6xl font-bold tabular-nums" style={{ color: accentColor }} dir="ltr">
                    {gigPack.call_time}
                  </div>
                </div>
              )}
              {gigPack.on_stage_time && (
                <div className="bg-muted/50 border-2 rounded-xl p-6 md:p-8 text-center">
                  <div className={`flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground uppercase tracking-wider font-semibold mb-3 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                    <span>{t("onStage")}</span>
                  </div>
                  <div className="text-4xl md:text-6xl font-bold tabular-nums" style={{ color: accentColor }} dir="ltr">
                    {gigPack.on_stage_time}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Venue - Compact but visible */}
          {gigPack.venue_name && (
            <div className="text-center">
              <div className={`flex items-center justify-center gap-2 text-sm md:text-base text-muted-foreground mb-2 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                <span className="uppercase tracking-wider font-semibold">{t("venue")}</span>
              </div>
              <div className="text-xl md:text-2xl font-semibold">{gigPack.venue_name}</div>
              {gigPack.venue_address && (
                <div className="text-sm md:text-base text-muted-foreground mt-1">{gigPack.venue_address}</div>
              )}
              {gigPack.venue_maps_url && (
                <Button 
                  onClick={openMaps} 
                  variant="outline" 
                  size="lg" 
                  className={`mt-3 text-base md:text-lg ${locale === 'he' ? 'flex-row-reverse' : ''}`}
                  style={{ borderColor: accentColor, color: accentColor }}
                >
                  <MapPin className={`h-5 w-5 ${locale === 'he' ? 'ml-2' : 'mr-2'}`} />
                  {t("openInMaps")}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Setlist - Main Focus */}
        {(gigPack.setlist_structured || gigPack.setlist) && (
          <div className="mb-8 md:mb-12">
            <div className="text-center mb-6 md:mb-8">
              <div className="inline-block px-6 py-3 rounded-full text-lg md:text-xl uppercase tracking-wider font-bold border-2" style={{ borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '10' }}>
                {t("setlist")}
              </div>
            </div>

            <div className="bg-muted/30 border-2 rounded-2xl p-6 md:p-10">
              {gigPack.setlist_structured && gigPack.setlist_structured.length > 0 ? (
                <RehearsalSetlist sections={gigPack.setlist_structured} accentColor={accentColor} locale={locale} />
              ) : (
                /* Fallback to simple setlist with large fonts */
                <div className="space-y-3">
                  {(() => {
                  const raw = gigPack.setlist || "";
                  const plain = isHtmlSetlist(raw) ? htmlToPlainText(raw) : raw;
                  return plain.split('\n');
                })().map((line, index) => (
                    line.trim() ? (
                      <div key={index} className={`flex gap-4 md:gap-6 py-3 border-b border-dashed last:border-0 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xl md:text-3xl font-bold min-w-[3rem] md:min-w-[4rem] tabular-nums" style={{ color: accentColor }}>
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <span className={`text-xl md:text-3xl font-semibold flex-1 ${locale === 'he' ? 'text-right' : ''}`}>{line}</span>
                      </div>
                    ) : (
                      <div key={index} className="h-4"></div>
                    )
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Logistics - Essential Info Only */}
        {(gigPack.dress_code || gigPack.backline_notes || gigPack.notes) && (
          <div className="space-y-6">
            <div className="text-center text-lg md:text-xl text-muted-foreground uppercase tracking-wider font-semibold mb-4">
              {t("essentialInfo")}
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
              {gigPack.dress_code && (
                <div className="bg-muted/50 border rounded-xl p-5 md:p-6">
                  <div className={`flex items-center gap-2 text-sm md:text-base uppercase tracking-wider font-semibold text-muted-foreground mb-3 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                    <Shirt className="h-5 w-5" />
                    <span>{t("dressCode")}</span>
                  </div>
                  <p className={`text-lg md:text-2xl font-medium ${locale === 'he' ? 'text-right' : ''}`}>{gigPack.dress_code}</p>
                </div>
              )}
              {gigPack.backline_notes && (
                <div className="bg-muted/50 border rounded-xl p-5 md:p-6">
                  <div className={`flex items-center gap-2 text-sm md:text-base uppercase tracking-wider font-semibold text-muted-foreground mb-3 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                    <Package className="h-5 w-5" />
                    <span>{t("gear")}</span>
                  </div>
                  <p className={`text-base md:text-xl font-medium whitespace-pre-wrap leading-relaxed ${locale === 'he' ? 'text-right' : ''}`}>{gigPack.backline_notes}</p>
                </div>
              )}
              {gigPack.notes && (
                <div className="bg-muted/50 border rounded-xl p-5 md:p-6 md:col-span-2">
                  <div className={`flex items-center gap-2 text-sm md:text-base uppercase tracking-wider font-semibold text-muted-foreground mb-3 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                    <StickyNote className="h-5 w-5" />
                    <span>{t("notesLabel")}</span>
                  </div>
                  <p className={`text-base md:text-xl font-medium whitespace-pre-wrap leading-relaxed ${locale === 'he' ? 'text-right' : ''}`}>{gigPack.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Packing Checklist */}
        {gigPack.packing_checklist && gigPack.packing_checklist.length > 0 && (
          <div className="mt-8 md:mt-12">
            <PackingChecklist
              items={gigPack.packing_checklist}
              gigSlug={slug}
              accentColor={accentColor}
              variant="rehearsal"
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 md:mt-16 text-center text-xs md:text-sm text-muted-foreground/40">
          <p>{t("stageViewFooter")}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * SongReferenceIcon Component for Rehearsal Mode
 * Larger, more visible icon suitable for stage view
 * 
 * Features platform detection:
 * - YouTube: Shows play icon (PlayCircle)
 * - Spotify: Shows music disc icon (Disc3)
 * - Other URLs: Shows generic external link icon
 */
function SongReferenceIcon({ url, accentColor, locale = "en" }: { url: string; accentColor: string; locale?: string }) {
  // Basic URL validation - ensure it starts with http:// or https://
  const isValidUrl = url.startsWith("http://") || url.startsWith("https://");
  const safeUrl = isValidUrl ? url : `https://${url}`;

  // Platform detection
  const lowerUrl = url.toLowerCase();
  const isYouTube = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
  const isSpotify = lowerUrl.includes('spotify.com') || lowerUrl.includes('open.spotify');

  // Select icon and tooltip based on platform
  let IconComponent = ExternalLink;
  let tooltipText = "Listen to reference";
  
  if (isYouTube) {
    IconComponent = PlayCircle;
    tooltipText = "Play on YouTube";
  } else if (isSpotify) {
    IconComponent = Disc3;
    tooltipText = "Play on Spotify";
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center hover:scale-110 transition-transform opacity-80 hover:opacity-100 ${locale === 'he' ? 'mr-3 md:mr-4' : 'ml-3 md:ml-4'}`}
      style={{ color: accentColor }}
      title={tooltipText}
      aria-label={`${tooltipText} in new tab`}
      onClick={(e) => e.stopPropagation()}
    >
      <IconComponent className="h-5 w-5 md:h-6 md:w-6" />
    </a>
  );
}

/**
 * RehearsalSetlist - Structured setlist optimized for stage view
 * Large fonts, clear hierarchy, essential details only
 */
function RehearsalSetlist({ sections, accentColor, locale = "en" }: { sections: GigPack["setlist_structured"], accentColor: string, locale?: string }) {
  if (!sections || sections.length === 0) return null;

  let globalSongNumber = 0;

  return (
    <div className="space-y-8 md:space-y-10">
      {sections.map((section) => {
        if (section.songs.length === 0) return null;

        return (
          <div key={section.id} className="space-y-4">
            {/* Section Header */}
            <div className="inline-flex items-center px-4 py-2 rounded-lg text-base md:text-lg font-bold uppercase tracking-wider border" style={{ borderColor: accentColor, color: accentColor, backgroundColor: accentColor + '15' }}>
              {section.name}
            </div>

            {/* Songs */}
            <div className="space-y-4">
              {section.songs.map((song) => {
                globalSongNumber++;
                
                return (
                  <div key={song.id} className="py-3 md:py-4 border-b border-dashed last:border-0">
                    {/* Song Number and Title */}
                    <div className={`flex gap-4 md:gap-6 items-baseline mb-2 ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                      <span className="text-2xl md:text-4xl font-bold min-w-[3rem] md:min-w-[4rem] tabular-nums flex-shrink-0" style={{ color: accentColor }}>
                        {String(globalSongNumber).padStart(2, '0')}.
                      </span>
                      <div className={`flex-1 space-y-1 ${locale === 'he' ? 'text-right' : ''}`}>
                        <div className="text-2xl md:text-4xl font-bold leading-tight">
                          {song.title}
                          {song.referenceUrl && (
                            <SongReferenceIcon url={song.referenceUrl} accentColor={accentColor} locale={locale} />
                          )}
                        </div>
                        
                        {/* Key, Tempo, Artist - inline */}
                        {(song.key || song.tempo || song.artist) && (
                          <div className={`flex flex-wrap gap-3 md:gap-4 text-base md:text-xl text-muted-foreground font-medium ${locale === 'he' ? 'flex-row-reverse' : ''}`}>
                            {song.key && (
                              <span className="font-bold" style={{ color: accentColor }}>
                                {song.key}
                              </span>
                            )}
                            {song.tempo && <span>♩ = {song.tempo}</span>}
                            {song.artist && <span className="italic">{song.artist}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Notes - Important watch-outs */}
                    {song.notes && (
                      <div className={`mt-2 text-base md:text-lg text-muted-foreground font-medium ${locale === 'he' ? 'mr-[3.5rem] md:mr-[5rem] text-right' : 'ml-[3.5rem] md:ml-[5rem]'}`}>
                        → {song.notes}
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

