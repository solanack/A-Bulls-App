# Living Universe completion record

`UNIVERSE_VISION.md`, `AGENTS.md`, `SOCIALFI_ARCHITECTURE.md`, and the preserved brief in `docs/a-bulls-app-universe-brief.pdf` define the current product boundary. When older material uses the legacy star/token or planet/wallet naming, the approved current taxonomy wins: **token = PLANET** and **observed public wallet/holder/trader = STAR**.

## Completed

- Galaxy Zero remains the reference particle field and native Three.js/WebGL renderer, generalized through immutable launch-origin state without replacing the known-good Seeker lifecycle.
- Protocol/launch ecosystems remain galaxies; pump.fun and PONS use the same normalized universe contracts.
- Tokens render as PLANETS. Public wallet/holder/trader observations render as STARS. Legacy producer labels are normalized behind adapters rather than leaking into the rendered universe.
- Token planets are navigable research objects. Entering a supported planet uses retained D1 evidence to build its local wallet-star sky, current indexed trade comets, and an observed-liquidity asteroid belt. Missing holder evidence remains honestly empty and does not trigger a passive provider lookup.
- The Weekly Top 50 Trader Observatory is a separate seven-day read-only research destination. It ranks only evidence-backed matched in-window realized results, excludes unmatched sells instead of inventing basis, caches in the existing D1 cache, and does not scrape Fomo.
- Watchlist v2 saves both token planets and public-wallet stars. Existing token-only device lists migrate forward, and a saved reference is not treated as fresh evidence without current indexed data.
- PONS ranked and teaching tokens use the same PLANET taxonomy while preserving verified-origin and ranking requirements.
- Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, Trickster/Create, and cited thesis research remain functional read-only interfaces.
- Real indexed OHLC is rendered as candlesticks; missing market data remains visibly unavailable rather than becoming zero.
- Thesis publication remains account-authenticated, requires indexed citations, and keeps user claims separate from observed market facts and later 24-hour resolution evidence.
- Education is narrated and noncompetitive. No scores, missions, or shooter mechanics are present.
- One D1 database-backed provider reservation breaker protects QUERY and background provider-backed indexing. Passive render, camera, planet-system entry, Watchlist, Observatory reads, Replay scrub, Evidence display, and thesis views do not spend provider credits merely to fill the screen.
- Wallet connection, ownership proof, custody, signing, swaps, copy trading, token creation, liquidity actions, minting, transaction submission, and commerce remain outside this release and hard-disabled.

## Release gate

Every publish must pass:

1. `npm run verify:release`
2. TypeScript check
3. all repository tests
4. production frontend build
5. Intelligence Worker dry-run bundle

The release guard now locks the simplified hamburger interface, approved Top 50 Traders and Watchlist research destinations, token-PLANET/wallet-STAR taxonomy, D1-only planet entry, honest-empty disclosures, observatory evidence rules, and wallet-execution locks.

## Deployment-owned configuration

Real coverage still depends on the existing account's `INTELLIGENCE_DB`, provider secrets, pump webhook/indexing, and ingestion health. The application never invents credentials, candles, provenance, holder membership, wallet identity, cost basis, or claims when those sources are empty.

GitHub Actions can publish only after its Cloudflare deployment credentials are configured. Until then, release publication is performed from the user's authenticated Wrangler environment with `npm run deploy:all`. A successful GitHub code push or release-gate run is not itself proof that `abullsapp.com` changed.

The future public SDK/platform layer remains intentionally outside this release.
