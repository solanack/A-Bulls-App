# A Bulls App — Final Living Universe Deployment

This release contains two Cloudflare deployments that intentionally remain separate:

1. `worker/` is the read-only Intelligence Worker and the single `INTELLIGENCE_DB` owner.
2. `frontend/` is the TanStack/Three.js experience served by `a-bulls-app-frontend`.

The frontend calls the Worker over its existing public read-only API. Do not create a second database. Apply the Worker migrations to the existing `a-bulls-app-intelligence` database, deploy the Worker, then deploy the frontend.

## Termux / Ubuntu

```bash
cd /root
unzip -q /sdcard/Download/A-Bulls-App-Living-Universe-Complete-Cloudflare-Ready.zip

cd /root/A-Bulls-App-Living-Universe-Complete/worker
npx wrangler d1 migrations apply INTELLIGENCE_DB --remote \
  --config workers/wrangler.production.toml
npx wrangler deploy --config workers/wrangler.production.toml

cd /root/A-Bulls-App-Living-Universe-Complete/frontend
npm install
npm run build
npx wrangler deploy
```

The Helius key remains a Worker secret and is never included in this package:

```bash
cd /root/A-Bulls-App-Living-Universe-Complete/worker
npx wrangler secret put HELIUS_API_KEY --config workers/wrangler.production.toml
```

## Required live verification

- Both `https://abullsapp.com` and `https://www.abullsapp.com` resolve to the frontend.
- Galaxy Zero and pump.fun open through the origin map.
- QUERY returns only observed public-chain facts.
- Replay loads indexed events and only draws candles when indexed OHLC exists.
- Evidence shows source, chain time, slot/signature when present, and bounded market context.
- Compare, What-If, Sequences, Ghost, and Create return honest empty states when coverage is absent.
- Trickster share URLs open with `?tour=<share-id>` and reload the frozen validated manifest.
- Education has narration but no score, mission, prize, wallet connection, or signing flow.
- Worker `/api/health` reports `living-universe-read-only`; competitive endpoints return 404.

Keep the previous Cloudflare versions available for rollback until this checklist passes on Android Chrome.
