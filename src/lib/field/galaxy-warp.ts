import type { GalaxyId } from "./types";
import { GALAXY_ZERO_CENTERS } from "./synthetic-universe.ts";

/**
 * Tuning knobs for the Field → galaxy entrance.
 * Duration stays inside 1.2–1.8s. Streak length is view-space stretch at peak;
 * 0 reads as dots, ~18 reads as hyperspace. Reduced motion never uses streaks.
 */
export const WARP_DURATION_MS = 1520;
export const WARP_REDUCED_MS = 420;
/** A burst of taps shares the first tap. The shot never runs past this. */
export const WARP_BURST_CAP_MS = 1800;
export const WARP_STREAK_LENGTH = 18;
/** Fraction of the shot where the destination scene replaces the departure scene. */
export const WARP_COMMIT = 0.58;
/** Camera distance at the moment of commit, before the arrival eases out to rest. */
export const WARP_APPROACH_DISTANCE = 108;

export const WARP_TINT = {
  fomo: [0.64, 0.26, 1] as [number, number, number],
  afterbell: [0.9, 0.93, 1] as [number, number, number],
  "galaxy-zero": [0.78, 0.84, 1] as [number, number, number],
};

const FIELD_ROOMS = new Set<GalaxyId>(["galaxy-zero", "fomo", "afterbell"]);

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function easeInCubic(value: number) {
  const t = clamp01(value);
  return t * t * t;
}

export function easeOutCubic(value: number) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 3;
}

export function warpDuration(reducedMotion: boolean) {
  return reducedMotion ? WARP_REDUCED_MS : WARP_DURATION_MS;
}

/** Keep the original start when the destination changes. A null start is the first tap. */
export function warpClock(existingStart: number | null, now: number) {
  return existingStart ?? now;
}

/**
 * Reduced motion mid-flight restarts a fade at the toggle.
 * The shot ends `reducedMs` after `now`, not a full cinematic duration later.
 * An existing deadline that is sooner is kept, so the fade never gets longer.
 */
export function warpReducedRestart(now: number, endsAt: number, reducedMs = WARP_REDUCED_MS) {
  const deadline = Math.min(endsAt, now + reducedMs);
  const duration = Math.max(1, deadline - now);
  return { started: now, duration, endsAt: now + duration };
}

export type WarpFollowPlan = {
  action: "start" | "retarget";
  started: number;
  duration: number;
  endsAt: number;
  anchor: number;
  /** Post-commit tap: land the new sky on the next frame without a second full shot. */
  reopenCommit: boolean;
};

/**
 * Taps during a shot share its deadline. A tap after the commit reopens the
 * landing instead of scheduling another 1.52s warp.
 */
export function planWarpFollowUp(input: {
  now: number;
  reduced: boolean;
  inFlight: boolean;
  committed: boolean;
  started: number | null;
  endsAt: number | null;
  anchor: number | null;
}): WarpFollowPlan {
  const full = warpDuration(input.reduced);
  if (!input.inFlight || input.started == null || input.endsAt == null) {
    return {
      action: "start",
      started: input.now,
      duration: full,
      endsAt: input.now + full,
      anchor: input.now,
      reopenCommit: false,
    };
  }
  const anchor = input.anchor ?? input.started;
  const endsAt = Math.min(input.endsAt, anchor + WARP_BURST_CAP_MS);
  return {
    action: "retarget",
    started: warpClock(input.started, input.now),
    duration: Math.max(1, endsAt - input.started),
    endsAt,
    anchor,
    reopenCommit: input.committed,
  };
}

/** Reduced motion is a fade. Warp and settle stay at zero so the galaxy does not scale. */
export function warpScale(reduced: boolean, approach: number, settle: number) {
  return reduced ? { warp: 0, settle: 0 } : { warp: approach, settle };
}

export type WarpSample = {
  /** Portal growth. Rises ease-in to the commit, then eases back out. */
  approach: number;
  /** Background-star stretch. Always 0 when reduced motion is requested. */
  streak: number;
  /** Additive color veil that covers the scene swap. */
  flash: number;
  /** Arrival scale. 1 at the commit, easing to 0 as the new view settles. */
  settle: number;
  committed: boolean;
};

export function sampleWarp(elapsed: number, reducedMotion: boolean, commit = WARP_COMMIT): WarpSample {
  const t = clamp01(elapsed);
  const span = Math.max(0.0001, 1 - commit);
  const committed = t >= commit;
  const approach = committed ? 1 - easeOutCubic((t - commit) / span) : easeInCubic(t / commit);
  const width = reducedMotion ? 0.42 : 0.2;
  const bell = Math.exp(-((((t - commit) / width) ** 2) * 4.2));
  return {
    approach,
    streak: reducedMotion ? 0 : approach,
    flash: bell * (reducedMotion ? 0.38 : 0.88),
    settle: committed ? approach : 0,
    committed,
  };
}

export function isFieldWarpRoute(from: GalaxyId, to: GalaxyId) {
  return from !== to && FIELD_ROOMS.has(from) && FIELD_ROOMS.has(to);
}

/** World point to fly toward. Only the Field home has portal galaxies to aim at. */
export function warpPortal(from: GalaxyId, to: GalaxyId): [number, number, number] | null {
  if (from !== "galaxy-zero") return null;
  if (to === "fomo") return [...GALAXY_ZERO_CENTERS[0]];
  if (to === "afterbell") return [...GALAXY_ZERO_CENTERS[1]];
  return null;
}

export function warpTint(id: GalaxyId): [number, number, number] {
  if (id === "fomo" || id === "afterbell" || id === "galaxy-zero") return [...WARP_TINT[id]];
  return [...WARP_TINT["galaxy-zero"]];
}
