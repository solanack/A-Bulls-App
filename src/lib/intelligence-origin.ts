export const INTELLIGENCE_ORIGINS = Object.freeze([
  "https://abullsapp.com",
  "https://black-bull-run-sol.ckdsigns1.workers.dev",
]);

export async function fetchIntelligence(path: string, init: RequestInit = {}) {
  let lastError: unknown = null;
  for (const origin of INTELLIGENCE_ORIGINS) {
    try {
      const response = await fetch(`${origin}${path}`, init);
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") && response.status !== 404) return response;
      lastError = new Error(`intelligence_origin_${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("intelligence_origins_unavailable");
}
