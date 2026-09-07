/**
 * Field v0 producer client — aligns with merged Indexer Field v0 (#22 on main):
 *   GET /api/intelligence/field/v0/events
 *   GET /api/intelligence/field/v0/tokens
 *   GET /api/intelligence/field/v0/wallets/:wallet
 *
 * Live galaxy host is a-bulls-app-frontend (abullsapp.com). Hydrate only via
 * that origin (zone-routed to the Intelligence Worker). No workers.dev hardcode.
 * Never treat Field compat v1 particle snapshots as truth.
 * Incomplete dying (producer omits liqSol) must not become black holes.
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
import { fetchIntelligence } from "../intelligence-origin.ts";

/** Live galaxy / frontend origin (a-bulls-app-frontend). */
export const FIELD_V0_ORIGIN = "https://abullsapp.com";

export const FIELD_V0_PATH = "/api/intelligence/field/v0";

export const FIELD_V0_BASE = `${FIELD_V0_ORIGIN}${FIELD_V0_PATH}`;

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
    const path = url.startsWith(FIELD_V0_ORIGIN) ? url.slice(FIELD_V0_ORIGIN.length) : url;
    const response = await fetchIntelligence(path, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, status: response.status, body: null };
    }
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

/** Plain loader — safe to call from other server handlers (no nested createServerFn). */
export async function loadFieldV0GalaxyDelivery(input: {
  galaxyId: GalaxyId;
  limit?: number;
  minScore?: number;
}): Promise<FieldV0GalaxyDelivery> {
  if (input.galaxyId !== "pump-fun") {
    return degraded(
      "Field v0 producer is pump.fun-scoped. Other galaxies keep the legacy indexed snapshot path.",
    );
  }

  const limit = Math.max(1, Math.min(500, Math.trunc(input.limit ?? 200)));
  const minScore = Math.max(0, Math.min(1, Number(input.minScore ?? 0.4)));
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
      "Field v0 producer is feature-disabled or not routed on abullsapp.com yet (404). No invented live feed.",
    );
  }

  if (!eventsRes.ok && !tokensRes.ok) {
    return degraded(
      "Field v0 on abullsapp.com did not return usable events/tokens. No workers.dev fallback.",
    );
  }

  const events = eventsRes.body?.ok ? eventsRes.body.events ?? [] : [];
  const stars = tokensRes.body?.ok ? tokensRes.body.stars ?? [] : [];
  const coverage = tokensRes.body?.coverage ?? eventsRes.body?.coverage ?? null;
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
}

export async function loadFieldV0Planet(wallet: string): Promise<{
  planet: FieldV0PlanetSnapshot | null;
  status: UniverseDataStatus;
}> {
  const response = await getJson<PlanetBody>(FIELD_V0_PATHS.wallet(wallet));
  if (!response.ok || !response.body?.ok || !response.body.planet) {
    return {
      planet: null,
      status: {
        store: "memory-fallback",
        coverage: "degraded",
        circuitBreaker: null,
        disclosure:
          response.body?.disclosure ??
          "Field v0 wallet snapshot unavailable on abullsapp.com. Membership exit is never treated as holder.exit.",
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
}

export const getFieldV0GalaxySnapshot = createServerFn({ method: "GET" })
  .validator((input: { galaxyId: GalaxyId; limit?: number; minScore?: number }) => input)
  .handler(async ({ data }) => loadFieldV0GalaxyDelivery(data));

export const getFieldV0Planet = createServerFn({ method: "GET" })
  .validator((input: { wallet: string }) => input)
  .handler(async ({ data }) => loadFieldV0Planet(data.wallet));
