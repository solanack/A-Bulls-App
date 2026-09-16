# Deploy A Bulls App from GitHub main

The repository root contains the frontend (`wrangler.jsonc`). The intelligence Worker lives under `workers/` (`workers/wrangler.production.toml`). Both must be published. Keep using the existing Intelligence D1 database.

## From your phone

If your prompt already says `root@localhost`, you are inside Ubuntu. Do not run `proot-distro login ubuntu` again. If you are at the Termux `$` prompt, enter Ubuntu first:

```bash
proot-distro login ubuntu
```

Then, inside Ubuntu, use the existing installed dependencies first:

```bash
cd /root/a-bulls-pons-top25 &&
git checkout main &&
git pull --ff-only origin main &&
npm run deploy:all
```

If Git reports a conflicting local edit, stop and preserve it; do not reset, clean, stash-and-drop, or overwrite it. The existing modified `package-lock.json` need not be discarded. This release does not change `package.json` or the lockfile, so a fresh install is not part of the normal phone deployment. Only if Node reports that dependencies are actually missing should you run `npm install --ignore-scripts --no-fund --no-audit`, then rerun `npm run deploy:all`.

`deploy:all` runs all repository tests, verifies the locked interface, builds and typechecks the production frontend, bundles the intelligence Worker, applies outstanding D1 migrations, publishes intelligence, publishes the frontend, and checks the public domain. It stops at the first failure. Wrangler uses the Cloudflare login already present on your phone; if it reports authentication is required, run `npx wrangler login` there and rerun `npm run deploy:all`.

The token-planet local system and weekly trader observatory reuse existing retained D1/index/cache tables. They do not require a new holder provider or a new database. The observatory cache is produced by scheduled Intelligence Worker maintenance; immediately after the first deployment it may honestly report that no cache has been produced yet until a scheduled run completes.

## Automatic deployment

In this repository's GitHub Settings → Secrets and variables → Actions, configure:

- `CLOUDFLARE_API_TOKEN`: an existing scoped Cloudflare token authorized to publish these Workers and apply migrations to their D1 database.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account containing both Workers and the existing database.

Also configure the repository variables `LIVE_REPLAY_FROM`, `LIVE_REPLAY_TO`, and
`LIVE_REPLAY_EXPECTED_SIGNATURES` (a comma-separated list). They pin the retained
window and receipts for the known active wallet/token fixture. The live gate fails
when that exact subject has no Replay events, lacks its expected receipts or WSOL
OHLC, or no longer appears in the wallet's aggregated holdings.

Do not paste either into chat or commit credentials. Pushes to main trigger the deployment workflow, or run **Deploy Cloudflare** from Actions. Missing credentials fail the workflow explicitly before any migration or publication step; they do not change production. The separate release workflow can run its tests and builds without production credentials.

## Verify the actual release

`https://abullsapp.com/release.json` reports the frontend Git commit and build time with `Cache-Control: no-store`. `node scripts/check-live.mjs` compares it with the checked-out commit and checks JavaScript MIME types, API health, both token resolvers, and galaxy endpoints. An empty galaxy is reported as empty, not as proof that ranking has populated.

PONS membership still requires verified factory origin, a provider-reported market cap of at least $500,000, and two qualifying cycles at least 15 minutes apart. FDV never replaces market cap. After starting or repairing indexing, allow those cycles to run and inspect Worker logs if the galaxy remains empty. Direct PONS lookup works independently of ranked membership.

The approved cosmology for acceptance is **token/mint = PLANET** and **observed public wallet/holder/trader = STAR**. Legacy producer field names are compatibility details and must not appear as reversed rendered meaning.

## Phone acceptance check

HTTP success and a successful build do not prove the 3D renderer works. On the Seeker's browser, verify:

1. Galaxy Zero renders without a black screen; all protocol galaxies remain reachable; rotate and pinch without blanking the native WebGL field.
2. Enter Solana, Pump, and PONS. Visible tokens render as PLANETS, not wallet stars. PONS ranked and pinned teaching tokens use the same planet taxonomy.
3. Tap a token planet. It becomes the central body of a local system. Retained positive-net wallet evidence appears above it as wallet STARS; current indexed trades appear as COMETS; observed liquidity may appear as an ASTEROID BELT. If retained holder evidence is empty, the system says so and does not fabricate stars.
4. Tap a wallet star and confirm Grey describes a public wallet as observed evidence without claiming a person's identity or ownership. Use WATCH on both a token planet and a wallet star, reopen WATCHLIST, and confirm both survive a page reload when browser storage is available.
5. Open TOP 50 TRADERS. The view must either show cached seven-day wallet stars with its matched-in-window methodology/disclosure or an honest empty/cache-not-produced state. It must not expose a copy-trade or execution action.
6. Solana and PONS token answers report current price, distinct market cap/FDV when available, trading activity, and sourced observations. Missing values remain missing rather than becoming zero.
7. Rotate the phone, background/resume the browser, and reopen the page. The Field recovers, saved references persist, and no duplicate renderer or blank canvas appears.
8. Replay/Evidence/Compare/Create still show their actual indexed coverage and cited evidence. Missing history is not fabricated, and Create/thesis publication remains account-authenticated rather than wallet-authenticated.

The automated release gate certifies tests, TypeScript, production frontend build, and Intelligence Worker bundling, but it cannot certify the physical Seeker GPU/browser lifecycle. Keep the previous Cloudflare deployment versions available until the phone check passes.

## Rollback order

For an application/API incompatibility, normally restore the previous frontend
deployment first so browser traffic stops depending on the newer API contract;
then roll back the Intelligence Worker. Before either action, check the D1 schema
and both versions' read/write compatibility. D1 migrations are not assumed to be
reversible, and an older Worker must not be restored if it cannot safely operate
against the current schema. If the incident is isolated to the API and the current
frontend is confirmed compatible with the prior API, document that exception and
its schema evidence before reversing the order.

Existing provider and voice secrets remain in their respective Workers. This release does not change the alien voice provider or require re-entering those secrets.
