const INTELLIGENCE_WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";
const FORWARDED_METHODS = new Set(["GET", "POST", "PUT"]);

export async function proxyIntelligenceRequest(request: Request): Promise<Response> {
  const source = new URL(request.url);
  const method = request.method.toUpperCase();
  if (!FORWARDED_METHODS.has(method)) {
    return Response.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
  }
  const target = new URL(`${source.pathname}${source.search}`, INTELLIGENCE_WORKER);
  const headers = new Headers();
  for (const name of ["accept", "content-type", "authorization", "x-pump-ingest-secret"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(target, {
      method,
      headers,
      body: method === "GET" ? undefined : request.body,
      redirect: "manual",
      signal: AbortSignal.timeout(14_000),
    });
    const outputHeaders = new Headers(response.headers);
    outputHeaders.set("cache-control", response.headers.get("cache-control") || "no-store");
    outputHeaders.set("x-a-bulls-intelligence-proxy", "1");
    return new Response(response.body, { status: response.status, headers: outputHeaders });
  } catch (error) {
    console.error("[intelligence-proxy] upstream unavailable", { path: source.pathname, error: String(error) });
    return Response.json({ ok: false, error: "intelligence_worker_unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}

export const __intelligenceProxyContract = Object.freeze({ upstream: INTELLIGENCE_WORKER, readOnlyByDefault: true });
