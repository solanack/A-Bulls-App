import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";
import { loadFieldV0GalaxyDelivery } from "./field-v0-client";
import { loadPonsGalaxyDelivery } from "./pons-client";
import { fetchIntelligence } from "../intelligence-origin.ts";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    if (data.galaxyId === "galaxy-zero") return { snapshot: null, status: { store: "memory-fallback", coverage: "fresh", circuitBreaker: null, disclosure: "Galaxy directory; no chain fetch required." } };
    if (data.galaxyId === "pons") {
      return loadPonsGalaxyDelivery();
    }
    // pump.fun prefers Field v0 producer — never Field compat v1 as truth.
    if (data.galaxyId === "pump-fun") {
      const fieldV0 = await loadFieldV0GalaxyDelivery(data);
      if (fieldV0.snapshot && fieldV0.snapshot.particles.length > 0) {
        return { snapshot: fieldV0.snapshot, status: fieldV0.status };
      }
      // Fall through to legacy snapshot only when v0 is empty/unavailable.
    }

    try {
      const response = await fetchIntelligence(
        `/api/intelligence/field/snapshot?galaxy=${encodeURIComponent(data.galaxyId)}&window=300&limit=2500&_ts=${Date.now()}`,
        {
          headers: {
            accept: "application/json",
            "cache-control": "no-cache",
          },
          cache: "no-store",
        },
      );
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        return {
          snapshot: null,
          status: {
            store: "memory-fallback",
            coverage: "degraded",
            circuitBreaker: null,
            disclosure:
              "abullsapp.com returned a non-JSON indexed snapshot response. No workers.dev fallback.",
          },
        };
      }
      const body = (await response.json()) as {
        ok?: boolean;
        snapshot?: UniverseSnapshot;
        status?: UniverseDataStatus;
      };
      if (response.ok && body.ok && body.status) {
        return { snapshot: body.snapshot ?? null, status: body.status };
      }
      return {
        snapshot: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            "abullsapp.com returned no indexed snapshot. No direct provider fallback was attempted.",
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
            "abullsapp.com indexed snapshot is unavailable. The field remains read-only and made no workers.dev request.",
        },
      };
    }
  });
