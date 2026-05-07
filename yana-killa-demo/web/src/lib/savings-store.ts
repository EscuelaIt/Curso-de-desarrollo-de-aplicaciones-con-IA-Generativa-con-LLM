import { useSyncExternalStore } from "react";

type Entry = { type: "simple" | "comparison" | "report"; savedMinutes: number };
const SAVINGS: Record<Entry["type"], number> = {
  simple: 30,
  comparison: 60,
  report: 90,
};

const STORAGE_KEY = "yanakilla.savings.entries";

function load(): Entry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Entry =>
        e && typeof e.type === "string" && e.type in SAVINGS && typeof e.savedMinutes === "number",
    );
  } catch {
    return [];
  }
}

function persist(next: Entry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

let entries: Entry[] = load();
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export const savings = {
  add(type: Entry["type"]) {
    entries = [...entries, { type, savedMinutes: SAVINGS[type] }];
    persist(entries);
    emit();
  },
  reset() {
    entries = [];
    persist(entries);
    emit();
  },
  totalMinutes() {
    return entries.reduce((a, e) => a + e.savedMinutes, 0);
  },
  count() {
    return entries.length;
  },
};

export function useSavings() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => entries,
    () => entries,
  );
}
