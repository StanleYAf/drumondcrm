import { useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<T extends string> {
  field: T | null;
  direction: SortDirection;
}

export function useTableSort<T extends Record<string, unknown>, K extends Extract<keyof T, string>>(
  data: T[],
  initialField: K | null = null,
  initialDirection: SortDirection = "asc",
) {
  const [sort, setSort] = useState<SortState<K>>({ field: initialField, direction: initialDirection });

  const toggle = (field: K) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" },
    );
  };

  const sorted = useMemo(() => {
    if (!sort.field) return data;
    const field = sort.field;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "pt-BR", { numeric: true }) * dir;
    });
  }, [data, sort]);

  return { sorted, sort, toggle };
}