"use client";

import { GigPack } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Music, Users, Shirt, Package, ParkingCircle, DollarSign, Paperclip, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PackingChecklist } from "@/components/packing-checklist";

interface SocialCardLayoutProps {
  gigPack: Omit<GigPack, "internal_notes" | "owner_id">;
  openMaps: () => void;
  slug: string;
}

/**
 * Social Card theme layout
 * Social media-inspired layout with hero banner and card-based sections
 * Supports branding: logo (circular avatar), hero image (cover), accent color, poster skin
 */
export function SocialCardLayout({ gigPack, openMaps, slug }: SocialCardLayoutProps) {
  // Get branding values with fallbacks
  const accentColor = gigPack.accent_color || "hsl(38, 92%, 50%)";
  const posterSkin = gigPack.poster_skin || "clean";
  
  // Use accent color for hero banner
  const heroBannerStyle = gigPack.hero_image_url 
    ? {} // Use hero image instead
    : {
        background: `linear-gradient(to bottom right, ${accentColor}, ${accentColor}cc)`,
      };

  return (
    <div className={`min-h-screen poster-skin-${posterSkin}`}>
      <div className="container max-w-2xl mx-auto px-4 py-8 md:py-12">
        {/* Hero Banner Card with optional hero image or accent color gradient */}
        <div className="mb-6 relative">
          <Card className="overflow-hidden border-0 shadow-lg">
            {/* Hero image at top */}
            {gigPack.hero_image_url ? (
              <div className="hero-image-container h-48 md:h-64">
                <img src={gigPack.hero_image_url} alt="Cover" className="hero-image" />
                <div className="hero-overlay"></div>
              </div>
            ) : null}

            {/* Content section - use accent gradient only when NO hero image */}
            <div 
              className={`p-8 md:p-12 relative ${gigPack.band_logo_url && gigPack.hero_image_url ? 'pt-16' : ''} ${!gigPack.hero_image_url ? 'text-primary-foreground' : ''}`} 
              style={!gigPack.hero_image_url ? heroBannerStyle : {}}
            >
            <div className="space-y-4">
              <h1 className="text-3xl md:text-5xl font-bold leading-tight">
                {gigPack.title}
              </h1>
              {gigPack.band_name && (
                  <p className="text-xl md:text-2xl text-muted-foreground">
                  {gigPack.band_name}
                </p>
              )}
                <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
                {gigPack.date && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-5 w-5" style={{ color: accentColor }} />
                    <span className="font-semibold">{formatDate(gigPack.date)}</span>
                  </div>
                )}
                {(gigPack.call_time || gigPack.on_stage_time) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-5 w-5" style={{ color: accentColor }} />
                    <span className="font-semibold">
                      {gigPack.call_time || gigPack.on_stage_time}
                    </span>
                  </div>
                )}
                {gigPack.venue_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-5 w-5" style={{ color: accentColor }} />
                    <span className="font-semibold">{gigPack.venue_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

          {/* Logo as circular avatar - positioned OUTSIDE the card to avoid clipping */}
          {gigPack.band_logo_url && gigPack.hero_image_url && (
            <div className="absolute -bottom-10 left-8 z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white dark:bg-card border-4 border-background overflow-hidden shadow-lg flex items-center justify-center p-2">
                <img src={gigPack.band_logo_url} alt="Band logo" className="w-full h-full object-contain" />
              </div>
            </div>
          )}
        </div>

        {/* Info Cards Stack */}
        <div className={`space-y-4 ${gigPack.band_logo_url && gigPack.hero_image_url ? 'mt-6' : ''}`}>
          {/* Venue Card */}
          {(gigPack.venue_name || gigPack.venue_address) && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <MapPin className="h-4 w-4" />
                  <span>Venue</span>
                </div>
                <div className="space-y-2">
                  {gigPack.venue_name && (
                    <div className="text-xl font-bold">{gigPack.venue_name}</div>
                  )}
                  {gigPack.venue_address && (
                    <div className="text-muted-foreground">{gigPack.venue_address}</div>
                  )}
                  {gigPack.venue_maps_url && (
                    <Button 
                      onClick={openMaps} 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      style={{ borderColor: accentColor, color: accentColor }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Open in Maps
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Times Card */}
          {(gigPack.call_time || gigPack.on_stage_time) && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <Clock className="h-4 w-4" />
                  <span>Schedule</span>
                </div>
                <div className="space-y-3">
                  {gigPack.call_time && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        Call Time
                      </div>
                      <div className="text-lg font-semibold">{gigPack.call_time}</div>
                    </div>
                  )}
                  {gigPack.on_stage_time && (
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        On Stage
                      </div>
                      <div className="text-lg font-semibold">{gigPack.on_stage_time}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lineup Card */}
          {gigPack.lineup && gigPack.lineup.length > 0 && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <Users className="h-4 w-4" />
                  <span>Who&apos;s playing</span>
                </div>
                <div className="space-y-3">
                  {gigPack.lineup.map((member, index) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg">
                      <div className="font-semibold">{member.role}</div>
                      {member.name && (
                        <div className="text-sm text-muted-foreground mt-1">{member.name}</div>
                      )}
                      {member.notes && (
                        <div className="text-sm text-muted-foreground mt-2 italic">{member.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Setlist Card */}
          {gigPack.setlist && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <Music className="h-4 w-4" />
                  <span>Setlist</span>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {gigPack.setlist.split('\n').map((line, index) => (
                      line.trim() ? (
                        <div key={index} className="flex gap-3 py-1.5 border-b border-dashed last:border-0">
                          <span className="font-semibold min-w-[2rem]" style={{ color: accentColor }}>
                            {index + 1}.
                          </span>
                          <span className="flex-1">{line}</span>
                        </div>
                      ) : (
                        <div key={index} className="h-2"></div>
                      )
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Materials Card */}
          {gigPack.materials && gigPack.materials.length > 0 && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <Paperclip className="h-4 w-4" />
                  <span>Materials</span>
                </div>
                <div className="space-y-3">
                  {gigPack.materials.map((material) => (
                    <div key={material.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-sm flex-1">{material.label}</div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {material.kind === "rehearsal" && "Rehearsal"}
                          {material.kind === "performance" && "Performance"}
                          {material.kind === "charts" && "Charts"}
                          {material.kind === "reference" && "Reference"}
                          {material.kind === "other" && "Other"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => window.open(material.url, '_blank', 'noopener,noreferrer')}
                        style={{ borderColor: accentColor, color: accentColor }}
                      >
                        <ExternalLink className="mr-2 h-3 w-3" />
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Logistics Card */}
          {(gigPack.dress_code || gigPack.backline_notes || gigPack.parking_notes || gigPack.payment_notes) && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-sm uppercase tracking-wider font-bold mb-4" style={{ color: accentColor }}>
                  <Package className="h-4 w-4" />
                  <span>Don&apos;t forget</span>
                </div>
                <div className="space-y-4">
                  {gigPack.dress_code && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                        <Shirt className="h-3.5 w-3.5" />
                        Dress code
                      </div>
                      <p className="text-sm">{gigPack.dress_code}</p>
                    </div>
                  )}
                  {gigPack.backline_notes && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                        <Package className="h-3.5 w-3.5" />
                        Gear
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{gigPack.backline_notes}</p>
                    </div>
                  )}
                  {gigPack.parking_notes && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                        <ParkingCircle className="h-3.5 w-3.5" />
                        Parking
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{gigPack.parking_notes}</p>
                    </div>
                  )}
                  {gigPack.payment_notes && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
                        <DollarSign className="h-3.5 w-3.5" />
                        Payment
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{gigPack.payment_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Packing Checklist Card */}
          {gigPack.packing_checklist && gigPack.packing_checklist.length > 0 && (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <PackingChecklist
                  items={gigPack.packing_checklist}
                  gigSlug={slug}
                  accentColor={accentColor}
                  variant="social"
                />
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground/60">
          <p>
            Powered by <span className="font-semibold" style={{ color: accentColor }}>GigPack</span>
          </p>
        </div>
      </div>
    </div>
  );
}

