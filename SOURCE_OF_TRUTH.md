# A Bulls App — source of truth

Captured 2026-08-28 from the live Cloudflare Pages deploy.

## Live Pages

- Domain: https://abullsapp.com
- Preview: https://d992b05d.black-bull-run-sol.pages.dev
- Cloudflare project: `black-bull-run-sol` (Pages)
- Deployment ID: `d992b05d-a3f5-4b19-a8db-4dabdc8ce379`
- Uploaded: 2026-08-26 2:33 PM
- Build stamp: `8.8.0-vnext-73`
- This branch: `production/pages`

## Live Worker (separate app, same Cloudflare name)

- URL: https://black-bull-run-sol.ckdsigns1.workers.dev
- Worker name: `black-bull-run-sol`
- Entry: `workers/worker-vnext-entry.mjs`
- Health stamp: `8.2.0`
- RELEASE note on this Pages build: Worker `8.2.0-vnext-71` unchanged
- Closest GitHub source: `z500-intelligence-build` / `recovery/particle-universe-z500-integrated`
- Live flags: Universe on, Mesh off, Indexer off, Pump on / stream off

## Rules

- Do not deploy Worker code from this branch.
- Do not deploy Pages from `main` or QUERY branches until they are based on this snapshot.
- Field talks to Worker only through `js/config.js` `apiBase`.
- Do not delete the `d992b05d` production deployment.

## What this branch is

Live website code overlaid on `live-source-sync` so existing game art stays in Git.
The JS/CSS/HTML here is the 8.8.0-vnext-73 Field + Intelligence shell that is on abullsapp.com.
