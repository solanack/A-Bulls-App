import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId } from "@/lib/field/types";
import type { TokenSystemResponse } from "./contracts";
import { fetchIntelligence } from "../intelligence-origin.ts";

export const getTokenSystem = createServerFn({ method: "GET" })
  .validator((input: { mint: string; galaxyId: GalaxyId; chainKey?: string; limit?: number }) => input)
  .handler(async ({ data }): Promise<TokenSystemResponse> => {
    const mint = String(data.mint || "").trim();
    const limit = Math.max(1, Math.min(50, Math.trunc(data.limit ?? 50)));
    const chainKey = String(data.chainKey || (data.galaxyId === "solana-core" ? "solana" : "") || "solana").trim().toLowerCase();
    try {
      const response = await fetchIntelligence(
        `/api/intelligence/token-system?mint=${encodeURIComponent(mint)}&chain=${encodeURIComponent(chainKey)}&limit=${limit}`,
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
        chainKey,
        holders: [],
        trades: [],
        disclosure:
          "The cached token-system record is unavailable. No live holder provider fallback was attempted.",
        error: "token_system_unavailable",
      };
    }
  });
