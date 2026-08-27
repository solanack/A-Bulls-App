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
7. On arrival, inspect, replay, compare, enter What If, or continue to a related destination.

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

## Performance architecture
Never send/render the whole Solana graph. The Worker produces bounded sectors/chunks. Client keeps the current sector plus a small neighbor cache and unloads old geometry. Low-end mobile is a first-class target.

## Cost architecture
Normal flight physics and already-loaded sectors produce zero Worker requests. Data requests happen only for destination resolution, sector boundary loads, explicit inspection, or replay. Sector payloads are cacheable and deduplicated. No per-frame or per-particle API calls.

## Integrity
Observed history and simulation must never look identical. Every evidence-derived object can expose provenance/coverage. Missing data produces fog/unknown space rather than fabricated events.

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

### Phase H — creator mode
Record a journey, camera path, annotations and evidence references into a replay bundle/Trickster story manifest for export/share.

## First implementation
`universe-flight.js` is a client-only engine foundation. It intentionally makes no network calls. `setSector()` is the seam where Intelligence Universe projections will enter later.
