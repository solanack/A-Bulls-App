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

function normalizedReplayInput(value:Record<string,unknown>){
  const input={...value},from=Number(input.from??input.startTime),to=Number(input.to??input.endTime),secondScale=Math.max(from,to)<10_000_000_000;
  // An unresolved backend bundle intentionally returns a point window while
  // history is being discovered. ReplayWorkspace floors/ceils that millisecond
  // point, so the next request can look zero or one second wide. Keep either
  // form evidence-resolvable instead of turning it into an explicit fake start.
  if(Number.isFinite(from)&&Number.isFinite(to)&&from>0&&to>0&&(from>=to||(secondScale&&to-from<=1))){delete input.from;delete input.startTime;}
  if(input.chainKey&&!input.chain)input.chain=input.chainKey;
  return input;
}

export const callUniverseTool = createServerFn({ method: "POST" })
  .validator((value: ToolRequest) => value)
  .handler(async ({ data }): Promise<UniverseToolResponse> => {
    const input = data.tool === "replay" ? normalizedReplayInput(data.input ?? {}) : data.input ?? {};
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