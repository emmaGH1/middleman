import type { Address, Hash, Hex } from "viem";

export type Broadcast = { hash: Hash; sender: Address; target: Address; data: Hex; label: string };
const listeners = new Set<() => void>();
const memory = new Map<string, string>();

export function subscribeJournal(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function readJournal(key: string) {
  if (typeof window === "undefined") return "";
  try { return window.sessionStorage.getItem(key) ?? memory.get(key) ?? ""; }
  catch { return memory.get(key) ?? ""; }
}

export function writeJournal(key: string, value?: Broadcast) {
  const raw = value ? JSON.stringify(value) : "";
  memory.set(key, raw);
  try {
    if (raw) window.sessionStorage.setItem(key, raw);
    else window.sessionStorage.removeItem(key);
  } catch { /* In-memory recovery still works when browser storage is unavailable. */ }
  listeners.forEach(listener => listener());
}

export function parseBroadcast(raw: string): Broadcast | undefined {
  if (!raw) return;
  try {
    const value = JSON.parse(raw) as Partial<Broadcast>;
    if (!/^0x[\da-f]{64}$/i.test(value.hash ?? "") || !/^0x[\da-f]{40}$/i.test(value.sender ?? "")
      || !/^0x[\da-f]{40}$/i.test(value.target ?? "") || !/^0x(?:[\da-f]{2})*$/i.test(value.data ?? "") || typeof value.label !== "string") return;
    return value as Broadcast;
  } catch { return; }
}
