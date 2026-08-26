# A Bulls App — Cloudflare Release Candidate

This document is the handoff boundary between repository work and production Cloudflare changes. The owner-facing execution sequence is in `docs/OWNER-DEPLOYMENT-HANDOFF.md`; Android and store work follows `docs/ANDROID-STORE-HANDOFF.md`.

## Release scope

- Frontend baseline: Pages 8.7.0, built forward as the vNext full-screen field experience. Current PWA checkpoint: `8.7.0-vnext-70`.
- Worker baseline: verified Worker 8.2.0 reconstructed at build time, extended through `workers/worker-vnext-entry.mjs`.
- Bull Invaders is the only game.
- LIFE, Ansem/$ANSEM, Bullpen NFT/community integration, Ansem.io, Community Integrations and removed games stay removed.
- Public-chain intelligence remains read-only: no wallet signing, custody, transaction submission or trading.
- Exact focused entities can expand into field-native investigation hubs, but visual edges are allowed only when a normalized evidence receipt explicitly connects both loaded endpoints.

## Production deployment order

Do not deploy Pages first against an old Worker. The vNext frontend calls vNext Worker routes.

1. Confirm the release-candidate workflow passes under Node 22. If hosted GitHub Actions allowance remains unavailable, run the exact workflow in another runnable environment and record the result; do not treat infrastructure-only Action failures as a green code result.
2. In Cloudflare, verify the existing Worker secrets/bindings are still present before replacing Worker code.
3. Apply D1 migrations `0007` through `0014` in numeric order to the intended production Intelligence/leaderboard database. Do not reapply a migration already recorded/applied in production. Migration `0014_trickster_share_manifests.sql` is required before `TRICKSTER_SHARE_ENABLED` can be enabled.
4. Verify Worker bindings point at the intended production D1/KV resources. The repository intentionally does not contain account-specific IDs or secrets.
5. Configure the `RATE_LIMITER` binding with an account-unique integer namespace ID before making Intelligence routes public. The Worker enforces HTTP 429 with `Retry-After` when the binding denies a request.
6. Preserve these existing Worker secrets where used by the retained baseline: `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, `AUTH_SESSION_SECRET`.
7. Add `INTELLIGENCE_MESH_INGEST_TOKEN` only if protected external ingest will be enabled.
8. Deploy the Worker release candidate with the vNext routes enabled only after migrations/bindings are verified.
9. Smoke-test Worker health and read-only Intelligence routes from `https://abullsapp.com` origin.
10. Deploy Pages from the same release-candidate commit.
11. Attach/verify `abullsapp.com` and `www.abullsapp.com`, then perform desktop + phone smoke tests.

## Feature flags for the first .com release

The browser shell is enabled in `js/config.js`.

For the Worker, enable the capabilities whose migrations and dependencies have been verified:

- `UNIVERSE_ENABLED=true`
- `TRICKSTER_STUDIO_ENABLED=true`
- `PLAYABLE_DATA_ENABLED=true`
- `INTELLIGENCE_MESH_ENABLED=true`
- `MARKET_BACKFILL_QUEUE_ENABLED=true` only after D1 migrations and scheduled processing are verified.
- `TRICKSTER_SHARE_ENABLED=true` only after migration `0014`, validation/share tests, expiry cleanup, and abuse/rate-limit policy are verified. It remains `false` in the checked-in Wrangler defaults.

Keep optional provider-specific historical transports off until real provider credentials/contracts are configured and tested:

- `INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED=false`
- `INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED=false`
- `INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED=false`

The app can still use the standard/progressive RPC path while those optional accelerators remain disabled. UI coverage must continue to report what was actually indexed/searched rather than implying full-chain completeness.

## Required production checks

- `ALLOWED_ORIGINS` contains `https://abullsapp.com` and `https://www.abullsapp.com`.
- `privacy.html`, `terms.html`, and `share.html` return 200.
- `_headers` is served as Cloudflare Pages policy configuration, with no stale HTML content.
- PWA manifest and service worker update successfully to `8.7.0-vnext-70`.
- Desktop opens as a true full-viewport experience; mobile uses the dedicated compact presentation.
- Search accepts public Solana addresses/mints/signatures without requesting a wallet signature.
- Exact field focus opens a spatial investigation hub; every rendered relationship has an evidence receipt and both endpoints are loaded in the bounded snapshot.
- Evidence-backed hub navigation supports bounded back/forward traversal without fuzzy entity matching or inferred relationships.
- Focused Replay, Compare, What If, Evidence, and Create actions carry the exact selected entity into the next investigation action. Focused Create gathers a valid evidence bundle before Trickster rather than manufacturing a story from visual focus alone.
- Universe truth panel shows observation window, coverage/source and live/degraded state.
- Live adapter/mesh events reach the Universe only through the normalized explicit projection path; malformed wallet/token/program identifiers are not promoted into typed field entities.
- Intelligence returns explicit `NO INDEXED EVIDENCE` when evidence is unavailable rather than `NO ACTIVITY`.
- Replay play/pause/seek/rewind and buy/sell effects work.
- Compare and What If preserve observed-vs-simulated disclosure.
- Trickster story creation and local export fail closed when validation/export prerequisites are unavailable.
- Saved Trickster projects remain local unless the user explicitly publishes a frozen share manifest; a shared manifest stays read-only, evidence-linked, content-addressed, and expires according to the Worker retention policy.
- Bull Invaders starts, exits back to Games, and retained Ranked/campaign behavior is unchanged.
- No LIFE, Ansem, Bullpen/community, Ansem.io, or removed-game navigation is present.

## Rollback

Keep the currently deployed Pages and Worker deployment IDs available until the release passes production smoke testing. If the Worker fails, roll the Worker back first, then Pages. Do not leave the vNext Pages frontend pointed at a Worker revision that lacks its required API routes.

## Not required for this .com release

Google Play and Solana dApp Store packaging/submission are deliberately deferred. Server-side video rendering and optional external historical accelerators can be added after the first Cloudflare release without weakening evidence/coverage truth rules.
