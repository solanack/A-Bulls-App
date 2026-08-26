# Product Shell vNext — Dusk Atelier 2.0

Status: canonical replacement-shell implementation contract on `feature/universe-trickster-v1`. Not deployed.

## Non-negotiable product rule

The application must make every primary product easy to discover and understand. It must feel composed by a coordinated expert team: precise hierarchy, consistent language, predictable interaction, excellent empty/loading/error states, responsive performance, accessibility, and restrained luxury. Visual spectacle never obscures meaning or delays a primary task.

## Product hierarchy

Primary products, always visible from the global shell:

1. **Universe** — cinematic full-chain Solana discovery.
2. **Intelligence** — evidence-backed wallet, transaction, token, NFT, market, replay, and comparison investigation.
3. **Trickster** — turn verified data and playable events into shareable stories and video.
4. **Games** — Bull Invaders only.

Secondary/utility surfaces:

- Media Workspace
- Profile
- Help, provenance, settings, and service status

**Removed completely from the product direction:**

- LIFE
- Ansem integration and $ANSEM-specific analytics
- Bullpen NFT/community integration
- Ansem.io integration
- Community Integrations product
- Solana Bang Bang / Claude of Duty maze game

Generic Solana NFT intelligence and NFT Memory remain because they apply to the entire blockchain rather than a specific community.

## Desktop experience

Desktop is a first-class full-screen workstation, not a stretched phone layout.

- Use the full browser width and available vertical workspace.
- Keep a persistent desktop product rail and full-width command/search region.
- Do not center the entire application inside a phone-sized or narrow max-width shell.
- Intelligence, replay charts, evidence, comparison, and creator surfaces should expand to use large monitors meaningfully.
- Wide screens should gain information density and simultaneous context rather than simply enlarging mobile cards.
- Tablet can condense columns while retaining desktop navigation until the true phone breakpoint.

The canonical phone breakpoint is **760 CSS px and below** unless testing proves a device-specific adjustment is required.

## Phone experience

Phone remains purpose-built and touch-first:

- bottom navigation for Universe, Intelligence, Trickster, and Games;
- minimum 44px touch targets;
- single-column reflow where needed;
- no hover-only actions;
- safe-area-aware bottom controls;
- back behavior preserves investigation/replay context;
- charts and replay controls remain fully usable by touch.

## First viewport

The home screen is a working surface, not a marketing hero. It contains:

- one universal public-address/signature/mint search;
- clear read-only reassurance;
- current network observation/coverage state;
- immediate entry into Universe and Intelligence;
- visible launch points for Trickster and Bull Invaders;
- recent local work only when it exists.

No carousel, hidden product drawer, autoplaying promotional copy, or mandatory 3D intro may stand between the user and a core product. Universe may be cinematic, but it cannot block Intelligence or Games.

## Intelligence replacement rule

vNext Intelligence does **not** portal into the legacy Ansem/Bullpen analytics center. It is a clean full-Solana workspace driven by Intelligence Mesh evidence.

The first canonical workflow is:

`public wallet → token → optional comparison wallet → time window → indexed Replay Bundle → playable chart → compare/what-if → Create Story`

Every replay must expose coverage, provenance/verification state, and missing-data caveats. Missing execution prices or candles are never fabricated.

## Visual direction: Dusk Atelier 2.0

A restrained observatory/editorial-luxury system:

- near-black ink rather than pure black;
- warm graphite and aubergine layered surfaces;
- bone-white primary text;
- champagne/platinum interactive emphasis;
- Solana cyan/violet/green used for live data, selection, and evidence states;
- fine hairline borders;
- restrained radius variation;
- deep but quiet shadows;
- dense information with generous internal spacing;
- Sora for display/product labels and Manrope for interface/data;
- tabular numerals for metrics;
- purposeful motion with reduced-motion parity.

Luxury means precision and restraint, not ornamental clutter.

## System states

Every data product provides initial, empty, indexing/progress, partial-history, live/confirmed/finalized/verified, degraded-source, recoverable-error, unavailable-evidence, and last-updated/provenance states. Loading never replaces the whole screen when useful cached or partial results exist.

## Accessibility and performance

- WCAG AA text contrast minimum.
- Keyboard-visible focus and logical focus order.
- Semantic headings, landmarks, buttons, tabs, dialogs, and status announcements.
- Reduced motion removes hyperspace/continuous drift without removing access.
- WebGL context loss returns to list/dashboard mode.
- Core navigation and Intelligence remain functional without 3D.
- Mobile first meaningful interaction target: under 2.5 seconds on representative mid-range Android.
- Product shell JavaScript remains independent from Bull Invaders and visualization render loops.

## Compatibility

Bull Invaders remains the preserved game compatibility surface. Ranked scoring, hitboxes, replay validation, physics invariants, and campaign behavior must not change accidentally while the surrounding app is replaced.

The legacy application DOM may remain temporarily as an internal Bull Invaders compatibility host while its game surface is extracted cleanly. It is hidden when vNext mounts and is not an allowed route or navigation surface. Retired Ansem/Bullpen/Ansem.io products must never be surfaced from that compatibility host.
