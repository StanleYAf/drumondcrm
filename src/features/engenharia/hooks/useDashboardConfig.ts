import { useCallback, useEffect, useState } from "react";
import {
  INDICADORES_DEFAULT, mergeIndicadores,
  type IndicadorDef, type IndicadorOverrides, type IndicadorOverride,
} from "../config/indicadoresConfig";

const STORAGE_KEY = "eng_dashboard_cfg_v1";

function load(): IndicadorOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function save(value: IndicadorOverrides) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* noop */ }
}

export function useDashboardConfig() {
  const [overrides, setOverrides] = useState<IndicadorOverrides>(() => load());

  useEffect(() => { save(overrides); }, [overrides]);

  const updateIndicador = useCallback((id: string, patch: IndicadorOverride) => {
    setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const reset = useCallback(() => setOverrides({}), []);

  const indicadores: IndicadorDef[] = mergeIndicadores(INDICADORES_DEFAULT, overrides);

  return { indicadores, overrides, updateIndicador, reset };
}