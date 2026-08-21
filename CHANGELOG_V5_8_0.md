# Worker 5.8.0 / Pages 7.8.0 verification changelog

Standing constraints: no wallet signature or crypto payment path; Ranked hitbox/scoring exact; Bullion closed-loop. Game, dashboard, and main menu were not modified.

## 0. Data path

- **Used: Path B.**
- **Why:** `ansem.io/docs` does not document a public API (JS-rendered, Cloudflare-challenged, no endpoint/auth/rate-limit reference). pump.fun has no official public API.
- **Authoritative sources:** PumpPortal `subscribeNewToken`, Helius DAS $ANSEM holder set, DexScreener pair stats, D1 `ansem_launches`.
- **Threshold:** 18% unique recipient overlap (min 8 recipients) **or** 2.5% of distributed supply to known $ANSEM holders.
- **Calibration:** Catecoin `$CATE` mint `Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump`, confirmed on `ansem.io/z500` as an airdropped launch.

## Mandatory verification

1. **Path B documented** in this file, `README_V5_8_0.md`, and Worker header. PumpPortal reconnects increment `pumpPortal.reconnects` and never throw into `/api/ansem/launchpad`.
2. **Top 5 Runners / Daily Volume / Top 5 Traders** render from live DexScreener stats on detected/seeded z500 launches — not CoinGecko placeholders. Traders are realized volume when Helius can parse txs; otherwise the UI labels the pair-volume fallback instead of inventing profit.
3. **Last updated** is the Worker `updatedAt` ISO timestamp. Pages auto-refresh every 3 minutes and show that stamp.
4. **$ANSEM holder count** is unique funded owners from existing Helius DAS `getTokenAccounts` (with getProgramAccounts fallback). Cached 60s fresh / 6h stale. Displayed as an exact integer when `holderScanComplete` is true; otherwise labeled as a scanned figure, never as a rounded guess.
5. **Old Ansem.io CoinGecko command-center markup is removed** from `index.html` (summary grids, breadth, dominance, comparison, risk, mechanics explorer, CSV export).
6. **Degraded state:** if DexScreener/PumpPortal fail, the Worker returns the stale cache with `degraded: true` or a 503 that Pages renders as “data temporarily unavailable” without breaking $ANSEM / wallet / Bullpen tabs.

## Out of scope (unchanged)

- Bull Invaders, Ranked scoring, campaign, dashboard/home, drawer/main menu, Bullion, wallet connect (still none).
