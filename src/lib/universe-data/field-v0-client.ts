/**
 * Field v0 producer client — aligns with Indexer PR #22 paths:
 *   GET /api/intelligence/field/v0/events
 *   GET /api/intelligence/field/v0/tokens
 *   GET /api/intelligence/field/v0/wallets/:wallet
 *
 * Never treats Field compat v1 particle snapshots as truth.
 * Incomplete dying (producer always omits liqSol today) must not become black holes.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  buildUniverseSnapshotFromFieldV0,
  type FieldV0Event,
  type FieldV0PlanetSnapshot,
  type FieldV0StarSnapshot,
} from "@/lib/field/indexer-field-v0";
import type { GalaxyId, UniverseSnapshot } from "@/lib/field/types";
import type { UniverseDataStatus } from "./contracts";

const WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";
export const FIELD_V0_BASE = `${WORKER}/api/intelligence/field/v0`;

export const FIELD_V0_PATHS = Object.freeze({
  events: `${FIELD_V0_BASE}/events`,
  tokens: `${FIELD_V0_BASE}/tokens`,
  wallet: (wallet: string) => `${FIELD_V0_BASE}/wallets/${encodeURIComponent(wallet)}`,
});

export type FieldV0Coverage = {
  readonly complete?: boolean;
  readonly boundedPumpIndex?: boolean;
  readonly derivedLabels?: boolean;
  readonly statement?: string;
  readonly gaps?: readonly string[];
};

export type FieldV0GalaxyDelivery = {
  snapshot: UniverseSnapshot | null;
  status: UniverseDataStatus;
  coverage: FieldV0Coverage | null;
};

type EventsBody = {
  ok?: boolean;
  events?: FieldV0Event[];
  coverage?: FieldV0Coverage;
  disclosure?: string;
  error?: string;
};

type TokensBody = {
  ok?: boolean;
  stars?: FieldV0StarSnapshot[];
  coverage?: FieldV0Coverage;
  disclosure?: string;
  error?: string;
};

type PlanetBody = {
  ok?: boolean;
  planet?: FieldV0PlanetSnapshot;
  coverage?: FieldV0Coverage;
  disclosure?: string;
  error?: string;
};

function degraded(disclosure: string): FieldV0GalaxyDelivery {
  return {
    snapshot: null,
    coverage: null,
    status: {
      store: "memory-fallback",
      coverage: "degraded",
      circuitBreaker: null,
      disclosure,
    },
  };
}

async function getJson<T>(url: string): Promise<{ ok: boolean; status: number; body: T | null }> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const body = (await response.json()) as T;
    return { ok: response.ok, status: response.status, body };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

/** Pure builder used by tests — maps producer JSON into a Field snapshot. */
export function snapshotFromFieldV0Payloads(input: {
  stars?: readonly FieldV0StarSnapshot[];
  planets?: readonly FieldV0PlanetSnapshot[];
  events?: readonly FieldV0Event[];
  galaxyId?: GalaxyId;
  disclosure?: string;
}): UniverseSnapshot {
  return buildUniverseSnapshotFromFieldV0({
    stars: input.stars,
    planets: input.planets,
    events: input.events,
    options: { galaxyId: input.galaxyId ?? "pump-fun" },
  });
}

export const getFieldV0GalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId; limit?: number; minScore?: number }) => input)
  .handler(async ({ data }): Promise<FieldV0GalaxyDelivery> => {
    if (data.galaxyId !== "pump-fun") {
      return degraded(
        "Field v0 producer is pump.fun-scoped. Other galaxies keep the legacy indexed snapshot path.",
      );
    }

    const limit = Math.max(1, Math.min(500, Math.trunc(data.limit ?? 200)));
    const minScore = Math.max(0, Math.min(1, Number(data.minScore ?? 0.4)));
    const eventsUrl = `${FIELD_V0_PATHS.events}?types=${encodeURIComponent(
      "token.trade,token.dying,holder.exit",
    )}&minScore=${minScore}&limit=${limit}`;
    const tokensUrl = `${FIELD_V0_PATHS.tokens}?minScore=${minScore}&limit=${limit}`;

    const [eventsRes, tokensRes] = await Promise.all([
      getJson<EventsBody>(eventsUrl),
      getJson<TokensBody>(tokensUrl),
    ]);

    if (eventsRes.status === 404 || tokensRes.status === 404) {
      return degraded(
        "Field v0 producer is feature-disabled or not deployed yet (404). No invented live feed.",
      );
    }

    if (!eventsRes.ok && !tokensRes.ok) {
      return degraded(
        "Field v0 producer did not return usable events/tokens. The field made no provider fallback.",
      );
    }

    const events = eventsRes.body?.ok ? eventsRes.body.events ?? [] : [];
    const stars = tokensRes.body?.ok ? tokensRes.body.stars ?? [] : [];
    const coverage =
      tokensRes.body?.coverage ?? eventsRes.body?.coverage ?? null;
    const disclosure =
      tokensRes.body?.disclosure ??
      eventsRes.body?.disclosure ??
      coverage?.statement ??
      "Field v0 evidence-only snapshot.";

    const snapshot = snapshotFromFieldV0Payloads({
      stars,
      events,
      galaxyId: "pump-fun",
      disclosure,
    });

    if (snapshot.particles.length === 0) {
      return {
        snapshot: null,
        coverage,
        status: {
          store: "memory-fallback",
          coverage: "empty",
          circuitBreaker: null,
          disclosure: `${disclosure} Honest empty: no Field v0 particles yet.`,
        },
      };
    }

    return {
      snapshot,
      coverage,
      status: {
        store: "d1",
        coverage: coverage?.complete === false ? "stale" : "fresh",
        circuitBreaker: null,
        disclosure,
      },
    };
  });

export const getFieldV0Planet = createServerFn({ method: "GET" })
  .validator((input: { wallet: string }) => input)
  .handler(async ({ data }): Promise<{ planet: FieldV0PlanetSnapshot | null; status: UniverseDataStatus }> => {
    const response = await getJson<PlanetBody>(FIELD_V0_PATHS.wallet(data.wallet));
    if (!response.ok || !response.body?.ok || !response.body.planet) {
      return {
        planet: null,
        status: {
          store: "memory-fallback",
          coverage: "degraded",
          circuitBreaker: null,
          disclosure:
            response.body?.disclosure ??
            "Field v0 wallet snapshot unavailable. Membership exit is never treated as holder.exit.",
        },
      };
    }
    return {
      planet: response.body.planet,
      status: {
        store: "d1",
        coverage: response.body.planet.incomplete ? "stale" : "fresh",
        circuitBreaker: null,
        disclosure: response.body.disclosure ?? "Field v0 planet snapshot.",
      },
    };
  });
