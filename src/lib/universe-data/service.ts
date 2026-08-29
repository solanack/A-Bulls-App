import { createServerFn } from "@tanstack/react-start";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";

export type GalaxySnapshotDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
};

export const getIndexedGalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId }) => input)
  .handler(async ({ data }): Promise<GalaxySnapshotDelivery> => {
    const {
      configuredBudgetPolicy,
      hasUniverseStore,
      readLatestSnapshot,
      readProviderUsage,
    } = await import("./store.server");
    const configured = hasUniverseStore();
    if (!configured) {
      return {
        snapshot: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            "Indexed D1 binding is not attached. Galaxy Zero remains on its explicit synthetic prototype window; no passive provider calls are made.",
        },
      };
    }
    const [record, circuitBreaker] = await Promise.all([
      readLatestSnapshot(data.galaxyId),
      readProviderUsage(configuredBudgetPolicy("helius")),
    ]);
    return {
      snapshot: record?.snapshot ?? null,
      status: {
        store: "d1",
        coverage: record?.coverage ?? "empty",
        circuitBreaker,
        disclosure: record
          ? `Indexed snapshot · ${record.sourceVersion} · no live provider request made by this view.`
          : "D1 is attached, but this galaxy has no indexed snapshot yet. No live fallback was attempted.",
      },
    };
  });
