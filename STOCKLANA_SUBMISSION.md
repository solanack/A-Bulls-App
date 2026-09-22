# STOCKLANA Submission — A Bulls App

## Project
**A Bulls App — Afterbell**

**One-line pitch:** Explore who trades tokenized stocks after the closing bell, replay the evidence, and turn an observed trade into a verifiable cinematic story.

A Bulls App is a read-only Solana research and content-creation universe. Its STOCKLANA experience, **Afterbell**, ranks public-wallet trader STARS from retained Solana xStock activity during the after-close research window. Selecting a trader reveals the tokenized-stock PLANETS they traded and retained trade COMETS. Selecting a trade carries the exact wallet, mint, time window, and available receipts into Replay, Evidence, Compare, What-If, Sequences, Ghost, and Trickster/Cut.

The product never executes trades, signs transactions, takes custody, or fabricates missing market history. Observed chain evidence, provider-reported context, derived values, user claims, and unavailable coverage remain distinct.

## Why it fits STOCKLANA
Tokenized stocks make the market programmable beyond brokerage hours. Afterbell focuses on the part a traditional brokerage interface does not make intuitive: **what public onchain traders actually did after the bell, how a trade unfolded, and how another researcher can verify the story.**

The differentiator is not another execution terminal. It is the evidence and media layer:
1. discover a public trader;
2. inspect their tokenized-stock activity;
3. choose an observed trade;
4. replay it against retained market data;
5. inspect receipts and provenance;
6. create a shareable Cut whose verification path reopens the underlying research context.

## Core demo path
1. Open **Galaxy Zero**.
2. Tap **AFTERBELL** once. The camera enters immediately; no confirmation tap or navigation narration.
3. Show the ranked Afterbell trader STARS.
4. Select a trader STAR.
5. Show that trader's xStock PLANETS and retained trade COMETS.
6. Select one trade COMET.
7. Open **Replay** and show the bounded evidence-backed timeline/candles available for that trade.
8. Open **Evidence** and show source/provenance.
9. Open **Trickster / Cut**, apply cinematic presentation, and show the verification path back to the same research context.
10. Return to the Field.

## 3-minute pitch video outline
**0:00–0:20 — Problem**
Tokenized stocks trade onchain beyond traditional market hours, but raw transaction history is difficult to understand and even harder to turn into trustworthy content.

**0:20–0:45 — Product**
A Bulls App turns public blockchain history into an explorable evidence universe. Afterbell answers: who is trading tokenized stocks after the closing bell, what did they trade, and what evidence supports the story?

**0:45–1:35 — Afterbell**
Enter Afterbell in one tap. Show ranked trader STARS. Select one. Show the trader-centered system with xStock PLANETS and observed trade COMETS. Emphasize that missing data stays unavailable rather than being invented.

**1:35–2:20 — Replay + Evidence**
Select a trade and open Replay. Demonstrate real retained event/candle coverage, buy/sell events, timeline controls, evidence receipts, and source labels.

**2:20–2:45 — Creator layer**
Open Trickster/Cut. Show how the same evidence becomes a cinematic vertical story with effects/audio while the underlying trade context remains verifiable.

**2:45–3:00 — Close**
“Study the trader. Replay the trade. Verify the story.” A Bulls App is the research and media layer for onchain markets.

## 5-minute technical walkthrough outline
- Field/WebGL architecture and mobile/Seeker constraints.
- Cloudflare Worker + D1 evidence/index architecture.
- Afterbell xStock discovery and bounded Solana history ingestion.
- Evidence taxonomy and non-fabrication rules.
- Research Thread context inheritance.
- Replay market/candle hydration.
- Cut manifest and verification.
- Provider budget controls, cache-first reads, scheduled indexing, and failure disclosure.

## Submission checklist
- [ ] Register for STOCKLANA on the Solana hackathon platform before submission closes.
- [ ] Confirm team/profile information.
- [ ] Verify production at abullsapp.com on desktop and mobile.
- [ ] Verify Afterbell contains real retained trader STARS.
- [ ] Verify STAR → xStock PLANET/trade COMET → Replay → Evidence → Cut journey.
- [ ] Record a pitch video no longer than 3 minutes.
- [ ] Record an optional technical walkthrough no longer than 5 minutes.
- [ ] Add the GitHub repository.
- [ ] Add the live production demo.
- [ ] Select the main STOCKLANA track and only sponsor tracks whose integration is actually present and demonstrable.
- [ ] Submit before the platform deadline.
- [ ] Re-open the submitted entry and verify every link from a logged-out/private browser where appropriate.

## Evidence / safety boundary
A Bulls App is research-only and non-custodial. It does not offer stock execution, swaps, transaction signing, approvals, custody, copy trading, token issuance, or liquidity execution. Public-wallet observations are not identity claims. Rankings describe retained activity, not trader skill. Realized PnL is withheld unless retained evidence supports the required basis. Missing data is not treated as zero.
