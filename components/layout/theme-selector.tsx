"use client";

import { useTheme } from "@/lib/providers/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeSelector() {
  const { theme: currentTheme, setTheme, themes, mode, toggleMode } = useTheme();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>
          Customize how Ensemble looks for you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dark Mode Toggle */}
        <div>
          <h3 className="text-sm font-medium mb-3">Mode</h3>
          <div className="flex gap-2">
            <button
              onClick={() => toggleMode()}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all flex-1",
                mode === "light"
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground/20 hover:bg-accent"
              )}
            >
              <Sun className="h-4 w-4" />
              <span className="font-medium">Light</span>
              {mode === "light" && <Check className="h-4 w-4 ml-auto text-primary" />}
            </button>
            <button
              onClick={() => toggleMode()}
              className={cn(
                "flex items-center gap-2 rounded-lg border-2 px-4 py-3 transition-all flex-1",
                mode === "dark"
                  ? "border-primary bg-accent"
                  : "border-border hover:border-muted-foreground/20 hover:bg-accent"
              )}
            >
              <Moon className="h-4 w-4" />
              <span className="font-medium">Dark</span>
              {mode === "dark" && <Check className="h-4 w-4 ml-auto text-primary" />}
            </button>
          </div>
        </div>

        {/* Color Theme */}
        <div>
          <h3 className="text-sm font-medium mb-3">Color Theme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((theme) => {
              const isActive = currentTheme === theme.name;
              return (
                <button
                  key={theme.name}
                  onClick={() => setTheme(theme.name)}
                  className={cn(
                    "relative flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all hover:bg-accent",
                    isActive
                      ? "border-primary bg-accent"
                      : "border-border hover:border-muted-foreground/20"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded-full border"
                        style={{
                          backgroundColor: `hsl(${theme.cssVars.light.primary})`,
                        }}
                      />
                      <div>
                        <p className="font-semibold">{theme.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {theme.description}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

