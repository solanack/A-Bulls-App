import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";
import { emptySocialWindow, parseSocialWindow, type SocialWindow } from "../field/social-window.ts";

type SocialWindowInput = { mint: string; day0: string; symbol?: string | null; name?: string | null; wallet?: string | null; room?: "fomo" | "afterbell" | null; chain?: string | null };

export const getSocialWindow = createServerFn({ method: "GET" }).validator((input: SocialWindowInput) => input).handler(async ({ data }): Promise<SocialWindow> => {
  const fallback = emptySocialWindow({ symbol: data.symbol ?? null, name: data.name ?? null, mint: data.mint }, data.day0);
  const params = new URLSearchParams({ mint: data.mint, day0: data.day0 });
  for (const key of ["symbol", "name", "wallet", "room", "chain"] as const) { const value = data[key]; if (value) params.set(key, value); }
  try {
    const response = await fetchIntelligence(`/api/intelligence/social/window?${params.toString()}`, { headers: { accept: "application/json" } });
    return parseSocialWindow(await response.json(), fallback);
  } catch {
    return fallback;
  }
});

export type SocialFetchState = { ok: boolean; state: "queued" | "running" | "done" | "empty" | "error" | "unavailable" | "invalid"; provider: string | null; count: number };
const FETCH_STATES = new Set(["queued", "running", "done", "empty", "error", "unavailable"]);

/** Asks the Intelligence Worker to fetch dated X posts for this mint + day_0 once. Cached server-side. */
export const requestSocialFetch = createServerFn({ method: "POST" }).validator((input: SocialWindowInput) => input).handler(async ({ data }): Promise<SocialFetchState> => {
  try {
    const response = await fetchIntelligence("/api/intelligence/social/request", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ mint: data.mint, day0: data.day0, symbol: data.symbol ?? null, name: data.name ?? null, chain: data.chain ?? null, room: data.room ?? null }) });
    const body = (await response.json()) as Record<string, unknown>;
    const state = String(body?.state ?? "");
    return { ok: body?.ok === true, state: (FETCH_STATES.has(state) ? state : "invalid") as SocialFetchState["state"], provider: typeof body?.provider === "string" ? body.provider : null, count: Number(body?.count) || 0 };
  } catch {
    return { ok: false, state: "unavailable", provider: null, count: 0 };
  }
});
