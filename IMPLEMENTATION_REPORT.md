# Template-Alien Implementation Report

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

## Verification

- `npm run typecheck`: pass
- `npm run build`: pass
- `npx wrangler deploy --dry-run`: pass
- Alien template contract: 18,000 finite samples with surface, eye, nose, mouth, and silhouette roles

The inherited Grok scaffold test suite and lint configuration contain pre-existing failures in PWA metadata/config fixtures plus one unrelated lint error. None are in the corrected QUERY implementation; the production build and Cloudflare dry run complete successfully.

Automated screenshot verification could not run in the implementation environment because its Chromium download endpoint timed out. Complete the Android visual gate on the temporary `workers.dev` deployment before attaching `abullsapp.com`.
