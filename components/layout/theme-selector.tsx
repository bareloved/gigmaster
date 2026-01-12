"use client";

import { useTheme } from "@/lib/providers/theme-provider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { mode, setMode } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose your preferred display mode</CardDescription>
      </CardHeader>
      <CardContent>
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

