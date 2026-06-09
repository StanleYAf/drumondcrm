import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeMode = "dark" | "light";
export type AccentColor = "blue" | "green" | "purple" | "orange";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentColor) => void;
  toggleMode: () => void;
}

const STORAGE_KEY = "app_theme_prefs";

const accentMap: Record<AccentColor, { hsl: string; hex: string }> = {
  blue:   { hsl: "211 100% 52%", hex: "#0A84FF" },
  green:  { hsl: "142 69% 50%",  hex: "#30D158" },
  purple: { hsl: "270 67% 57%",  hex: "#8B5CF6" },
  orange: { hsl: "25 95% 53%",   hex: "#F97316" },
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(mode: ThemeMode, accent: AccentColor) {
  const root = document.documentElement;

  // Force light mode globally; ignore `mode` argument.
  const a = accentMap[accent];
  root.style.setProperty("--primary", a.hsl);
  root.style.setProperty("--ring", a.hsl);
  root.style.setProperty("--sidebar-primary", a.hsl);
  root.style.setProperty("--sidebar-ring", a.hsl);
  root.style.setProperty("--ios-blue", a.hex);

  // Light tokens — kept in sync with src/index.css :root
  root.style.setProperty("--background", "210 17% 98%");
  root.style.setProperty("--foreground", "222 47% 11%");
  root.style.setProperty("--card", "0 0% 100%");
  root.style.setProperty("--card-foreground", "222 47% 11%");
  root.style.setProperty("--popover", "0 0% 100%");
  root.style.setProperty("--popover-foreground", "222 47% 11%");
  root.style.setProperty("--primary-foreground", "0 0% 100%");
  root.style.setProperty("--secondary", "220 14% 96%");
  root.style.setProperty("--secondary-foreground", "220 9% 27%");
  root.style.setProperty("--muted", "220 14% 96%");
  root.style.setProperty("--muted-foreground", "220 9% 46%");
  root.style.setProperty("--accent", "214 100% 97%");
  root.style.setProperty("--accent-foreground", "217 91% 53%");
  root.style.setProperty("--border", "220 13% 91%");
  root.style.setProperty("--input", "220 13% 83%");
  root.style.setProperty("--sidebar-background", "0 0% 100%");
  root.style.setProperty("--sidebar-foreground", "220 9% 27%");
  root.style.setProperty("--sidebar-accent", "214 100% 97%");
  root.style.setProperty("--sidebar-accent-foreground", "217 91% 53%");
  root.style.setProperty("--sidebar-border", "220 13% 91%");
  root.setAttribute("data-theme", "light");
  root.classList.remove("dark");
  document.body.classList.remove("dark");
  document.body.style.backgroundColor = "#F8F9FA";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");
  const [accent, setAccentState] = useState<AccentColor>("blue");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { accent: a } = JSON.parse(saved);
        if (a) setAccentState(a);
        applyTheme("light", a || "blue");
      } else {
        applyTheme("light", "blue");
      }
    } catch {
      applyTheme("light", "blue");
    }
  }, []);

  const setMode = (_m: ThemeMode) => {
    // Dark mode disabled — always light.
    setModeState("light");
    applyTheme("light", accent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: "light", accent }));
  };

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    applyTheme("light", a);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: "light", accent: a }));
  };

  const toggleMode = () => setMode("light");

  return (
    <ThemeContext.Provider value={{ mode: "light", accent, setMode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { accentMap };
