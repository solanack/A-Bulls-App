# A Bulls App release rules

## Source of truth

- GitHub `main` is the only release baseline.
- Never build, package, or deploy from a recovered folder, an old ZIP, an archive branch, or a stale local copy.
- Start every release from the latest verified `main` commit and record that commit in the handoff.

## Locked interface

- The default Field view is the simplified mobile interface: hamburger menu, combined query bar, particle field, and compact bottom context labels.
- Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, Query, Create, and Field remain inside the hamburger menu.
- Do not restore the expanded brand pill, galaxy card, marketing headline, analysis-button grid, example-token pills, or bottom navigation bar.
- Do not change `src/components/app-shell.tsx` navigation or layout unless the user explicitly requests that specific interface change.

## Release gate

- `npm run verify:release` must pass before every build and deployment.
- `npm run build` includes the release guard and must fail if the expanded interface returns.
- Grey geometry, particles, voice, data, and Worker changes must remain isolated from the locked interface.

