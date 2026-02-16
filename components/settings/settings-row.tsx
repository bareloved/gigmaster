"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  value?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  destructive?: boolean;
}

export function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
  children,
  destructive,
}: SettingsRowProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      className={cn(
        "flex w-full items-center gap-4 px-2 py-3.5 text-left transition-colors",
        onClick && "active:bg-muted",
        destructive && "text-destructive"
      )}
      onClick={onClick}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          destructive ? "text-destructive" : "text-muted-foreground"
        )}
      />
      <span
        className={cn(
          "flex-1 text-[15px] font-medium",
          destructive && "text-destructive"
        )}
      >
        {label}
      </span>
      {children}
      {value && (
        <span className="text-sm text-muted-foreground">{value}</span>
      )}
      {onClick && !children && (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
      )}
    </Wrapper>
  );
}
