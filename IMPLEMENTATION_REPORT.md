# Template-Alien Implementation Report

> Historical implementation snapshot. The alien work below is preserved for provenance, but statements about what remained “next” are no longer current. For the active product/release contract use `AGENTS.md`, `UNIVERSE_VISION.md`, `REVIEW_2026-09-08.md`, and `FINAL_RELEASE.md`.

## Outcome

The supplied alien point template now generates the visible QUERY organism. The procedural grey-head generator that caused the chopped cranium, oversized protruding eyes, and weak mouth is no longer used.

## Material changes

- Template-backed surface sampling and nested depth shells
- Template-derived eye, nose, mouth, and camera framing
- Recessed black almond eyes and a narrow responsive mouth slit
- Curved Solana Pit Viper visor fitted directly from the template eye bounds
- Circular depth-core particles instead of square WebGL point blocks
- Stable breathing/rotation with deterministic speech motion
- Reusable mobile-unlocked voice context
- Round field/star point sprites
- Portable `startup.sh` for Termux and non-`/workspace` paths

## Verification at the time of this historical pass

- `npm run typecheck`: pass
- `npm run build`: pass
- `npx wrangler deploy --dry-run`: pass
- Alien template contract: 18,000 finite samples with surface, eye, nose, mouth, and silhouette roles

The inherited Grok scaffold test suite and lint configuration contained pre-existing failures in PWA metadata/config fixtures plus one unrelated lint error at the time of this pass. Those notes are historical; use the current release review and GitHub Actions gate for present validation status.

Automated screenshot verification could not run in the implementation environment because its Chromium download endpoint timed out. Physical Android/Seeker rendering remains a device acceptance concern after each production publication.

## Living Universe foundation pass — historical state

Galaxy Zero was generalized through a reusable galaxy architecture instead of an anonymous one-off snapshot:

- Added a typed galaxy registry with Galaxy Zero populated and pump.fun marked honestly as staging.
- Added the initial shared cosmology contract.
- Added immutable launch-origin enforcement and cross-galaxy wallet identity.
- Added `galaxyId`, `cosmicKind`, and `originGalaxyId` to field data.
- Added current-galaxy state and safe galaxy switching to Field OS.
- Added in-place snapshot replacement to the existing renderer, preserving the renderer, camera, gestures, mobile budget, Grey, voice, and Worker behavior.
- Added an immersive origin starmap rather than a page transition.
- Reframed Games copy as narrated education with no scores, missions, or competitive mechanics.

At that point Replay and the other interaction modes were still a later delivery phase. They have since been implemented; the current release state is documented in `FINAL_RELEASE.md` and `REVIEW_2026-09-08.md`.
