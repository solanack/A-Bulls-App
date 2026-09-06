import type { GalaxyId } from "./types.ts";

export const WATCHLIST_STORAGE_KEY = "abulls-watchlist";
export const WATCHLIST_MAX = 50;
export const WATCHLIST_VERSION = 1;

export type WatchItem = {
  mint: string;
  galaxyId: GalaxyId;
  symbol: string | null;
  name: string | null;
  addedAt: number;
};

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
};

function mintKey(mint: string): string {
  return mint.trim().toLowerCase();
}

export function parseWatchlist(raw: string | null | undefined): WatchItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { v?: number; items?: unknown };
    if (!parsed || parsed.v !== WATCHLIST_VERSION || !Array.isArray(parsed.items)) return [];
    const seen = new Set<string>();
    const items: WatchItem[] = [];
    for (const row of parsed.items) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const mint = typeof record.mint === "string" ? record.mint.trim() : "";
      if (!mint) continue;
      const key = mintKey(mint);
      if (seen.has(key)) continue;
      seen.add(key);
      const galaxyId = record.galaxyId;
      if (galaxyId !== "galaxy-zero" && galaxyId !== "pump-fun" && galaxyId !== "pons") continue;
      items.push({
        mint,
        galaxyId,
        symbol: typeof record.symbol === "string" ? record.symbol : null,
        name: typeof record.name === "string" ? record.name : null,
        addedAt: typeof record.addedAt === "number" && Number.isFinite(record.addedAt) ? record.addedAt : Date.now(),
      });
      if (items.length >= WATCHLIST_MAX) break;
    }
    return items;
  } catch {
    return [];
  }
}

export function serializeWatchlist(items: readonly WatchItem[]): string {
  return JSON.stringify({ v: WATCHLIST_VERSION, items: items.slice(0, WATCHLIST_MAX) });
}

function getStore(storage?: StorageLike | null): StorageLike | null {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadWatchlist(storage?: StorageLike | null): WatchItem[] {
  return parseWatchlist(getStore(storage)?.getItem(WATCHLIST_STORAGE_KEY) ?? null);
}

export function saveWatchlist(items: readonly WatchItem[], storage?: StorageLike | null): WatchItem[] {
  const next = items.slice(0, WATCHLIST_MAX);
  const store = getStore(storage);
  store?.setItem(WATCHLIST_STORAGE_KEY, serializeWatchlist(next));
  return next;
}

export function isWatched(items: readonly WatchItem[], mint: string | null | undefined): boolean {
  if (!mint) return false;
  const key = mintKey(mint);
  return items.some((item) => mintKey(item.mint) === key);
}

export function toggleWatchItem(
  items: readonly WatchItem[],
  next: { mint: string; galaxyId: GalaxyId; symbol?: string | null; name?: string | null },
): WatchItem[] {
  const key = mintKey(next.mint);
  if (items.some((item) => mintKey(item.mint) === key)) {
    return items.filter((item) => mintKey(item.mint) !== key);
  }
  return [
    {
      mint: next.mint.trim(),
      galaxyId: next.galaxyId,
      symbol: next.symbol ?? null,
      name: next.name ?? null,
      addedAt: Date.now(),
    },
    ...items,
  ].slice(0, WATCHLIST_MAX);
}
