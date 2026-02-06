"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "@/lib/gigpack/i18n";
import { GigPack } from "@/lib/gigpack/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, MapPin, Music, Users, Shirt, Package, ParkingCircle, Paperclip, ExternalLink, Mic, Building, Beer, Coffee, Tent, Headphones, Star, PartyPopper, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { classifyGigVisualTheme, pickFallbackImageForTheme } from "@/lib/gigpack/gig-visual-theme";
import { GigActivityWidget } from "@/components/dashboard/activity-widget";
import type { GigActivityLogEntry } from "@/lib/api/gig-activity";
import { NeedHelpSection } from "@/components/gigpack/need-help-section";
import { HostingServiceIcon } from "@/components/shared/hosting-service-icon";
import type { GigMaterialKind } from "@/lib/gigpack/types";

function getInitials(name: string): string {
  if (!name.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getStatusColor(status?: string): string {
  switch (status) {
    case "accepted": return "bg-green-500";
    case "invited":
    case "pending": return "bg-yellow-500";
    case "declined": return "bg-red-500";
    case "needs_sub": return "bg-orange-500";
    case "tentative": return "bg-yellow-400";
    default: return "bg-gray-400";
  }
}

const MATERIAL_KIND_ICON: Record<GigMaterialKind, { icon: React.ElementType; color: string }> = {
  rehearsal: { icon: Mic, color: "text-primary" },
  performance: { icon: Star, color: "text-secondary" },
  charts: { icon: Music, color: "text-accent" },
  reference: { icon: Headphones, color: "text-[hsl(var(--chart-4))]" },
  other: { icon: Paperclip, color: "text-muted-foreground" },
};

interface MinimalLayoutProps {
  gigPack: Omit<GigPack, "internal_notes" | "owner_id">;
  openMaps: () => void;
  slug: string;
  locale?: string;
}

export function MinimalLayout({ gigPack, openMaps }: MinimalLayoutProps) {
  const activeLocale = useLocale();
  
  const t = useTranslations("public");
  const [setlistExpanded, setSetlistExpanded] = useState(false);
  
  const accentColor = gigPack.accent_color || "hsl(var(--primary))";
  const posterSkin = gigPack.poster_skin || "clean";
  
  const customStyle = accentColor ? {
    "--custom-accent": accentColor,
  } as React.CSSProperties : {};

  let backgroundImage;
  try {
    const classifiedTheme = classifyGigVisualTheme(gigPack as GigPack);
    backgroundImage = gigPack.hero_image_url || pickFallbackImageForTheme(classifiedTheme, gigPack.id);
  } catch {
    backgroundImage = "/gig-fallbacks/generic-1.jpeg";
  }

  const getGigTypeIcon = (gigType: string | null) => {
    switch (gigType) {
      case "wedding": return <PartyPopper className="h-3 w-3" />;
      case "club_show": return <Mic className="h-3 w-3" />;
      case "corporate": return <Building className="h-3 w-3" />;
      case "bar_gig": return <Beer className="h-3 w-3" />;
      case "coffee_house": return <Coffee className="h-3 w-3" />;
      case "festival": return <Tent className="h-3 w-3" />;
      case "rehearsal": return <Headphones className="h-3 w-3" />;
      default: return <Star className="h-3 w-3" />;
    }
  };

  const getGigTypeBadgeColors = (gigType: string | null) => {
    switch (gigType) {
      case "wedding": return "bg-pink-500/20 border-pink-300/30 text-pink-100";
      case "club_show": return "bg-purple-500/20 border-purple-300/30 text-purple-100";
      case "corporate": return "bg-blue-500/20 border-blue-300/30 text-blue-100";
      case "bar_gig": return "bg-green-500/20 border-green-300/30 text-green-100";
      case "coffee_house": return "bg-amber-500/20 border-amber-300/30 text-amber-100";
      case "festival": return "bg-orange-500/20 border-orange-300/30 text-orange-100";
      case "rehearsal": return "bg-slate-500/20 border-slate-300/30 text-slate-100";
      default: return "bg-gray-500/20 border-gray-300/30 text-gray-100";
    }
  };

  const getGigTypeLabel = (gigType: string | null) => {
    switch (gigType) {
      case "wedding": return t("gigTypeWedding");
      case "club_show": return t("gigTypeClubShow");
      case "corporate": return t("gigTypeCorporate");
      case "bar_gig": return t("gigTypeBarGig");
      case "coffee_house": return t("gigTypeCoffeeHouse");
      case "festival": return t("gigTypeFestival");
      case "rehearsal": return t("gigTypeRehearsal");
      case "other": return t("gigTypeOther");
      default: return gigType || "";
    }
  };


  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      if (activeLocale === 'he') {
        return date.toLocaleDateString('he-IL', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const setlistLines = (gigPack.setlist || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const SETLIST_COLLAPSED_VISIBLE = 3;
  const SETLIST_TEASER_VISIBLE = 1;

  const hasMoreSetlist = setlistLines.length > SETLIST_COLLAPSED_VISIBLE;
  const visibleSetlistLines = setlistExpanded
    ? setlistLines
    : setlistLines.slice(
        0,
        Math.min(setlistLines.length, SETLIST_COLLAPSED_VISIBLE + SETLIST_TEASER_VISIBLE)
      );

  const remainingSetlistCount = Math.max(0, setlistLines.length - SETLIST_COLLAPSED_VISIBLE);

  const splitSetlistLine = (line: string) => {
    if (line.includes(" — ")) {
      const [title, ...rest] = line.split(" — ");
      return { title: title.trim(), meta: rest.join(" — ").trim() };
    }
    if (line.includes(" - ")) {
      const [title, ...rest] = line.split(" - ");
      return { title: title.trim(), meta: rest.join(" - ").trim() };
    }
    return { title: line, meta: "" };
  };
  
  return (
    <TooltipProvider>
      <div className={`min-h-screen poster-skin-${posterSkin}`} style={customStyle}>
      <div className={`container max-w-6xl mx-auto px-4 py-6 md:py-8 ${activeLocale === 'he' ? 'rtl' : ''}`} dir={activeLocale === 'he' ? 'rtl' : 'ltr'}>
        <div className="relative min-h-[400px] md:min-h-[500px] rounded-lg overflow-hidden mb-8 shadow-lg">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 backdrop-blur-[1px]" />
          {gigPack.band_logo_url && (
            <div className={`absolute top-4 md:top-6 z-10 ${activeLocale === 'he' ? 'right-4 md:right-6' : 'left-4 md:left-6'}`}>
              <div className="bg-white/95 dark:bg-black/80 p-2 rounded-lg shadow-lg">
                <Image src={gigPack.band_logo_url} alt="Band logo" width={64} height={64} className="band-logo-small object-contain" />
              </div>
          </div>
        )}
          <div className="relative z-10 flex flex-col justify-center items-center text-center text-white px-4 py-12 md:py-16 min-h-full">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                top: '-60px',
                left: '-60px',
                right: '-60px',
                bottom: '-60px',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                background: 'rgba(0, 0, 0, 0.3)',
                maskImage: 'radial-gradient(ellipse 60% 50% at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.1) 90%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.3) 75%, rgba(0,0,0,0.1) 90%, rgba(0,0,0,0) 100%)',
                zIndex: -1,
              }}
            />
            {gigPack.gig_type && gigPack.gig_type !== "other" && (
              <div className={`absolute top-6 z-20 ${activeLocale === 'he' ? 'left-6' : 'right-6'}`}>
                <Badge
                  variant="secondary"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm shadow-lg ${getGigTypeBadgeColors(gigPack.gig_type)}`}
                >
                  {getGigTypeIcon(gigPack.gig_type)}
                  {getGigTypeLabel(gigPack.gig_type)}
                </Badge>
              </div>
            )}
            <div className="relative px-6 py-8 md:px-8 md:py-10 max-w-4xl w-full mx-4">
              <div className="mb-6">
                <div className="flex flex-col items-center justify-center mb-4">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight drop-shadow-lg">
                    {gigPack.title}
                  </h1>
                </div>
              {gigPack.band_name && (
                  <p className="text-xl md:text-2xl lg:text-3xl font-semibold text-white/90 drop-shadow-md">
                  {gigPack.band_name}
                </p>
              )}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-6 text-lg md:text-xl">
                {gigPack.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-white/90" />
                    <span className="font-semibold text-white drop-shadow-sm">{formatDate(gigPack.date)}</span>
                  </div>
                )}
            </div>
              {(gigPack.venue_name || gigPack.venue_address) && (
                <div className="mb-6">
                  {gigPack.venue_name && (
                    <div className="text-xl md:text-2xl font-bold text-white drop-shadow-md mb-1">
                      {gigPack.venue_name}
                    </div>
                  )}
                  {gigPack.venue_address && (
                    <div className="flex items-center justify-center gap-2 text-white/90 text-sm md:text-base drop-shadow-sm">
                      {gigPack.venue_address}
                      {gigPack.venue_maps_url && (
                        <>
                          <Button
                            onClick={openMaps}
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white shadow-lg"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              const address = encodeURIComponent(gigPack.venue_address || '');
                              const wazeUrl = `https://waze.com/ul?q=${address}`;
                              window.open(wazeUrl, '_blank', 'noopener,noreferrer');
                            }}
                            variant="secondary"
                            size="sm"
                            className="h-8 w-8 p-0 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white shadow-lg"
                          >
                            <Image src="/wazeicon.png" alt="Waze" width={28} height={28} />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center gap-3">
                {gigPack.call_time && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 bg-white/20 backdrop-blur-sm border-white/30 text-white shadow-lg transition-colors"
                    style={{
                      '--tw-bg-opacity': '0.2'
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onClick={() => navigator.clipboard?.writeText(gigPack.call_time || '')}
                  >
                    <Clock className="h-4 w-4" />
                    <span>{t("callLabel")} <span dir="ltr">{gigPack.call_time}</span></span>
                  </Button>
                )}
                {gigPack.on_stage_time && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-2 bg-white/20 backdrop-blur-sm border-white/30 text-white shadow-lg transition-colors"
                    style={{
                      '--tw-bg-opacity': '0.2'
                    } as React.CSSProperties}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = accentColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onClick={() => navigator.clipboard?.writeText(gigPack.on_stage_time || '')}
                  >
                    <Music className="h-4 w-4" />
                    <span>{t("stageLabel")} <span dir="ltr">{gigPack.on_stage_time}</span></span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {gigPack.schedule && gigPack.schedule.length > 0 && (
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className={`flex items-center gap-3 mb-4`}>
                  <Clock className="h-5 w-5" style={{ color: accentColor }} />
                  <h3 className="font-semibold text-lg">{t("schedule")}</h3>
                </div>
                <div className="space-y-1">
                  {gigPack.schedule.sort((a, b) => {
                    if (!a.time && !b.time) return 0;
                    if (!a.time) return 1;
                    if (!b.time) return -1;
                    return a.time.localeCompare(b.time);
                  }).map((item, index) => (
                    <div key={item.id}>
                      <div className="py-2">
                        <span dir="ltr" className="text-base font-bold text-foreground">
                          {item.time}
                        </span>
                        <span className="mx-1 text-muted-foreground/60" aria-hidden="true">–</span>
                        <span className="font-medium text-foreground/90">{item.label}</span>
                      </div>
                      {index < gigPack.schedule!.length - 1 && (
                        <hr className="border-muted-foreground/20" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(gigPack.dress_code || gigPack.backline_notes || gigPack.parking_notes) && (
              <div className="space-y-4">
                {(gigPack.dress_code || gigPack.backline_notes || gigPack.parking_notes) && (
                  <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <div className={`flex items-center gap-3 mb-4`}>
                      <Package className="h-5 w-5" style={{ color: accentColor }} />
                      <h3 className="font-semibold text-lg">{t("logistics")}</h3>
                    </div>
                    <div className="space-y-4">
                      {gigPack.dress_code && (
                        <div className={`flex gap-3`}>
                          <Shirt className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                          <div className={`${activeLocale === 'he' ? 'text-right' : ''}`}>
                            <div className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-1">{t("dressCodeLabel")}</div>
                            <div className="text-sm">{gigPack.dress_code}</div>
                          </div>
                        </div>
                      )}
                      {gigPack.backline_notes && (
                        <div className={`flex gap-3`}>
                          <Package className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                          <div className={`${activeLocale === 'he' ? 'text-right' : ''}`}>
                            <div className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-1">{t("gearLabel")}</div>
                            <div className="text-sm whitespace-pre-wrap">{gigPack.backline_notes}</div>
                          </div>
                        </div>
                      )}
                      {gigPack.parking_notes && (
                        <div className={`flex gap-3`}>
                          <ParkingCircle className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                          <div className={`${activeLocale === 'he' ? 'text-right' : ''}`}>
                            <div className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-1">{t("parkingLabel")}</div>
                            <div className="text-sm whitespace-pre-wrap">{gigPack.parking_notes}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="text-center py-2">
              <p className="text-muted-foreground/60 text-xs italic">
                Smart packing checklist coming soon...
              </p>
            </div>
          </div>
          <div className="space-y-6">
            {gigPack.lineup && gigPack.lineup.length > 0 && (
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="h-5 w-5" style={{ color: accentColor }} />
                  <h3 className="font-semibold text-lg">{t("whosPlaying")}</h3>
                  <Badge variant="secondary" className="text-xs">{gigPack.lineup.filter(m => m.name?.trim()).length}</Badge>
                </div>
                <div className="rounded-lg border bg-card">
                  {gigPack.lineup.map((member, index) => {
                    if (!member.name?.trim()) return null;
                    return (
                      <div
                        key={`${member.name}-${index}`}
                        className="flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      >
                        {/* Avatar with status dot */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative shrink-0">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.avatarUrl || undefined} />
                                <AvatarFallback className="text-sm bg-primary/10 text-primary">
                                  {getInitials(member.name!)}
                                </AvatarFallback>
                              </Avatar>
                              <span
                                className={cn(
                                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                                  getStatusColor(member.invitationStatus)
                                )}
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="capitalize">
                              {member.invitationStatus?.replace("_", " ") || "pending"}
                            </p>
                          </TooltipContent>
                        </Tooltip>

                        {/* Name and secondary info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{member.name}</p>
                          {(member.role || member.email) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {member.role}
                              {member.role && member.email && <span className="text-border"> · </span>}
                              {member.email}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {setlistLines.length > 0 && (
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5" style={{ color: accentColor }} />
                    <h3 className="font-semibold text-lg">{t("setlist")}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {setlistLines.length}
                    </Badge>
                  </div>
                  {hasMoreSetlist && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSetlistExpanded(!setlistExpanded)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {setlistExpanded ? t("showLess") : t("showMore", { count: remainingSetlistCount })}
                    </Button>
                  )}
                </div>
                <div className="relative bg-muted/30 border rounded-lg p-4 overflow-hidden">
                  <div
                    className={`space-y-1 transition-[max-height] duration-300 ease-out ${
                      setlistExpanded ? "max-h-[1200px]" : "max-h-[240px]"
                    }`}
                  >
                    {visibleSetlistLines.map((line, idx) => {
                      const isTeaser =
                        !setlistExpanded && idx === SETLIST_COLLAPSED_VISIBLE;
                      return (
                        <div
                          key={`${idx}-${line}`}
                          className={`flex gap-3 py-1.5 ${isTeaser ? "opacity-60 blur-[0.3px]" : ""}`}
                        >
                          <span
                            className="font-mono text-sm min-w-[2rem] font-semibold"
                            style={{ color: accentColor }}
                          >
                            {idx + 1}.
                          </span>
                          {(() => {
                            const { title, meta } = splitSetlistLine(line);
                            return (
                              <div className={`flex-1 ${activeLocale === "he" ? "text-right" : ""}`}>
                                <div className="text-sm leading-relaxed">{title}</div>
                                {meta && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {meta}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                  {hasMoreSetlist && (
                    <div
                      className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
                        setlistExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                      }`}
                    >
                      <div className="h-20 bg-gradient-to-t from-muted/50 via-muted/30 to-transparent" />
                      <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-none">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="pointer-events-auto bg-background/80 backdrop-blur-sm border shadow-sm"
                          onClick={() => setSetlistExpanded(true)}
                        >
                          {t("showFullSetlist")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {gigPack.setlist_pdf_url && (
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5" style={{ color: accentColor }} />
                  <h3 className="font-semibold text-lg">{t("setlist")} (PDF)</h3>
                </div>
                <iframe
                  src={`${gigPack.setlist_pdf_url}#toolbar=0&navpanes=0`}
                  title="Setlist PDF"
                  className="w-full h-[500px] rounded-md border bg-white mb-3"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(gigPack.setlist_pdf_url!, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t("View Pdf") || "Open full PDF"}
                </Button>
              </div>
            )}
            {gigPack.materials && gigPack.materials.length > 0 && (
              <div className="bg-card border rounded-lg p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <Paperclip className="h-5 w-5" style={{ color: accentColor }} />
                  <h3 className="font-semibold text-lg">{t("materials")}</h3>
                  <Badge variant="secondary" className="text-xs">{gigPack.materials.length}</Badge>
                </div>
                <div className="rounded-lg border bg-card">
                  {gigPack.materials.map((material) => {
                    const kindConfig = MATERIAL_KIND_ICON[material.kind as GigMaterialKind] ?? MATERIAL_KIND_ICON.other;
                    const KindIcon = kindConfig.icon;
                    const hostname = material.url ? (() => { try { return new URL(material.url).hostname; } catch { return null; } })() : null;

                    return (
                      <a
                        key={material.id}
                        href={material.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-3 py-2.5 px-3 hover:bg-muted/50 transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                      >
                        <div className="shrink-0">
                          <KindIcon className={`h-5 w-5 ${kindConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {material.label || t(`materialType${material.kind.charAt(0).toUpperCase()}${material.kind.slice(1)}` as never)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <span>{t(`materialType${material.kind.charAt(0).toUpperCase()}${material.kind.slice(1)}` as never)}</span>
                            {hostname && (
                              <>
                                <span className="text-border">·</span>
                                <span className="inline-flex items-center gap-1 truncate">
                                  <HostingServiceIcon url={material.url!} className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{hostname}</span>
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Need Help - Contacts */}
        {gigPack.contacts && gigPack.contacts.length > 0 && (
          <div className="mt-8">
            <NeedHelpSection
              contacts={gigPack.contacts}
              accentColor={accentColor}
            />
          </div>
        )}

        {/* Updates / Activity Log — reuses the dashboard widget scoped to this gig */}
        <GigActivityWidget gigId={gigPack.id} limit={10} showViewAll className="mt-8 shadow-sm" initialData={gigPack.activity as GigActivityLogEntry[] | undefined} />
        <div className="mt-12 text-center text-xs text-muted-foreground/60">
          <p>
            Powered by <span className="font-semibold" style={{ color: accentColor }}>GigPack</span>
          </p>
        </div>
      </div>
    </div>
  </TooltipProvider>
  );
}
