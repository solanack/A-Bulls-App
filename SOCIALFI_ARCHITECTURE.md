# A Bulls App Social Research Architecture

> `MASTER_PLAN.md` is the highest-level product contract. This file defines the social/account layer that supports the evidence-native research system.

## Product definition
A Bulls App is a social intelligence network organized around verifiable research objects, not a generic social feed. Public-chain discovery, trader/token research, evidence, Research Threads, Trickster Cuts, theses, watchlists, creator identity, conversation, and communities all attach to the same evidence graph.

## Identity / wallet boundary
The normal social identity is an **A Bulls App account**.

A public wallet may be watched, analyzed, cited, or voluntarily disclosed without implying real-world identity or wallet control.

The default web product remains fully usable without wallet connection. Transaction signing, swaps, copy trading, token creation, liquidity actions, custody, approvals, and automated execution remain prohibited.

### Narrow future mobile exception — Bind My Star
The master plan approves a mobile/Seeker-only Solana Mobile Wallet Adapter flow whose sole purpose is to authorize/select an installed wallet's **public address** and navigate to that STAR.

This exception:
- does not sign transactions;
- does not execute or route trades;
- does not create token/liquidity actions;
- does not turn A Bulls App into a wallet app;
- must not imply more identity/ownership than the active wallet authorization actually establishes.

Any stronger ownership proof, message signing, execution adapter, custody behavior, or financial action requires a separate explicit product/legal/security review and owner approval.

## Social graph
Long-term supported structures:
- member, creator, project, and moderator profiles;
- follows, mutes, and blocks;
- evidence-linked posts and replies;
- private, unlisted, and public Research Threads;
- private, unlisted, and public watchlists/My Sky collections;
- save/cite/fork research;
- counter-theses tied to the same evidence;
- token and galaxy communities;
- creator research channels;
- Trickster Cut pages and discussion;
- non-transferable reputation based on useful evidence-backed participation;
- reports and moderation state.

## Research Threads are the social unit
A Research Thread is more important than a generic post. It can carry:
- galaxy/lens;
- token/mint;
- wallet/trader;
- selected matched round;
- time window;
- Replay state;
- Evidence receipts;
- Compare/What-If/Sequence/Ghost references;
- thesis/interpretation;
- Trickster Cut manifests;
- later observed resolutions.

Users should be able to share, cite, fork, and respond to a Research Thread without mutating the underlying evidence.

## Claim separation
A public claim, thesis, Trickster interpretation, provider-reported value, and A Bulls App observed fact are distinct objects.

Later evidence may resolve or contextualize a claim, but must not rewrite what the user originally said.

## Index relationship
Public research objects should become searchable in the first-class **Index / Trade Library** when visibility allows. A user's profile may therefore surface:
- public Research Threads;
- public Trickster Cuts;
- cited traders/tokens;
- theses and resolutions;
- saved/public collections;
- evidence-backed participation history.

The Index is not a popularity feed. Ranking/discovery methods must distinguish engagement from factual/evidence quality.

## My Sky / return loop
Users may watch token PLANETS, public-wallet STARS, Research Threads, Cuts, and selected evidence objects. Signed-in accounts should eventually sync watch state across devices; unsigned users may retain local-only state.

Alerts should report meaningful observed changes and deep-link into the exact research context. They must not say or imply that the user should copy a trader or buy/sell a token.

## Reputation
Start with non-transferable reputation/product trust signals based on useful evidence-backed participation and transparent methodology.

Do not reduce reputation to investment returns or trader PnL. Do not label users “smart money” solely from observed gains.

## Native token recommendation
Do not launch an A Bulls App token for hackathon optics or early growth. Consider a token only after measurable product utility, economics design, independent legal review, and explicit owner approval.

Do not promise appreciation, revenue share, yield, buybacks, or returns in product copy.

## Product sequence
1. Finish the canonical research descent and shared Research Thread context.
2. Build the first-class Index / Study Trader / Study Token research surfaces.
3. Make My Sky/watchlists durable and useful.
4. Enable evidence-linked public/unlisted/private Research Threads, follows, saves, citations, forks, and counter-theses.
5. Add creator channels and token/galaxy research communities with moderation.
6. Add the narrow mobile `Bind My Star` public-address authorization when the core mobile research demo is stable.
7. Evaluate stronger wallet identity/execution capabilities only after separate explicit review; execution is not part of the current master plan.
