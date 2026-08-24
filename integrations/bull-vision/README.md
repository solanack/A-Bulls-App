# Bull Vision integration

This directory records the integration boundary between A Bulls App and the user-owned `solanack/trickshot` fork.

## Product surface

Bull Vision lives inside Analytics and exposes four read-only public-chain modes:

- Trade Autopsy / replay metrics
- Historical What If
- Wallet vs Wallet
- Cinematic Replay / Trade Movie

The LIFE screen can optionally consume the last Bull Vision observed-signal set for the same public wallet. Those signals describe only observed on-chain behavior and do not identify a person or infer private/protected traits.

## Service routes

The Trickshot deployment provides:

- `GET /api/bull-vision?mint=&wallet=`
- `GET /api/bull-vision/what-if?mint=&wallet=`
- `GET /api/bull-vision/compare?mint=&walletA=&walletB=`
- `GET /api/bull-vision/life-signals?mint=&wallet=`
- `/bull-vision/replay?mint=&wallet=` for the cinematic replay and client-side trade-movie recorder

A Bulls App sets `CONFIG.bullVisionBase` to the user-owned Trickshot deployment URL. The Helius key stays server-side in Trickshot and is never exposed in browser code.

## Source-of-truth note

The deployed A Bulls App source is newer than the historical `main` tree in this repository. The Bull Vision release package is therefore built from the canonical Pages 8.5.1 master and versioned as Pages 8.6.0. A source-sync workflow is included so this repository can be rebuilt from the deployed public artifact before the release branch becomes the new source of truth.
