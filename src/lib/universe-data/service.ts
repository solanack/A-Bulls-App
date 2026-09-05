import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";
import {
  FIELD_V0_ORIGIN,
  FIELD_V0_WORKER_FALLBACK,
  loadFieldV0GalaxyDelivery,
} from "./field-v0-client";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

async function fetchLegacySnapshot(galaxyId: GalaxyId, base: string) {
  const response = await fetch(
    `${base}/api/intelligence/field/snapshot?galaxy=${encodeURIComponent(galaxyId)}&window=300&limit=2500`,
    { headers: { accept: "application/json" }, cache: "no-store" },
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }
  const body = (await response.json()) as {
    ok?: boolean;
    snapshot?: UniverseSnapshot;
    status?: UniverseDataStatus;
  };
  if (response.ok && body.ok && body.status) {
    return { snapshot: body.snapshot ?? null, status: body.status };
  }
  return null;
}

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    // pump.fun prefers Field v0 producer — never Field compat v1 as truth.
    if (data.galaxyId === "pump-fun") {
      const fieldV0 = await loadFieldV0GalaxyDelivery(data);
      if (fieldV0.snapshot && fieldV0.snapshot.particles.length > 0) {
        return { snapshot: fieldV0.snapshot, status: fieldV0.status };
      }
      // Fall through to legacy snapshot only when v0 is empty/unavailable.
    }

    try {
      // Prefer live galaxy host (a-bulls-app-frontend / abullsapp.com).
      const preferred = await fetchLegacySnapshot(data.galaxyId, FIELD_V0_ORIGIN);
      if (preferred) return preferred;
      const fallback = await fetchLegacySnapshot(data.galaxyId, FIELD_V0_WORKER_FALLBACK);
      if (fallback) return fallback;
      return {
        snapshot: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            "The live galaxy host and Intelligence Worker returned no indexed snapshot. No direct provider fallback was attempted.",
        },
      };
    } catch {
      return {
        snapshot: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            "Indexed snapshot hosts are unavailable. The field remains read-only and made no direct provider request.",
        },
      };
    }
  });
