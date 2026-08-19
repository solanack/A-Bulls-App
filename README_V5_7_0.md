# A Bulls App Worker 5.7.0

This Worker matches Pages 7.7.0. It keeps Bull Invaders as the only competitive game key and exposes read-only public analytics; it never connects a wallet, requests a signature, constructs a transaction, trades, launches, claims, or transfers tokens.

## Changes

- Keeps only `bull-invaders` in competitive challenge, submission, leaderboard, and Daily validation.
- Keeps only Bull Invaders cosmetic items in the closed-loop Bullion catalog.
- Adds `GET /api/ansem/launchpad`, backed by CoinGecko's Ansem.io Ecosystem category.
- Derives tracked market-cap and volume totals, market breadth, cap-weighted change, turnover, concentration, volatility, ATH drawdown, and normalized seven-day comparison inputs.
- Uses a 60-second fresh cache and a six-hour stale fallback. `ANALYTICS_CACHE` remains optional.
- Reports the analytics service in `/api/health`.

## Deploy

1. Preserve the existing Worker project and D1 database.
2. Keep `COMMERCE_ENABLED = "false"`.
3. Preserve `HELIUS_API_KEY`, `GOOGLE_CLIENT_ID`, and `AUTH_SESSION_SECRET`.
4. Preserve the D1 binding `LEADERBOARD_DB` and optional `ANALYTICS_CACHE` and `RATE_LIMITER` bindings.
5. Optionally set `COINGECKO_API_KEY` as a secret for higher API reliability.
6. Deploy and confirm `/api/health` reports `5.7.0`.
7. Confirm `/api/ansem/launchpad` returns current tracked projects before deploying Pages.

No new migration is required.

## Fairness and security

- Ranked and Daily Bull Invaders submissions retain signed, one-time, account-bound challenges and server-side sanity limits.
- Purchased or Arcade runs remain ineligible for the screened leaderboard.
- All launchpad, market, wallet, and NFT views are read-only.
