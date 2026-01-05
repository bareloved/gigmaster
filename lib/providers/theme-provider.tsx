"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { themes, type Theme } from "@/lib/themes";

type ThemeProviderProps = {
  children: React.ReactNode;
};

type ThemeProviderState = {
  theme: string;
  setTheme: (theme: string) => void;
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
  toggleMode: () => void;
  themes: Theme[];
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(
  undefined
);

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<string>("slate");
  const [mode, setModeState] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("ensemble-theme");
    const storedMode = localStorage.getItem("ensemble-mode") as "light" | "dark" | null;
    
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    if (storedMode) {
      setModeState(storedMode);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const themeConfig = themes.find((t) => t.name === theme);

    if (themeConfig) {
      // Apply theme variables based on current mode
      const vars = mode === "dark" ? themeConfig.cssVars.dark : themeConfig.cssVars.light;
      
      Object.entries(vars).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value);
      });

      // Update class for dark mode
      if (mode === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      // Store preferences
      localStorage.setItem("ensemble-theme", theme);
      localStorage.setItem("ensemble-mode", mode);
    }
  }, [theme, mode, mounted]);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
  };

  const setMode = (newMode: "light" | "dark") => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, mode, setMode, toggleMode, themes }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

