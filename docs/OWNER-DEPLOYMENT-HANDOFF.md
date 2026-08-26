# A Bulls App — Owner Deployment Handoff

This checklist begins only after PR #15 is approved as the release candidate. Repository work must remain unmerged and production untouched until the owner deliberately starts this checklist.

## Locked release

- Product: A Bulls App
- Website: `https://abullsapp.com`
- Worker baseline: 8.2.0 built forward through `workers/worker-vnext-entry.mjs`
- Interface: persistent 3D Solana particle field
- Game: Bull Invaders only
- Analysis: read-only public-chain evidence; no wallet connection, signature, custody, transaction submission, or trading
- Optional Substreams and Old Faithful transports: off for first release

## 1. Record rollback state

Before changing Cloudflare, record the current Pages deployment ID, Worker deployment ID, and D1 backup/export location. Do not continue without all three.

## 2. Validate the release candidate

Use Node 22 or newer at the repository root:

```bash
npm ci --ignore-scripts
npm run validate:release-candidate
```

The command must end with `RELEASE-CANDIDATE LOCAL VALIDATION PASSED`.

## 3. Prepare a private production Wrangler file

Copy `workers/wrangler.production.example.toml` to a private, untracked `workers/wrangler.production.toml`. Replace every placeholder with the existing production D1 name/ID and a new account-unique integer rate-limit namespace ID. Do not commit the resolved file.

Validate it:

```bash
node scripts/verify-production-config.mjs workers/wrangler.production.toml
```

It must print `PASS`. Optional external historical transports must remain `false`.

## 4. Verify Cloudflare secrets and bindings

From `workers/`, verify the existing secrets without copying their values into chat, GitHub, screenshots, or files:

```bash
npx wrangler secret list --config wrangler.production.toml
```

Preserve `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, and `AUTH_SESSION_SECRET` where used by the retained baseline. Add `INTELLIGENCE_MESH_INGEST_TOKEN` only when protected external ingest will actually run.

Confirm `LEADERBOARD_DB` points at the intended production D1 database and `RATE_LIMITER` is present.

## 5. Apply D1 migrations

Check production migration history first. Apply only unapplied migrations, in numeric order, from `0007` through `0014`. Never reapply a recorded migration. Migration `0014` must exist before story sharing is enabled.

Keep `TRICKSTER_SHARE_ENABLED=false` for the first smoke test.

## 6. Deploy and test the Worker first

From `workers/`:

```bash
npx wrangler deploy --config wrangler.production.toml
```

Test health, CORS from `https://abullsapp.com`, oversized-body rejection, rate-limit behavior, read-only Intelligence routes, Replay Bundles, Universe snapshots, and disabled optional transports. Roll the Worker back immediately if retained health/auth/Bull Invaders routes regress.

## 7. Deploy matching Pages

Deploy Pages from the exact same release-candidate commit. Do not deploy a different branch or an older checkout. Verify both `abullsapp.com` and `www.abullsapp.com`.

## 8. Production smoke test

- PWA installs and reports the release-candidate service-worker checkpoint.
- Desktop is full viewport; Android uses the compact presentation.
- Search accepts public wallets, mints, and signatures without wallet authorization.
- Every field relationship has a receipt and two loaded endpoints.
- Investigation back/forward, Replay, Compare, What If, Evidence, and Create preserve exact context.
- What If remains visibly simulated.
- `NO INDEXED EVIDENCE` never becomes `NO ACTIVITY`.
- Trickster validates and exports locally; publishing remains disabled until its separate abuse/retention check is complete.
- Bull Invaders starts, plays, submits eligible Ranked results, and returns to the field.
- Privacy, Terms, share page, manifest, service worker, and `.well-known/assetlinks.json` return correctly.
- LIFE, Ansem/$ANSEM, Bullpen, Ansem.io, Community Integrations, Bull Run, Solana Bang Bang/Claude of Duty, and Pilots are absent.

## 9. Enable frozen story sharing separately

Only after migration `0014`, rate limiting, expiry pruning, validation, publish, read, and abuse tests pass may `TRICKSTER_SHARE_ENABLED` be changed to `true` and the Worker redeployed.

## 10. Android and stores

After the live domain passes every smoke test, follow `docs/ANDROID-STORE-HANDOFF.md`. Never replace `A-Bulls-App-release.keystore` or change package `com.abullsapp.app`.
