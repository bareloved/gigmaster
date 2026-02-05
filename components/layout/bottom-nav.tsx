"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Music, Guitar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Gigs",
    href: "/gigs",
    icon: Music,
  },
  {
    title: "Bands",
    href: "/bands",
    icon: Guitar,
  },
  {
    title: "Invitations",
    href: "/invitations",
    icon: Mail,
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      {/* Safe area padding for notched phones (iPhone X+) */}
      <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute top-1 w-1 h-1 rounded-full bg-primary" />
              )}
              <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5]")} />
              <span className={cn("text-[10px]", isActive ? "font-semibold" : "font-medium")}>{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
