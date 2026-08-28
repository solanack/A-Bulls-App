# Particle Universe recovery candidate

Branch: `recovery/particle-universe-immersive-candidate`

This branch recovers the immersive Particle Universe experience on top of the validated Universe/Intelligence architecture while permanently retiring the Bull Invaders runtime from the active product graph.

## Candidate rules

- Particle Universe is the playable field and primary immersive experience.
- Intelligence, token market, evidence, replay, comparison, What If, and Create/Trickster remain integrated with the field.
- Bull Invaders runtime, renderer, CSS, ship asset, old arcade bosses, old arcade backgrounds, legacy ship roster, power-up art, and Pixi bundle are removed from this candidate.
- LIFE remains removed.
- Wallet activity remains read-only.
- Production Worker indexing limits are not changed by this frontend recovery.
- Do not merge or deploy until CI and browser validation pass.

## Validation target

The release candidate must load `js/experience-entry.mjs` as the canonical entrypoint, mount the Three.js Universe field, preserve synthetic-field fallback when live indexed evidence is empty, keep field investigation/replay/story routing intact, and contain no active Bull Invaders references.
