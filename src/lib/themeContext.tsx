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

  // Accent
  const a = accentMap[accent];
  root.style.setProperty("--primary", a.hsl);
  root.style.setProperty("--ring", a.hsl);
  root.style.setProperty("--sidebar-primary", a.hsl);
  root.style.setProperty("--sidebar-ring", a.hsl);
  root.style.setProperty("--ios-blue", a.hex);

  if (mode === "dark") {
    root.style.setProperty("--background", "0 0% 4%");
    root.style.setProperty("--foreground", "0 0% 100%");
    root.style.setProperty("--card", "0 0% 100% / 0.05");
    root.style.setProperty("--card-foreground", "0 0% 100%");
    root.style.setProperty("--popover", "0 0% 8%");
    root.style.setProperty("--popover-foreground", "0 0% 100%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--secondary", "0 0% 100% / 0.08");
    root.style.setProperty("--secondary-foreground", "0 0% 100%");
    root.style.setProperty("--muted", "0 0% 100% / 0.06");
    root.style.setProperty("--muted-foreground", "0 0% 56%");
    root.style.setProperty("--border", "0 0% 100% / 0.08");
    root.style.setProperty("--input", "0 0% 100% / 0.08");
    root.style.setProperty("--sidebar-background", "0 0% 100% / 0.03");
    root.style.setProperty("--sidebar-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-accent", "0 0% 100% / 0.08");
    root.style.setProperty("--sidebar-accent-foreground", "0 0% 100%");
    root.style.setProperty("--sidebar-border", "0 0% 100% / 0.06");
    root.setAttribute("data-theme", "dark");
    document.body.style.backgroundColor = "#0a0a0a";
  } else {
    root.style.setProperty("--background", "0 0% 96%");
    root.style.setProperty("--foreground", "0 0% 10%");
    root.style.setProperty("--card", "0 0% 100%");
    root.style.setProperty("--card-foreground", "0 0% 10%");
    root.style.setProperty("--popover", "0 0% 100%");
    root.style.setProperty("--popover-foreground", "0 0% 10%");
    root.style.setProperty("--primary-foreground", "0 0% 100%");
    root.style.setProperty("--secondary", "0 0% 0% / 0.05");
    root.style.setProperty("--secondary-foreground", "0 0% 10%");
    root.style.setProperty("--muted", "0 0% 0% / 0.04");
    root.style.setProperty("--muted-foreground", "0 0% 40%");
    root.style.setProperty("--border", "0 0% 0% / 0.1");
    root.style.setProperty("--input", "0 0% 0% / 0.06");
    root.style.setProperty("--sidebar-background", "0 0% 100%");
    root.style.setProperty("--sidebar-foreground", "0 0% 10%");
    root.style.setProperty("--sidebar-accent", "0 0% 0% / 0.05");
    root.style.setProperty("--sidebar-accent-foreground", "0 0% 10%");
    root.style.setProperty("--sidebar-border", "0 0% 0% / 0.08");
    root.setAttribute("data-theme", "light");
    document.body.style.backgroundColor = "#f5f5f7";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentColor>("blue");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { mode: m, accent: a } = JSON.parse(saved);
        if (m) setModeState(m);
        if (a) setAccentState(a);
        applyTheme(m || "dark", a || "blue");
      }
    } catch {}
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    applyTheme(m, accent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: m, accent }));
  };

  const setAccent = (a: AccentColor) => {
    setAccentState(a);
    applyTheme(mode, a);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, accent: a }));
  };

  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode }}>
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
