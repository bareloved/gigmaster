"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "@/lib/gigpack/i18n";
import { GigPack } from "@/lib/gigpack/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar, Clock, MapPin, Music, Users, Shirt, Package, ParkingCircle, Paperclip, ExternalLink, Mic, Building, Beer, Coffee, Tent, Headphones, Star, PartyPopper, FileText, Download, StickyNote, Share2, Phone, Mail, MessageCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { normalizePhoneForWhatsApp } from "@/lib/utils/whatsapp";
import { isHtmlSetlist, plainTextToHtml } from "@/lib/utils/setlist-html";
import { exportSetlistPdf } from "@/lib/utils/setlist-pdf-export";
import { classifyGigVisualTheme, pickFallbackImageForTheme } from "@/lib/gigpack/gig-visual-theme";
import { NeedHelpSection } from "@/components/gigpack/need-help-section";
import { HostingServiceIcon } from "@/components/shared/hosting-service-icon";
import { InvitationStatusIcon } from "@/components/gigpack/ui/invitation-status-icon";
import type { GigMaterialKind } from "@/lib/gigpack/types";

function getInitials(name: string): string {
  if (!name.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}


const MATERIAL_KIND_ICON: Record<GigMaterialKind, { icon: React.ElementType; color: string }> = {
  rehearsal: { icon: Mic, color: "text-amber-700 dark:text-amber-400" },
  performance: { icon: Star, color: "text-rose-600 dark:text-rose-400" },
  charts: { icon: Music, color: "text-blue-600 dark:text-blue-400" },
  reference: { icon: Headphones, color: "text-violet-600 dark:text-violet-400" },
  other: { icon: Paperclip, color: "text-slate-600 dark:text-slate-400" },
};

interface GigPackLayoutProps {
  gigPack: Omit<GigPack, "internal_notes" | "owner_id">;
  openMaps: () => void;
  slug: string;
  locale?: string;
  paymentSection?: React.ReactNode;
}

export function GigPackLayout({ gigPack, openMaps, paymentSection }: GigPackLayoutProps) {
  const activeLocale = useLocale();
  
  const t = useTranslations("public");
  const [setlistExpanded, setSetlistExpanded] = useState(false);
  const [mobileScheduleExpanded, setMobileScheduleExpanded] = useState(false);
  
  const accentColor = gigPack.accent_color || "hsl(var(--primary))";

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

  const rawSetlist = gigPack.setlist || "";
  const setlistHtml = rawSetlist.trim()
    ? isHtmlSetlist(rawSetlist)
      ? rawSetlist
      : plainTextToHtml(rawSetlist)
    : "";
  const hasSetlistContent =
    setlistHtml.replace(/<[^>]+>/g, "").trim().length > 0;

  const handleDownloadPdf = async () => {
    if (!setlistHtml) return;
    const subtitle = [
      gigPack.venue_name,
      gigPack.date ? formatDate(gigPack.date) : null,
    ]
      .filter(Boolean)
      .join(" \u2022 ");
    const title = gigPack.band_name || gigPack.title;
    const filename =
      [gigPack.title, gigPack.band_name, gigPack.date]
        .filter(Boolean)
        .join(" - ") + ".pdf";
    await exportSetlistPdf(
      { title, subtitle, bodyHtml: setlistHtml, numbered: true },
      filename
    );
  };
  
  return (
    <TooltipProvider>
      <div className={`min-h-screen bg-background ${activeLocale === 'he' ? 'rtl' : ''}`} style={customStyle} dir={activeLocale === 'he' ? 'rtl' : 'ltr'}>
        {/* ─── Clean Hero Image (full-width) ─── */}
        <div className="relative h-[280px] sm:h-[320px] md:h-[400px] w-full overflow-hidden mb-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
          {gigPack.band_logo_url && (
            <div className={`absolute top-4 md:top-6 z-10 ${activeLocale === 'he' ? 'right-4 md:right-6' : 'left-4 md:left-6'}`}>
              <div className="bg-white/95 dark:bg-black/80 p-2 rounded-lg shadow-lg">
                <Image src={gigPack.band_logo_url} alt="Band logo" width={64} height={64} className="band-logo-small object-contain" />
              </div>
            </div>
          )}
          {gigPack.gig_type && gigPack.gig_type !== "other" && (
            <div className={`absolute top-14 md:top-16 z-10 ${activeLocale === 'he' ? 'left-4 md:left-6' : 'right-4 md:right-6'}`}>
              <Badge
                variant="secondary"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold backdrop-blur-sm shadow-lg ${getGigTypeBadgeColors(gigPack.gig_type)}`}
              >
                {getGigTypeIcon(gigPack.gig_type)}
                {getGigTypeLabel(gigPack.gig_type)}
              </Badge>
            </div>
          )}
        </div>

        {/* ─── Content container ─── */}
        <div className="max-w-5xl mx-auto px-6 sm:px-10 md:px-16 lg:px-24">

        {/* ─── Floating Info Card (wide, like reference) ─── */}
        <div className="-mt-40 md:-mt-56 mb-10 relative z-10">
          <div className="mx-auto bg-card border rounded-xl shadow-xl p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:gap-0">
              {/* Left 2/3 — Gig info */}
              <div className="flex-1 min-w-0 lg:pr-8">
                {/* Title + Band */}
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {gigPack.title}
                </h1>
                {gigPack.band_name && (
                  <p className="text-muted-foreground mt-1">
                    {gigPack.band_name}
                  </p>
                )}

                {/* Date And Time — labeled section */}
                {(gigPack.date || gigPack.call_time || gigPack.on_stage_time) && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4" style={{ color: accentColor }} />
                      <span className="text-sm font-medium" style={{ color: accentColor }}>{t("dateAndTime") || "Date And Time"}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                      {gigPack.date && (
                        <span className="font-medium">{formatDate(gigPack.date)}</span>
                      )}
                      {(gigPack.call_time || gigPack.on_stage_time) && (
                        <div className="flex items-center gap-3 text-sm sm:text-base">
                          {gigPack.call_time && (
                            <button
                              className="hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                              onClick={() => navigator.clipboard?.writeText(gigPack.call_time || '')}
                              title="Copy call time"
                            >
                              <span className="text-muted-foreground">{t("callLabel")}</span>{" "}
                              <span dir="ltr" className="font-semibold">{gigPack.call_time?.slice(0, 5)}</span>
                            </button>
                          )}
                          {gigPack.call_time && gigPack.on_stage_time && (
                            <span className="text-muted-foreground/50">|</span>
                          )}
                          {gigPack.on_stage_time && (
                            <button
                              className="hover:bg-muted rounded px-1.5 py-0.5 transition-colors"
                              onClick={() => navigator.clipboard?.writeText(gigPack.on_stage_time || '')}
                              title="Copy stage time"
                            >
                              <span className="text-muted-foreground">{t("stageLabel")}</span>{" "}
                              <span dir="ltr" className="font-semibold">{gigPack.on_stage_time?.slice(0, 5)}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Address — labeled section */}
                {(gigPack.venue_name || gigPack.venue_address) && (
                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4" style={{ color: accentColor }} />
                      <span className="text-sm font-medium" style={{ color: accentColor }}>{t("addressLabel") || "Address"}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {gigPack.venue_name && (
                          <span className="font-medium">{gigPack.venue_name}</span>
                        )}
                        {gigPack.venue_address && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1 sm:line-clamp-none">{gigPack.venue_address}</p>
                        )}
                      </div>
                      {gigPack.venue_maps_url && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            onClick={openMaps}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MapPin className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => {
                              const address = encodeURIComponent(gigPack.venue_address || '');
                              const wazeUrl = `https://waze.com/ul?q=${address}`;
                              window.open(wazeUrl, '_blank', 'noopener,noreferrer');
                            }}
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Image src="/wazeicon.png" alt="Waze" width={20} height={20} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right 1/3 — Who's Playing */}
              {gigPack.lineup && gigPack.lineup.length > 0 && (() => {
                const visibleMembers = gigPack.lineup.filter(m => m.name?.trim());
                const MAX_VISIBLE = 4;
                const shown = visibleMembers.slice(0, MAX_VISIBLE);
                const overflow = visibleMembers.slice(MAX_VISIBLE);

                const renderMemberRow = (member: typeof visibleMembers[number], index: number) => {
                  const hasContactInfo = member.email || member.phone;
                  const row = (
                    <div
                      className={`flex items-center gap-2.5 py-2 hover:bg-muted/30 transition-colors rounded-md px-1 -mx-1 ${hasContactInfo ? 'cursor-pointer' : ''}`}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {getInitials(member.name!)}
                          </AvatarFallback>
                        </Avatar>
                        <InvitationStatusIcon
                          status={member.invitationStatus}
                          size="sm"
                          className="absolute -bottom-0.5 -right-0.5 border-2 border-background"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{member.name}</p>
                        {member.role && (
                          <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                        )}
                      </div>
                    </div>
                  );

                  if (!hasContactInfo) {
                    return <div key={`${member.name}-${index}`}>{row}</div>;
                  }

                  return (
                    <Popover key={`${member.name}-${index}`}>
                      <PopoverTrigger asChild>
                        {row}
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-4" align="start">
                        <div className="flex items-center gap-3 mb-3">
                          <Avatar className="h-11 w-11">
                            <AvatarImage src={member.avatarUrl || undefined} />
                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                              {getInitials(member.name!)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{member.name}</p>
                            {member.role && (
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {member.phone && (
                            <>
                              <Button variant="outline" size="sm" className="gap-2" asChild>
                                <a href={`tel:${member.phone}`}>
                                  <Phone className="h-4 w-4" />
                                  {member.phone}
                                </a>
                              </Button>
                              <Button variant="outline" size="sm" className="gap-2" asChild>
                                <a
                                  href={`https://wa.me/${normalizePhoneForWhatsApp(member.phone)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                  WhatsApp
                                </a>
                              </Button>
                            </>
                          )}
                          {member.email && (
                            <Button variant="outline" size="sm" className="gap-2" asChild>
                              <a href={`mailto:${member.email}`}>
                                <Mail className="h-4 w-4" />
                                {member.email}
                              </a>
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                };

                return (
                  <>
                    {/* Desktop — full member list in right 1/3 */}
                    <div className="hidden lg:block w-px bg-border/50 shrink-0" />
                    <div className="hidden lg:block lg:pl-8 lg:w-[280px] shrink-0">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="h-4 w-4" style={{ color: accentColor }} />
                        <span className="font-semibold">{t("whosPlaying")}</span>
                        <Badge variant="secondary" className="text-xs">{visibleMembers.length}</Badge>
                      </div>
                      <div className="space-y-0">
                        {shown.map((member, i) => renderMemberRow(member, i))}
                        {overflow.length > 0 && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="flex items-center gap-2 py-2 px-1 -mx-1 text-sm font-medium hover:bg-muted/30 rounded-md transition-colors w-full">
                                <div className="flex -space-x-2">
                                  {overflow.slice(0, 3).map((m, i) => (
                                    <Avatar key={i} className="h-6 w-6 border-2 border-card">
                                      <AvatarImage src={m.avatarUrl || undefined} />
                                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {getInitials(m.name!)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <span style={{ color: accentColor }}>+{overflow.length} more</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-3 max-h-[400px] overflow-y-auto" align="start">
                              <div className="space-y-0">
                                {visibleMembers.map((member, i) => renderMemberRow(member, i))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>

                    {/* Mobile — compact avatar stack with "show all" popover */}
                    <div className="lg:hidden mt-3 pt-3 border-t border-border/50">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2.5 w-full">
                            <div className="flex -space-x-2">
                              {visibleMembers.slice(0, 5).map((m, i) => (
                                <Avatar key={i} className="h-7 w-7 border-2 border-card ring-1 ring-border/20">
                                  <AvatarImage src={m.avatarUrl || undefined} />
                                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {getInitials(m.name!)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {visibleMembers.length > 5 && (
                                <div className="h-7 w-7 rounded-full border-2 border-card ring-1 ring-border/20 bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                                  +{visibleMembers.length - 5}
                                </div>
                              )}
                            </div>
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3 max-h-[400px] overflow-y-auto" align="start">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                            <Users className="h-4 w-4" style={{ color: accentColor }} />
                            <span className="font-semibold text-sm">{t("whosPlaying")}</span>
                            <Badge variant="secondary" className="text-xs">{visibleMembers.length}</Badge>
                          </div>
                          <div className="space-y-0">
                            {visibleMembers.map((member, i) => renderMemberRow(member, i))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ─── Main + Sidebar Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-8">

          {/* ─── Main Column (left, wider) ─── */}
          <div className="lg:col-span-3 space-y-0">
            {/* Logistics */}
            {(gigPack.dress_code || gigPack.backline_notes || gigPack.parking_notes || gigPack.notes) && (
              <div className="pb-8">
                <div className="space-y-4">
                  {gigPack.dress_code && (
                    <div className={`flex gap-3 ${activeLocale === 'he' ? 'text-right' : ''}`}>
                      <Shirt className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm text-muted-foreground mb-1">{t("dressCodeLabel")}</div>
                        <div className="text-base">{gigPack.dress_code}</div>
                      </div>
                    </div>
                  )}
                  {gigPack.backline_notes && (
                    <div className={`flex gap-3 ${activeLocale === 'he' ? 'text-right' : ''}`}>
                      <Package className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm text-muted-foreground mb-1">{t("gearLabel")}</div>
                        <div className="text-base whitespace-pre-wrap">{gigPack.backline_notes}</div>
                      </div>
                    </div>
                  )}
                  {gigPack.parking_notes && (
                    <div className={`flex gap-3 ${activeLocale === 'he' ? 'text-right' : ''}`}>
                      <ParkingCircle className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm text-muted-foreground mb-1">{t("parkingLabel")}</div>
                        <div className="text-base whitespace-pre-wrap">{gigPack.parking_notes}</div>
                      </div>
                    </div>
                  )}
                  {gigPack.notes && (
                    <div className={`flex gap-3 ${activeLocale === 'he' ? 'text-right' : ''}`}>
                      <StickyNote className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm text-muted-foreground mb-1">{t("notesLabel")}</div>
                        <div className="text-base whitespace-pre-wrap">{gigPack.notes}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Schedule — mobile only (above setlist) */}
            {gigPack.schedule && gigPack.schedule.length > 0 && (() => {
              const sorted = [...gigPack.schedule].sort((a, b) => {
                if (!a.time && !b.time) return 0;
                if (!a.time) return 1;
                if (!b.time) return -1;
                return a.time.localeCompare(b.time);
              });
              const PREVIEW_COUNT = 2;
              const needsCollapse = sorted.length > PREVIEW_COUNT;
              const displayed = mobileScheduleExpanded ? sorted : sorted.slice(0, PREVIEW_COUNT);

              return (
                <div className="lg:hidden pb-8 border-t border-border/30 pt-6">
                  <h3 className="font-semibold text-lg mb-3">{t("schedule")}</h3>
                  <div className="relative">
                    <div className="space-y-1">
                      {displayed.map((item, index) => (
                        <div key={item.id}>
                          <div className="py-2">
                            <span dir="ltr" className="text-base font-bold text-foreground">
                              {item.time}
                            </span>
                            <span className="mx-1.5 text-muted-foreground/50" aria-hidden="true">–</span>
                            <span className="font-medium text-foreground/90">{item.label}</span>
                          </div>
                          {index < displayed.length - 1 && (
                            <hr className="border-muted-foreground/10" />
                          )}
                        </div>
                      ))}
                    </div>
                    {needsCollapse && !mobileScheduleExpanded && (
                      <div className="absolute inset-x-0 bottom-0 pointer-events-none">
                        <div className="h-10 bg-gradient-to-t from-background to-transparent" />
                      </div>
                    )}
                  </div>
                  {needsCollapse && !mobileScheduleExpanded && (
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/80 backdrop-blur-sm border shadow-sm text-gray-700 hover:bg-white"
                        onClick={() => setMobileScheduleExpanded(true)}
                      >
                        {`${t("showMoreUpdates") || "Show more"} (+${sorted.length - PREVIEW_COUNT})`}
                      </Button>
                    </div>
                  )}
                  {needsCollapse && mobileScheduleExpanded && (
                    <div className="flex justify-center mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setMobileScheduleExpanded(false)}
                      >
                        {t("showLess")}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Setlist */}
            {hasSetlistContent && (
              <div className="pb-8 border-t border-border/30 pt-6">
                <h2 className="text-xl font-bold mb-4">{t("setlist")}</h2>
                <div
                  className="relative overflow-hidden rounded-lg"
                  style={{ maxHeight: setlistExpanded ? "none" : "180px" }}
                >
                  <div className="setlist-paper mx-auto setlist-numbered">
                    <div className="setlist-paper-header">
                      <div className="setlist-title">
                        {gigPack.band_name || gigPack.title}
                      </div>
                      {(gigPack.venue_name || gigPack.date) && (
                        <div className="setlist-subtitle">
                          {[
                            gigPack.venue_name,
                            gigPack.date ? formatDate(gigPack.date) : null,
                          ]
                            .filter(Boolean)
                            .join(" \u2022 ")}
                        </div>
                      )}
                    </div>
                    <div
                      className="setlist-preview"
                      dangerouslySetInnerHTML={{ __html: setlistHtml }}
                    />
                  </div>
                  {!setlistExpanded && (
                    <div className="absolute inset-x-0 bottom-0 pointer-events-none">
                      <div className="h-20 bg-gradient-to-t from-white to-transparent" />
                      <div className="absolute inset-x-0 bottom-3 flex justify-center pointer-events-auto">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="bg-white/80 backdrop-blur-sm border shadow-sm text-gray-700 hover:bg-white"
                          onClick={() => setSetlistExpanded(true)}
                        >
                          {t("showFullSetlist")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {setlistExpanded && (
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setSetlistExpanded(false)}
                    >
                      {t("showLess")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download PDF
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Setlist PDF */}
            {gigPack.setlist_pdf_url && (
              <div className="pb-8 border-t border-border/30 pt-6">
                <h2 className="text-xl font-bold mb-4">{t("setlist")} (PDF)</h2>
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

            {/* Materials */}
            {gigPack.materials && gigPack.materials.length > 0 && (
              <div className="pb-8 border-t border-border/30 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold">{t("materials")}</h2>
                  <Badge variant="secondary" className="text-xs bg-white dark:bg-card">{gigPack.materials.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gigPack.materials.map((material) => {
                    const kindConfig = MATERIAL_KIND_ICON[material.kind as GigMaterialKind] ?? MATERIAL_KIND_ICON.other;
                    const KindIcon = kindConfig.icon;

                    return (
                      <a
                        key={material.id}
                        href={material.url || undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex items-center gap-3.5 p-4 rounded-xl border border-transparent hover:border-border/50 hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-card"
                      >
                        {material.url && (
                          <div className="absolute top-2 right-2">
                            <HostingServiceIcon url={material.url} className="h-4 w-4" />
                          </div>
                        )}
                        <div className="shrink-0">
                          <KindIcon className={`h-7 w-7 ${kindConfig.color}`} />
                        </div>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-medium">
                            {material.label || t(`materialType${material.kind.charAt(0).toUpperCase()}${material.kind.slice(1)}` as never)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t(`materialType${material.kind.charAt(0).toUpperCase()}${material.kind.slice(1)}` as never)}
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment section — mobile (after materials) */}
            {paymentSection && (
              <div className="lg:hidden pb-8 border-t border-border/30 pt-6">
                {paymentSection}
              </div>
            )}

          </div>{/* end main column */}

          {/* ─── Sidebar Column (right, narrower — bordered card like reference) ─── */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Schedule card — desktop only (mobile version is in main column) */}
              {gigPack.schedule && gigPack.schedule.length > 0 && (
                <div className="hidden lg:block border rounded-xl p-5">
                  <h3 className="font-semibold text-lg mb-3">{t("schedule")}</h3>
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
                          <span className="mx-1.5 text-muted-foreground/50" aria-hidden="true">–</span>
                          <span className="font-medium text-foreground/90">{item.label}</span>
                        </div>
                        {index < gigPack.schedule!.length - 1 && (
                          <hr className="border-muted-foreground/10" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment section — desktop (right column, after schedule) */}
              {paymentSection && (
                <div className="hidden lg:block">
                  {paymentSection}
                </div>
              )}

              {/* Contact card */}
              {gigPack.contacts && gigPack.contacts.length > 0 && (
                <div className="border rounded-xl p-5">
                  <NeedHelpSection
                    contacts={gigPack.contacts}
                    accentColor={accentColor}
                  />
                </div>
              )}
            </div>
          </div>{/* end sidebar column */}

        </div>{/* end main+sidebar grid */}

        {/* Footer */}
        <div className="mt-2 pb-6 text-center text-xs text-muted-foreground/60 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
            Live • Updated {new Date(gigPack.updated_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
          <p>
            Powered by <a href="https://gigmaster.io" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: accentColor }}>GigMaster</a>
          </p>
        </div>
        </div>{/* end content container */}
    </div>
  </TooltipProvider>
  );
}
