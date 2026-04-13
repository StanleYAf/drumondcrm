import Dexie, { type Table } from "dexie";
import type { AppData } from "./types";
import { INITIAL_DATA } from "./initialData";

const DB_NAME = "comercial_db";
const STORAGE_KEY = "comercial_data";

class ComercialDB extends Dexie {
  appState!: Table<{ id: string; data: AppData }>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      appState: "id",
    });
  }
}

export const db = new ComercialDB();

export async function loadFromDB(): Promise<AppData> {
  // Try IndexedDB first
  const row = await db.appState.get("main");
  if (row) return row.data;

  // Migrate from localStorage if exists
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const data: AppData = Array.isArray(parsed) ? parsed[0] : parsed;
      // Ensure historico_metas exists
      if (!data.historico_metas) data.historico_metas = [];
      await db.appState.put({ id: "main", data });
      localStorage.removeItem(STORAGE_KEY);
      return data;
    }
  } catch {}

  // First run - use initial data
  const data = { ...INITIAL_DATA };
  await db.appState.put({ id: "main", data });
  return data;
}

export async function saveToDB(data: AppData): Promise<void> {
  await db.appState.put({ id: "main", data });
}
