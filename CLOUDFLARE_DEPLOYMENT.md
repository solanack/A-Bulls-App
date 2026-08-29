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
unzip A-Bulls-App-Template-Alien-Cloudflare-Ready.zip -d ~/A-Bulls-App
cd ~/A-Bulls-App
npm ci
npx wrangler login --device
npm run build
npx wrangler deploy
```

If Wrangler is already authenticated, skip the login command. Device login is used because it avoids Termux browser callback problems.

Wrangler prints the temporary `workers.dev` URL after deployment. Keep that URL for the preview checks below. This command deploys only `a-bulls-app-frontend`; it does not deploy or modify the existing intelligence Worker.

## Required preview verification

Before moving `abullsapp.com`, verify on the temporary Worker URL:

1. Normal Particle Field loads and behaves exactly like the Grok source-of-truth build.
2. Normal Particle Field movement, camera, colors, and controls are unchanged.
3. QUERY transitions to the alien.
4. Alien renders, rotates, and remains anatomically stable.
5. QUERY accepts wallet / transaction / mint / NFT / program identifiers.
6. Existing intelligence Worker returns real read-only results.
7. Alien speaks the result.
8. Return To Field restores the exact normal field.
9. Test on Android/mobile.

## Move `abullsapp.com` only after preview passes

In Cloudflare Dashboard:

Workers & Pages → `a-bulls-app-frontend` → Settings → Domains & Routes → Add → Custom Domain → `abullsapp.com`

Keep the previous Pages deployment available as rollback until the new Worker deployment is verified in production.
