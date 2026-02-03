"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AppLoadingScreenProps {
  className?: string;
}

export function AppLoadingScreen({ className }: AppLoadingScreenProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background",
        className
      )}
    >
      {/* Logo and brand */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-xl bg-primary/20 animate-ping" />
          <div className="relative">
            <Image src="/gigmasterlogo.png" alt="GigMaster" width={240} height={188} className="w-auto" priority />
          </div>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-semibold">GigMaster</span>
          <span className="text-sm text-muted-foreground">Loading your gigs...</span>
        </div>
      </div>

      {/* Subtle loading indicator */}
      <div className="mt-8 flex gap-1">
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}
