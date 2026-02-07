"use client";

import Image from "next/image";
import Link from "next/link";
import { FaInstagram, FaFacebookF, FaXTwitter, FaYoutube } from "react-icons/fa6";

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Gigs", href: "/gigs" },
  { label: "Bands", href: "/bands" },
  { label: "Invitations", href: "/invitations" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-6 pt-12 pb-8">
        {/* 3-column grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Branding */}
          <div>
            <Image
              src="/logos/textlogo.png"
              alt="GigMaster"
              width={140}
              height={32}
              className="dark:invert"
            />
            <p className="mt-3 text-sm text-muted-foreground">
              Built by musicians, for musicians.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span aria-label="Instagram" className="text-muted-foreground">
                <FaInstagram className="h-4 w-4" />
              </span>
              <span aria-label="Facebook" className="text-muted-foreground">
                <FaFacebookF className="h-4 w-4" />
              </span>
              <span aria-label="X" className="text-muted-foreground">
                <FaXTwitter className="h-4 w-4" />
              </span>
              <span aria-label="YouTube" className="text-muted-foreground">
                <FaYoutube className="h-4 w-4" />
              </span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-medium text-foreground">Product</h3>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h3 className="text-sm font-medium text-foreground">Company</h3>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright divider */}
        <div className="mt-10 border-t pt-6">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} GigMaster. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
