import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

type CohortInput = { room: "fomo" | "afterbell"; chain: string; mint: string; wallet: string; after: number; to?: number | null };
export type ReplayCohortItem = { id: string; wallet: string; callsign: string; time: number; priceUsd: number | null; source: string; sourceKind: string; txId: string | null };
export type ReplayCohort = { ok: boolean; count: number; wallets: number; items: ReplayCohortItem[]; disclosure: string | null };
const text = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) => (Number.isFinite(Number(value)) && value != null && value !== "" ? Number(value) : null);
const EMPTY: ReplayCohort = { ok: false, count: 0, wallets: 0, items: [], disclosure: null };

/** Same-room buys on this mint after the hero's first print. Seconds in `after` and `to`. */
export const getReplayCohort = createServerFn({ method: "GET" }).validator((input: CohortInput) => input).handler(async ({ data }): Promise<ReplayCohort> => {
  const params = new URLSearchParams({ room: data.room, chain: data.chain, mint: data.mint, wallet: data.wallet, after: String(Math.floor(data.after)) });
  if (data.to) params.set("to", String(Math.ceil(data.to)));
  try {
    const response = await fetchIntelligence(`/api/intelligence/replay/cohort?${params.toString()}`, { headers: { accept: "application/json" } });
    const body = (await response.json()) as Record<string, unknown>;
    if (!body || body.ok !== true) return EMPTY;
    const items = (Array.isArray(body.items) ? body.items : []).flatMap((raw): ReplayCohortItem[] => {
      const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      const wallet = text(row.wallet), time = num(row.time);
      return wallet && time ? [{ id: text(row.id), wallet, callsign: text(row.callsign), time, priceUsd: num(row.priceUsd), source: text(row.source), sourceKind: text(row.sourceKind), txId: text(row.txId) || null }] : [];
    });
    return { ok: true, count: items.length, wallets: Number(body.wallets) || 0, items, disclosure: typeof body.disclosure === "string" ? body.disclosure : null };
  } catch {
    return EMPTY;
  }
});
