import type { GalaxyId } from "./types.ts";

export const WATCHLIST_STORAGE_KEY = "abulls-watchlist";
export const WATCHLIST_MAX = 100;
export const WATCHLIST_VERSION = 2;

export type WatchSubjectKind = "token" | "wallet";

export type WatchItem = {
  subjectKind: WatchSubjectKind;
  subjectId: string;
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

export function mintKey(value: string): string {
  const text = value.trim();
  return /^0x[0-9a-f]{40}$/i.test(text) ? text.toLowerCase() : text;
}

export function watchKey(kind: WatchSubjectKind, subjectId: string) {
  return `${kind}:${mintKey(subjectId)}`;
}

function validGalaxy(value: unknown): value is GalaxyId {
  return value === "galaxy-zero" || value === "solana-core" || value === "pump-fun" || value === "pons";
}

function parseRow(record: Record<string, unknown>, legacy = false): WatchItem | null {
  const subjectKind: WatchSubjectKind = legacy
    ? "token"
    : record.subjectKind === "wallet"
      ? "wallet"
      : record.subjectKind === "token"
        ? "token"
        : "token";
  const rawId = legacy ? record.mint : record.subjectId ?? record.mint;
  const subjectId = typeof rawId === "string" ? rawId.trim() : "";
  if (!subjectId) return null;
  const galaxyId = validGalaxy(record.galaxyId) ? record.galaxyId : "solana-core";
  return {
    subjectKind,
    subjectId,
    galaxyId,
    symbol: typeof record.symbol === "string" ? record.symbol : null,
    name: typeof record.name === "string" ? record.name : null,
    addedAt: typeof record.addedAt === "number" && Number.isFinite(record.addedAt) ? record.addedAt : Date.now(),
  };
}

export function parseWatchlist(raw: string | null | undefined): WatchItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { v?: number; items?: unknown };
    if (!parsed || !Array.isArray(parsed.items) || (parsed.v !== 1 && parsed.v !== WATCHLIST_VERSION)) return [];
    const seen = new Set<string>();
    const items: WatchItem[] = [];
    for (const row of parsed.items) {
      if (!row || typeof row !== "object") continue;
      const item = parseRow(row as Record<string, unknown>, parsed.v === 1);
      if (!item) continue;
      const key = watchKey(item.subjectKind, item.subjectId);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(item);
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
  try { return globalThis.localStorage ?? null; }
  catch { return null; }
}

export function loadWatchlist(storage?: StorageLike | null): WatchItem[] {
  try { return parseWatchlist(getStore(storage)?.getItem(WATCHLIST_STORAGE_KEY) ?? null); }
  catch { return []; }
}

export function saveWatchlist(items: readonly WatchItem[], storage?: StorageLike | null): WatchItem[] {
  const next = items.slice(0, WATCHLIST_MAX);
  try { getStore(storage)?.setItem(WATCHLIST_STORAGE_KEY, serializeWatchlist(next)); }
  catch { /* Session state still remains usable. */ }
  return next;
}

export function isWatched(
  items: readonly WatchItem[],
  subjectKind: WatchSubjectKind,
  subjectId: string | null | undefined,
): boolean {
  if (!subjectId) return false;
  const key = watchKey(subjectKind, subjectId);
  return items.some((item) => watchKey(item.subjectKind, item.subjectId) === key);
}

export function toggleWatchItem(
  items: readonly WatchItem[],
  next: {
    subjectKind: WatchSubjectKind;
    subjectId: string;
    galaxyId: GalaxyId;
    symbol?: string | null;
    name?: string | null;
  },
): WatchItem[] {
  const subjectId = next.subjectId.trim();
  if (!subjectId) return [...items];
  const key = watchKey(next.subjectKind, subjectId);
  if (items.some((item) => watchKey(item.subjectKind, item.subjectId) === key)) {
    return items.filter((item) => watchKey(item.subjectKind, item.subjectId) !== key);
  }
  return [{
    subjectKind: next.subjectKind,
    subjectId,
    galaxyId: next.galaxyId,
    symbol: next.symbol ?? null,
    name: next.name ?? null,
    addedAt: Date.now(),
  }, ...items].slice(0, WATCHLIST_MAX);
}

export function tokenWatchMints(items: readonly WatchItem[]) {
  return items.filter((item) => item.subjectKind === "token").map((item) => item.subjectId);
}
