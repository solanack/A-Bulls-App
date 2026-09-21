# A Bulls App — Production QA Inventory

Audit baseline: production `main` at `d8f650eafc880aeff27138bd08210a5b7a1534c5` (2026-09-21). This inventory is code-derived from the active frontend, Intelligence Worker, production Wrangler flags, release/live-check scripts, and the successful Cloudflare deployment for that exact SHA. Disabled surfaces are not represented as live product features.

| Feature / route family | Primary code path | Production scope | Real data source | Automated coverage |
|---|---|---|---|---|
| Galaxy Zero / Field WebGL universe | `src/components/app-shell.tsx`, `src/lib/field/*` | ZERO | retained Field snapshots + Intelligence API; Three/WebGL renderer | release baseline + production HTML/asset/MIME checks; visual WebGL remains device/manual |
| FOMO galaxy trader STAR field | `workers/intelligence-fomo-galaxy.mjs`, `workers/intelligence-fomo-live.mjs` | FOMO | Fomo provider cache in D1, provider-reported values kept distinct from chain evidence | `check-live.mjs` galaxy + audit checks |
| Public identifier / wallet / mint search | Field resolver + `/api/intelligence/field/resolve` + `/api/intelligence/research/wallet-system` | ZERO/FOMO/Afterbell research drill-down | resolver cache + retained chain-qualified wallet/token events | `check-live.mjs` Solana + EVM resolver checks; repository tests cover honest-empty STAR/PLANET handoff |
| Field snapshot | `/api/intelligence/field/snapshot` | ZERO | normalized D1/cache | `check-live.mjs` |
| Token/PLANET index | `/api/intelligence/field/v0/tokens` | ZERO | D1 retained token snapshots | `check-live.mjs` + route-depth check |
| Event/COMET index | `/api/intelligence/field/v0/events` | ZERO | D1 normalized events | `check-live.mjs` |
| Wallet/STAR drill-down | `/api/intelligence/field/v0/wallets/:wallet`, `/api/intelligence/research/wallet-system` | ZERO/FOMO/Afterbell handoff | retained Solana wallet events + `intelligence_chain_events_v2` | route-depth checks + wallet-system unit tests; EVM/Solana missing coverage remains empty |
| Research holdings | `/api/intelligence/research/holdings` | STAR | D1 matched/open/unmatched observed activity | retained-evidence live assertion |
| Replay | `src/lib/universe-intelligence.ts` → `/api/intelligence/replay-bundle` | research thread | D1 receipts/events + bounded history hydration | retained fixture asserts exact wallet/mint/window/signatures |
| Price candles / chart overlay | Replay bundle and pump candle route | research thread | retained OHLC D1/cache | retained fixture asserts non-empty numeric OHLC |
| Evidence | `src/lib/universe-intelligence.ts` → `/api/intelligence/event-context` | research thread | observed/provider/derived evidence records | repository tests; Replay input normalization regression coverage; live evidence is exercised through retained Replay/Cut manifest |
| Compare | `src/lib/universe-intelligence.ts` → `/api/intelligence/wallet-rivalry` | research thread | retained wallet/trade evidence | repository worker/UI tests; no independent production fixture assertion yet |
| What-If | `src/lib/universe-intelligence.ts` → `/api/intelligence/parallel-universe` | research thread | deterministic retained historical evidence | repository tests; no independent production fixture assertion yet |
| Sequences | `src/lib/universe-intelligence.ts` → `/api/intelligence/market-sequence` | research thread | retained before/after event evidence | repository tests; no independent production fixture assertion yet |
| Ghost | `src/lib/universe-intelligence.ts` → `/api/intelligence/ghost-portfolio` | research thread | retained historical similarity/index evidence | repository tests; no independent production fixture assertion yet |
| Trickster validation | `/api/intelligence/trickster/validate` | research thread | Research Thread + Evidence IDs | repository tests |
| Frozen Trickster Cut read/share/VERIFY | `/api/intelligence/trickster/share/:id`, `/?cut=:id` | public read-only | frozen Cut manifest in D1/cache | `check-live.mjs` asserts frozen manifest, subject, evidence list, canonical VERIFY route |
| Trickster media export | `src/lib/trickster-cut-recorder.ts`, `src/components/trickster-director.tsx`, `js/trickster-cut-video.mjs` | capable browsers | frozen Cut manifest + indexed candles/receipts + separate Grey/Trickster narration | release gate covers pure video/Auto Cut logic and build; actual MediaRecorder/Web Audio/share-sheet export remains browser/manual QA |
| FOMO trader detail | `/api/intelligence/fomo/trader` | FOMO | cached provider positions/trades + bounded A Bulls enrichment | `check-live.mjs` validates handle/wallet, bounded positions/trades and provenance |
| FOMO data audit | `/api/intelligence/fomo/audit` | FOMO | D1 cache population | `check-live.mjs` asserts traders, PnL coverage and wallet mappings |
| FOMO multichain evidence spine | chain registry + `intelligence_chain_assets_v2` / `intelligence_market_snapshots_v2` / `intelligence_chain_events_v2` | Solana, Base, BNB/BSC, Ethereum, Monad, Robinhood | retained provider-reported + independently observed chain evidence, chain-qualified | production `check-multichain-live.mjs` passed on `d8f650e…`; D1 population captured for all six targets |
| Multichain token PLANET → wallet STAR descent | `/api/intelligence/token-system?chain=…`, Field token system | FOMO current six-chain target set | D1 chain-qualified retained events; Solana native tables where richer | repository parity tests + production multichain evidence check; missing valuation remains NULL |
| Afterbell sibling galaxy / xStock PLANETS | `src/lib/field/afterbell-galaxy.ts`, `src/lib/universe-data/afterbell-client.ts` | Afterbell research galaxy | xStock registry + retained/venue-reported market context | release gate + production application/deep-link checks; visual WebGL remains device/manual |
| Afterbell Top-50 trader STARS | `/api/intelligence/afterbell/traders`, `afterbell-trader-system.ts` | selected xStock | unique retained after-close transactions; bounded FIFO realized PnL only with complete basis | unit tests lock ET window, tx de-duplication, rank, unavailable PnL; deployed at `2d580af…` and subsequent production checks passed |
| Trending Cuts | `/api/intelligence/trickster/activity`, `/api/intelligence/trickster/trending`, Index UI | public frozen Cuts | anonymous Cut-ID view/share events in D1; immutable frozen manifests | unit tests cover indexing/activity/ranking/honest-empty; migration 0033 applied and production deploy passed; actual native Share action remains browser/manual |
| Provider secret diagnostics | internal provider-secret checker + release gate | deployment health | boolean-only Cloudflare secret presence/feature gating | release gate fails enabled provider paths with missing required secrets; no secret values exposed |
| Provider budget diagnostics | provider budget D1 observability | internal provider health | reserved credits/call counts/hard limits + blocker events | repository tests + production deployment diagnostics; plan limits must remain provider/account-verified rather than invented |
| Provider fetch resilience | `workers/intelligence-fetch.mjs` and provider call sites | all bounded provider paths | env-configured timeouts/retries + distinct empty reason codes | repository tests + production source-health/sparse-Replay diagnostics |
| Mesh/source status | `/api/intelligence/mesh-status` | internal evidence health | D1/source-health state | route-depth live check |
| Grey voice | `src/lib/alien-voice.ts` | supported clients | ElevenLabs when configured; human Grey profile | release baseline config lock; audio playback remains browser/manual |
| Auth/session-gated publishing | social/thesis policy | gated/limited | authenticated session + immutable evidence objects | repository policy/tests; not marked live-verified here |
| Watchlist / My Sky | Field OS/local-first watch state | ZERO/FOMO research | local-first state + evidence change objects | release baseline + repository tests |
| Intelligence frontend proxy | frontend Worker `/api/intelligence/*` | all live research routes | service binding to Intelligence Worker | route-depth production checks with proxy-header mode in deployment verification |

## Production feature flags / explicit exclusions

The public provenance/origin contract remains ZERO + FOMO. Afterbell is a sibling research galaxy/context for tokenized equities while its xStock PLANETS retain truthful Solana provenance; it is not treated as a launch-origin rewrite. PonsFamily remains an internal/research lens and retained evidence system rather than a third public provenance origin. Trading, signing, custody, token launch, native token, Bull Invaders, and LIFE remain disabled/out of scope. Disabled features must fail or remain absent rather than render fabricated data.

## QA rule

A feature is only marked ✅ in `QA_REPORT.md` when a production request or deployment check exercised its live path and inspected response content. Code review or unit tests alone are not enough for that status.
