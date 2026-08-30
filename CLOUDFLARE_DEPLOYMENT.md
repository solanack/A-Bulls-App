# A Bulls App — integrated Cloudflare deployment

## Locked architecture

- `a-bulls-app-frontend` serves the particle interface and `abullsapp.com`.
- `black-bull-run-sol` remains the complete Z500/Universe intelligence backend.
- `INTELLIGENCE_DB` remains the only Universe intelligence database.
- The frontend never receives Helius secrets and never creates its own D1 database.
- Passive field loading reads indexed snapshots only; it never falls back to a
  per-particle or per-frame provider request.

## Integration

The existing intelligence Worker exposes a narrow Field OS compatibility layer:

- `/api/intelligence/field/snapshot`
- `/api/intelligence/field/resolve`
- `/api/intelligence/field/status`

These routes reuse the existing universe index, pump.fun membership, intelligence
cache, provider budget, rate limiter, CORS policy, cron scheduler, secrets, and D1
binding. Migration `0020_field_compat.sql` is additive and creates only the atomic
monthly provider reservation table.

## Deploy from Termux / Ubuntu

```bash
cd /root
unzip -q /sdcard/Download/A-Bulls-App-Integrated-Universe-Cloudflare-Ready.zip \
  -d A-Bulls-App-Integrated-Universe
cd /root/A-Bulls-App-Integrated-Universe
npm install

cd workers
npx wrangler d1 migrations apply INTELLIGENCE_DB \
  --remote \
  --config wrangler.production.toml
npx wrangler deploy --config wrangler.production.toml

cd ..
npm run build
npx wrangler deploy
```

Wrangler updates the existing Worker names from their checked-in configurations.
It does not create a new Worker or database. Existing secrets remain stored in
Cloudflare and are not included in the source package.

## Required verification

1. Galaxy Zero reports the existing Intelligence Worker coverage state.
2. pump.fun uses the existing `pump-fun` universe membership when populated.
3. Normal field loading makes no live Helius request.
4. QUERY accepts a public wallet, transaction, mint, NFT, or program.
5. Repeating a QUERY within 60 seconds reports an Intelligence Worker cache hit.
6. A closed Helius circuit breaker serves stale evidence when available and never
   invents a result.
7. Replay and Evidence use indexed observations and never fabricate candles.
8. The Grey, voice, fitted glasses, camera, origin map, and mobile controls remain
   functional.
9. Existing Z500, pump.fun, Trickster, replay, research, ingestion, and health routes
   continue responding.
10. Test both `https://abullsapp.com` and `https://www.abullsapp.com` after deployment.

