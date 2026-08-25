const STORY_TYPES = new Set([
  'wallet-timeline','transaction-replay','trade-route','token-sequence',
  'nft-memory','wallet-rivalry','network-recap','anomaly-explainer'
]);
const CLAIM_KINDS = new Set(['observed','calculated','estimated','inferred']);
const RATIOS = new Set(['9:16','16:9','1:1']);

function text(value, name) {
  const result = String(value ?? '').trim();
  if (!result) throw new TypeError(`${name} is required`);
  return result;
}

function number(value, name) {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new TypeError(`${name} must be finite`);
  return result;
}

export function validateStoryManifest(input) {
  if (!input || typeof input !== 'object') throw new TypeError('manifest is required');
  const storyType = text(input.storyType, 'storyType');
  if (!STORY_TYPES.has(storyType)) throw new RangeError(`unsupported story type: ${storyType}`);

  const receipts = new Map((input.evidence ?? []).map((receipt, index) => {
    const id = text(receipt?.id, `evidence ${index} id`);
    if (!receipt.signature && !receipt.archiveReference && !receipt.sourceReference) {
      throw new TypeError(`evidence ${id} requires a source reference`);
    }
    return [id, Object.freeze({
      id,
      signature: receipt.signature ? String(receipt.signature) : null,
      slot: receipt.slot == null ? null : number(receipt.slot, `evidence ${id} slot`),
      blockTime: receipt.blockTime == null ? null : number(receipt.blockTime, `evidence ${id} blockTime`),
      source: text(receipt.source, `evidence ${id} source`),
      archiveReference: receipt.archiveReference ? String(receipt.archiveReference) : null,
      sourceReference: receipt.sourceReference ? String(receipt.sourceReference) : null
    })];
  }));

  const claims = (input.claims ?? []).map((claim, index) => {
    const kind = text(claim?.kind, `claim ${index} kind`);
    if (!CLAIM_KINDS.has(kind)) throw new RangeError(`unsupported claim kind: ${kind}`);
    const evidenceIds = [...new Set(claim.evidenceIds ?? [])].map(String);
    if (!evidenceIds.length) throw new TypeError(`claim ${index} requires evidence`);
    for (const id of evidenceIds) {
      if (!receipts.has(id)) throw new RangeError(`claim ${index} references missing evidence ${id}`);
    }
    if ((kind === 'estimated' || kind === 'inferred') && !claim.disclosure) {
      throw new TypeError(`claim ${index} requires an estimate/inference disclosure`);
    }
    return Object.freeze({
      id: text(claim.id, `claim ${index} id`),
      kind,
      statement: text(claim.statement, `claim ${index} statement`),
      evidenceIds: Object.freeze(evidenceIds),
      disclosure: claim.disclosure ? String(claim.disclosure) : null
    });
  });

  const claimIds = new Set(claims.map(({ id }) => id));
  if (claimIds.size !== claims.length) throw new RangeError('claim ids must be unique');

  const scenes = (input.scenes ?? []).map((scene, index) => {
    const sceneClaimIds = [...new Set(scene?.claimIds ?? [])].map(String);
    for (const id of sceneClaimIds) {
      if (!claimIds.has(id)) throw new RangeError(`scene ${index} references missing claim ${id}`);
    }
    return Object.freeze({
      id: text(scene?.id, `scene ${index} id`),
      type: text(scene?.type, `scene ${index} type`),
      durationFrames: Math.max(1, Math.trunc(number(scene?.durationFrames, 'durationFrames'))),
      claimIds: Object.freeze(sceneClaimIds)
    });
  });
  if (!scenes.length) throw new TypeError('at least one scene is required');

  const aspectRatio = text(input.output?.aspectRatio ?? '9:16', 'aspectRatio');
  if (!RATIOS.has(aspectRatio)) throw new RangeError(`unsupported aspect ratio: ${aspectRatio}`);

  const coverage = Object.freeze({
    from: number(input.coverage?.from, 'coverage.from'),
    to: number(input.coverage?.to, 'coverage.to'),
    verifiedPercent: Math.max(0, Math.min(100, number(input.coverage?.verifiedPercent, 'coverage.verifiedPercent'))),
    statement: text(input.coverage?.statement, 'coverage.statement')
  });
  if (coverage.to < coverage.from) throw new RangeError('coverage.to must not precede coverage.from');

  return Object.freeze({
    schemaVersion: 1,
    id: text(input.id, 'id'),
    storyType,
    subject: Object.freeze({
      kind: text(input.subject?.kind, 'subject.kind'),
      id: text(input.subject?.id, 'subject.id')
    }),
    coverage,
    evidence: Object.freeze([...receipts.values()]),
    claims: Object.freeze(claims),
    scenes: Object.freeze(scenes),
    output: Object.freeze({
      aspectRatio,
      locale: String(input.output?.locale ?? 'en-US'),
      theme: String(input.output?.theme ?? 'hyperspace'),
      rendererVersion: text(input.output?.rendererVersion, 'rendererVersion')
    })
  });
}

export function manifestDisclosures(manifest) {
  const disclosures = new Set();
  if (manifest.coverage.verifiedPercent < 100) disclosures.add(manifest.coverage.statement);
  for (const claim of manifest.claims) if (claim.disclosure) disclosures.add(claim.disclosure);
  return Object.freeze([...disclosures]);
}
