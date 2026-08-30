import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";

const WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    try {
      const response = await fetch(
        `${WORKER}/api/intelligence/field/snapshot?galaxy=${encodeURIComponent(data.galaxyId)}&window=300&limit=2500`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
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
            "The Intelligence Worker returned no indexed snapshot. No direct provider fallback was attempted.",
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
            "The Intelligence Worker is unavailable. The field remains read-only and made no direct provider request.",
        },
      };
    }
  });
