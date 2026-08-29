# A Bulls App — Cloudflare Frontend Deployment

## Locked architecture

- This project is the **frontend/application runtime** for `abullsapp.com`.
- Existing intelligence Worker remains unchanged:
  `https://black-bull-run-sol.ckdsigns1.workers.dev`
- Do not migrate, edit, or redeploy the intelligence Worker as part of this frontend deployment.
- Do not point `abullsapp.com` directly at the intelligence Worker.
- The original Grok workspace archive remains the rollback/source-of-truth fallback.

## What was changed for Cloudflare

1. Replaced the Vercel/Nitro build adapter with Cloudflare's official Vite plugin for TanStack Start.
2. Added `wrangler.jsonc` with `nodejs_compat` and TanStack's server entry.
3. Added `deploy` and `cf-typegen` scripts.
4. Removed the build-time `db:migrate` step from `npm run build`; this frontend does not need to mutate the existing A Bulls App Worker/D1 infrastructure.
5. Left `src/lib/intelligence.ts` pointed at the existing Worker.
6. Did not add the production custom domain route yet. First deploy to a temporary `workers.dev` URL and verify the app.

## First deployment from Termux / Ubuntu

```bash
pkg update
pkg install nodejs-lts git unzip
termux-setup-storage

cd ~/storage/downloads
unzip A-Bulls-App-Universe-Data-Spine-Cloudflare-Ready.zip -d ~/A-Bulls-App-Universe-Data-Spine
cd ~/A-Bulls-App-Universe-Data-Spine
npm ci
npx wrangler login --device
npx wrangler d1 create a-bulls-universe-index --binding UNIVERSE_DB --update-config
npx wrangler d1 execute UNIVERSE_DB --remote --file=cloudflare/migrations/0001_universe_index.sql --yes
npm run build
npx wrangler deploy
```

If Wrangler is already authenticated, skip the login command. Device login is used because it avoids Termux browser callback problems.

Wrangler prints the temporary `workers.dev` URL after deployment. Keep that URL for the preview checks below. This command deploys only `a-bulls-app-frontend`; it does not deploy or modify the existing intelligence Worker.

## Required preview verification

Before moving `abullsapp.com`, verify on the temporary Worker URL:

1. Normal Particle Field loads and behaves exactly like the Grok source-of-truth build.
2. Normal Particle Field movement, camera, colors, and controls are unchanged.
3. The Galaxy Zero origin-map button opens the immersive starmap.
4. Galaxy Zero is marked current; pump.fun is visibly calibrating and cannot be
   entered before its live source is attached.
5. Closing the starmap returns to the same camera and field state.
6. QUERY transitions to the alien.
7. Alien renders, rotates, and remains anatomically stable.
8. QUERY accepts wallet / transaction / mint / NFT / program identifiers.
9. Existing intelligence Worker returns real read-only results.
10. Alien speaks the result.
11. Return To Field restores the exact normal field.
12. Test on Android/mobile.
13. Open REPLAY, play/pause, scrub, and step through the bounded field window.
14. Confirm unrevealed particles cannot be selected.
15. Select a revealed particle and open EVIDENCE.
16. Confirm the synthetic Galaxy Zero window shows no fabricated price chart.
17. Confirm the field displays `INDEXED / EMPTY` after D1 is attached but before
    a production snapshot is written; it must not silently live-fetch a field.
18. Repeat a QUERY within 60 seconds and confirm it is served from cache.

## Move `abullsapp.com` only after preview passes

In Cloudflare Dashboard:

Workers & Pages → `a-bulls-app-frontend` → Settings → Domains & Routes → Add → Custom Domain → `abullsapp.com`

Keep the previous Pages deployment available as rollback until the new Worker deployment is verified in production.
