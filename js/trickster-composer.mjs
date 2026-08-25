import { validateStoryManifest } from './trickster-story-manifest.mjs';

const TEMPLATES = Object.freeze({
  'transaction-replay': Object.freeze([
    { type: 'universe-hook', frames: 75, claimKinds: [] },
    { type: 'transaction-focus', frames: 120, claimKinds: ['observed'] },
    { type: 'evidence-summary', frames: 105, claimKinds: ['observed','calculated','estimated','inferred'] }
  ]),
  'wallet-timeline': Object.freeze([
    { type: 'wallet-arrival', frames: 75, claimKinds: [] },
    { type: 'timeline', frames: 180, claimKinds: ['observed'] },
    { type: 'pattern-summary', frames: 120, claimKinds: ['calculated','estimated','inferred'] }
  ]),
  'trade-route': Object.freeze([
    { type: 'route-hook', frames: 60, claimKinds: [] },
    { type: 'hop-replay', frames: 180, claimKinds: ['observed'] },
    { type: 'execution-context', frames: 120, claimKinds: ['calculated','estimated'] }
  ]),
  'token-sequence': Object.freeze([
    { type: 'market-hook', frames: 75, claimKinds: [] },
    { type: 'market-sequence', frames: 210, claimKinds: ['observed'] },
    { type: 'coverage-summary', frames: 90, claimKinds: ['calculated','estimated','inferred'] }
  ]),
  'nft-memory': Object.freeze([
    { type: 'asset-reveal', frames: 75, claimKinds: [] },
    { type: 'ownership-events', frames: 180, claimKinds: ['observed'] },
    { type: 'memory-summary', frames: 105, claimKinds: ['calculated','estimated','inferred'] }
  ])
});

function safeId(prefix, value) {
  const normalized = String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return `${prefix}-${normalized || 'item'}`;
}

export function availableStoryTemplates(storyType) {
  return TEMPLATES[storyType] ?? Object.freeze([
    { type: 'universe-hook', frames: 75, claimKinds: [] },
    { type: 'evidence-summary', frames: 180, claimKinds: ['observed','calculated','estimated','inferred'] }
  ]);
}

export function composeGuidedStory({
  id,
  storyType,
  subject,
  coverage,
  evidence,
  claims,
  output = {}
}) {
  const normalizedClaims = (claims ?? []).map((claim, index) => ({
    ...claim,
    id: claim.id || safeId('claim', index + 1)
  }));
  const usedClaims = new Set();
  const scenes = availableStoryTemplates(storyType).map((template, index) => {
    const claimIds = normalizedClaims
      .filter((claim) => template.claimKinds.includes(claim.kind) && !usedClaims.has(claim.id))
      .map((claim) => claim.id);
    claimIds.forEach((claimId) => usedClaims.add(claimId));
    return {
      id: safeId('scene', index + 1),
      type: template.type,
      durationFrames: template.frames,
      claimIds
    };
  });

  const remaining = normalizedClaims.filter((claim) => !usedClaims.has(claim.id));
  if (remaining.length) scenes.at(-1).claimIds.push(...remaining.map((claim) => claim.id));

  return validateStoryManifest({
    id,
    storyType,
    subject,
    coverage,
    evidence,
    claims: normalizedClaims,
    scenes,
    output: {
      aspectRatio: output.aspectRatio ?? '9:16',
      locale: output.locale ?? 'en-US',
      theme: output.theme ?? 'hyperspace',
      rendererVersion: output.rendererVersion ?? 'trickster-v1'
    }
  });
}

export function narrationClaims(manifest) {
  return Object.freeze(manifest.scenes.map((scene) => Object.freeze({
    sceneId: scene.id,
    claims: Object.freeze(scene.claimIds.map((id) => {
      const claim = manifest.claims.find((candidate) => candidate.id === id);
      return Object.freeze({
        statement: claim.statement,
        label: claim.kind,
        disclosure: claim.disclosure
      });
    }))
  })));
}
