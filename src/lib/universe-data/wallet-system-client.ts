import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type WalletTokenActivity = {
  chainKey: string;
  mint: string;
  eventCount: number;
  tradeCount: number;
  firstEvent: number | null;
  lastEvent: number | null;
  observedTokenFlow: number;
  maxConfidence: number;
  sourceKinds?: string[];
};

export type WalletActivityIndex = {
  schemaVersion: string;
  wallet: string;
  addressKind: "solana" | "evm";
  tokenCount: number;
  tokens: WalletTokenActivity[];
  disclosure: string;
};

export type WalletSystemResponse = {
  ok: boolean;
  index?: WalletActivityIndex;
  error?: string;
};

export const getWalletSystem = createServerFn({ method: "GET" })
  .validator((input: { wallet: string; limit?: number }) => input)
  .handler(async ({ data }): Promise<WalletSystemResponse> => {
    const wallet = String(data.wallet || "").trim();
    const limit = Math.max(1, Math.min(50, Math.trunc(data.limit ?? 50)));
    try {
      const response = await fetchIntelligence(
        `/api/intelligence/wallet-tokens?wallet=${encodeURIComponent(wallet)}&limit=${limit}`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
      const body = (await response.json()) as WalletSystemResponse;
      return response.ok ? body : { ...body, ok: false };
    } catch {
      return { ok: false, error: "wallet_system_unavailable" };
    }
  });
