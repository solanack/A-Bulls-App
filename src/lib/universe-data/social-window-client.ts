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
