# Universe data spine activation

The application code is safe to deploy before D1 is attached. In that state it
keeps the explicit synthetic Galaxy Zero window, labels coverage as degraded,
and makes no passive provider calls.

Run these commands once from the project root while authenticated with
Wrangler:

```bash
npx wrangler d1 create a-bulls-universe-index \
  --binding UNIVERSE_DB \
  --update-config
```

Wrangler writes the account-specific database ID into `wrangler.jsonc`. Apply
the idempotent schema directly and deploy:

```bash
npx wrangler d1 execute UNIVERSE_DB --remote \
  --file=cloudflare/migrations/0001_universe_index.sql \
  --yes
npm run build
npx wrangler deploy
```

The binding name must remain `UNIVERSE_DB`; the application looks for that
exact runtime binding. Provider keys belong in Worker secrets and must never be
committed. `HELIUS_MONTHLY_CREDITS` and `HELIUS_BREAKER_RATIO` are non-secret
budget controls. The default breaker closes at 75% of the declared allowance.

This phase does not invent a Helius key, market-data key, launch-source
address, or Cloudflare database ID. Until a real indexer writes a normalized
snapshot and dedicated market data writes candles, the UI remains honestly
labeled `PROTOTYPE / DEGRADED` and Evidence refuses to draw a price chart.
