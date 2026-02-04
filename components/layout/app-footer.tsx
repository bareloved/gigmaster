"use client";

import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard,
  Music,
  Guitar,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Smartphone,
} from "lucide-react";

const productLinks = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Gigs", href: "/gigs", icon: Music },
  { title: "Bands", href: "/bands", icon: Guitar },
  { title: "Invitations", href: "/invitations", icon: Mail },
];

const legalLinks = [
  { title: "Privacy Policy", href: "/privacy" },
  { title: "Terms of Service", href: "/terms" },
];

const companyLinks = [
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];

const socialLinks = [
  { title: "Instagram", icon: Instagram, href: "#" },
  { title: "Facebook", icon: Facebook, href: "#" },
  { title: "Twitter", icon: Twitter, href: "#" },
];

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted">
      <div className="container mx-auto max-w-7xl px-6 py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Branding Column */}
          <div className="lg:col-span-1">
            <Link href="/dashboard" className="inline-block">
              <Image
                src="/gigmasterlogo.png"
                alt="GigMaster"
                width={120}
                height={95}
                className="object-contain w-auto"
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Built by musicians, for musicians
            </p>

            {/* Social Icons */}
            <div className="mt-4 flex items-center gap-3">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <button
                    key={social.title}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label={social.title}
                    disabled
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              © {currentYear} GigMaster
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-3">
              {productLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon className="h-4 w-4" />
                      {link.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Mobile App Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Mobile App
            </h3>
            <div className="mt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Smartphone className="h-4 w-4" />
                <span>Coming Soon</span>
              </div>
              <div className="mt-4 flex flex-col gap-2">
                {/* App Store Badge (grayed) */}
                <div className="flex h-10 w-32 items-center justify-center rounded-lg bg-muted-foreground/20 text-xs text-muted-foreground">
                  App Store
                </div>
                {/* Play Store Badge (grayed) */}
                <div className="flex h-10 w-32 items-center justify-center rounded-lg bg-muted-foreground/20 text-xs text-muted-foreground">
                  Google Play
                </div>
              </div>
            </div>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
              Company
            </h3>
            <ul className="mt-4 space-y-3">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
