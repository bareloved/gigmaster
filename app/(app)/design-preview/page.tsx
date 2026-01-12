"use client";

import { useState } from "react";
import {
  Music,
  MapPin,
  Clock,
  Star,
  ChevronRight,
} from "lucide-react";

type ThemeKey = "vintage" | "jazz" | "brutalist" | "retro70s" | "editorial";

export default function DesignPreviewPage() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>("vintage");

  const themes: { key: ThemeKey; label: string; style: string }[] = [
    { key: "vintage", label: "VINTAGE POSTER", style: "rounded-none border-2 border-black uppercase tracking-wider" },
    { key: "jazz", label: "Jazz Lounge", style: "rounded-sm border border-[#d4af37] italic" },
    { key: "brutalist", label: "BRUTALIST", style: "rounded-none border-4 border-black uppercase font-mono" },
    { key: "retro70s", label: "Groovy 70s", style: "rounded-full border-0 bg-gradient-to-r from-[#f97316] to-[#facc15]" },
    { key: "editorial", label: "Editorial", style: "rounded-none border-b-2 border-black font-serif" },
  ];

  return (
    <div className={`min-h-screen -m-6 transition-all duration-500 ${
      activeTheme === "vintage" ? "bg-[#f5efe6]" :
      activeTheme === "jazz" ? "bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a]" :
      activeTheme === "brutalist" ? "bg-[#e5e5e5]" :
      activeTheme === "retro70s" ? "bg-gradient-to-br from-[#fef3c7] via-[#fde68a] to-[#fcd34d]" :
      "bg-[#fafaf9]"
    }`}>
      {/* Theme Switcher */}
      <div className="sticky top-0 z-50 p-4 flex gap-3 justify-center flex-wrap backdrop-blur-sm bg-black/20">
        {themes.map(({ key, label, style }) => (
          <button
            key={key}
            onClick={() => setActiveTheme(key)}
            className={`px-5 py-2.5 font-bold transition-all ${style} ${
              activeTheme === key
                ? "bg-white text-black shadow-lg scale-105"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ============================================
            VINTAGE CONCERT POSTER THEME
            ============================================ */}
        {activeTheme === "vintage" && (
          <div className="space-y-8">
            <div className="text-center py-8 border-b-4 border-dashed border-[#8b4513]">
              <h1 className="text-7xl font-black uppercase tracking-tighter text-[#8b4513]
                           [text-shadow:4px_4px_0px_#d4a574,-1px_-1px_0px_#fff]
                           transform -rotate-1">
                Your Gigs
              </h1>
              <p className="text-xl text-[#a0522d] mt-2 font-mono">★ ★ ★ LIVE ON STAGE ★ ★ ★</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Ticket stub card */}
                <div className="relative bg-[#fffdf8] border-4 border-[#8b4513] p-0
                              shadow-[8px_8px_0px_#8b4513] transform rotate-[0.5deg]">
                  <div className="absolute -left-2 top-0 bottom-0 w-4 flex flex-col justify-around">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-full bg-[#f5efe6]" />
                    ))}
                  </div>

                  <div className="absolute -top-4 -right-4 bg-[#c41e3a] text-white px-4 py-2
                                transform rotate-12 font-black text-sm uppercase tracking-widest
                                border-2 border-white shadow-lg z-10">
                    ⭐ NEXT GIG ⭐
                  </div>

                  <div className="p-8 pl-12">
                    <div className="flex items-start gap-6 mb-6">
                      <div className="bg-[#c41e3a] text-white p-4 transform -rotate-3
                                    border-4 border-[#8b0000] min-w-[100px] text-center
                                    shadow-[4px_4px_0px_#8b0000]">
                        <div className="text-sm font-bold uppercase tracking-widest">JAN</div>
                        <div className="text-5xl font-black leading-none">9</div>
                        <div className="text-sm font-bold uppercase">FRI</div>
                      </div>

                      <div className="flex-1">
                        <span className="bg-[#daa520] text-white px-3 py-1 text-xs font-black uppercase
                                      transform -rotate-2 inline-block mb-2">★ HOSTING ★</span>
                        <h2 className="text-4xl font-black uppercase text-[#8b4513] leading-tight
                                     [text-shadow:2px_2px_0px_#d4a574]">
                          TechCorp Annual Party
                        </h2>
                        <div className="flex items-center gap-2 mt-2 text-[#a0522d]">
                          <MapPin className="h-5 w-5" />
                          <span className="font-mono text-lg">EXPO TEL AVIV</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-6">
                      {[
                        { label: "Doors Open", value: "20:00", rotate: "rotate-1" },
                        { label: "Your Role", value: "Singer", rotate: "-rotate-1", valueColor: "text-[#c41e3a]" },
                        { label: "Payment", value: "₪1,500", rotate: "rotate-2", valueColor: "text-[#228b22]" },
                      ].map((item, i) => (
                        <div key={i} className={`bg-[#f5efe6] border-2 border-dashed border-[#8b4513] px-4 py-2 transform ${item.rotate}`}>
                          <div className="text-xs font-bold uppercase text-[#a0522d]">{item.label}</div>
                          <div className={`text-2xl font-black ${item.valueColor || "text-[#8b4513]"} ${item.label === "Payment" ? "font-mono" : ""}`}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {[
                        { label: "✎ Edit Details", bg: "#c41e3a", border: "#8b0000", text: "white" },
                        { label: "📋 Gig Pack", bg: "#fffdf8", border: "#8b4513", text: "#8b4513" },
                        { label: "🎵 Setlist", bg: "#daa520", border: "#b8860b", text: "white" },
                      ].map((btn, i) => (
                        <button key={i} className="px-6 py-3 font-black uppercase tracking-wider border-4 transition-all
                                                 hover:translate-x-[2px] hover:translate-y-[2px]"
                                style={{
                                  backgroundColor: btn.bg,
                                  borderColor: btn.border,
                                  color: btn.text,
                                  boxShadow: `4px 4px 0px ${btn.border}`,
                                }}>
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Upcoming list */}
                <div className="bg-[#fffdf8] border-4 border-[#8b4513] p-6 shadow-[8px_8px_0px_#8b4513]">
                  <h3 className="text-2xl font-black uppercase text-[#8b4513] mb-4 border-b-4 border-dashed border-[#d4a574] pb-2">
                    ★ Coming Up ★
                  </h3>
                  <div className="space-y-3">
                    {[
                      { day: "SAT", date: "10", title: "Jazz Night", venue: "Blue Note", color: "#2563eb" },
                      { day: "TUE", date: "13", title: "Corporate Gig", venue: "Hilton", color: "#7c3aed" },
                      { day: "FRI", date: "16", title: "Beach Wedding", venue: "Resort", color: "#059669" },
                    ].map((gig, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-[#f5efe6] border-l-8
                                             transform hover:-rotate-1 hover:scale-[1.02] transition-all cursor-pointer"
                           style={{ borderColor: gig.color }}>
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs font-black uppercase" style={{ color: gig.color }}>{gig.day}</div>
                          <div className="text-2xl font-black text-[#8b4513]">{gig.date}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-[#8b4513] uppercase">{gig.title}</div>
                          <div className="text-sm text-[#a0522d] font-mono">{gig.venue}</div>
                        </div>
                        <ChevronRight className="h-6 w-6 text-[#8b4513]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Stats stamp */}
                <div className="bg-[#fffdf8] border-4 border-[#8b4513] p-6 transform -rotate-1 shadow-[6px_6px_0px_#8b4513]">
                  <h3 className="text-xl font-black uppercase text-[#c41e3a] mb-4 text-center
                               border-2 border-[#c41e3a] py-1 transform rotate-[-2deg]">
                    ★ THIS MONTH ★
                  </h3>
                  <div className="space-y-4 text-center">
                    <div>
                      <div className="text-5xl font-black text-[#8b4513]">12</div>
                      <div className="text-sm font-bold uppercase text-[#a0522d]">Gigs Played</div>
                    </div>
                    <div className="border-t-2 border-dashed border-[#d4a574] pt-4">
                      <div className="text-4xl font-mono font-black text-[#228b22]">₪8,500</div>
                      <div className="text-sm font-bold uppercase text-[#a0522d]">Total Earned</div>
                    </div>
                  </div>
                </div>

                {/* Notepad checklist */}
                <div className="bg-[#fffef0] border-4 border-[#8b4513] p-6 transform rotate-1 shadow-[6px_6px_0px_#8b4513]"
                     style={{ backgroundImage: 'repeating-linear-gradient(#fffef0 0px, #fffef0 24px, #e0d5c0 25px)' }}>
                  <h3 className="text-lg font-black uppercase text-[#c41e3a] mb-4">☑ Prep Checklist</h3>
                  <div className="space-y-2 font-mono">
                    {[
                      { label: "Learn songs", done: true },
                      { label: "Print charts", done: true },
                      { label: "Program sounds", done: false },
                      { label: "Pack gear", done: false },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-2 ${item.done ? 'line-through text-[#a0522d]' : 'text-[#8b4513]'}`}>
                        <span className="text-xl">{item.done ? '☑' : '☐'}</span>
                        <span className="font-bold">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            JAZZ LOUNGE THEME
            ============================================ */}
        {activeTheme === "jazz" && (
          <div className="space-y-8">
            <div className="text-center py-8 relative">
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
              <div className="relative inline-block bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f0f1a] px-12">
                <div className="text-[#d4af37] text-sm tracking-[0.5em] uppercase mb-2">✧ Presenting ✧</div>
                <h1 className="text-6xl font-serif italic text-[#d4af37] [text-shadow:2px_2px_4px_rgba(0,0,0,0.5)]">
                  Your Performances
                </h1>
                <div className="text-[#8888aa] text-sm tracking-[0.3em] uppercase mt-2">An Evening of Excellence</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="relative">
                  <div className="absolute -top-2 -left-2 w-12 h-12 border-t-2 border-l-2 border-[#d4af37]" />
                  <div className="absolute -top-2 -right-2 w-12 h-12 border-t-2 border-r-2 border-[#d4af37]" />
                  <div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-2 border-l-2 border-[#d4af37]" />
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-2 border-r-2 border-[#d4af37]" />

                  <div className="bg-gradient-to-br from-[#1e1e3f] to-[#252550] border border-[#3d3d6b] p-8">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-[1px] bg-gradient-to-r from-[#d4af37] to-transparent" />
                      <span className="text-[#d4af37] text-sm tracking-[0.3em] uppercase font-light">Featured Performance</span>
                      <div className="flex-1 h-[1px] bg-gradient-to-l from-[#d4af37] to-transparent" />
                    </div>

                    <div className="flex items-start gap-8 mb-8">
                      <div className="bg-[#722f37] border border-[#d4af37]/30 p-5 text-center min-w-[100px]
                                    shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                        <div className="text-[#d4af37]/70 text-xs tracking-[0.2em] uppercase font-light">January</div>
                        <div className="text-[#f4e4bc] text-5xl font-serif italic">9</div>
                        <div className="text-[#d4af37]/70 text-xs tracking-[0.2em] uppercase font-light">Friday</div>
                      </div>

                      <div className="flex-1">
                        <span className="bg-[#d4af37]/20 border border-[#d4af37]/50 text-[#d4af37]
                                      px-3 py-1 text-xs tracking-[0.2em] uppercase inline-block mb-3">Host</span>
                        <h2 className="text-3xl font-serif italic text-[#f4e4bc] mb-2">TechCorp Annual Gala</h2>
                        <div className="flex items-center gap-2 text-[#8888aa]">
                          <MapPin className="h-4 w-4 text-[#d4af37]" />
                          <span className="tracking-wide">Expo Tel Aviv • Grand Ballroom</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[
                        { label: "Curtain", value: "20:00", icon: Clock },
                        { label: "Role", value: "Vocalist", icon: Music },
                        { label: "Honorarium", value: "₪1,500", icon: Star },
                      ].map((item, i) => (
                        <div key={i} className="bg-[#1a1a2e]/50 border border-[#3d3d6b] p-4 text-center">
                          <item.icon className="h-4 w-4 text-[#d4af37] mx-auto mb-2" />
                          <div className="text-[#8888aa] text-xs tracking-[0.2em] uppercase mb-1">{item.label}</div>
                          <div className="text-[#f4e4bc] text-xl font-serif">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button className="bg-[#722f37] text-[#f4e4bc] px-8 py-3 border border-[#d4af37]/30
                                       tracking-[0.15em] uppercase text-sm hover:bg-[#8b3a44] transition-all">
                        Edit Details
                      </button>
                      <button className="bg-transparent text-[#d4af37] px-8 py-3 border border-[#d4af37]/50
                                       tracking-[0.15em] uppercase text-sm hover:bg-[#d4af37]/10 transition-all">
                        View Programme
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e1e3f] to-[#252550] border border-[#3d3d6b] p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-8 h-[1px] bg-[#d4af37]" />
                    <h3 className="text-[#d4af37] text-sm tracking-[0.3em] uppercase font-light">Upcoming Engagements</h3>
                    <div className="flex-1 h-[1px] bg-[#d4af37]/30" />
                  </div>
                  <div className="space-y-4">
                    {[
                      { day: "Sat", date: "10", title: "Jazz Night at Blue Note", venue: "Blue Note Club" },
                      { day: "Tue", date: "13", title: "Corporate Reception", venue: "The Hilton" },
                      { day: "Fri", date: "16", title: "Wedding Celebration", venue: "Seaside Resort" },
                    ].map((gig, i) => (
                      <div key={i} className="flex items-center gap-6 p-4 border-b border-[#3d3d6b]/50 last:border-0
                                            hover:bg-[#d4af37]/5 transition-all cursor-pointer group">
                        <div className="text-center min-w-[50px]">
                          <div className="text-[#d4af37] text-xs tracking-wider uppercase">{gig.day}</div>
                          <div className="text-[#f4e4bc] text-2xl font-serif italic">{gig.date}</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[#f4e4bc] font-serif text-lg">{gig.title}</div>
                          <div className="text-[#8888aa] text-sm">{gig.venue}</div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-[#d4af37]/50 group-hover:text-[#d4af37] transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-[#1e1e3f] to-[#252550] border border-[#3d3d6b] p-6">
                  <div className="text-center mb-4">
                    <div className="text-[#d4af37] text-xs tracking-[0.3em] uppercase">This Season</div>
                    <div className="w-16 h-[1px] bg-[#d4af37]/50 mx-auto mt-2" />
                  </div>
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-5xl font-serif italic text-[#d4af37]">12</div>
                      <div className="text-[#8888aa] text-xs tracking-[0.2em] uppercase mt-1">Performances</div>
                    </div>
                    <div className="border-t border-[#3d3d6b] pt-4 text-center">
                      <div className="text-3xl font-serif text-[#f4e4bc]">₪8,500</div>
                      <div className="text-[#8888aa] text-xs tracking-[0.2em] uppercase mt-1">Compensation</div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#1e1e3f] to-[#252550] border border-[#3d3d6b] p-6">
                  <div className="text-[#d4af37] text-xs tracking-[0.3em] uppercase mb-4 text-center">Preparation</div>
                  <div className="space-y-3">
                    {[
                      { label: "Repertoire mastered", done: true },
                      { label: "Charts prepared", done: true },
                      { label: "Sound design complete", done: false },
                      { label: "Equipment ready", done: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-4 h-4 border ${item.done ? 'bg-[#d4af37] border-[#d4af37]' : 'border-[#d4af37]/50'} flex items-center justify-center`}>
                          {item.done && <span className="text-[#1a1a2e] text-xs">✓</span>}
                        </div>
                        <span className={`text-sm tracking-wide ${item.done ? 'text-[#d4af37]' : 'text-[#8888aa]'}`}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            BRUTALIST THEME
            Raw, industrial, exposed grid, harsh angles
            ============================================ */}
        {activeTheme === "brutalist" && (
          <div className="space-y-8 font-mono">
            {/* Header - Raw, stark */}
            <div className="border-b-8 border-black pb-4">
              <div className="flex items-end gap-4">
                <h1 className="text-8xl font-black uppercase tracking-tighter text-black leading-none">
                  GIGS
                </h1>
                <div className="text-2xl text-black/50 uppercase pb-2">/SCHEDULE</div>
              </div>
              <div className="mt-2 h-2 bg-black w-32" />
            </div>

            <div className="grid grid-cols-12 gap-4">
              {/* Main Content - 8 cols */}
              <div className="col-span-12 lg:col-span-8 space-y-4">
                {/* Hero - Exposed structure */}
                <div className="bg-white border-4 border-black">
                  {/* Top bar */}
                  <div className="bg-black text-white px-4 py-2 flex justify-between items-center">
                    <span className="uppercase tracking-widest text-sm">NEXT_GIG.exe</span>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 border border-white" />
                      <div className="w-3 h-3 border border-white" />
                      <div className="w-3 h-3 bg-white" />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-12 gap-4">
                      {/* Date block */}
                      <div className="col-span-3">
                        <div className="bg-[#ff0000] text-white p-4 text-center">
                          <div className="text-xs uppercase tracking-widest opacity-70">2025</div>
                          <div className="text-6xl font-black leading-none">09</div>
                          <div className="text-xl uppercase tracking-widest">JAN</div>
                          <div className="mt-2 pt-2 border-t border-white/30 text-sm uppercase">FRI</div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="col-span-9">
                        <div className="flex gap-2 mb-3">
                          <span className="bg-black text-white px-2 py-1 text-xs uppercase tracking-wider">
                            STATUS: HOSTING
                          </span>
                          <span className="border-2 border-black px-2 py-1 text-xs uppercase tracking-wider">
                            CONFIRMED
                          </span>
                        </div>

                        <h2 className="text-4xl font-black uppercase tracking-tight mb-2">
                          TECHCORP<br/>ANNUAL PARTY
                        </h2>

                        <div className="space-y-1 text-sm uppercase tracking-wider">
                          <div className="flex gap-2">
                            <span className="text-black/50 w-20">VENUE:</span>
                            <span className="font-bold">EXPO TEL AVIV</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-black/50 w-20">TIME:</span>
                            <span className="font-bold">20:00</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-black/50 w-20">ROLE:</span>
                            <span className="font-bold text-[#ff0000]">SINGER</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-black/50 w-20">PAY:</span>
                            <span className="font-bold">₪1,500</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - Raw rectangles */}
                    <div className="mt-6 pt-4 border-t-2 border-black flex flex-wrap gap-2">
                      <button className="bg-black text-white px-6 py-3 uppercase tracking-wider text-sm font-bold
                                       hover:bg-[#ff0000] transition-colors">
                        [EDIT]
                      </button>
                      <button className="border-2 border-black px-6 py-3 uppercase tracking-wider text-sm font-bold
                                       hover:bg-black hover:text-white transition-colors">
                        [GIG_PACK]
                      </button>
                      <button className="border-2 border-black px-6 py-3 uppercase tracking-wider text-sm font-bold
                                       hover:bg-black hover:text-white transition-colors">
                        [SETLIST]
                      </button>
                    </div>
                  </div>
                </div>

                {/* Upcoming - Table/Grid style */}
                <div className="bg-white border-4 border-black">
                  <div className="bg-black text-white px-4 py-2 uppercase tracking-widest text-sm">
                    UPCOMING_QUEUE
                  </div>
                  <div className="divide-y-2 divide-black">
                    {[
                      { date: "10/01", day: "SAT", title: "JAZZ NIGHT", venue: "BLUE NOTE", status: "CONFIRMED" },
                      { date: "13/01", day: "TUE", title: "CORPORATE GIG", venue: "HILTON", status: "PENDING" },
                      { date: "16/01", day: "FRI", title: "BEACH WEDDING", venue: "RESORT", status: "CONFIRMED" },
                    ].map((gig, i) => (
                      <div key={i} className="grid grid-cols-12 text-sm uppercase tracking-wider
                                            hover:bg-[#ff0000] hover:text-white transition-colors cursor-pointer group">
                        <div className="col-span-2 p-3 border-r-2 border-black group-hover:border-white font-bold">
                          {gig.date}
                        </div>
                        <div className="col-span-1 p-3 border-r-2 border-black group-hover:border-white text-black/50 group-hover:text-white/70">
                          {gig.day}
                        </div>
                        <div className="col-span-4 p-3 border-r-2 border-black group-hover:border-white font-bold">
                          {gig.title}
                        </div>
                        <div className="col-span-3 p-3 border-r-2 border-black group-hover:border-white">
                          {gig.venue}
                        </div>
                        <div className="col-span-2 p-3 font-bold">
                          {gig.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar - 4 cols */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                {/* Stats - Raw numbers */}
                <div className="bg-white border-4 border-black">
                  <div className="bg-black text-white px-4 py-2 uppercase tracking-widest text-sm">
                    STATS_JAN
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="text-center border-b-2 border-black pb-4">
                      <div className="text-7xl font-black text-black">12</div>
                      <div className="text-xs uppercase tracking-widest text-black/50">GIGS_COMPLETED</div>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-[#ff0000]">₪8,500</div>
                      <div className="text-xs uppercase tracking-widest text-black/50">TOTAL_EARNED</div>
                    </div>
                  </div>
                </div>

                {/* Checklist - Terminal style */}
                <div className="bg-black text-white border-4 border-black">
                  <div className="px-4 py-2 border-b border-white/30 uppercase tracking-widest text-sm text-[#00ff00]">
                    $ PREP_STATUS
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    {[
                      { label: "learn_songs", done: true },
                      { label: "print_charts", done: true },
                      { label: "program_sounds", done: false },
                      { label: "pack_gear", done: false },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-2">
                        <span className={item.done ? "text-[#00ff00]" : "text-[#ff0000]"}>
                          [{item.done ? "✓" : " "}]
                        </span>
                        <span className={item.done ? "text-white/50 line-through" : "text-white"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                    <div className="mt-4 pt-2 border-t border-white/30 text-[#00ff00] animate-pulse">
                      █ PROGRESS: 50%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            RETRO 70s THEME
            Warm, groovy, rounded, sunburst patterns
            ============================================ */}
        {activeTheme === "retro70s" && (
          <div className="space-y-8">
            {/* Header - Groovy curves */}
            <div className="text-center py-8 relative">
              {/* Sunburst background */}
              <div className="absolute inset-0 overflow-hidden opacity-20">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="absolute top-1/2 left-1/2 w-[200%] h-8 bg-[#c2410c] origin-left"
                       style={{ transform: `rotate(${i * 30}deg)` }} />
                ))}
              </div>

              <div className="relative">
                <div className="inline-block bg-[#c2410c] text-white px-6 py-2 rounded-full text-sm font-bold
                              uppercase tracking-widest mb-4 shadow-lg">
                  ✿ Far Out Schedule ✿
                </div>
                <h1 className="text-7xl font-black text-[#7c2d12]"
                    style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                  Your Gigs
                </h1>
                <div className="flex justify-center gap-2 mt-4">
                  {["★", "☮", "★", "☮", "★"].map((s, i) => (
                    <span key={i} className="text-2xl text-[#c2410c]">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {/* Hero - Rounded, warm */}
                <div className="bg-gradient-to-br from-[#fed7aa] to-[#fdba74] rounded-[40px] p-8
                              shadow-[0_10px_40px_rgba(194,65,12,0.3)] border-4 border-[#c2410c]">
                  {/* Status bubble */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#c2410c] text-white px-6 py-2 rounded-full font-bold uppercase tracking-wider
                                  shadow-lg transform -rotate-3">
                      ✿ Next Gig ✿
                    </div>
                    <div className="bg-[#166534] text-white px-4 py-1 rounded-full text-sm font-bold uppercase">
                      Hosting
                    </div>
                  </div>

                  <div className="flex items-start gap-6">
                    {/* Date - Circle style */}
                    <div className="bg-[#c2410c] rounded-full w-28 h-28 flex flex-col items-center justify-center
                                  text-white shadow-lg border-4 border-[#7c2d12]">
                      <div className="text-xs uppercase tracking-wider opacity-80">Jan</div>
                      <div className="text-4xl font-black leading-none">9</div>
                      <div className="text-xs uppercase tracking-wider opacity-80">Fri</div>
                    </div>

                    <div className="flex-1">
                      <h2 className="text-4xl font-black text-[#7c2d12] mb-2"
                          style={{ fontFamily: 'Georgia, serif' }}>
                        TechCorp Annual Party
                      </h2>
                      <div className="flex items-center gap-2 text-[#9a3412] mb-4">
                        <MapPin className="h-5 w-5" />
                        <span className="font-medium text-lg">Expo Tel Aviv</span>
                      </div>

                      {/* Info pills */}
                      <div className="flex flex-wrap gap-3 mb-6">
                        {[
                          { label: "Time", value: "20:00", color: "#7c2d12" },
                          { label: "Role", value: "Singer", color: "#c2410c" },
                          { label: "Pay", value: "₪1,500", color: "#166534" },
                        ].map((item, i) => (
                          <div key={i} className="bg-white/60 backdrop-blur rounded-full px-5 py-2 border-2"
                               style={{ borderColor: item.color }}>
                            <span className="text-xs uppercase tracking-wider opacity-60">{item.label}: </span>
                            <span className="font-bold" style={{ color: item.color }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Buttons - Pill shapes */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    <button className="bg-[#c2410c] text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider
                                     shadow-lg hover:scale-105 hover:shadow-xl transition-all border-2 border-[#7c2d12]">
                      Edit Details
                    </button>
                    <button className="bg-white text-[#c2410c] px-8 py-3 rounded-full font-bold uppercase tracking-wider
                                     shadow-lg hover:scale-105 hover:shadow-xl transition-all border-2 border-[#c2410c]">
                      Gig Pack
                    </button>
                    <button className="bg-[#166534] text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider
                                     shadow-lg hover:scale-105 hover:shadow-xl transition-all border-2 border-[#14532d]">
                      Setlist
                    </button>
                  </div>
                </div>

                {/* Upcoming - Wavy cards */}
                <div className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] rounded-[40px] p-6 border-4 border-[#c2410c]">
                  <h3 className="text-2xl font-black text-[#7c2d12] mb-4 text-center"
                      style={{ fontFamily: 'Georgia, serif' }}>
                    ✿ Coming Up ✿
                  </h3>
                  <div className="space-y-3">
                    {[
                      { day: "SAT", date: "10", title: "Jazz Night", venue: "Blue Note", color: "#2563eb" },
                      { day: "TUE", date: "13", title: "Corporate Gig", venue: "Hilton", color: "#7c3aed" },
                      { day: "FRI", date: "16", title: "Beach Wedding", venue: "Resort", color: "#059669" },
                    ].map((gig, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white/70 backdrop-blur rounded-full p-3 pr-6
                                            hover:scale-[1.02] transition-all cursor-pointer border-2 border-white
                                            shadow-md hover:shadow-lg">
                        <div className="rounded-full w-14 h-14 flex flex-col items-center justify-center text-white font-bold"
                             style={{ backgroundColor: gig.color }}>
                          <div className="text-[10px] uppercase">{gig.day}</div>
                          <div className="text-xl leading-none">{gig.date}</div>
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-[#7c2d12]" style={{ fontFamily: 'Georgia, serif' }}>{gig.title}</div>
                          <div className="text-sm text-[#9a3412]">{gig.venue}</div>
                        </div>
                        <ChevronRight className="h-6 w-6 text-[#c2410c]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Stats - Flower power */}
                <div className="bg-gradient-to-br from-[#fed7aa] to-[#fdba74] rounded-[40px] p-6 border-4 border-[#c2410c]
                              text-center relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 text-6xl opacity-20">✿</div>
                  <div className="absolute -bottom-4 -left-4 text-6xl opacity-20">☮</div>
                  <h3 className="text-lg font-bold text-[#c2410c] uppercase tracking-wider mb-4">This Month</h3>
                  <div className="bg-white/60 backdrop-blur rounded-3xl p-6 mb-4">
                    <div className="text-6xl font-black text-[#c2410c]">12</div>
                    <div className="text-sm text-[#9a3412] uppercase tracking-wider">Groovy Gigs</div>
                  </div>
                  <div className="bg-white/60 backdrop-blur rounded-3xl p-6">
                    <div className="text-4xl font-black text-[#166534]">₪8,500</div>
                    <div className="text-sm text-[#9a3412] uppercase tracking-wider">Total Bread</div>
                  </div>
                </div>

                {/* Checklist - Bubbly */}
                <div className="bg-gradient-to-br from-[#fef3c7] to-[#fde68a] rounded-[40px] p-6 border-4 border-[#c2410c]">
                  <h3 className="text-lg font-bold text-[#c2410c] uppercase tracking-wider mb-4 text-center">
                    ✿ Prep Vibes ✿
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Learn the tunes", done: true },
                      { label: "Print the charts", done: true },
                      { label: "Dial in sounds", done: false },
                      { label: "Pack the van", done: false },
                    ].map((item, i) => (
                      <div key={i} className={`flex items-center gap-3 bg-white/60 backdrop-blur rounded-full px-4 py-2
                                              ${item.done ? 'opacity-60' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm
                                      ${item.done ? 'bg-[#166534]' : 'bg-[#c2410c]'}`}>
                          {item.done ? "✓" : "○"}
                        </div>
                        <span className={`font-medium ${item.done ? 'line-through text-[#9a3412]' : 'text-[#7c2d12]'}`}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================
            EDITORIAL THEME
            Clean, newspaper-style, typographic
            ============================================ */}
        {activeTheme === "editorial" && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Masthead */}
            <div className="border-b-2 border-black pb-4">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-black/50 mb-1">The Musician&apos;s</div>
                  <h1 className="text-6xl font-serif font-bold tracking-tight text-black">
                    GIG JOURNAL
                  </h1>
                </div>
                <div className="text-right text-sm">
                  <div className="font-serif italic text-black/60">&ldquo;All the gigs fit to print&rdquo;</div>
                  <div className="font-mono text-xs text-black/50 mt-1">January 9, 2025</div>
                </div>
              </div>
              <div className="h-1 bg-black mt-2" />
              <div className="h-[2px] bg-black mt-[2px]" />
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Main story - 8 cols */}
              <div className="col-span-12 lg:col-span-8">
                {/* Lead story */}
                <article className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="bg-black text-white px-2 py-0.5 text-xs font-bold uppercase tracking-wider">
                      Featured
                    </span>
                    <span className="text-xs uppercase tracking-wider text-black/50">Next Performance</span>
                  </div>

                  <h2 className="text-5xl font-serif font-bold leading-tight mb-4 text-black">
                    TechCorp Annual Party Set for Friday Night
                  </h2>

                  <div className="flex items-center gap-4 text-sm text-black/60 mb-4 font-serif italic">
                    <span>By The Schedule Desk</span>
                    <span>•</span>
                    <span>Expo Tel Aviv</span>
                  </div>

                  {/* Article body - newspaper columns */}
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm leading-relaxed mb-4 first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-2 first-letter:leading-none">
                        <strong>EXPO TEL AVIV</strong> — The highly anticipated TechCorp Annual Party
                        is scheduled to take place this Friday evening, January 9th, at the prestigious
                        Expo Tel Aviv venue.
                      </p>
                      <p className="text-sm leading-relaxed mb-4">
                        Doors are set to open at <strong>20:00</strong>, with the main performance
                        beginning shortly thereafter. The event marks one of the most significant
                        corporate gatherings of the season.
                      </p>
                    </div>
                    <div>
                      <div className="bg-[#fafaf9] border border-black/10 p-4 mb-4">
                        <div className="text-xs uppercase tracking-wider text-black/50 mb-2">At a Glance</div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b border-black/10 pb-1">
                            <span className="text-black/60">Date</span>
                            <span className="font-bold">Jan 9, 2025</span>
                          </div>
                          <div className="flex justify-between border-b border-black/10 pb-1">
                            <span className="text-black/60">Time</span>
                            <span className="font-bold">20:00</span>
                          </div>
                          <div className="flex justify-between border-b border-black/10 pb-1">
                            <span className="text-black/60">Role</span>
                            <span className="font-bold text-[#dc2626]">Singer</span>
                          </div>
                          <div className="flex justify-between border-b border-black/10 pb-1">
                            <span className="text-black/60">Status</span>
                            <span className="font-bold">Hosting</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-black/60">Fee</span>
                            <span className="font-bold">₪1,500</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed">
                        Sources close to the event indicate strong attendance is expected,
                        with preparations already well underway.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 mt-6 pt-4 border-t border-black/10">
                    <button className="bg-black text-white px-6 py-2 text-sm font-bold uppercase tracking-wider
                                     hover:bg-[#dc2626] transition-colors">
                      Edit Story
                    </button>
                    <button className="border-2 border-black px-6 py-2 text-sm font-bold uppercase tracking-wider
                                     hover:bg-black hover:text-white transition-colors">
                      View Pack
                    </button>
                    <button className="border-2 border-black px-6 py-2 text-sm font-bold uppercase tracking-wider
                                     hover:bg-black hover:text-white transition-colors">
                      Setlist
                    </button>
                  </div>
                </article>

                {/* Secondary stories */}
                <div className="border-t-2 border-black pt-6">
                  <h3 className="text-xs uppercase tracking-wider text-black/50 mb-4">Coming Attractions</h3>
                  <div className="divide-y divide-black/10">
                    {[
                      { date: "Jan 10", title: "Jazz Night Returns to Blue Note", venue: "Blue Note Club", tag: "Music" },
                      { date: "Jan 13", title: "Corporate Reception at The Hilton", venue: "Hilton Hotel", tag: "Corporate" },
                      { date: "Jan 16", title: "Seaside Wedding Celebration", venue: "Beach Resort", tag: "Wedding" },
                    ].map((story, i) => (
                      <div key={i} className="py-4 flex gap-4 hover:bg-black/5 transition-colors cursor-pointer group">
                        <div className="text-sm text-black/50 font-mono w-16 shrink-0">{story.date}</div>
                        <div className="flex-1">
                          <span className="text-[10px] uppercase tracking-wider text-[#dc2626] font-bold">{story.tag}</span>
                          <h4 className="font-serif text-xl font-bold group-hover:text-[#dc2626] transition-colors">
                            {story.title}
                          </h4>
                          <p className="text-sm text-black/60 mt-1">{story.venue}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-black/30 group-hover:text-black transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar - 4 cols */}
              <div className="col-span-12 lg:col-span-4 space-y-6">
                {/* Stats box */}
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold">
                    The Numbers
                  </div>
                  <div className="p-4">
                    <div className="text-center border-b border-black/10 pb-4 mb-4">
                      <div className="text-6xl font-serif font-bold text-black">12</div>
                      <div className="text-xs uppercase tracking-wider text-black/50">Gigs This Month</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-serif font-bold text-[#dc2626]">₪8,500</div>
                      <div className="text-xs uppercase tracking-wider text-black/50">Total Earnings</div>
                    </div>
                  </div>
                </div>

                {/* Checklist */}
                <div className="border-2 border-black">
                  <div className="bg-black text-white px-4 py-2 text-xs uppercase tracking-wider font-bold">
                    Preparation Notes
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {[
                        { label: "Songs learned", done: true },
                        { label: "Charts printed", done: true },
                        { label: "Sounds programmed", done: false },
                        { label: "Equipment packed", done: false },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-4 h-4 border-2 border-black flex items-center justify-center
                                        ${item.done ? 'bg-black' : ''}`}>
                            {item.done && <span className="text-white text-xs">✓</span>}
                          </div>
                          <span className={`text-sm ${item.done ? 'line-through text-black/40' : 'text-black'}`}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-black/10">
                      <div className="text-xs text-black/50 uppercase tracking-wider mb-1">Progress</div>
                      <div className="h-2 bg-black/10">
                        <div className="h-full bg-black w-1/2" />
                      </div>
                      <div className="text-xs text-black/50 mt-1">50% Complete</div>
                    </div>
                  </div>
                </div>

                {/* Quote box */}
                <div className="border-l-4 border-black pl-4 py-2">
                  <p className="font-serif italic text-lg text-black/80 leading-relaxed">
                    &ldquo;Music is the universal language of mankind.&rdquo;
                  </p>
                  <p className="text-xs uppercase tracking-wider text-black/50 mt-2">
                    — Henry W. Longfellow
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
