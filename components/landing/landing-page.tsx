"use client";

import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";
import { AnimateOnScroll } from "@/components/landing/animate-on-scroll";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
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
      <LandingFooter />
    </div>
  );
}
