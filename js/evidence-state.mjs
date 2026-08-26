const STATES = Object.freeze({
  idle: Object.freeze({ label: 'READY', tone: 'neutral', actionable: true }),
  loading: Object.freeze({ label: 'LOADING', tone: 'neutral', actionable: false }),
  indexing: Object.freeze({ label: 'INDEXING', tone: 'live', actionable: true }),
  partial: Object.freeze({ label: 'PARTIAL HISTORY', tone: 'warning', actionable: true }),
  observed: Object.freeze({ label: 'LIVE OBSERVATION', tone: 'live', actionable: true }),
  confirmed: Object.freeze({ label: 'CONFIRMED', tone: 'confirmed', actionable: true }),
  finalized: Object.freeze({ label: 'FINALIZED', tone: 'verified', actionable: true }),
  verified: Object.freeze({ label: 'VERIFIED', tone: 'verified', actionable: true }),
  degraded: Object.freeze({ label: 'PARTIAL SERVICE', tone: 'warning', actionable: true }),
  unavailable: Object.freeze({ label: 'UNAVAILABLE', tone: 'danger', actionable: false }),
  error: Object.freeze({ label: 'RETRY AVAILABLE', tone: 'danger', actionable: true })
});

export function evidenceState(state, detail = {}) {
  const definition = STATES[state];
  if (!definition) throw new RangeError(`unsupported evidence state: ${state}`);
  const coveragePercent = detail.coveragePercent == null
    ? null
    : Math.max(0, Math.min(100, Number(detail.coveragePercent)));
  if (coveragePercent != null && !Number.isFinite(coveragePercent)) {
    throw new TypeError('coveragePercent must be finite');
  }
  return Object.freeze({
    state,
    ...definition,
    message: String(detail.message ?? ''),
    coveragePercent,
    coverageFrom: detail.coverageFrom ?? null,
    coverageTo: detail.coverageTo ?? null,
    observedCount: detail.observedCount == null ? null : Math.max(0, Math.trunc(Number(detail.observedCount))),
    lastUpdated: detail.lastUpdated ?? null,
    sources: Object.freeze([...new Set((detail.sources ?? []).map(String))])
  });
}

export function evidenceSummary(value) {
  const coverage = value.coveragePercent == null ? '' : ` · ${value.coveragePercent.toFixed(1)}% coverage`;
  const count = value.observedCount == null ? '' : ` · ${value.observedCount.toLocaleString()} observations`;
  return `${value.label}${coverage}${count}`;
}

export const EvidenceStates = Object.freeze(Object.keys(STATES));
