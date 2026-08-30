import type { EvidenceRecord, FieldParticle, ReplayState, UniverseSnapshot } from "./types";

export function clampReplayCursor(cursor: number) {
  return Math.min(1, Math.max(0, Number.isFinite(cursor) ? cursor : 0));
}

export function replayTimestamp(snapshot: UniverseSnapshot, cursor: number) {
  return snapshot.windowStart +
    (snapshot.windowEnd - snapshot.windowStart) * clampReplayCursor(cursor);
}

export function isVisibleAtCursor(
  snapshot: UniverseSnapshot,
  particle: FieldParticle,
  cursor: number,
) {
  return particle.observedAt <= replayTimestamp(snapshot, cursor);
}

export function visibleReplayCount(snapshot: UniverseSnapshot, cursor: number) {
  return snapshot.particles.reduce(
    (count, particle) => count + Number(isVisibleAtCursor(snapshot, particle, cursor)),
    0,
  );
}

export function stepReplayCursor(
  snapshot: UniverseSnapshot,
  cursor: number,
  direction: -1 | 1,
) {
  const range = Math.max(1, snapshot.windowEnd - snapshot.windowStart);
  const currentTime = replayTimestamp(snapshot, cursor);
  const times = [...new Set(snapshot.particles.map((particle) => particle.observedAt))].sort(
    (a, b) => a - b,
  );
  const next = direction > 0
    ? times.find((time) => time > currentTime + 0.001) ?? snapshot.windowEnd
    : [...times].reverse().find((time) => time < currentTime - 0.001) ?? snapshot.windowStart;
  return clampReplayCursor((next - snapshot.windowStart) / range);
}

export function createReplayState(snapshot: UniverseSnapshot, cursor = 0): ReplayState {
  const safeCursor = clampReplayCursor(cursor);
  return {
    active: false,
    status: "paused",
    cursor: safeCursor,
    windowStart: snapshot.windowStart,
    windowEnd: snapshot.windowEnd,
    visibleEventCount: visibleReplayCount(snapshot, safeCursor),
    totalEventCount: snapshot.particles.length,
    samplingPolicy: snapshot.samplingPolicy,
    coverageStatement: snapshot.coverageStatement,
    sources: snapshot.sources,
  };
}

export function evidenceForParticle(
  snapshot: UniverseSnapshot,
  particle: FieldParticle,
): EvidenceRecord {
  return {
    eventId: particle.eventId ?? particle.id,
    kind: particle.kind,
    cosmicKind: particle.cosmicKind,
    category: particle.category,
    originGalaxyId: particle.originGalaxyId,
    observedAt: particle.observedAt,
    verificationState: particle.verificationState,
    magnitudeBand: particle.magnitudeBand,
    sources: particle.source ? [...new Set([particle.source, ...snapshot.sources])] : snapshot.sources,
    samplingPolicy: snapshot.samplingPolicy,
    coverageStatement: snapshot.coverageStatement,
    chartStatus: "unavailable",
    chartReason:
      "Select a token event with indexed OHLC coverage to load its real candlestick context. No price path is inferred when the index is empty.",
    source: particle.source ?? null,
    slot: particle.slot ?? null,
    signature: typeof particle.metadata?.signature === "string" ? particle.metadata.signature : null,
    wallet: typeof particle.metadata?.wallet === "string" ? particle.metadata.wallet : null,
    mint: typeof particle.metadata?.mint === "string" ? particle.metadata.mint : particle.kind === "token" ? particle.id : null,
    metadata: particle.metadata ?? {},
  };
}
