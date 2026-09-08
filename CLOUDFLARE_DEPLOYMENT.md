# Deploy A Bulls App from GitHub main

The repository root contains the frontend (`wrangler.jsonc`). The intelligence Worker lives under `workers/` (`workers/wrangler.production.toml`). Both must be published. Keep using the existing Intelligence D1 database.

## From your phone

If your prompt already says `root@localhost`, you are inside Ubuntu. Do not run `proot-distro login ubuntu` again. If you are at the Termux `$` prompt, enter Ubuntu first:

```bash
proot-distro login ubuntu
```

Then, inside Ubuntu:

```bash
cd /root/a-bulls-pons-top25 &&
git checkout main &&
git pull --ff-only origin main &&
npm install --ignore-scripts --no-fund --no-audit &&
npm run deploy:all
```

If Git reports a conflicting local edit, stop and preserve it; do not reset or overwrite it. The existing modified lockfile need not be discarded.

`deploy:all` runs all repository tests, verifies the locked interface, builds and typechecks the production frontend, bundles the intelligence Worker, applies outstanding D1 migrations, publishes intelligence, publishes the frontend, and checks the public domain. It stops at the first failure. Wrangler uses the Cloudflare login already present on your phone; if it reports authentication is required, run `npx wrangler login` there.

## Automatic deployment

In this repository's GitHub Settings → Secrets and variables → Actions, configure:

- `CLOUDFLARE_API_TOKEN`: an existing scoped Cloudflare token authorized to publish these Workers and apply migrations to their D1 database.
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account containing both Workers and the existing database.

Do not paste either into chat or commit credentials. Pushes to main trigger the deployment workflow, or run **Deploy Cloudflare** from Actions. Missing credentials now fail the workflow explicitly; they no longer produce a green deployment that published nothing. The separate release workflow can run its tests and builds without production credentials.

## Verify the actual release

`https://abullsapp.com/release.json` reports the frontend Git commit and build time with `Cache-Control: no-store`. `node scripts/check-live.mjs` compares it with the checked-out commit and checks JavaScript MIME types, API health, both token resolvers, and galaxy endpoints. An empty galaxy is reported as empty, not as proof that ranking has populated.

PONS membership still requires verified factory origin, a provider-reported market cap of at least $500,000, and two qualifying cycles at least 15 minutes apart. FDV never replaces market cap. After starting or repairing indexing, allow those cycles to run and inspect Worker logs if the galaxy remains empty. Direct PONS lookup works independently of ranked membership.

## Phone acceptance check

HTTP success and a successful build do not prove the 3D renderer works. On the Seeker's browser, verify:

1. All three protocol galaxies render inside Galaxy Zero; rotate and pinch without blanking the field.
2. Enter Solana, Pump, and PONS, tap a visible token, query it, then return and select another token.
3. Solana and PONS answers report current price, distinct market cap/FDV when available, trading activity, and sourced risk observations.
4. Rotate the phone, background/resume the browser, and reopen the page. Pins persist and the field recovers.
5. Replay/Evidence/Compare show their actual indexed coverage. Missing history is not fabricated.

The current automated review could not certify these physical-device checks: its cloud browser disables WebGL and blocks the local preview address. Keep the previous Cloudflare deployment versions available until the phone check passes.

Existing provider and voice secrets remain in their respective Workers. This release does not change the alien voice provider or require re-entering those secrets.
