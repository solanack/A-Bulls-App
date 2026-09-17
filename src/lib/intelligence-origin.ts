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

export async function fetchIntelligence(path: string, init: RequestInit = {}) {
  let lastError: unknown = null;
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
