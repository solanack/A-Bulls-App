# A Bulls App — Universe Flight

## Product rule
The particle field is the game world. Blockchain evidence is never destroyed by gameplay; weapons are interaction/investigation tools.

## Core loop
1. Enter the field in a customizable ship.
2. Prompt: **DESTINATION?**
3. Accept a public Solana wallet, token mint, NFT mint, transaction signature, or known universe entity.
4. Resolve the destination through the Intelligence Mesh.
5. Build a bounded evidence sector around the route.
6. Fly, dodge, scan, shoot/reveal, divert to discoveries, and reach the destination.
7. On arrival, inspect, replay, compare, enter What If, create a movie, or continue to a related destination.

## Data-to-world mapping
- wallet = destination/station
- token = system/beacon
- NFT = artifact
- transaction = event/object
- transfer = route/trail
- relationship = navigable lane
- large buy = green energy surge
- large sell = red shockwave
- volatility = environmental instability
- volume = traffic/particle density
- liquidity = system scale/stability
- anomaly = unknown contact
- bridge = portal
- historical replay = time travel
- simulated What If = visually distinct alternate timeline

## Game verbs
- fly / boost / brake
- dodge
- fire probe
- scan
- reveal
- lock target
- follow transaction
- tractor/pin evidence
- waypoint
- replay / pause / rewind / fast-forward
- record journey
- direct camera
- summon Trickster playback

## Cinematic Trade Journeys
A user's real historical trade can become a navigable, cinematic destination and a movie source.

Example flow:
1. User enters a public wallet and selects a historically observed winning trade.
2. Universe Flight reconstructs the bounded evidence route from entry through relevant market events to exit.
3. The player physically travels through that trade in the ship, with the world reacting to the observed timeline.
4. At evidence moments, the user can inspect transactions, price movement, related wallet activity and other indexed context.
5. Trickster can appear as an in-world host/screen and play attached or generated video segments about the trade.
6. The creator can combine live flight, historical replay, charts, evidence cards, Trickster segments, narration/captions and cinematic camera moves.
7. The result becomes a replayable/shareable Trade Movie while retaining references back to the underlying evidence.

The same system supports losses, discoveries, NFT journeys, wallet histories, token launches, major market events, investigations and educational walkthroughs. A massive win is one story type, not a special hard-coded mode.

## Trickster Director
Trickster is the bridge between Intelligence Universe evidence and creator media. Trickster can:
- introduce the destination and story premise;
- play a video clip at an evidence checkpoint;
- present a chart/replay of the winning or losing trade;
- narrate observed timeline events using evidence-backed facts;
- transition between gameplay, replay, charts and inspection views;
- call out uncertainty or missing coverage instead of inventing facts;
- create chapter markers around entry, acceleration, volatility, exit and aftermath;
- assemble the recorded journey into a creator manifest for later rendering/export.

Generated narration must distinguish facts derived from indexed evidence from interpretation or simulation.

## Trade Movie manifest
Creator mode should save a lightweight deterministic manifest rather than duplicating blockchain data. Suggested structure:
- story id / owner-local draft id
- wallet/token references
- evidence ids and transaction signatures
- observed timeline window
- flight path and camera keyframes
- replay speed/time-control events
- selected charts and overlays
- Trickster cue points and media references
- captions/narration script
- simulation segments, explicitly labeled
- provenance/coverage metadata

This lets a movie be replayed or re-rendered from shared evidence/cache without storing a giant custom universe per user.

## Performance architecture
Never send/render the whole Solana graph. The Worker produces bounded sectors/chunks. Client keeps the current sector plus a small neighbor cache and unloads old geometry. Low-end mobile is a first-class target.

## Cost architecture
Normal flight physics and already-loaded sectors produce zero Worker requests. Data requests happen only for destination resolution, sector boundary loads, explicit inspection, replay, or creator evidence hydration. Sector payloads are cacheable and deduplicated. No per-frame or per-particle API calls. Trade Movies reference cached evidence wherever possible rather than re-indexing the same trade for every viewer.

## Integrity
Observed history and simulation must never look identical. Every evidence-derived object can expose provenance/coverage. Missing data produces fog/unknown space rather than fabricated events. Cinematic effects may dramatize presentation but cannot alter the underlying observed trade chronology or values.

## Build phases
### Phase A — playable shell
Ship physics, mobile controls, projectiles/probes, collision obstacles, destination beacon, radar, deterministic offline sector, market-state hooks.

### Phase B — particle-field integration
Replace synthetic particles with existing intelligence projection data. Tapping/revealing objects opens an inspect card with a close/back path to flight.

### Phase C — destination resolver
Wallet/token/NFT/signature input, indexed destination lookup, unknown destination indexing job, route generation, loading/fog states.

### Phase D — evidence gameplay
Transactions become encounters; relationship trails become routes; scanners/probes reveal metadata and provenance.

### Phase E — market-reactive world
Feed normalized volatility/volume/buy-sell pressure/liquidity/anomaly state into environmental parameters without changing evidence truth.

### Phase F — time flight
Market Replay controls drive the world clock. Reconstruct bounded historical sectors and allow pause/rewind/fast-forward.

### Phase G — What If
Fork an observed checkpoint into an explicitly simulated timeline. Never write simulation into observed evidence.

### Phase H — cinematic creator mode
Record flight path, camera path, annotations, replay controls, charts and evidence references. Add Trickster cue points and in-world video playback. Save as a lightweight Trade Movie manifest for replay/render/export/share.

### Phase I — story templates
Offer evidence-driven templates such as Massive Win, Painful Loss, Token Discovery, Wallet Origin Story, NFT Journey, Investigation and Market Event. Templates choose presentation/camera/cue structure; they never change evidence.

## First implementation
`universe-flight.js` is a client-only engine foundation. It intentionally makes no network calls. `setSector()` is the seam where Intelligence Universe projections will enter later.
