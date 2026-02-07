"use client";

import { useTheme } from "@/lib/providers/theme-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function GeneralTab() {
  const { mode, setMode } = useTheme();

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div>
          <h3 className="text-lg font-semibold">Appearance</h3>
          <p className="text-sm text-muted-foreground">Choose your preferred display mode</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMode("light")}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all flex-1",
              mode === "light"
                ? "border-primary bg-accent"
                : "border-border hover:border-muted-foreground/20 hover:bg-accent"
            )}
          >
            <Sun className="h-4 w-4" />
            <span className="font-medium">Light</span>
            {mode === "light" && (
              <Check className="h-4 w-4 ml-auto text-primary" />
            )}
          </button>
          <button
            onClick={() => setMode("dark")}
            className={cn(
              "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all flex-1",
              mode === "dark"
                ? "border-primary bg-accent"
                : "border-border hover:border-muted-foreground/20 hover:bg-accent"
            )}
          >
            <Moon className="h-4 w-4" />
            <span className="font-medium">Dark</span>
            {mode === "dark" && (
              <Check className="h-4 w-4 ml-auto text-primary" />
            )}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
