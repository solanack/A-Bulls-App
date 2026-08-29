# A Bulls App — source of truth

This branch is the live **Field / Intelligence / Universe / Trickster** website.
It is **not** Bull Invaders.

Captured 2026-08-28 from the live Cloudflare Pages Field shell, then cleaned.

## Live Pages

- Domain: https://abullsapp.com
- Preview: https://d992b05d.black-bull-run-sol.pages.dev
- Cloudflare project: `black-bull-run-sol` (Pages)
- Deployment ID: `d992b05d-a3f5-4b19-a8db-4dabdc8ce379`
- Build stamp on the public site: `8.8.0-vnext-73`
- This branch: `production/pages`

## What belongs here

- Field shell
- Universe / Particle Field client
- Intelligence workspace
- Trickster / story tools
- Worker API client (`js/config.js` → live Worker)

## What does not belong here

- Bull Invaders game code
- Ships, bosses, powerups, Pixi campaign art
- Ranked / arcade run-mode
- Game audio / leaderboard / share-card for Invaders

Those stay on `live-source-sync` and the public `d992b05d` deploy until a later split.
Do not copy them back onto this branch.

## Live Worker (separate app)

- URL: https://black-bull-run-sol.ckdsigns1.workers.dev
- Entry: `workers/worker-vnext-entry.mjs`
- Closest GitHub source: `z500-intelligence-build`
- Do not deploy Worker code from this branch.
