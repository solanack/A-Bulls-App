# A Bulls App Worker 5.8.0

This Worker matches Pages 7.8.0. It keeps Bull Invaders as the only competitive game key and exposes read-only public analytics; it never connects a wallet, requests a signature, constructs a transaction, trades, launches, claims, or transfers tokens.

## Data source decision — Path B

`ansem.io/docs` does **not** document a public API (JS-rendered marketing/docs shell behind a Cloudflare challenge; no endpoint list, auth scheme, or rate limits). pump.fun also has no official public API.

**Authoritative launchpad source is Path B:**

1. PumpPortal `wss://pumpportal.fun/api/data` `subscribeNewToken` (third-party; no uptime guarantee). The Worker opens a short burst, then reconnects on the `*/2 * * * *` cron. Disconnects are logged and skipped — they never fail the HTTP API.
2. Detection: earliest distribution recipients vs the cached $ANSEM holder set from Helius DAS `getTokenAccounts`. Flag when **≥18% of unique recipients** (min 8) match known holders **or ≥2.5% of distributed supply** lands with known holders.
3. Calibration: Catecoin `$CATE` (`Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump`), a z500-listed airdropped launch.
4. Detected mints persist in D1 table `ansem_launches`. `/api/ansem/launchpad` reads that table and enriches with DexScreener pair stats.

Top 5 Daily Traders are ranked by **realized volume** from parsed transactions when Helius is configured. Profit and hold-time attribution are not claimed; hold time is only the sampled first-to-last transfer window. If Helius is down, the section degrades to most-active pairs by 24h volume.

## Changes

- Replaces CoinGecko category coverage on `/api/ansem/launchpad` with Path B runners / daily volume / traders.
- Adds D1 `ansem_launches` plus a two-minute ingest cron.
- Keeps `/api/ansem/onchain` holder count (Helius DAS unique funded owners) and adds a six-hour stale fallback so a scan timeout does not 503 the $ANSEM panel.
- Ranked hitbox/scoring, Bullion closed-loop, and the no-signature rule are unchanged.

## Deploy

1. Preserve the existing Worker project and D1 database.
2. Apply `migrations/0002_ansem_launches.sql`.
3. Keep `COMMERCE_ENABLED = "false"`.
4. Preserve `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, and `AUTH_SESSION_SECRET`.
5. Deploy and confirm `/api/health` reports `5.8.0`.
6. Confirm `/api/ansem/launchpad` returns `dataPath: "B"` with current runners before deploying Pages.

## Fairness and security

- Ranked and Daily Bull Invaders submissions retain signed, one-time, account-bound challenges and server-side sanity limits.
- Purchased or Arcade runs remain ineligible for the screened leaderboard.
- All launchpad, market, wallet, and NFT views are read-only.
