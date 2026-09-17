import { INTELLIGENCE_WORKER_ORIGIN as INTELLIGENCE_WORKER } from "./app-origins.ts";
const FORWARDED_METHODS = new Set(["GET", "POST", "PUT"]);

type ProxyBindings = {
  INTELLIGENCE?: { fetch(request: Request): Promise<Response> };
};

async function runtimeBindings(): Promise<ProxyBindings> {
  // Vite/Nitro dev has no service binding; use the configured local HTTP worker.
  // Production Cloudflare uses its private service binding. HTTP remains available
  // for non-Cloudflare previews and deployments without the binding. Never retry a
  // failed bound request over HTTP: a POST/PUT may already have taken effect.
  try {
    const { env } = await import("cloudflare:workers");
    return env as ProxyBindings;
  } catch { return {}; }
}

export async function proxyIntelligenceRequest(request: Request, bindings?: ProxyBindings): Promise<Response> {
  const source = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!FORWARDED_METHODS.has(method)) {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }
  const target = new URL(INTELLIGENCE_WORKER);
  // Assign separately: a leading // path must never replace the configured host.
  target.pathname = source.pathname;
  target.search = source.search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "authorization", "x-pump-ingest-secret"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const resolvedBindings = bindings ?? await runtimeBindings();
    const upstreamRequest = new Request(target, {
      method,
      headers,
      body: method === "GET" ? undefined : request.body,
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(14_000)]),
      // Required by Node/Undici when forwarding a streaming POST/PUT in dev.
      ...(method === "GET" ? {} : { duplex: "half" as const }),
    });
    const response = resolvedBindings.INTELLIGENCE
      ? await resolvedBindings.INTELLIGENCE.fetch(upstreamRequest)
      : await fetch(upstreamRequest);
    const outputHeaders = new Headers(response.headers);
    outputHeaders.set("cache-control", response.headers.get("cache-control") || "no-store");
    outputHeaders.set("x-a-bulls-intelligence-proxy", "1");
    return new Response(response.body, { status: response.status, headers: outputHeaders });
  } catch (error) {
    console.error("[intelligence-proxy] upstream unavailable", { path: source.pathname, error: String(error) });
    return Response.json({ ok: false, error: "intelligence_worker_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export const intelligenceProxyHandlers = {
  GET: ({ request }: { request: Request }) => proxyIntelligenceRequest(request),
  POST: ({ request }: { request: Request }) => proxyIntelligenceRequest(request),
  PUT: ({ request }: { request: Request }) => proxyIntelligenceRequest(request),
};

export const __intelligenceProxyContract = Object.freeze({
  upstream: INTELLIGENCE_WORKER,
  readOnlyByDefault: true,
  catchAllSegments: [1, 2, 3, 4],
});
