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
        "fixed inset-0 z-50 flex items-center justify-center bg-background",
        className
      )}
    >
      <Image
        src="/gigmasterlogo.png"
        alt="GigMaster"
        width={240}
        height={188}
        className="w-auto animate-pulse opacity-60"
        priority
      />
    </div>
  );
}
