"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type ThemeContextType = {
  mode: "light" | "dark";
  setMode: (mode: "light" | "dark") => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<"light" | "dark">("light");
  const initialized = useRef(false);

  // Load saved preference and apply theme on mount
  useEffect(() => {
    const stored = localStorage.getItem("ensemble-mode") as "light" | "dark" | null;
    const initialMode = stored || "light";

    // Apply to DOM
    const root = document.documentElement;
    if (initialMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard hydration pattern
      setModeState(stored);
    }
    initialized.current = true;
  }, []);

  // Apply dark class to document when mode changes (after initialization)
  useEffect(() => {
    if (!initialized.current) return;

    const root = document.documentElement;

    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("ensemble-mode", mode);
  }, [mode]);

  const toggleMode = () => {
    setModeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setMode = (newMode: "light" | "dark") => {
    setModeState(newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, setMode, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
