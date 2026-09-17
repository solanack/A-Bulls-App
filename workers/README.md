# A Bulls App Living Universe Worker

Canonical backend package for A Bulls App. Deploy from this `workers/` directory. Required configuration and bindings are documented in `wrangler.toml` and the root rebuild audit.

Required secret: `HELIUS_API_KEY` for guarded indexing.
Required binding: `INTELLIGENCE_DB`; `RATE_LIMITER` is recommended.

The Worker is read-only with respect to wallets and contains no Google Play, Stripe, purchase, webhook, wallet-connect, signature, blockchain-transaction, or crypto-payment endpoints.

Verification: `node tests/v8-worker.test.mjs`.

## Local and production routing

`workers/wrangler.toml` names the development worker `black-bull-run-sol-api`;
`workers/wrangler.production.toml` names production `black-bull-run-sol`.
The frontend production defaults live in root `wrangler.jsonc` vars.
Vite loads `.env`, `.env.local`, and mode-specific files; explicit environment
variables win (including flags supplied by `scripts/with-app-env.mjs`).
`VITE_INTELLIGENCE_WORKER_URL` overrides the HTTP upstream and
`VITE_PUBLIC_APP_ORIGIN` overrides the public origin. Only production mode
uses production defaults. Development defaults to ports 8787 and 8080.

Run `npx wrangler dev --config workers/wrangler.toml` in one terminal and
`npm run dev` in another. Request `http://localhost:8080/api/health`:
the local Wrangler request log must show `GET /api/health`. Stop the local
worker and the frontend must return 503, never silently reach production.
The local flags intentionally remain fail-closed; use local Wrangler vars
and local D1 migrations to enable the specific research feature under test.
Do not use the production config for routine local development.

Release checks reject deployment-host URLs in executable source outside
Wrangler configuration. Historical docs and deployment metadata are not
runtime routing configuration. Provider user-agent strings use the app name.
