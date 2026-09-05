# A Bulls App SocialFi Architecture

## Product definition

A Bulls App is a social intelligence network organized as galaxies. It combines public-chain discovery, evidence, trader and creator identity, reputation, conversation, watchlists, and launchpad communities. It is not presented as a generic blockchain explorer.

## Release boundary

The current release remains non-custodial and does not connect to or sign with wallets. Social identity is an A Bulls App account. A public wallet may be watched, analyzed, or voluntarily disclosed without implying that the account controls it.

Wallet connection, wallet ownership proof, signing, swaps, copy trading, token creation, liquidity actions, custody, and the A Bulls App native token are all hard-disabled in code. Environment variables alone cannot activate wallet execution; a separately reviewed execution adapter and new release are required.

## Social graph

- Profiles for members, creators, projects, and moderators
- Evidence-linked posts and replies
- Follows, mutes, and blocks
- Private, unlisted, and public watchlists
- Token and galaxy communities
- Creator channels
- Non-transferable reputation based on useful, evidence-backed participation
- Reports and moderation state

## Product sequence

1. Ship read-only discovery feeds built from indexed evidence.
2. Enable account-authenticated profiles, follows, posts, reactions, and watchlists.
3. Add creator channels and token/galaxy communities with moderation.
4. Add simulated or routed transaction intents without signing.
5. Complete security, legal, store-policy, and custody reviews before any wallet adapter exists.
6. Evaluate a native token only after measurable product utility and independent legal review.

## Native token recommendation

Do not launch the token first. Start with non-transferable reputation and product entitlements. A future token may support access, creator/community coordination, and governance only after the platform has real users and the economics are modeled. Do not promise appreciation, revenue share, yield, buybacks, or returns in product copy.
