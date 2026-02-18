"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Music, Calendar, Guitar, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Gigs", href: "/gigs", icon: Music },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Bands", href: "/bands", icon: Guitar },
  { title: "Money", href: "/money", icon: Banknote },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background">
      <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isDisabled = "disabled" in item && item.disabled;
          const isActive =
            !isDisabled &&
            (pathname === item.href || pathname.startsWith(`${item.href}/`));

          if (isDisabled) {
            return (
              <span
                key={item.href}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-muted-foreground/30 cursor-not-allowed"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.title}</span>
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
