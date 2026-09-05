import type { SocialCapabilities, SocialFeedResponse, SocialFeedScope } from "./contracts";

const WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";

async function readJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${WORKER}${path}`, {
    method: "GET",
    headers: { accept: "application/json" },
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body?.error === "string" ? body.error : "social_service_unavailable";
    throw new Error(detail);
  }
  return body as T;
}

export function loadSocialCapabilities(signal?: AbortSignal) {
  return readJson<SocialCapabilities>("/api/social/capabilities", signal);
}

export function loadSocialFeed(scope: SocialFeedScope, signal?: AbortSignal) {
  return readJson<SocialFeedResponse>(
    `/api/social/feed?scope=${encodeURIComponent(scope)}&limit=30`,
    signal,
  );
}
