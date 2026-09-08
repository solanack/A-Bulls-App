# A Bulls App release rules

## Source of truth

- GitHub `main` is the only release baseline.
- Never build, package, or deploy from a recovered folder, an old ZIP, an archive branch, or a stale local copy.
- Start every release from the latest verified `main` commit and record that commit in the handoff.

## Locked interface

- The default Field view is the simplified mobile interface: hamburger menu, combined query bar, particle field, and compact bottom context labels.
- Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, Top 50 Traders, Watchlist, Query, Create, and Field remain inside the hamburger menu. Top 50 Traders and Watchlist are the approved read-only research additions; they must not become trading or social-execution surfaces.
- Do not restore the expanded brand pill, galaxy card, marketing headline, analysis-button grid, example-token pills, or bottom navigation bar.
- Do not otherwise change `src/components/app-shell.tsx` navigation or layout unless the user explicitly requests that specific interface change.
- The cosmology is locked: token/mint = PLANET; observed public wallet/holder/trader = STAR. Legacy producer field names may remain only behind adapters and must not leak into rendered meaning or Grey speech.
- A token planet may open its D1-backed local wallet-star system. Missing retained holder evidence must produce an honest empty system, never passive provider fan-out.

## Read-only boundary

- No wallet connection, wallet ownership proof, signing, swaps, copy trading, token creation, liquidity actions, custody, or native-token execution may be introduced by a Field feature.
- Saved watchlist objects are research references. A saved token or wallet is not automatically current evidence.
- Trader-observatory rankings are descriptive evidence over a bounded retained window, never skill scores, endorsements, recommendations, or copy-trading instructions.

## Release gate

- `npm run verify:release` must pass before every build and deployment.
- `npm run build` includes the release guard and must fail if the expanded interface returns.
- Grey geometry, particles, voice, data, and Worker changes must remain isolated from the locked interface except for the explicitly approved Top 50 Traders and Watchlist destinations above.
- The full repository test suite, TypeScript check, production frontend build, and Intelligence Worker dry-run must all pass before publication.
