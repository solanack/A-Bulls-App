// @ts-nocheck
const STORY_TYPES = new Set([
  'wallet-timeline','transaction-replay','trade-route','token-sequence',
  'nft-memory','wallet-rivalry','wallet-comparison','network-recap','anomaly-explainer'
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

/** Existing public VERIFY page. Worker share ids resolve as `/?tour=<id>`. */
export const CUT_SHARE_SIZE = Object.freeze({
  '9:16': Object.freeze({ w: 1080, h: 1920 }),
  '16:9': Object.freeze({ w: 1920, h: 1080 }),
  '1:1': Object.freeze({ w: 1080, h: 1080 })
});

export function cutShareSize(aspectRatio = '9:16') {
  return CUT_SHARE_SIZE[aspectRatio] ?? CUT_SHARE_SIZE['9:16'];
}

export function cutSharePath(shareId) {
  const id = String(shareId ?? '').trim();
  return id ? `/?tour=${encodeURIComponent(id)}` : '';
}

export function cutShareHref(origin, shareId) {
  const base = String(origin ?? '').replace(/\/$/, '') || 'https://abullsapp.com';
  const path = cutSharePath(shareId);
  return path ? `${base}${path}` : '';
}

export function shareIdFromSearch(search) {
  const raw = String(search ?? '');
  const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
  return String(params.get('tour') || params.get('verify') || '').trim();
}

function shortSig(value) {
  const text = String(value ?? '').trim();
  return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;
}

export function formatCoverageWindow(from, to) {
  const start = formatCoverageTime(from);
  const end = formatCoverageTime(to);
  if (start === 'time unavailable' && end === 'time unavailable') return 'time window unavailable';
  return `${start} → ${end}`;
}

export function formatCoverageTime(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || !n) return 'time unavailable';
  const ms = n < 10_000_000_000 ? n * 1000 : n;
  try { return new Date(ms).toLocaleString(); }
  catch { return 'time unavailable'; }
}

/** Burn-in lines from the frozen manifest. Missing signatures stay missing. */
export function cutShareReceiptLines(manifest, verifyHref = '') {
  const evidence = Array.isArray(manifest?.evidence) ? manifest.evidence : [];
  const sigs = evidence.map((row) => String(row?.signature ?? '').trim()).filter(Boolean).slice(0, 4).map((sig) => `SIG ${shortSig(sig)}`);
  const coverage = manifest?.coverage ?? {};
  const lines = [
    'INDEXED',
    formatCoverageWindow(coverage.from, coverage.to),
    ...sigs,
    verifyHref ? `VERIFY ${verifyHref}` : 'VERIFY link unavailable'
  ];
  if (!sigs.length) lines.splice(2, 0, 'signature unavailable');
  return Object.freeze(lines);
}

export function cutShareCopy(verifyHref) {
  return Object.freeze({
    title: 'VERIFY this Cut',
    text: `Indexed receipts for this trade. VERIFY: ${verifyHref}`
  });
}

export async function shareCutLink({ title, text, url, file, nav } = {}) {
  const shareNav = nav ?? (typeof navigator === 'undefined' ? undefined : navigator);
  try {
    if (shareNav && typeof shareNav.share === 'function') {
      if (file && typeof shareNav.canShare === 'function') {
        try {
          const payload = { files: [file], title, text };
          if (shareNav.canShare(payload)) {
            await shareNav.share(payload);
            return 'shared';
          }
        } catch { /* files unsupported */ }
      }
      await shareNav.share({ title, text, url });
      return 'shared';
    }
    if (shareNav?.clipboard && typeof shareNav.clipboard.writeText === 'function') {
      await shareNav.clipboard.writeText(String(url ?? ''));
      return 'copied';
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled';
  }
  return 'downloaded';
}

export const __tricksterSharePageContract = Object.freeze({
  queryParam: 'tour',
  verifyAlias: 'verify',
  defaultAspectRatio: '9:16',
  verticalSize: CUT_SHARE_SIZE['9:16']
});


