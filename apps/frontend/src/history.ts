import { useCallback, useEffect, useState } from "react";

export type HistoryEntry = {
  id: string;
  kind: "decode" | "generate";
  input: string;
  /** Short summary line for the list (tldr or first line of post). */
  summary: string;
  /** The full result payload, so we can restore it on click. */
  payload: unknown;
  at: number;
};

const KEY = "lit:history:v1";
const MAX = 30;

function load(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

let counter = 0;
function makeId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter}`;
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [entries]);

  const add = useCallback((e: Omit<HistoryEntry, "id" | "at">) => {
    setEntries((prev) =>
      [{ ...e, id: makeId(), at: Date.now() }, ...prev].slice(0, MAX),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, add, remove, clear };
}
