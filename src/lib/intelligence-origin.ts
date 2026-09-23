import { createIsomorphicFn } from "@tanstack/react-start";
import { INTELLIGENCE_WORKER_ORIGIN, INTELLIGENCE_PUBLIC_ORIGIN } from "./app-origins.ts";
export { INTELLIGENCE_WORKER_ORIGIN, INTELLIGENCE_PUBLIC_ORIGIN };

/** ServerFn fetches prefer workers.dev first. Browser Field hydrate stays origin-only (#23). */
export const INTELLIGENCE_ORIGINS = Object.freeze([
  INTELLIGENCE_WORKER_ORIGIN,
  INTELLIGENCE_PUBLIC_ORIGIN,
]);

export function shouldRetryIntelligenceOrigin(response: Response): boolean {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return true;
  return response.status >= 500;
}

type IntelligenceBindings = { INTELLIGENCE?: { fetch(request: Request): Promise<Response> } };

const runtimeBindings = createIsomorphicFn()
  .server(async (): Promise<IntelligenceBindings> => {
    try {
      const { env } = await import("cloudflare:workers");
      return env as IntelligenceBindings;
    } catch { return {}; }
  })
  .client(async (): Promise<IntelligenceBindings> => ({}));

/**
 * Production serverFns reach the intelligence Worker over its private service binding: a Worker's
 * own subrequest to workers.dev can stall for the full timeout. HTTP origins remain the fallback
 * for local dev and previews without the binding.
 */
export async function fetchIntelligence(path: string, init: RequestInit = {}, bindings?: IntelligenceBindings) {
  let lastError: unknown = null;
  const bound = (bindings ?? await runtimeBindings()).INTELLIGENCE;
  if (bound) {
    try {
      if (init.signal?.aborted) throw init.signal.reason;
      const timeout = AbortSignal.timeout(15_000);
      const response = await bound.fetch(new Request(`${INTELLIGENCE_WORKER_ORIGIN}${path}`, {
        ...init,
        signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
      }));
      if (!shouldRetryIntelligenceOrigin(response)) return response;
      lastError = new Error(`intelligence_origin_${response.status}`);
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
  }
  for (const origin of INTELLIGENCE_ORIGINS) {
    try {
      if (init.signal?.aborted) throw init.signal.reason;
      const timeout = AbortSignal.timeout(15_000);
      const response = await fetch(`${origin}${path}`, {
        ...init,
        signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
      });
      if (!shouldRetryIntelligenceOrigin(response)) return response;
      lastError = new Error(`intelligence_origin_${response.status}`);
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("intelligence_origins_unavailable");
}
