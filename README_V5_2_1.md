# A Bulls App Worker 5.2.1

This Worker matches Pages 7.0.1. It preserves the existing package identity (`com.abullsapp.app`) and the read-only wallet boundary: there are no wallet connections, signatures, transactions, custody flows, or client-side provider secrets.

## Deploy

1. Preserve the existing Worker project and D1 database.
2. Keep `COMMERCE_ENABLED = "false"`. Do not configure Play or Stripe secrets for this release.
3. Configure `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, and a strong random `AUTH_SESSION_SECRET` as Worker secrets.
4. Bind the existing D1 database as `LEADERBOARD_DB`.
5. Apply `migrations/0001_core.sql` with Wrangler. It is idempotent and removes legacy duplicate Daily rows before creating the one-run-per-player/day index.
6. Optional but recommended for multi-isolate production: bind Cloudflare Rate Limiting as `RATE_LIMITER` and a KV namespace as `ANALYTICS_CACHE`.
7. Deploy and confirm `/api/health` reports Worker `5.2.1`, retention/leaderboard availability that matches the bindings, and every commerce service as `false`.
8. Deploy the matching Pages 7.0.1 package.

## Security behavior

- Signed-out players receive an HMAC-signed anonymous player session; Google players are keyed by a one-way hash of the verified Google subject.
- Ranked and Daily submissions require a signed, one-time, account-bound run challenge and pass broad physics sanity bounds. The UI accurately calls this “server-screened,” not cheat-proof or server-authoritative.
- Daily submissions are one accepted result per account per UTC day. Replay attempts cannot advance streak, medal, crew, or community totals.
- NFT image proxy URLs are HTTPS-only, reject private/local destinations and unsafe redirects, and enforce metadata/image body limits.

## Android App Links

The existing Google Play signing certificate fingerprint in `/.well-known/assetlinks.json` is preserved. Add the Solana-store build as a second fingerprint only after obtaining that build’s actual SHA-256 signing certificate fingerprint; never replace or guess the Google fingerprint.
