# A Bulls App release rules

## READ THIS FIRST — master direction
- **`MASTER_PLAN.md` is the highest-level product and architecture contract for this repository. Read it before proposing, coding, refactoring, or deploying anything.**
- If an older document conflicts with `MASTER_PLAN.md`, the master plan wins unless the owner explicitly changes the direction.
- After the master plan, read this file, then the most relevant source contract such as `UNIVERSE_VISION.md` or `SOCIALFI_ARCHITECTURE.md`.
- Before changing code, inspect current `main` and the existing implementation. Reuse existing systems rather than creating parallel products.
- Every substantial change should identify which `MASTER_PLAN.md` roadmap item it advances.

## Source of truth
- GitHub `main` is the only release baseline.
- Never build or deploy from a recovered folder, old ZIP, archive branch, or stale local copy.
- Start every release from the latest verified `main` commit and record that commit in the handoff.
- Never claim production is updated until deployment actually succeeds and live state has been checked.

## Locked interface
- Default Field view remains the simplified mobile interface: hamburger, combined query bar, particle field, compact bottom context labels.
- Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, Watchlist/My Sky, Query, Create/Trickster, Field, and the future Index/Trade Library must remain parts of one product rather than separate apps.
- Public Galaxy Zero destinations are Fomo, pump.fun, and PonsFamily. `solana-core` remains an internal provenance namespace only; it must not return as a public galaxy without explicit user approval.
- Do not restore brand/marketing chrome, expanded galaxy cards, analysis grids, example-token pills, or bottom navigation.
- Cosmology is locked: token/mint = PLANET; observed public wallet/holder/trader = STAR. Legacy producer names remain behind adapters only.
- A token planet may open its D1-backed local wallet-star system. Missing holder evidence produces an honest empty system, never passive provider fan-out.
- A Fomo trader STAR may open a bounded trader system: up to 10 mapped token PLANETS plus the 3 latest retained trade COMETS. Fomo-reported fields must remain distinct from A Bulls App chain evidence.
- The canonical descent is `Universe → Galaxy → Planet → Holder Sky → Star → Holdings → Matched Rounds → Chosen Trade → Tools → Trickster Cut`.

## Research Thread contract
- Deep research tools inherit a persistent Research Thread context instead of forcing the user to repeatedly type wallet/mint/time-window inputs.
- At minimum, thread context may include galaxy/lens, immutable launch origin, mint, wallet, selected matched round, timestamps, signatures, Replay state, Evidence IDs, Ghost/Sequence/Compare references, thesis/narration references, watch state, and Cut manifests.
- A selected trade round should become the shared context for Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, and Trickster.
- Durable research objects should be indexable/searchable when they create long-term research value.

## Index / research archive
- The Index is a first-class product pillar, not a replacement for the Field.
- Indexable objects include trader/wallet STARS, token PLANETS, transactions/trades, matched rounds, Research Threads, Replay windows, Evidence bundles, Trickster Cuts/videos, theses/resolutions, Ghost comparisons, Sequences, and useful public comparisons.
- Universe and Index must deep-link both directions.
- Every public/shared Trickster Cut should carry a manifest and a VERIFY/Replay path back to the exact evidence window.

## Data-source boundaries
- Fomo Galaxy uses the independent `fomoapi.io` feed as a cited, cached discovery source. It must never replay or scrape a logged-in `prod-api.fomo.family` session.
- Fomo rank/PnL/profile/top-token values are provider-reported context, not independently verified performance claims, skill scores, endorsements, recommendations, or copy-trading instructions.
- Fomo page navigation is D1/cache-only. Provider calls happen only in bounded scheduled refreshes behind a monthly credit breaker.
- PonsFamily retains internal galaxy id `pons`. Public membership requires verified PONS launch origin, fresh market cap above $75,000, more than 750 holders, and fresh reported 24h volume; qualifying tokens rank by 24h volume descending. Missing holder/market evidence does not qualify.
- The old pinned PONS teaching token fallback is retired.
- Missing data is not zero. Unknown coverage must remain visibly unknown/incomplete.

## Matched-round accounting
- A matched closed round may show realized result only when in-window/retained evidence supports matching sell inventory to observed acquisition basis using the documented deterministic method.
- Open rounds may show observed open inventory but no realized result.
- Unmatched sells are excluded from realized accounting; never invent cost basis.
- Do not relabel deterministic matched-round evidence as “alpha,” “smart money,” “winning trader,” or copy-trade guidance.

## Grey / Trickster roles
- **Grey = truth/observation layer.** Grey states what was observed, what a provider reported, what is unavailable, and where receipts live.
- **Trickster = interpretation/director layer.** Trickster may explain why a bounded sequence matters while keeping interpretation explicitly separate from Grey's facts.
- Grey synthesis is server-side ElevenLabs when `ELEVENLABS_API_KEY` is configured; the key must never be shipped to browser code or committed.
- `ELEVENLABS_GREY_VOICE_ID` may override the approved Grey human voice profile. Browser speech is a graceful fallback only.
- Grey voice is natural human, calm, clear, and premium. Do not restore heavy metallic carrier/low-pitch demon/alien processing.
- Trickster must not fabricate a price path when indexed OHLC is unavailable.

## Ghost contract
- Ghost may surface evidence-backed historical similarity/echoes only.
- Ghost is historical comparison, not prediction.
- Matching criteria, time window, coverage, and receipts must be inspectable. Missing history means no Ghost, not a fabricated analogue.

## My Sky / watch boundary
- Watchlist/My Sky may save token PLANETS, public-wallet STARS, Research Threads, Cuts, and other useful research references.
- Saved objects are not proof of fresh evidence.
- Notifications are observational and deep-link to the exact Universe/Index/Research Thread context. Never phrase them as buy/sell recommendations.

## Read-only / execution boundary
- No swaps, transaction signing, custody, approvals, copy trading, token creation, liquidity execution, or automated trade routing may be introduced by a Field/research feature.
- The default web product remains fully usable with no wallet connection.
- **One narrow future mobile exception is approved by the master plan:** Solana Mobile Wallet Adapter may be used for an explicit `Bind My Star` flow that authorizes/selects a public wallet address only. It must not send transaction-signing requests, execute trades, or imply more identity/ownership than the wallet session establishes.
- Watchlist objects and public-wallet analysis do not prove wallet ownership.
- Replay/Evidence/Trickster may study a trader wallet and token together, but cannot execute or recommend the trader's actions.
- Bull Invaders and LIFE are retired and must not return.

## Technology direction
- Preserve the known-good Three/WebGL Seeker Field. Do not migrate the core renderer to WebGPU merely for novelty.
- Evaluate Mediabunny/WebCodecs for deterministic Trickster Cut export without replacing the Field.
- Evaluate DuckDB-Wasm for lazy-loaded local Evidence Pack analytics.
- Evaluate Graphology for wallet↔token relationship analysis while rendering results through the existing Universe.
- Evaluate Transformers.js only for bounded evidence retrieval/search; deterministic indexed evidence remains responsible for factual answers.
- Carbon + Yellowstone gRPC are approved high-priority future upstream indexing technologies for live stream + gap detection + backfill + verification; do not replace the current Worker/D1 product layer simply to adopt them.

## Release gate
- `npm run verify:release` must pass before build/deploy.
- Full repository tests, TypeScript, production frontend build, and Intelligence Worker dry-run must all pass before publication.
- Preserve the known-good Seeker WebGL lifecycle and device budgets.
- Physical Seeker acceptance is required for changes that touch the Field/mobile rendering lifecycle.

## North-star test
Before adding a feature, ask:

> **Does this make it easier to discover a real subject, understand what happened, replay it, verify it, preserve it in the Index, or turn it into a truthful story?**

If not, it is probably not the next thing A Bulls App needs.
