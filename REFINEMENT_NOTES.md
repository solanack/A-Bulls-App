# A Bulls App — Template-Alien Correction

This pass fixes the QUERY organism itself. The earlier build imported the supplied alien template only to check orientation, while a procedural head profile still generated the visible face. That procedural fallback has been removed.

## Corrected organism

- `alien-head-template.mjs` is now the geometry authority for the visible skin, the depth core, and the feature layout.
- The 18,000 template samples and their semantic roles drive the cranium, silhouette, eyes, nose, and mouth.
- Eye, nostril, and mouth positions are derived from template-role bounds instead of hand-placed constants.
- Nested template shells create opaque near-black depth without replacing the supplied silhouette.
- Eye surfaces are recessed and restrained; the mouth is a narrow living slit instead of a rectangular block.
- The exposed eye inserts are now concealed by a curved, fitted Solana-gradient Pit Viper visor with a black brow frame, nose bridge, and Solana-color temple marks.
- The near-black depth core now uses circular shader points, eliminating the remaining square/block artifacts visible on the forehead.
- The camera frames the template bounds per viewport, including portrait/mobile screens.
- Field and star particles use round point sprites, removing the visible square artifacts.
- Cellular motion, breathing, and speech deformation remain subtle so the anatomy stays stable.

## Voice and mobile behavior

- The Web Audio context is unlocked during the user gesture and reused across queries.
- Speech is slower and lower-pitched, with a restrained subharmonic carrier.
- Random mouth pulses were removed; speech deformation now follows deterministic organism state.
- The existing device budgets and reduced-motion/save-data paths remain in place.

## Architecture kept intact

- The normal Particle Field remains the entry surface.
- QUERY still accepts public wallet, transaction, mint, NFT, and program identifiers.
- The existing read-only intelligence Worker remains unchanged:
  `https://black-bull-run-sol.ckdsigns1.workers.dev`
- No wallet connection, commerce, or Bull Invaders surface was added.
