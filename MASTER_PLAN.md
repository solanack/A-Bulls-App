# A Bulls App — MASTER PLAN

**Status:** LOCKED product and architecture direction  
**Effective:** 2026-09-08  
**Repository:** `solanack/A-Bulls-App`  
**Primary release branch:** `main`

> **AI / contributor instruction:** Read this file before proposing, coding, refactoring, or deploying anything. This is the highest-level product direction for A Bulls App. `AGENTS.md` contains release and implementation guardrails. If an older document conflicts with this plan, this plan wins unless the owner explicitly changes it.

---

## 1. What A Bulls App is

A Bulls App is an **evidence-native Solana research operating system rendered as an explorable universe**.

It continuously indexes public blockchain activity and selected cited external research feeds, turns that data into navigable objects, lets users descend from ecosystems to tokens to public wallets to specific trades, replays those trades on real indexed market data, preserves the evidence, and turns the research into verifiable cinematic content.

It is not a generic explorer, terminal, portfolio tracker, copy-trading app, shooter, or AI chatbot with a 3D background.

### Core promise

**Study the trader. Replay the trade. Verify the story.**

Long form:

> A Bulls App turns blockchain history into an explorable universe. Enter a token, look up into the wallets that traded it, descend into a trader's history, replay an actual trade on the real market tape, inspect the receipts, and turn that evidence into a verifiable cinematic story.

---

## 2. The five product pillars

### FIELD
The living 3D universe. Discovery and spatial comprehension happen here.

### INTELLIGENCE
Deep study of the currently selected subject: token, wallet, trade round, sequence, evidence window, or comparison.

### INDEX
The permanent searchable research archive: traders, tokens, trades, matched rounds, Replays, Evidence, Trickster Cuts, theses, Ghosts, sequences, and public research threads.

### TRICKSTER
The cinematic storytelling/directing layer. It turns a bounded Research Thread into a verifiable video/Cut without inventing prices, transactions, or outcomes.

### MY SKY
The user's home inside the system: watched token PLANETS, wallet STARS, Research Threads, Cuts, and meaningful change alerts.

These pillars are different interfaces onto one evidence graph. Do not rebuild them as disconnected products.

---

## 3. Locked universe cosmology

| Universe object | Meaning |
| --- | --- |
| **Galaxy** | A launch-origin ecosystem or explicit research lens |
| **Planet** | Token / mint |
| **Star** | Observed public wallet / holder / trader |
| **Moon** | Related NFT collection when relevant |
| **Asteroid belt** | Liquidity / pools / LP depth |
| **Comet** | Near-real-time indexed trade |
| **Black hole** | Collapsed/rugged/dead token with retained evidence |
| **Supernova** | Historical pump/death event |
| **Wormhole** | Migration / bridge event |
| **Ghost** | Dormant/collapsed historical trace or evidence-backed historical echo |
| **Dust** | Decorative field fabric with **no on-chain meaning** |

The taxonomy is locked: **token = PLANET** and **public wallet/holder/trader = STAR**.

Different classes should be recognizable by scale, silhouette, motion, placement, and behavior before a label is read. Decorative particles must never impersonate evidence objects.

---

## 4. Public Galaxy Zero topology

The active public Field origins are **ZERO + FOMO**. ZERO is the overview;
**Fomo** is the only active public research galaxy/lens.

PonsFamily (`pons`) and pump.fun (`pump-fun`) are retired public galaxies.
Their historical launch-origin identifiers, applied migrations, and retained
Replay/Evidence objects remain intact. No public navigation or scheduled
ranking/discovery refresh for these retired galaxies is authorized.

`solana-core` remains an internal provenance/compatibility namespace for
generic Solana evidence and queries, not a public destination.

A research lens never rewrites historical launch origin.

---

## 5. The canonical research descent

This is the signature interaction path and should feel like one continuous research shot rather than a series of forms:

**Universe → Galaxy → Planet → Holder Sky → Star → Holdings → Matched Rounds → Chosen Trade → Tools → Trickster Cut**

### Beat 1 — Galaxy Zero
ZERO overview with Fomo as the sole active research destination. Do not replace the Field with cards.

### Beat 2 — Enter galaxy
The chosen galaxy fills the frame. Token PLANETS or trader STARS appear according to the galaxy's meaning.

### Beat 3 — Select token planet
Do not hard-cut to a dashboard. Dolly toward the selected PLANET until it becomes the local ground/center of the scene.

### Beat 4 — Look up into holder sky
Keep the token PLANET low in frame and reveal retained public-wallet STARS above it. If holder evidence is unavailable, the sky remains honestly empty and Grey states the coverage limitation. No invented wallets and no passive provider fan-out on page navigation.

### Beat 5 — Select wallet/trader star
The STAR becomes the research subject without claiming a real-world identity or wallet ownership unless separately verified. A holdings system opens around it: other token PLANETS this wallet is currently observed to hold or has provider-reported positions in, with source type kept explicit.

### Beat 6 — Matched-round picker
For the selected `wallet × mint`, show evidence-backed trade rounds instead of raw transfer noise.

Each round may be:
- **Matched closed round** — in-window inventory can support a buy→sell calculation; show matched realized result, hold time, and citations.
- **Open round** — observed inventory remains open; no realized result.
- **Unmatched sell** — excluded from realized accounting if acquisition basis is unknown. Never invent cost basis.

Do not label these “alpha,” “winning trades,” “smart money,” or skill. They are observed/matched rounds.

### Beat 7 — Chosen trade becomes context
Selecting one round creates or updates the Research Thread. Replay, Evidence, Compare, What-If, Sequences, Ghost, Intelligence, and Trickster inherit the exact context automatically.

### Beat 8 — Replay / Trickster stage
Replay uses indexed OHLC/candles for the bounded time window. Entry/exit markers sit on real indexed candles and link to receipts. If OHLC is unavailable, Trickster may film an event timeline but must not fabricate a price path.

---

## 6. Research Thread — the context backbone

Every deep research action must share one persistent context object rather than making users repeatedly enter addresses and timestamps.

Conceptual schema:

```text
research_thread_id
creator/account visibility
galaxy/research lens
launch origin
mint/token
wallet/trader
selected matched round
from timestamp
to timestamp
entry/exit signatures
indexed candles / coverage
Evidence receipt IDs
Replay state
Compare / What-If / Sequence references
Ghost references
thesis / narration references
watch state
Cut manifests
created_at / updated_at
```

A Research Thread may be **private**, **unlisted**, or **public**.

Every tool should inherit the active thread. A tool should never dump the user into an empty form when the needed context is already known.

---

## 7. Fomo Galaxy

Fomo is the **WHO is trading** galaxy.

### Source boundary
- Use a documented/authorized independent data feed such as `fomoapi.io`, cached into A Bulls App D1.
- Never depend on replaying or scraping a logged-in `prod-api.fomo.family` session.
- Provider-reported PnL, rank, profile, followers, top tokens, volume, and similar fields remain visibly **Fomo-reported / as reported**.
- They are not A Bulls App proof of skill, profit, identity, or recommendation.

### Fomo Galaxy behavior
- Up to 50 ranked trader STARS.
- Rank #1 may be the most visually dominant central star; #2–#10 can form an inner region; remaining ranks form outer regions/rings.
- A provider row becomes a wallet STAR only when there is a usable public wallet address.
- Avatar/profile metadata may be cached conservatively; do not hot-link brittle provider assets if avoidable.

### Enter a trader star
A bounded trader system should reveal:
- up to **10 top token PLANETS / positions**;
- source label per position (`Fomo-reported`, `A Bulls App observed`, or both);
- the **3 latest retained trade COMETS**;
- direct descent into a selected token PLANET and the trader's history on it;
- Replay/Evidence/Compare/Sequences/Ghost/Trickster context inheritance.

The purpose is to learn how a public wallet traded, not to copy it.

---

## 8. Retired galaxy provenance

PonsFamily (`pons`) and pump.fun (`pump-fun`) are retired public galaxies.
Keep applied migration history and retained launch-origin/evidence records
for historical verification and backwards compatibility. Do not restore
public galaxy membership, rankings, discovery jobs, or provider refresh loops.
Generic token/wallet research remains available independently of those retired
navigation surfaces.

---

## 9. Trader behavioral fingerprints

A Bulls App should eventually let the visual STAR encode deterministic observed behavior, not an AI “score.”

Candidate observed dimensions:
- median holding period;
- scale-in / scale-out frequency;
- full-exit frequency;
- average/median observed trade size;
- token concentration;
- ecosystem distribution;
- re-entry frequency;
- buy/sell cadence;
- activity around liquidity/volume regime changes.

The visual grammar may use size, pulse, halo, orbit, cadence, or other bounded properties, but every encoded metric must have a documented meaning and source.

Never collapse this into “good trader,” “smart money,” or financial advice.

---

## 10. Ghost — evidence-backed historical echoes

Ghost should become a signature historical-comparison tool.

When a Research Thread is active, Ghost may answer:

> When have we observed a sequence like this before?

Possible Ghosts:
- same wallet, similar prior entry/exit sequence;
- another indexed wallet with a similar deterministic event sequence;
- same token under a comparable indexed volume/liquidity/time regime.

Ghosts are **historical similarity**, not prediction. Every comparison must expose the matching criteria, time range, coverage, and receipts. Missing history yields no Ghost rather than a fabricated analogue.

---

## 11. Replay

Replay is the timeline primitive for the entire platform.

It must support:
- real indexed candles/OHLC when available;
- play/pause/seek/step/speed;
- entry/exit markers;
- wallet/trade event markers;
- bounded time windows inherited from Research Threads;
- direct jumps to Evidence/transaction receipts;
- shareable deterministic state.

A surfaced trade must be verifiable against the actual indexed time/price data when that data exists.

---

## 12. Grey and Trickster are different roles

### Grey = truth / observation layer
Grey describes:
- what object the user is touching;
- what A Bulls App has observed;
- what an external cited provider reported;
- what evidence coverage is missing;
- where receipts live.

Grey must separate fact from user/provider interpretation. Grey is not a generic chatbot and should increasingly act as the consciousness/interface of the indexed universe: answer, focus camera, open the relevant historical object, or filter the Index.

Grey voice direction is **natural human, calm, clear, premium**. Server-side ElevenLabs is preferred when configured. Browser speech is fallback. Do not restore demon/metallic/low-pitch alien processing.

### Trickster = interpretation / director layer
Trickster may explain why a selected researcher thinks a sequence matters, while keeping interpretation explicitly distinct from Grey's observed facts.

Example separation:

> Grey: “The wallet bought across three indexed transactions between 14:03 and 14:11.”
>
> Trickster: “Notice the second entry: exposure increased while the indexed price was below the first entry.”
>
> Grey/Evidence: “The interpretation is narration; the transactions and prices are cited.”

---

## 13. Trickster Cuts — verifiable cinematic media

Trickster should become a deterministic director for a Research Thread, not merely a form.

### Primary stage
- indexed candle chart for the selected `mint + quote + [fromTs,toTs]`;
- entry/exit markers;
- optional size markers from observed swap amounts;
- evidence/source footer;
- Grey factual narration;
- Trickster interpretation/narration;
- optional Field establishing shot.

### Export target
Prefer deterministic browser media generation using **Mediabunny + WebCodecs/Canvas** when device capability allows, with fallback where necessary. Target a shareable vertical Cut such as 1080×1920 MP4 without requiring a completely separate renderer.

Do not move the core Field to a new renderer solely for video creation.

### Every Cut has a manifest
Conceptual fields:

```text
cut_id
research_thread_id
creator / visibility
galaxy / lens
launch origin
wallet
mint
entry signature
exit signature
from_ts / to_ts
candle source + coverage
Evidence IDs
Replay state
Grey narration
Trickster narration
video hash
video/storage URL
verification URL
created_at
```

A Cut is not just an `.mp4`; it is an indexed research object.

Every public/shared Cut should offer **VERIFY / REPLAY THIS TRADE**, reopening the exact Research Thread/Replay state that produced it.

---

## 14. INDEX — the permanent research archive

The Index is a first-class core product, not an afterthought.

### What must be indexable
- trader/wallet STAR;
- token PLANET;
- transaction/trade;
- matched round;
- Research Thread;
- Replay window;
- Evidence bundle;
- Trickster Cut/video;
- thesis/claim;
- thesis resolution;
- Ghost comparison;
- Sequence/pattern;
- public comparison;
- watch-triggered event when retained.

### Relationship graph

```text
TOKEN
  ↕
WALLET
  ↓
TRADE
  ↓
MATCHED ROUND
  ↓
RESEARCH THREAD
  ↓
REPLAY
  ↓
EVIDENCE
  ↓
TRICKSTER CUT
  ↓
THESIS
  ↓
RESOLUTION
```

Objects should be linked by stable IDs and timestamps so the graph can be traversed both directions.

### Index browsing/filtering
Support deterministic filters for:
- trader/wallet/Fomo handle;
- token/mint/symbol/launch origin/galaxy;
- buy/sell/open/closed/matched status;
- hold duration / observed matched result / trade size;
- date/time window;
- evidence coverage/source;
- Replay/Cut/Thesis/Ghost/Sequence content type.

### Study Trader page
Each important/public trader should have a conventional research page for fast study alongside the Field:
- observed universe/top positions;
- latest 3 trades;
- matched rounds;
- most-traded planets;
- current observed/provider-reported holdings with source labels;
- Trickster Cuts;
- Sequences;
- Ghosts;
- Evidence;
- Watch Star;
- jump back into the 3D system.

### Study Token page
Likewise a token PLANET can expose:
- launch-origin evidence;
- holder/trader stars;
- recent trades;
- liquidity/history;
- matched rounds involving studied wallets;
- Cuts/Replays/Theses/Ghosts referencing the token;
- jump back into the Field.

The Universe and Index must work in both directions: **Universe → Index** and **Index → Universe**.

---

## 15. The research corpus is a data moat

A Bulls App indexes more than raw blockchain transactions. It should index the lifecycle of understanding them:

**chain event → normalized trade → matched round → Research Thread → Replay → Evidence → Cut → Thesis → later Resolution**

Over time the platform should become more useful because the structured research corpus grows even if no new UI feature ships.

The data moat is **structured, timestamped, source-separated, verifiable blockchain research**, not merely social posts.

---

## 16. My Sky — return loop / watch system

Users can save:
- token PLANETS;
- wallet/trader STARS;
- Research Threads;
- Cuts;
- selected theses/objects where useful.

Unsigned users may retain a local-device watch state. Signed-in A Bulls App accounts should sync durable watchlists across devices when the account system supports it.

Meaningful change notifications may include:
- watched STAR has new indexed activity;
- watched PLANET has significant new retained trades;
- a watched matched round now has an indexed exit;
- liquidity/holder/market evidence changed materially;
- a new evidence-backed thesis/Cut references a watched object.

Notifications must be observational, not recommendations. Tapping an alert should reopen the exact place/thread in the Universe or Index.

---

## 17. Social research layer

Social features must orbit evidence rather than become a generic feed.

Long-term allowed structures:
- member/creator/project/moderator profiles;
- follows/mutes/blocks;
- evidence-linked posts/replies;
- public/unlisted/private Research Threads;
- save/cite/fork research;
- counter-theses tied to the same evidence;
- creator channels;
- token/galaxy communities;
- non-transferable reputation for useful evidence-backed participation;
- moderation/reporting.

A public claim and its evidence are distinct objects. Later observations/resolutions never rewrite what the user originally claimed.

---

## 18. Data truth model

Every surfaced statement/data point should fit one of these classes:

### A Bulls App observed
Derived from indexed public-chain data or deterministic calculations over retained evidence.

### Provider reported
Supplied by a cited external provider (for example Fomo leaderboard PnL/rank). Keep the provider name and capture time.

### User claim / thesis
A user's interpretation or belief. Never restate it as observed fact.

### Trickster interpretation
Narrative interpretation generated from bounded evidence. Must remain visibly separate from observed fact.

### Unavailable / incomplete
Missing coverage is a legitimate state. Do not convert missing values to zero or invent history to make a scene look complete.

---

## 19. Indexing architecture and coverage

Indexing is a core product capability.

### Current architecture to preserve
- D1-normalized observations, caches, rankings, receipts, candles, research objects, and provider usage;
- cache-first public reads;
- bounded scheduled provider enrichment;
- provider credit breakers/hard stops;
- no passive provider fan-out merely because a user navigates a galaxy;
- Replay/Field rendering should consume retained data rather than cause uncontrolled indexing calls.

### Coverage must become visible
A Bulls App should eventually track and expose:
- last indexed slot / block where relevant;
- known missing ranges;
- backfill status;
- source/provider;
- confidence/finality;
- whether a Replay window is complete enough for a stated calculation.

Grey should be able to say that coverage is complete, incomplete, recovering, or unavailable.

### High-priority future ingestion upgrade
Evaluate a small upstream ingestion/indexing service using public/open-source technology such as:
- **Carbon** for modular Solana transaction/account/event pipelines;
- **Yellowstone gRPC** for high-performance Solana streams;
- a unified live + backfill + gap-detection + verification pipeline inspired by public realtime-indexer architectures.

Do **not** replace the current Worker/D1 product layer just to adopt these. The preferred direction is an upstream evidence ingestion service feeding normalized A Bulls App storage/contracts.

Desired invariant:

**live stream → normalize → detect gaps → backfill through same parser → independently verify coverage → publish evidence state**

---

## 20. Local/on-device intelligence and performance technology

### DuckDB-Wasm — preferred future local analytics engine
Use an optional/lazy-loaded local Evidence Pack so What-If, Sequences, hold-window calculations, scale-in detection, and other bounded analytics can run on-device without repeated provider/Worker spend.

Possible Evidence Pack contents:
- candles;
- trades;
- wallet events;
- volume/liquidity observations;
- positions;
- timestamps/receipts.

### Graphology — preferred relationship-analysis engine
Use a graph model for `wallet ↔ token` relationships, repeated co-participation, neighborhoods, overlap, and community structure. Keep the existing Field renderer; do not replace it with a generic node-graph UI.

### Transformers.js — optional on-device evidence retrieval
A small local embedding model may help locate relevant historical evidence (“find similar scale-in sequences”) while deterministic code and citations remain responsible for the answer. Do not let an on-device model invent blockchain facts.

### Automerge — later local-first/collaborative research option
Useful for offline research notes/thread collaboration after the core Index/Thread model is stable.

### Motion Canvas — optional cinematic helper
May be evaluated for deterministic sequences if it adds value, but Mediabunny/WebCodecs + the existing chart/Field are preferred before introducing another rendering stack.

### WebGPU
Do not migrate the known-good Field renderer to WebGPU before it is clearly safer and more valuable. WebGPU may be used selectively for local analytics/embeddings/compute behind capability detection.

---

## 21. Mobile / Seeker strategy

The known-good Seeker WebGL lifecycle is a product asset. Preserve it.

### Mobile-specific goals
- touch-first camera choreography;
- one-handed navigation where possible;
- orientation/background/resume resilience;
- no desktop-scale GPU budgets on Seeker;
- deterministic fallbacks for local compute/video encoding;
- installable Android build for hackathon/store use.

### Bind My Star — narrow MWA exception
The default web product remains usable with no wallet connection.

For the Solana Mobile/Seeker build only, a **narrow read-only Mobile Wallet Adapter authorization** is an approved future feature called **Bind My Star**:
- user explicitly authorizes an installed wallet to disclose/select its public address;
- A Bulls App flies to that public-wallet STAR / observed history;
- no transaction signing;
- no message signing unless a separately approved identity-proof feature is introduced later;
- no swaps, custody, approvals, copy trading, token creation, or execution;
- do not use the authorization to imply more identity/ownership than the wallet session actually establishes.

If public Seeker identity evidence such as a relevant device/wallet identity asset can be checked safely, a subtle **Seeker Star** visual treatment is allowed. It must not grant financial privilege or imply investment quality.

---

## 22. Read-only / safety boundary

The product is a research system.

Prohibited unless the owner explicitly changes the master plan after legal/security/store review:
- swaps/trading execution;
- transaction signing;
- copy trading;
- custody;
- token creation;
- liquidity execution;
- approvals;
- automated trade routing;
- financial recommendations framed as instructions;
- “smart money,” “alpha,” or trader-skill claims unsupported by explicit methodology/evidence;
- native A Bulls App token launched merely for growth/hackathon optics.

The narrow MWA **Bind My Star** address-authorization flow described above is not an execution feature.

Bull Invaders and LIFE are retired and must not return.

---

## 23. Content/distribution loop

Trickster Cuts should be an acquisition engine.

External flow:

**watch Cut on social → tap VERIFY → open exact Research Thread → Replay trade → inspect Evidence → Watch Star/Planet → return when evidence changes**

Public Cut pages should be fast, understandable without logging in, and deep-link into the exact evidence state.

The content itself should advertise A Bulls App's differentiator: **the story has receipts**.

---

## 24. Hackathon / demo north star

The demo should show one complete descent on a phone rather than a feature checklist.

Suggested two-minute flow:

1. **Galaxy Zero** — ZERO overview / FOMO research galaxy.
2. **Fomo Galaxy** — top trader STARS.
3. **Touch trader STAR** — enter their system, top position PLANETS appear.
4. **Touch PLANET** — descend into the token/trader relationship and holder/trade context.
5. **Choose matched round** — show entry/exit and accounting method.
6. **Replay** — real indexed candles move with trade markers.
7. **Ghost** — evidence-backed historical analogue if one genuinely exists.
8. **Evidence** — receipts/signatures/coverage.
9. **Trickster → Make Cut** — Grey facts + Trickster interpretation.
10. **VERIFY** — reopen exact Replay/Research Thread.
11. **Watch Star / My Sky** — demonstrate return loop.
12. Optional: **Bind My Star** via mobile read-only wallet address authorization.

The demo should communicate stickiness, mobile UX, innovation, and verifiability through the same journey.

---

## 25. Build priority / roadmap

AI agents should prefer completing the highest unfinished item that strengthens the canonical research descent. Do not create unrelated side features while a higher-priority layer is incomplete.

### P0 — make the core path undeniable
1. Keep Seeker Field stable and release-safe.
2. Make Fomo populate reliably from its approved scheduled source.
3. Finish continuous camera choreography: galaxy → planet → holder sky → star.
4. Finish STAR holdings/top-position system with strict source labels.
5. Build deterministic `wallet × mint` matched-round picker.
6. Create persistent Research Thread context and make every tool inherit it.
7. Make Replay excellent for one selected round: candles, markers, evidence jumps.
8. Turn Trickster into a chart-first cinematic director with Grey/Trickster role separation.
9. Generate verifiable Cut manifests and share/deep-link state.
10. Build the first-class Index / Trade Library and Study Trader/Study Token pages.
11. Make My Sky durable and useful for watched Stars/Planets/Threads.

### P1 — deepen the intelligence moat
12. Ghost historical echoes with deterministic similarity criteria.
13. Sequences and behavioral fingerprints.
14. Wallet/token relationship graph and overlap constellations.
15. Better coverage/gap/backfill visibility.
16. Evidence Packs + optional DuckDB-Wasm local analytics.
17. Indexed public research threads, forks, counter-theses, follows, creator research surfaces.
18. Better indexing/search across Cuts, Replays, matched rounds, Ghosts, theses, and resolutions.

### P2 — harden scale and mobile differentiation
19. Carbon/Yellowstone upstream ingestion service with gap detection/backfill/verification.
20. Deterministic Mediabunny/WebCodecs Cut export across capable devices.
21. Mobile Wallet Adapter **Bind My Star**.
22. Optional Seeker identity treatment.
23. On-device semantic evidence retrieval with Transformers.js.
24. Local-first/collaborative research enhancements where useful.
25. Public API/SDK only after internal contracts and evidence semantics are stable.

---

## 26. What NOT to build next

Do not get distracted by:
- another game;
- Bull Invaders;
- LIFE;
- generic trading-terminal chrome;
- swap/copy-trade buttons;
- wallet execution;
- token/staking mechanics;
- generic social feed detached from evidence;
- a second chart/replay system when the existing Replay can be extended;
- a second storytelling product beside Trickster;
- a decorative node graph replacing the Universe;
- WebGPU/renderer rewrites that endanger Seeker stability;
- AI-generated price paths, wallet identities, cost basis, holder counts, performance claims, or evidence.

---

## 27. Engineering principles

1. **Extend; do not casually rewrite.** Reuse the current Field, Grey, Replay, Evidence, Trickster/Create, D1, account/social primitives, and Intelligence Worker contracts.
2. **One evidence graph.** Field, Index, Grey, Trickster, social and watch surfaces should reference the same stable research objects.
3. **Source separation is mandatory.** Observed chain data, provider-reported data, user claims and Trickster interpretation must remain visibly distinct.
4. **Missing is not zero.** Unknown data stays unknown.
5. **No fabricated continuity.** Empty history/holder sky/Ghost is valid.
6. **Cache-first public navigation.** Scheduled/explicit indexing populates the system; rendering does not secretly fan out to expensive providers.
7. **Bound provider spend.** Keep monthly/periodic breakers and conservative enrichment limits.
8. **Physical mobile acceptance matters.** Passing CI is necessary but does not certify the Seeker renderer.
9. **Release from `main` only.** Never deploy stale ZIPs/recovered directories/archive branches.
10. **Every major feature needs an evidence contract and a user-visible failure/coverage state.**

---

## 28. Definition of done for a research feature

A feature is not complete because it renders.

It should, where applicable:
- identify its source and timestamp;
- have stable IDs/relationships;
- preserve provenance;
- define missing/incomplete behavior;
- link to Evidence;
- inherit or update the Research Thread;
- be searchable/indexable if it creates durable research value;
- be watchable/shareable when useful;
- avoid passive provider fan-out;
- pass repository release gates;
- survive physical Seeker testing when it touches the Field/mobile renderer.

---

## 29. Contributor process

See `AGENTS.md` for canonical contributor instructions, required reading,
implementation guardrails, and the release process. Tool-specific instruction
files redirect there rather than maintaining separate rules.
