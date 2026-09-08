import { createServerFn } from "@tanstack/react-start";
import { fetchIntelligence } from "./intelligence-origin.ts";

export type UniverseTool =
  | "replay"
  | "evidence"
  | "compare"
  | "what-if"
  | "sequences"
  | "ghost"
  | "education"
  | "trickster-validate"
  | "trickster-share"
  | "trickster-read"
  | "pump-candles"
  | "pump-trades";

type ToolRequest = { tool: UniverseTool; input?: Record<string, unknown> };
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type UniverseToolResponse = { [key: string]: JsonValue };

const ROUTES: Record<Exclude<UniverseTool, "trickster-read" | "education" | "pump-candles" | "pump-trades">, string> = {
  replay: "/api/intelligence/replay-bundle",
  evidence: "/api/intelligence/event-context",
  compare: "/api/intelligence/wallet-rivalry",
  "what-if": "/api/intelligence/parallel-universe",
  sequences: "/api/intelligence/market-sequence",
  ghost: "/api/intelligence/ghost-portfolio",
  "trickster-validate": "/api/intelligence/trickster/validate",
  "trickster-share": "/api/intelligence/trickster/share",
};

export const callUniverseTool = createServerFn({ method: "POST" })
  .validator((value: ToolRequest) => value)
  .handler(async ({ data }): Promise<UniverseToolResponse> => {
    const input = data.input ?? {};
    let path: string;
    let method = "POST";
    if (data.tool === "education") {
      path = "/api/intelligence/chain-radar";
      method = "GET";
    } else if (data.tool === "trickster-read") {
      const id = encodeURIComponent(String(input.shareId ?? ""));
      path = `/api/intelligence/trickster/share/${id}`;
      method = "GET";
    } else if (data.tool === "pump-candles" || data.tool === "pump-trades") {
      const mint = encodeURIComponent(String(input.mint ?? ""));
      const kind = data.tool === "pump-candles" ? "candles" : "trades";
      const params = new URLSearchParams();
      if (input.from) params.set("from", String(input.from));
      if (input.to) params.set("to", String(input.to));
      path = `/api/intelligence/pump/token/${mint}/${kind}?${params}`;
      method = "GET";
    } else {
      path = ROUTES[data.tool];
    }
    const response = await fetchIntelligence(path, {
      method,
      headers: { accept: "application/json", ...(method === "POST" ? { "content-type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify(input) : undefined,
      cache: "no-store",
    });
    let payload: UniverseToolResponse;
    try {
      payload = (await response.json()) as UniverseToolResponse;
    } catch {
      payload = { ok: false, error: "invalid_worker_response" };
    }
    if (!response.ok) {
      return { ...payload, ok: false, status: response.status };
    }
    return payload;
  });
