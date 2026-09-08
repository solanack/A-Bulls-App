import { createServerFn } from "@tanstack/react-start";
import type { TraderObservatoryResponse } from "./contracts";
import { fetchIntelligence } from "../intelligence-origin.ts";

export const getWeeklyTraderObservatory = createServerFn({ method: "GET" })
  .handler(async (): Promise<TraderObservatoryResponse> => {
    try {
      const response = await fetchIntelligence("/api/intelligence/trader-observatory", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const body = (await response.json()) as TraderObservatoryResponse;
      return response.ok ? body : { ...body, ok: false, items: body.items ?? [] };
    } catch {
      return {
        ok: false,
        coverage: "degraded",
        items: [],
        disclosure:
          "The cached weekly trader observatory is unavailable. No public leaderboard was scraped or substituted.",
        error: "trader_observatory_unavailable",
      };
    }
  });
