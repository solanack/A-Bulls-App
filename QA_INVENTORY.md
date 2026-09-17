# A Bulls App — Production QA Inventory

Audit baseline: `main` at `e6fe31dafd296ccb726aa32600849a2e8e493a1b` (2026-09-17). This inventory is code-derived from the active frontend, Intelligence Worker, production Wrangler flags, and release/live-check scripts. Disabled surfaces are not represented as live product features.

| Feature / route family | Primary code path | Production scope | Real data source | Automated coverage |
|---|---|---|---|---|
| Galaxy Zero / Field WebGL universe | `src/components/app-shell.tsx`, `src/lib/field/*` | ZERO | retained Field snapshots + Intelligence API; Three/WebGL renderer | release baseline + production HTML/asset/MIME checks; visual WebGL remains device/manual |
| FOMO galaxy trader STAR field | `workers/intelligence-fomo-galaxy.mjs`, `workers/intelligence-fomo-live.mjs` | FOMO | Fomo provider cache in D1, provider-reported values kept distinct from chain evidence | `check-live.mjs` galaxy + audit checks |
| Public identifier / wallet / mint search | Field resolver frontend + `/api/intelligence/field/resolve` | ZERO + research drill-down | resolver cache/D1 plus bounded live enrichment | `check-live.mjs` Solana + EVM resolver checks |
| Field snapshot | `/api/intelligence/field/snapshot` | ZERO | normalized D1/cache | `check-live.mjs` |
| Token/PLANET index | `/api/intelligence/field/v0/tokens` | ZERO | D1 retained token snapshots | `check-live.mjs` + route-depth check |
| Event/COMET index | `/api/intelligence/field/v0/events` | ZERO | D1 normalized events | `check-live.mjs` |
| Wallet/STAR drill-down | `/api/intelligence/field/v0/wallets/:wallet` | ZERO/FOMO handoff | D1 wallet evidence | route-depth check |
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
| Trickster media export | client Trickster/Cut pipeline | capable browsers | real Replay/candles + client media pipeline | repository tests; browser codec/export is capability/manual QA |
| FOMO trader detail | `/api/intelligence/fomo/trader` | FOMO | cached provider positions/trades + bounded A Bulls enrichment | `check-live.mjs` validates handle/wallet, bounded positions/trades and provenance |
| FOMO data audit | `/api/intelligence/fomo/audit` | FOMO | D1 cache population | `check-live.mjs` asserts traders, PnL coverage and wallet mappings |
| Mesh/source status | `/api/intelligence/mesh-status` | internal evidence health | D1/source-health state | route-depth live check |
| Grey voice | `src/lib/alien-voice.ts` | supported clients | ElevenLabs when configured; human Grey profile | release baseline config lock; audio playback remains browser/manual |
| Auth/session-gated publishing | social/thesis policy | gated/limited | authenticated session + immutable evidence objects | repository policy/tests; not marked live-verified here |
| Watchlist / My Sky | Field OS/local-first watch state | ZERO/FOMO research | local-first state + evidence change objects | release baseline + repository tests |
| Intelligence frontend proxy | frontend Worker `/api/intelligence/*` | all live research routes | service binding to Intelligence Worker | route-depth production checks with proxy-header mode in deployment verification |

## Production feature flags / explicit exclusions

The public galaxy origin contract is ZERO + FOMO. PonsFamily remains an internal/research lens and retained evidence system rather than a third public galaxy origin. Trading, signing, custody, token launch, native token, Bull Invaders, and LIFE remain disabled/out of scope. Disabled features must fail or remain absent rather than render fabricated data.

## QA rule

A feature is only marked ✅ in `QA_REPORT.md` when a production request or deployment check exercised its live path and inspected response content. Code review or unit tests alone are not enough for that status.
