# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a full marketing landing page at `/` for unauthenticated users, with hero, features, how-it-works, testimonials, FAQ, and CTA sections.

**Architecture:** Single client component page at `app/page.tsx` that checks auth state — authenticated users redirect to `/gigs`, unauthenticated users see the landing page. All sections are separate components in `components/landing/`. No middleware needed.

**Tech Stack:** Next.js App Router, Tailwind CSS, shadcn/ui (Button, Card, Accordion), Lucide icons, Intersection Observer for scroll animations.

---

### Task 1: Install shadcn Accordion component

**Files:**
- Create: `components/ui/accordion.tsx`

**Step 1: Install accordion**

Run: `npx shadcn@latest add accordion`

**Step 2: Verify installation**

Run: `ls components/ui/accordion.tsx`
Expected: File exists

**Step 3: Commit**

```bash
git add components/ui/accordion.tsx
git commit -m "chore: add shadcn accordion component for landing page FAQ"
```

---

### Task 2: Create landing page navbar

**Files:**
- Create: `components/landing/landing-nav.tsx`

**Step 1: Create the navbar component**

```tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

export function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/gigmasterlogo.png"
            alt="GigMaster"
            width={120}
            height={95}
            className="h-10 w-auto"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/auth/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/sign-up">
            <Button size="sm">Get Started Free</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t bg-background px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/auth/sign-in">
                <Button variant="outline" size="sm" className="w-full">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button size="sm" className="w-full">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep landing-nav || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add components/landing/landing-nav.tsx
git commit -m "feat: add landing page navbar component"
```

---

### Task 3: Create hero section with stylized app mockup

**Files:**
- Create: `components/landing/hero-section.tsx`
- Create: `components/landing/app-mockup.tsx`

**Step 1: Create the stylized app mockup**

This is a CSS-only illustration of a gig card, not a real screenshot. It shows a simplified gig detail with venue, date, lineup avatars, and payment badges.

```tsx
export function AppMockup() {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">
            UPCOMING GIG
          </div>
          <h3 className="text-lg font-bold">Jazz at the Blue Note</h3>
        </div>
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Confirmed
        </span>
      </div>

      {/* Details */}
      <div className="mb-4 space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/20" />
          <span>The Blue Note, Tel Aviv</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/20" />
          <span>Friday, March 14 &middot; 21:00</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/20" />
          <span>The Jazz Collective</span>
        </div>
      </div>

      {/* Lineup */}
      <div className="mb-4">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          LINEUP
        </div>
        <div className="flex items-center gap-2">
          {["D.S", "M.K", "R.L", "A.B"].map((initials, i) => (
            <div
              key={i}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
            >
              {initials}
            </div>
          ))}
          <span className="text-xs text-muted-foreground">4 musicians</span>
        </div>
      </div>

      {/* Payment row */}
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <span className="text-sm font-medium">Total Pay</span>
        <span className="font-bold text-primary">$2,400</span>
      </div>
    </div>
  );
}
```

**Step 2: Create the hero section**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppMockup } from "./app-mockup";

export function HeroSection() {
  return (
    <section className="px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Text */}
          <div className="text-center md:text-left">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              The operating system for gigging musicians
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Manage your gigs, bands, setlists, lineups, and payments — all in
              one place. Built by a musician, for musicians.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row md:justify-start">
              <Link href="/auth/sign-up">
                <Button size="lg" className="text-base">
                  Get Started Free
                </Button>
              </Link>
              <Link
                href="/auth/sign-in"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline"
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>

          {/* Mockup */}
          <div className="flex justify-center">
            <AppMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(hero|mockup)" || echo "No errors"`

**Step 4: Commit**

```bash
git add components/landing/hero-section.tsx components/landing/app-mockup.tsx
git commit -m "feat: add hero section with stylized app mockup"
```

---

### Task 4: Create features section

**Files:**
- Create: `components/landing/features-section.tsx`

**Step 1: Create the features component**

```tsx
import {
  Music,
  Users,
  ListMusic,
  DollarSign,
  CalendarSync,
  Mail,
} from "lucide-react";

const features = [
  {
    icon: Music,
    title: "Gig Management",
    description:
      "Create and track every gig with venue details, schedules, and notes.",
  },
  {
    icon: Users,
    title: "Band & Lineup",
    description:
      "Organize your bands, assign roles, and invite musicians to your gigs.",
  },
  {
    icon: ListMusic,
    title: "Setlists",
    description:
      "Build and reorder setlists for every performance with drag-and-drop.",
  },
  {
    icon: DollarSign,
    title: "Payment Tracking",
    description:
      "Track who's been paid, what's pending, and see your total earnings.",
  },
  {
    icon: CalendarSync,
    title: "Calendar Sync",
    description:
      "Export gigs to Google Calendar and import events back automatically.",
  },
  {
    icon: Mail,
    title: "Smart Invitations",
    description:
      "Invite musicians via email or WhatsApp with one-click acceptance.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="bg-muted/30 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Everything you need to run your gigs
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            From booking to payment, GigMaster handles the business side so you
            can focus on the music.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

**Note:** If `CalendarSync` doesn't exist in lucide-react, use `CalendarDays` or `RefreshCw` instead. Check imports at build time.

**Step 2: Commit**

```bash
git add components/landing/features-section.tsx
git commit -m "feat: add features section for landing page"
```

---

### Task 5: Create how-it-works section

**Files:**
- Create: `components/landing/how-it-works-section.tsx`

**Step 1: Create the component**

```tsx
import { CirclePlus, UserPlus, BadgeDollarSign } from "lucide-react";

const steps = [
  {
    icon: CirclePlus,
    step: "1",
    title: "Create a gig",
    description: "Add the venue, date, time, and all the details for your performance.",
  },
  {
    icon: UserPlus,
    step: "2",
    title: "Build your lineup",
    description: "Add musicians from your circle or invite new ones via email or WhatsApp.",
  },
  {
    icon: BadgeDollarSign,
    step: "3",
    title: "Get paid & track everything",
    description: "Mark payments, export to your calendar, and stay organized effortlessly.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Get up and running in minutes. No learning curve, no complexity.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="mb-2 text-sm font-bold text-primary">
                  Step {item.step}
                </div>
                <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/landing/how-it-works-section.tsx
git commit -m "feat: add how-it-works section for landing page"
```

---

### Task 6: Create testimonials section

**Files:**
- Create: `components/landing/testimonials-section.tsx`

**Step 1: Create the component with placeholder data**

```tsx
const testimonials = [
  {
    name: "Daniel Levy",
    role: "Bandleader, The Brass Collective",
    initials: "DL",
    quote:
      "I used to spend hours coordinating gigs over WhatsApp. GigMaster replaced all of that — now I send an invite and it's done.",
  },
  {
    name: "Maya Cohen",
    role: "Session Musician",
    initials: "MC",
    quote:
      "Finally, I can see all my upcoming gigs in one place. The calendar sync alone saves me from double-booking every week.",
  },
  {
    name: "Arik Ben-David",
    role: "Music Director",
    initials: "AB",
    quote:
      "Managing 4 different bands was a nightmare. GigMaster keeps everything organized — lineups, setlists, payments, all of it.",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-muted/30 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            What musicians are saying
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border bg-card p-6"
            >
              <p className="mb-6 text-sm italic text-muted-foreground">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/landing/testimonials-section.tsx
git commit -m "feat: add testimonials section with placeholder data"
```

---

### Task 7: Create FAQ section

**Files:**
- Create: `components/landing/faq-section.tsx`

**Depends on:** Task 1 (accordion installed)

**Step 1: Create the FAQ component**

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is GigMaster free?",
    answer:
      "Yes! GigMaster is completely free to use. We believe every musician deserves great tools to manage their gigs without paying a fortune.",
  },
  {
    question: "Who is GigMaster for?",
    answer:
      "GigMaster is built for gigging musicians, band leaders, and music managers. Whether you play solo gigs, lead a jazz quartet, or manage multiple function bands — it's for you.",
  },
  {
    question: "Can I use it on my phone?",
    answer:
      "Absolutely. GigMaster is a fully responsive web app that works great on phones, tablets, and desktops. A dedicated mobile app is also in development.",
  },
  {
    question: "How do invitations work?",
    answer:
      "You can invite musicians to your gigs via email or WhatsApp. They receive a magic link, click it, and they're in. No account required to view the gig — but signing up lets them manage everything from their own dashboard.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Yes. GigMaster uses Supabase with row-level security, which means your data is isolated and encrypted. Only you can see your gigs, and only musicians you invite can see theirs.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-base">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/landing/faq-section.tsx
git commit -m "feat: add FAQ section with accordion"
```

---

### Task 8: Create final CTA section

**Files:**
- Create: `components/landing/cta-section.tsx`

**Step 1: Create the CTA component**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="bg-primary/5 px-4 py-16 sm:px-6 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
          Ready to get organized?
        </h2>
        <p className="mb-8 text-lg text-muted-foreground">
          Join GigMaster today and spend less time organizing, more time playing.
        </p>
        <Link href="/auth/sign-up">
          <Button size="lg" className="text-base">
            Get Started Free
          </Button>
        </Link>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/landing/cta-section.tsx
git commit -m "feat: add final CTA section for landing page"
```

---

### Task 9: Create landing page footer

**Files:**
- Create: `components/landing/landing-footer.tsx`

**Step 1: Create the footer component**

```tsx
import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "/contact" },
];

export function LandingFooter() {
  return (
    <footer className="border-t px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/gigmasterlogo.png"
            alt="GigMaster"
            width={80}
            height={63}
            className="h-7 w-auto"
          />
          <span className="text-sm text-muted-foreground">
            Built with love for musicians
          </span>
        </div>

        <nav className="flex gap-6">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
```

**Step 2: Commit**

```bash
git add components/landing/landing-footer.tsx
git commit -m "feat: add landing page footer"
```

---

### Task 10: Wire everything into app/page.tsx

**Files:**
- Modify: `app/page.tsx` (replace the redirect with the landing page)

**Step 1: Replace app/page.tsx**

This is a client component. It checks auth via `useUser()`. If the user is authenticated, it redirects to `/gigs`. Otherwise, it renders the landing page.

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/providers/user-provider";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/gigs");
    }
  }, [user, isLoading, router]);

  // Show nothing while checking auth (prevents flash)
  if (isLoading || user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
```

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No errors

**Step 3: Run dev server and manually verify**

Run: `npm run dev`
Expected: Visit `http://localhost:3000` in an incognito window (no auth) → see landing page. Visit in a logged-in browser → redirect to `/gigs`.

**Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: replace root redirect with landing page for unauthenticated users"
```

---

### Task 11: Add scroll fade-in animations

**Files:**
- Modify: `app/globals.css` (add animation keyframes)
- Create: `components/landing/animate-on-scroll.tsx` (Intersection Observer wrapper)

**Step 1: Add CSS keyframes to globals.css**

Add at the end of `globals.css`:

```css
/* Landing page scroll animations */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out forwards;
}

.animate-fade-in-up-delay-1 {
  animation: fade-in-up 0.6s ease-out 0.1s forwards;
  opacity: 0;
}

.animate-fade-in-up-delay-2 {
  animation: fade-in-up 0.6s ease-out 0.2s forwards;
  opacity: 0;
}
```

**Step 2: Create the AnimateOnScroll wrapper**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimateOnScroll({ children, className = "" }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}
```

**Step 3: Wrap each section in AnimateOnScroll in app/page.tsx**

Update the `<main>` in `app/page.tsx`:

```tsx
import { AnimateOnScroll } from "@/components/landing/animate-on-scroll";

// Inside the return:
<main>
  <HeroSection />
  <AnimateOnScroll>
    <FeaturesSection />
  </AnimateOnScroll>
  <AnimateOnScroll>
    <HowItWorksSection />
  </AnimateOnScroll>
  <AnimateOnScroll>
    <TestimonialsSection />
  </AnimateOnScroll>
  <AnimateOnScroll>
    <FaqSection />
  </AnimateOnScroll>
  <AnimateOnScroll>
    <CtaSection />
  </AnimateOnScroll>
</main>
```

**Step 4: Commit**

```bash
git add app/globals.css components/landing/animate-on-scroll.tsx app/page.tsx
git commit -m "feat: add scroll fade-in animations to landing page sections"
```

---

### Task 12: Build verification and final cleanup

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors (fix any warnings about unused imports, especially check if `CalendarSync` exists in lucide — if not, replace with `CalendarDays`)

**Step 2: Run TypeScript check**

Run: `npm run check`
Expected: No type errors

**Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Manual testing checklist**

- [ ] Visit `/` in incognito → landing page shows
- [ ] Visit `/` logged in → redirects to `/gigs`
- [ ] All anchor links (#features, #how-it-works, #faq) scroll correctly
- [ ] Mobile hamburger menu opens/closes
- [ ] All "Get Started Free" buttons link to `/auth/sign-up`
- [ ] "Sign In" links to `/auth/sign-in`
- [ ] FAQ accordion opens/closes
- [ ] Footer links work (About, Privacy, Terms, Contact)
- [ ] Scroll animations trigger as sections enter viewport
- [ ] Responsive: looks good on mobile (375px), tablet (768px), desktop (1280px)

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete landing page with all sections and animations"
```
