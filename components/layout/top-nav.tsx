"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Gigs", href: "/gigs" },
  { title: "Calendar", href: "/calendar" },
  { title: "Bands", href: "/bands" },
  { title: "Money", href: "/money" },
] as const;

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
      <div className="flex h-16 items-center px-4 sm:px-5 lg:px-6">
        {/* Logo — swaps between full and compact on scroll */}
        <Link href="/gigs" className="relative flex items-center justify-start shrink-0 w-[75px] sm:w-[92px] lg:w-[112px] overflow-visible">
          {/* Full logo (at top) */}
          <Image
            src="/gigmasterlogo.png"
            alt="GigMaster"
            width={170}
            height={134}
            className={cn(
              "object-contain w-[75px] sm:w-[92px] lg:w-[112px] h-auto mt-4 sm:mt-8 transition-opacity duration-300",
              scrolled ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            priority
          />
          {/* Compact text logo (scrolled) */}
          <Image
            src="/logos/textlogo.png"
            alt="GigMaster"
            width={400}
            height={120}
            style={{ width: "auto", height: "auto" }}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 object-contain w-[160px] sm:w-[190px] lg:w-[220px] h-auto transition-opacity duration-300",
              scrolled ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1 ml-4">
          {navItems.map((item) => {
            const isDisabled = "disabled" in item && item.disabled;
            const isActive =
              !isDisabled &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));

            if (isDisabled) {
              return (
                <span
                  key={item.href}
                  className="px-3 py-2 text-base font-medium rounded-md text-muted-foreground/40 cursor-not-allowed"
                >
                  {item.title}
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-base font-medium rounded-md transition-colors",
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
