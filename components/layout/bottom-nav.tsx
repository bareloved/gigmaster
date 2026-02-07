"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Music, Guitar, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Gigs", href: "/gigs", icon: Music },
  { title: "Bands", href: "/bands", icon: Guitar },
  { title: "Invitations", href: "/invitations", icon: Mail },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t bg-background">
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
