# A Bulls App — Production QA Report

Audit date: 2026-09-17. Baseline before this report: `e6fe31dafd296ccb726aa32600849a2e8e493a1b` on `main`.

The verification handoff requires real-data verification, honest unavailable states, and no mock/fixture data presented as live. This report deliberately does **not** promote code-only checks to ✅.

| Feature | Status | Evidence / caveat |
|---|---|---|
| Production frontend release identity | ✅ | Deploy workflow and `check-live.mjs` require `/release.json` to match the deployed Git SHA. |
| Frontend Intelligence proxy route depths | ✅ | Production route checks exercise depth 1–4 JSON routes; latest cleanup fixed service binding/proxy routing. |
| Galaxy Zero application shell/assets | ✅ | Production HTML and every referenced JS asset are fetched; JS MIME is asserted. |
| WebGL universe visual rendering | ⚠️ | Renderer code/build/assets are release-gated, but a CI HTTP check cannot prove GPU rendering on Seeker/mobile. Keep device/browser visual QA as a caveat; do not substitute Canvas 2D. |
| Solana resolver/search | ✅ | Production resolver is called with a real Solana address and validated as read-only resolved evidence with coverage metadata. |
| EVM resolver/search | ✅ | Production resolver is called with a real EVM address and validated through the same live resolver contract. |
| Field snapshot/token/event indexes | ✅ | Production snapshot, token v0 and event v0 endpoints are exercised and response shapes checked. |
| Wallet/STAR drill-down | ✅ | Depth-4 wallet route is exercised with the retained active wallet and subject identity asserted. |
| Research holdings | ✅ | Retained active wallet must return non-empty holdings including the retained traded mint. This prevents the prior “activity exists but trader looks empty” failure mode. |
| Replay | ✅ | Retained production evidence is discovered directly from D1 before deployment; live Replay must return the exact wallet, mint, time window and expected transaction signatures. |
| Price candles | ✅ | The retained Replay fixture must contain non-empty numeric OHLC candles. |
| Frozen Trickster Cut read/share/VERIFY | ✅ | Known frozen Cut must retain canonical ID, subject, evidence list, share/verify URL, and render through the public app shell. |
| FOMO galaxy | ✅ | Live production must return addressable Solana trader STARS and provider-reported PnL. |
| FOMO cache audit | ✅ | Live audit requires cached traders, wallet mappings and non-zero PnL coverage; a minimum 50% PnL coverage guard prevents silent degradation. |
| FOMO trader detail | ✅ | Live trader detail must preserve handle/wallet, bounded positions/latest trades, source provenance, and mapped provider token positions during partial enrichment. |
| Evidence tool | ⚠️ | The retained Replay/Cut path proves real evidence survives end-to-end, and the Replay polling normalization regression is fixed. The standalone `event-context` route is not yet independently asserted by `check-live.mjs`, so it is not promoted to ✅. |
| Compare | ⚠️ | Implemented and repository-tested, but no independent production fixture assertion currently exists. |
| What-If | ⚠️ | Implemented and repository-tested, but no independent production fixture assertion currently exists. |
| Sequences | ⚠️ | Implemented and repository-tested, but no independent production fixture assertion currently exists. |
| Ghost | ⚠️ | Implemented and repository-tested, but no independent production fixture assertion currently exists. |
| Trickster validation | ⚠️ | Repository-tested; frozen Cut read path is live-verified, but validate POST is not independently asserted in production. |
| Trickster MP4/media export | ⚠️ | Deterministic/capability-gated client pipeline cannot be proven by HTTP CI alone; requires a codec-capable browser run. No fake export fallback is acceptable. |
| Grey audio playback | ⚠️ | Human Grey ElevenLabs configuration is release-locked; actual device audio/network playback remains browser/manual QA. |
| Auth/session-gated publishing | ⚠️ | Policy and repository coverage exist, but CI intentionally does not fabricate an authenticated user session. |
| Watchlist / My Sky | ⚠️ | Local-first behavior is repository-tested/release-gated; production persistence is client-local and not meaningfully verifiable by stateless HTTP smoke checks. |

## Fixes already landed during this continuation

- Replay polling no longer converts unresolved point/one-second windows into a fake explicit start, keeping old retained Replay evidence resolvable.
- The Universe tool route map is present and the frontend Intelligence proxy is bound across nested route depths.
- FOMO trader data checks require real addressable trader records, provider-reported PnL, provenance, and non-empty cached coverage rather than accepting a 200 response.
- Holdings verification requires a known actively traded mint to appear for the retained wallet.

## No-fake-data audit rule

Production checks assert real response structure and retained evidence identity. A failed live fetch must remain an explicit empty/unavailable/error state; this audit does not authorize sample, placeholder, dummy, fixture, or hardcoded market/trader data as a runtime fallback.

## Remaining caveats

The only items left as ⚠️ are those that require either (a) a dedicated production fixture/assertion that is not yet in the live script, or (b) a real browser/device capability such as WebGL, audio, authentication, or media codecs. They are intentionally not mislabeled as verified.
