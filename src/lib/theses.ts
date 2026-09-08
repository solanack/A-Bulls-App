import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import type {
  PublishThesisInput,
  PublishThesisResponse,
  ThesisListResponse,
  ThesisTargetKind,
} from "@/lib/socialfi/contracts";
import { fetchIntelligence } from "./intelligence-origin";

async function jsonBody<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return { ok: false, error: "invalid_worker_response" } as T;
  }
}

export const listTheses = createServerFn({ method: "GET" })
  .validator((value: { targetKind: ThesisTargetKind; targetId: string }) => value)
  .handler(async ({ data }): Promise<ThesisListResponse> => {
    const params = new URLSearchParams({
      targetKind: data.targetKind,
      targetId: String(data.targetId || "").trim(),
      limit: "20",
    });
    try {
      const response = await fetchIntelligence(`/api/intelligence/theses?${params.toString()}`, {
        method: "GET",
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      return await jsonBody<ThesisListResponse>(response);
    } catch {
      return {
        ok: false,
        coverage: "degraded",
        items: [],
        disclosure:
          "The Intelligence Worker is unavailable. Cited claims were not live-fetched or invented.",
        error: "intelligence_worker_unavailable",
      };
    }
  });

export const publishThesis = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((value: PublishThesisInput) => value)
  .handler(async ({ data, context }): Promise<PublishThesisResponse> => {
    const { readSessionToken } = await import("@/lib/auth/server");
    const previewBearer =
      typeof context.bearerToken === "string" && context.bearerToken
        ? context.bearerToken
        : null;
    const token = previewBearer ?? readSessionToken();
    if (!token) {
      return { ok: false, error: "account_session_unavailable" };
    }
    try {
      const response = await fetchIntelligence("/api/intelligence/theses", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      return await jsonBody<PublishThesisResponse>(response);
    } catch {
      return {
        ok: false,
        coverage: "degraded",
        error: "intelligence_worker_unavailable",
      };
    }
  });
