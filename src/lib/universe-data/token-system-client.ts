import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId } from "@/lib/field/types";
import type { TokenSystemResponse } from "./contracts";
import { fetchIntelligence } from "../intelligence-origin.ts";

export const getTokenSystem = createServerFn({ method: "GET" })
  .validator((input: { mint: string; galaxyId: GalaxyId; limit?: number }) => input)
  .handler(async ({ data }): Promise<TokenSystemResponse> => {
    const mint = String(data.mint || "").trim();
    const limit = Math.max(1, Math.min(50, Math.trunc(data.limit ?? 50)));
    const mode = data.galaxyId === "afterbell" ? "afterbell" : "holders";
    try {
      const response = await fetchIntelligence(
        `/api/intelligence/token-system?mint=${encodeURIComponent(mint)}&limit=${limit}&mode=${mode}`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
      const body = (await response.json()) as TokenSystemResponse;
      if (response.ok) return body;
      return { ...body, ok: false, holders: body.holders ?? [], trades: body.trades ?? [] };
    } catch {
      return {
        ok: false,
        coverage: "degraded",
        mint,
        holders: [],
        trades: [],
        disclosure: "The cached token-system record is unavailable. No wallet activity or performance value was invented.",
        error: "token_system_unavailable",
      };
    }
  });
