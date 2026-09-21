# A Bulls App — Production QA Inventory

Audit baseline: production-verified `main` at `7688665cfe6a6c12d56d162c384a060a049e7193` (2026-09-21). GitHub Actions run `35660603868` passed the full release gate and Deploy Cloudflare run `35660603738` published both Workers and passed post-deploy live verification.

This inventory is code-derived from the active frontend, Intelligence Worker, production Wrangler flags, and release/live-check scripts. Missing evidence remains unavailable; no surface is allowed to fabricate wallets, holdings, candles, prices, exits, PnL, chain identity, or performance claims.

| Feature / route family | Primary code path | Production scope | Real data source | Automated coverage |
|---|---|---|---|---|
| Galaxy Zero / Field WebGL universe | `src/components/app-shell.tsx`, `src/lib/field/*` | ZERO | retained Field snapshots + Intelligence API; native Three/WebGL renderer | release baseline + production HTML/asset/MIME checks; physical WebGL remains device/manual |
| FOMO galaxy trader STAR field | `workers/intelligence-fomo-galaxy.mjs`, `workers/intelligence-fomo-live.mjs` | FOMO | Fomo provider cache in D1, provider-reported values kept distinct from chain evidence | `check-live.mjs` galaxy + audit checks |
| Current Fomo chain parity | chain registry + `intelligence_chain_*_v2` + token/wallet research | Solana, Base, BNB/BSC, Ethereum, Monad, Robinhood | chain-qualified retained assets, markets and events | `check-multichain-live.mjs` + permanent wallet/token live validators |
| Public identifier / wallet / mint search | Field resolver frontend + `/api/intelligence/field/resolve` | ZERO + research drill-down | resolver cache/D1 plus bounded enrichment | live Solana + EVM resolver checks |
| ASK wallet → STAR system | `src/lib/field/field-os.ts`, `wallet-research-system.ts`, `/api/intelligence/research/wallet-system` | Solana + retained EVM wallet evidence | retained chain-qualified wallet/token observations | repository tests + production wallet-system validator |
| Wallet STAR → PLANET descent | wallet research + multichain token-system | all current Fomo chains | retained per-chain wallet/token events | release tests + production token-system validator |
| Token/PLANET system | `workers/intelligence-token-system.mjs`, `src/lib/field/token-system.ts` | all current Fomo chains | Solana native event tables or `intelligence_chain_events_v2` | six-chain parity tests; live validator rejects lost chain identity and invented EVM SOL values |
| Field snapshot | `/api/intelligence/field/snapshot` | ZERO | normalized D1/cache | `check-live.mjs` |
| Token/PLANET index | `/api/intelligence/field/v0/tokens` | ZERO | D1 retained token snapshots | `check-live.mjs` + route-depth check |
| Event/COMET index | `/api/intelligence/field/v0/events` | ZERO | D1 normalized events | `check-live.mjs` |
| Wallet/STAR drill-down | `/api/intelligence/field/v0/wallets/:wallet` | ZERO/FOMO handoff | D1 wallet evidence | route-depth check |
| Research holdings | `/api/intelligence/research/holdings` | STAR | D1 matched/open/unmatched observed activity | retained-evidence live assertion |
| Afterbell galaxy | `src/lib/field/afterbell-galaxy.ts`, `src/lib/universe-data/afterbell-client.ts`, `/afterbell/` | tokenized-equity research context | xStock registry + retained/provider-labeled market evidence | release checks + live deep-link validation |
| Afterbell xStock Top 50 trader STARS | `workers/intelligence-afterbell-traders.mjs`, `src/lib/field/afterbell-trader-system.ts` | xStock PLANET → after-close trader STARS | retained Solana xStock events only | unit tests + permanent production smoke |
| Afterbell ranking method | same route | most recent weekday 4:00 PM–9:30 AM America/New_York window | unique retained transactions; bounded prior basis only for realized PnL | live validator requires contiguous rank and positive transaction counts |
| Afterbell realized PnL | same route | only where FIFO acquisition basis + sale price are complete | retained receipts/prices | tests keep incomplete basis `null`; no invented zero PnL |
| Replay | `src/lib/universe-intelligence.ts` → `/api/intelligence/replay-bundle` | research thread | D1 receipts/events + bounded history hydration | retained fixture asserts exact wallet/mint/window/signatures |
| Adaptive Replay candles | Replay bundle + candle aggregation | research thread | retained OHLC and safe aggregation from finer intervals | retained fixture asserts non-empty numeric OHLC |
| Evidence | `src/lib/universe-intelligence.ts` → `/api/intelligence/event-context` | research thread | observed/provider/derived evidence records | repository tests + retained Replay/Cut verification |
| Compare | `/api/intelligence/wallet-rivalry` | research thread | retained wallet/trade evidence | repository tests; no independent production fixture assertion yet |
| What-If | `/api/intelligence/parallel-universe` | research thread | deterministic retained historical evidence | repository tests; no independent production fixture assertion yet |
| Sequences | `/api/intelligence/market-sequence` | research thread | retained before/after event evidence | repository tests; no independent production fixture assertion yet |
| Ghost | `/api/intelligence/ghost-portfolio` | research thread | retained historical similarity/index evidence | repository tests; no independent production fixture assertion yet |
| Trickster validation | `/api/intelligence/trickster/validate` | research thread | frozen Research Thread + Evidence IDs | repository tests |
| Frozen Trickster Cut read/share/VERIFY | `/api/intelligence/trickster/share/:id`, `/?cut=:id` | public read-only | frozen Cut manifest in D1/cache | live frozen-manifest/VERIFY checks |
| Trickster video export | `src/lib/trickster-cut-recorder.ts`, `trickster-director.tsx` | capable browsers | frozen receipt-bound scenes + browser MediaRecorder/Web Audio | typecheck/unit/build coverage; actual codec capture/export remains browser/manual QA |
| Trickster Auto Cut | director + pure cue/video model | frozen receipt set | highest-magnitude receipt window | pure-function tests |
| Grey + Trickster narration | ElevenLabs path + separate role text | capable clients | Grey factual text + Trickster interpretation text kept distinct | repository tests/types; audio playback/export remains browser/manual |
| Trending Cuts | Index + `/api/intelligence/trickster/trending` | public frozen Cuts | anonymous retained view/share actions only | repository tests + release gate |
| Cut activity | `/api/intelligence/trickster/activity` | public frozen Cuts | view/share event kind + cut id + time; no wallet/user identity | migration + router tests |
| FOMO trader detail | `/api/intelligence/fomo/trader` | FOMO | cached provider positions/trades + bounded A Bulls enrichment | live validates handle/wallet, bounded positions/trades and provenance |
| FOMO data audit | `/api/intelligence/fomo/audit` | FOMO | D1 cache population | live asserts traders, PnL coverage and wallet mappings |
| Provider-secret diagnostics | provider secret manifest + release gate | deployment/internal | configured-name booleans only; never secret values | release gate fails enabled required-secret gaps |
| Provider-budget diagnostics | provider budget module + internal diagnostics | deployment/internal | retained usage/reservation state | repository tests + production diagnostics |
| Provider fetch resilience | `workers/intelligence-fetch.mjs` | all direct provider reads | provider-specific timeout/retry policy | repository tests; 429/5xx bounded retry |
| Empty-result reason codes | intelligence response paths | all research surfaces | no-evidence vs provider failure/timeout vs budget exhausted | repository tests; user copy remains calm while machine reason stays distinct |
| Replay source health | history engine/source-health D1 | internal evidence health | Helius/archive health + failure records | deployment captures source-health after publish |
| Mesh/source status | `/api/intelligence/mesh-status` | internal evidence health | D1/source-health state | route-depth live check |
| Grey voice | `src/lib/alien-voice.ts` | supported clients | ElevenLabs when configured; human Grey profile | release config lock; playback remains browser/manual |
| Watchlist / My Sky | Field OS/local-first watch state | research | local-first state + evidence change objects | release baseline + repository tests |
| Intelligence frontend proxy | frontend Worker `/api/intelligence/*` | all live research routes | service binding to Intelligence Worker | production route checks |

## Production deployment state

GitHub Actions is authorized for Cloudflare production deployment. The historical 2026-09-08 note stating that `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` were unavailable is no longer current. The active release path is:

1. Main release gate: provider-secret coverage → release baseline → TypeScript → full tests → production frontend build → Intelligence Worker bundle → migration safety → frontend Worker bundle → immutable tested artifact.
2. Deploy Cloudflare: rebuild/verify exact artifact → pending migration inspection → retained Replay evidence validation → migrations → Intelligence Worker publish → frontend Worker publish → public routes → multichain evidence → D1 population → sparse Replay diagnostic → source-health capture.

Production verification for `7688665cfe6a6c12d56d162c384a060a049e7193` passed both workflows.

## Production feature flags / explicit exclusions

The provenance/origin contract remains ZERO + FOMO. **Afterbell is a sibling research galaxy context, not a launch-origin claim.** PonsFamily remains an internal/research lens rather than a third public origin.

Trading, signing, custody, token launch, native token, Bull Invaders, LIFE, copy-trading execution, and fabricated market/history surfaces remain disabled/out of scope. Disabled or unavailable evidence must fail closed or render honest-empty rather than synthesize data.

## Manual/device acceptance still required

Automation does not certify physical Android/Seeker GPU or browser codec behavior. Manual acceptance remains required for:

- native WebGL rendering, rotation/pinch/lifecycle recovery and no black-screen regression;
- actual MediaRecorder/WebCodecs availability, exported Trickster MP4/WebM playback, narration mix and watermark legibility;
- audible Grey/Trickster playback on the target device;
- touch ergonomics and battery/memory behavior.

A feature is only marked production-live in this inventory when its server/data path is exercised by production checks. Browser-only media/GPU behavior remains explicitly manual rather than being claimed from CI.
