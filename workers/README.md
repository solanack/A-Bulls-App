# A Bulls App Worker v8.0.2

Canonical backend package for A Bulls App. Deploy from this `workers/` directory. Required configuration and bindings are documented in `wrangler.toml` and the root rebuild audit.

Required secrets: `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, `AUTH_SESSION_SECRET`.
Required/expected bindings: `LEADERBOARD_DB`; `ANALYTICS_CACHE` strongly recommended; `RATE_LIMITER` recommended.

The Worker is read-only with respect to wallets and contains no Google Play, Stripe, purchase, webhook, wallet-connect, signature, blockchain-transaction, or crypto-payment endpoints.

Verification: `node tests/v8-worker.test.mjs`.


