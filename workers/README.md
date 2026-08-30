# A Bulls App Living Universe Worker

Canonical backend package for A Bulls App. Deploy from this `workers/` directory. Required configuration and bindings are documented in `wrangler.toml` and the root rebuild audit.

Required secret: `HELIUS_API_KEY` for guarded indexing.
Required binding: `INTELLIGENCE_DB`; `RATE_LIMITER` is recommended.

The Worker is read-only with respect to wallets and contains no Google Play, Stripe, purchase, webhook, wallet-connect, signature, blockchain-transaction, or crypto-payment endpoints.

Verification: `node tests/v8-worker.test.mjs`.
