"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", href: "/dashboard" },
  { title: "Gigs", href: "/gigs" },
  { title: "Bands", href: "/bands" },
  { title: "Invitations", href: "/invitations" },
];

export function TopNav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Logo — swaps between full and compact on scroll */}
        <Link href="/dashboard" className="relative flex items-center justify-center shrink-0 w-[130px] sm:w-[150px] lg:w-[180px]">
          {/* Full logo (at top) */}
          <Image
            src="/gigmasterlogo.png"
            alt="GigMaster"
            width={170}
            height={134}
            className={cn(
              "object-contain w-[75px] sm:w-[92px] lg:w-[112px] h-auto mt-8 transition-opacity duration-300",
              scrolled ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            priority
          />
          {/* Compact text logo (scrolled) */}
          <Image
            src="/logos/textlogo.png"
            alt="GigMaster"
            width={200}
            height={60}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 object-contain w-[130px] sm:w-[150px] lg:w-[180px] h-auto transition-opacity duration-300",
              scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 ml-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                {item.title}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <NotificationsDropdown />
          <UserMenu />
        </div>
      </div>
    </nav>
  );
}
