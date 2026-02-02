"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Music,
  // DollarSign, // FROZEN: Money page
  // Calendar, // FROZEN: Calendar page
  // Users, // FROZEN: My Circle page
  MoreHorizontal,
  History,
  Menu,
  Mail,
  Guitar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NotificationsDropdown } from "@/components/layout/notifications-dropdown";
import { DarkModeToggle } from "@/components/layout/dark-mode-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { cn } from "@/lib/utils";

const mainNavItems = [
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

const moreNavItems = [
  // FROZEN: Money, Calendar, My Circle
  // {
  //   title: "Money",
  //   href: "/money",
  //   icon: DollarSign,
  // },
  // {
  //   title: "Calendar",
  //   href: "/calendar",
  //   icon: Calendar,
  // },
  // {
  //   title: "My Circle",
  //   href: "/my-circle",
  //   icon: Users,
  // },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
];

export function TopNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // State for animated indicator
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navItemRefs = useRef<{ [key: string]: HTMLAnchorElement | null }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Update indicator position when pathname changes
  useEffect(() => {
    const activeItem = mainNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

    if (activeItem && navItemRefs.current[activeItem.href] && containerRef.current) {
      const element = navItemRefs.current[activeItem.href];
      const container = containerRef.current;
      
      if (element) {
        const containerRect = container.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        setIndicatorStyle({
          left: elementRect.left - containerRect.left + (elementRect.width - 32) / 2,
          width: 32,
        });
      }
    }
  }, [pathname]);

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Row 1 - Global App Bar */}
        <div className="flex h-24 items-center px-6 gap-6">
          {/* Logo + App Name */}
          <Link href="/dashboard" className="min-w-fit flex items-center">
            <Image src="/gigmasterlogo.png" alt="GigMaster" width={170} height={134} className="object-contain mt-3" />
          </Link>

          {/* Center - Main Navigation (Desktop) */}
          <div className="flex-1 hidden lg:flex items-center justify-center">
            <div ref={containerRef} className="relative flex items-center gap-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    ref={(el) => {
                      navItemRefs.current[item.href] = el;
                    }}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "gap-2",
                        isActive && "font-semibold"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Button>
                  </Link>
                );
              })}

              {/* Animated indicator */}
              <div
                className="absolute bottom-0 h-0.5 bg-primary rounded-full transition-all duration-300 ease-out"
                style={{
                  left: `${indicatorStyle.left}px`,
                  width: `${indicatorStyle.width}px`,
                }}
              />

              {/* More dropdown for less-used items */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <MoreHorizontal className="h-4 w-4" />
                    <span>More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex-1 flex lg:hidden items-center justify-start">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    );
                  })}
                  <DropdownMenuSeparator />
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right - Actions & User */}
          <div className="flex items-center gap-2 min-w-fit">
            {/* Notification Bell */}
            <NotificationsDropdown />

            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* User Menu */}
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  );
}

