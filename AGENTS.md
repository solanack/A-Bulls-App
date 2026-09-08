# A Bulls App release rules

## Source of truth
- GitHub `main` is the only release baseline.
- Never build or deploy from a recovered folder, old ZIP, archive branch, or stale local copy.
- Start every release from the latest verified `main` commit and record that commit in the handoff.

## Locked interface
- Default Field view remains the simplified mobile interface: hamburger, combined query bar, particle field, compact bottom context labels.
- Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, Watchlist, Query, Create, and Field remain in the hamburger. The old separate Top 50 Traders item is retired because trader discovery now lives physically inside Fomo Galaxy.
- Public Galaxy Zero destinations are Fomo, pump.fun, and PonsFamily. `solana-core` remains an internal provenance namespace only; it must not return as a public galaxy without explicit user approval.
- Do not restore brand/marketing chrome, expanded galaxy cards, analysis grids, example-token pills, or bottom navigation.
- Cosmology is locked: token/mint = PLANET; observed public wallet/holder/trader = STAR. Legacy producer names remain behind adapters only.
- A token planet may open its D1-backed local wallet-star system. Missing holder evidence produces an honest empty system, never passive provider fan-out.
- A Fomo trader STAR may open a bounded trader system: up to 10 mapped token PLANETS plus the 3 latest retained trade COMETS. Fomo-reported fields must remain distinct from A Bulls App chain evidence.

## Data-source boundaries
- Fomo Galaxy uses the independent `fomoapi.io` feed as a cited, cached discovery source. It must never replay or scrape a logged-in `prod-api.fomo.family` session.
- Fomo rank/PnL/profile/top-token values are provider-reported context, not independently verified performance claims, skill scores, endorsements, recommendations, or copy-trading instructions.
- Fomo page navigation is D1/cache-only. Provider calls happen only in bounded scheduled refreshes behind a monthly credit breaker.
- PonsFamily retains internal galaxy id `pons`. Public membership requires verified PONS launch origin, fresh market cap above $75,000, more than 750 holders, and fresh reported 24h volume; qualifying tokens rank by 24h volume descending. Missing holder/market evidence does not qualify.
- The old pinned PONS teaching token fallback is retired.

## Grey voice
- Grey synthesis is server-side ElevenLabs when `ELEVENLABS_API_KEY` is configured; the key must never be shipped to browser code or committed.
- `ELEVENLABS_GREY_VOICE_ID` may override the approved Grey voice profile. Browser speech is a graceful fallback only.
- Voice effects must preserve intelligibility; do not restore the heavy metallic carrier/low-pitch demon treatment.

## Read-only boundary
- No wallet connection, ownership proof, signing, swaps, copy trading, token creation, liquidity actions, custody, or execution may be introduced by a Field feature.
- Watchlist objects are research references, not proof of fresh evidence.
- Replay/Evidence/Trickster may study a trader wallet and token together, but cannot execute or recommend the trader's actions.

## Release gate
- `npm run verify:release` must pass before build/deploy.
- Full repository tests, TypeScript, production frontend build, and Intelligence Worker dry-run must all pass before publication.
- Preserve the known-good Seeker WebGL lifecycle and device budgets.
