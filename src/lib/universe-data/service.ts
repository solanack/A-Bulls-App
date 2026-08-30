import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";

const DEFAULT_INTELLIGENCE_WORKER =
  "https://black-bull-run-sol.ckdsigns1.workers.dev";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    try {
      const { env } = await import("cloudflare:workers");
      const worker =
        String(env.INTELLIGENCE_WORKER_URL || "").trim() ||
        DEFAULT_INTELLIGENCE_WORKER;
      const response = await fetch(
        `${worker}/api/intelligence/field/snapshot?galaxy=${encodeURIComponent(data.galaxyId)}&window=60&limit=5000`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
      const payload = (await response.json()) as {
        snapshot?: UniverseSnapshot;
        status?: UniverseDataStatus;
      };
      if (!response.ok || !payload.snapshot || !payload.status) {
        throw new Error(`field_snapshot_http_${response.status}`);
      }
      return {
        snapshot: payload.snapshot,
        status: payload.status,
      };
    } catch {
      return {
        snapshot: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            "The existing Intelligence Worker could not provide an indexed galaxy snapshot. The explicit prototype remains visible and no live provider fallback was attempted.",
        },
      };
    }
  });
