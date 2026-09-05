import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";
import { loadFieldV0GalaxyDelivery } from "./field-v0-client";

const WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    // pump.fun prefers Field v0 producer (#22 on main) — never Field compat v1 as truth.
    if (data.galaxyId === "pump-fun") {
      const fieldV0 = await loadFieldV0GalaxyDelivery(data);
      if (fieldV0.snapshot && fieldV0.snapshot.particles.length > 0) {
        return { snapshot: fieldV0.snapshot, status: fieldV0.status };
      }
      // Fall through to legacy snapshot only when v0 is empty/unavailable.
    }

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
