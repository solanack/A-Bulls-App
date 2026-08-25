const ENTITY_KINDS = new Set(['transaction','wallet','program','token','nft','cluster']);
const VERIFICATION_STATES = new Set(['observed','confirmed','finalized','verified']);
const DESTINATIONS = Object.freeze({
  wallet: 'wallet-dna',
  transaction: 'transaction',
  token: 'market-sequence',
  nft: 'nft-memory',
  program: 'program',
  cluster: 'chain-radar'
});

function finiteNumber(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name} must be finite`);
  return number;
}

function nonEmpty(value, name) {
  const text = String(value ?? '').trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

export function normalizeUniverseSnapshot(input) {
  if (!input || typeof input !== 'object') throw new TypeError('snapshot is required');
  const windowStart = finiteNumber(input.windowStart, 'windowStart');
  const windowEnd = finiteNumber(input.windowEnd, 'windowEnd');
  if (windowEnd < windowStart) throw new RangeError('windowEnd must not precede windowStart');

  const sources = [...new Set((input.sources ?? []).map((item) => nonEmpty(item, 'source')))];
  if (!sources.length) throw new TypeError('at least one source is required');

  const particles = (input.particles ?? []).map((particle, index) => {
    if (!particle || typeof particle !== 'object') throw new TypeError(`particle ${index} is invalid`);
    const kind = nonEmpty(particle.kind, `particle ${index} kind`);
    if (!ENTITY_KINDS.has(kind)) throw new RangeError(`unsupported entity kind: ${kind}`);
    const verificationState = nonEmpty(
      particle.verificationState ?? 'observed',
      `particle ${index} verificationState`
    );
    if (!VERIFICATION_STATES.has(verificationState)) {
      throw new RangeError(`unsupported verification state: ${verificationState}`);
    }
    return Object.freeze({
      id: nonEmpty(particle.id, `particle ${index} id`),
      kind,
      verificationState,
      observedAt: finiteNumber(particle.observedAt, `particle ${index} observedAt`),
      category: String(particle.category ?? 'unknown'),
      magnitudeBand: Math.max(0, Math.min(1, finiteNumber(particle.magnitudeBand ?? 0, 'magnitudeBand'))),
      position: Object.freeze([
        finiteNumber(particle.position?.[0] ?? 0, 'position.x'),
        finiteNumber(particle.position?.[1] ?? 0, 'position.y'),
        finiteNumber(particle.position?.[2] ?? 0, 'position.z')
      ])
    });
  });

  const observedEventCount = Math.max(0, Math.trunc(finiteNumber(input.observedEventCount, 'observedEventCount')));
  if (particles.length > observedEventCount) {
    throw new RangeError('rendered particles cannot exceed observed event count');
  }

  return Object.freeze({
    schemaVersion: 1,
    windowStart,
    windowEnd,
    observedEventCount,
    renderedParticleCount: particles.length,
    samplingPolicy: nonEmpty(input.samplingPolicy, 'samplingPolicy'),
    coverageStatement: nonEmpty(input.coverageStatement, 'coverageStatement'),
    sources: Object.freeze(sources),
    particles: Object.freeze(particles)
  });
}

export function destinationForEntity(entity) {
  if (!entity || !ENTITY_KINDS.has(entity.kind)) throw new TypeError('valid entity is required');
  return Object.freeze({
    destination: DESTINATIONS[entity.kind],
    entityKind: entity.kind,
    entityId: nonEmpty(entity.id, 'entity id'),
    verificationState: VERIFICATION_STATES.has(entity.verificationState)
      ? entity.verificationState
      : 'observed'
  });
}

export const UniverseContracts = Object.freeze({
  entityKinds: Object.freeze([...ENTITY_KINDS]),
  verificationStates: Object.freeze([...VERIFICATION_STATES]),
  destinations: DESTINATIONS
});
