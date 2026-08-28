# QUERY — Living Quantum Organism v1

## Locked implementation contract

QUERY transforms the existing Particle Field into a fully volumetric Grey-alien organism made entirely from living blockchain particle matter. The downloaded alien GLB is never rendered directly; it is an invisible anatomical mold.

### Non-negotiable rules

1. **One canonical orientation only.** The complete QUERY organism is rotated as one assembly. Do not independently flip Z in the mesh generator, parent targets, quantum children, cavity logic, shaders, or animation code.
2. **The whole head is living matter.** Use dermal, subdermal, and core layers of the same quantum child population.
3. **No child stacking.** Multiple children must never occupy the same destination point. Every surface sample is a local cell with deterministic tangent/normal offsets.
4. **Mesh-driven anatomy.** The real alien mesh is the anatomical authority. Sampling must preserve the cranium, forehead, temples, eyelids, brow, nose bridge, cheek planes, lips, jaw, chin, side skull, and rear skull.
5. **True negative-space cavities.** Eye interiors, nostrils, and the mouth slit must remain dark and free of visible forward quantum matter.
6. **Living volume.** Extra children move continuously beneath the skin and inside the skull while remaining constrained to the head volume and outside facial voids.
7. **Identity colors + lighting modulation.** Each child inherits its parent blockchain color, then receives controlled lighting/shadow modulation for form. No random recoloring.
8. **Parent particles visibly subdivide.** QUERY formation must look like existing field particles splitting into microscopic children and organizing into the organism. At full formation, large parents are visually absent.
9. **RETURN TO FIELD fully reverses the process.** Children recombine into parents and the exact original Particle Field appearance/state returns.
10. **Normal Particle Field remains untouched.** Every new behavior is QUERY-gated.

## Target material layers

- Dermal layer: 60% — surface + thin skin depth.
- Subdermal layer: 25% — several units beneath surface, slow tangential flow.
- Core layer: 15% — deeper volumetric motion.

## Visual hierarchy

- Large dark almond eye cavities are the dominant facial feature.
- Brow and eyelid rims are defined by sparse, fine particles rather than dense emissive bands.
- Nose bridge receives a controlled highlight; nostrils remain black.
- Mouth is a thin dark slit with sparse lip contour particles.
- Forehead, cheeks, temples, jaw, chin, side skull, and rear skull receive enough distributed occupancy to read as continuous living skin.
- Interior particles are darker/translucent and never project strongly through eye or mouth cavities.

## Lighting model

Each quantum child stores its parent color as identity color. Rendering applies physically-inspired modulation using an approximate surface normal and a virtual lighting rig:

- key light: upper/front-left,
- cool low-energy fill,
- faint rim,
- ambient floor.

Surface lighting changes brightness/tint without replacing the inherited identity hue. Interior matter is intentionally darker.

## Performance target

Adaptive visible quantum population:

- low tier: ~64k,
- normal phone: ~96k,
- high tier: ~128k.

Prefer one BufferGeometry and GPU attributes. CPU animation should be limited to existing parent transitions; child micro-motion and lighting should move toward shader-driven execution.

## Acceptance test

Do not call the feature complete until a straight-on phone preview simultaneously shows:

- correct front-facing orientation,
- unmistakable Grey-alien anatomy,
- large black almond eyes,
- readable narrow nose bridge,
- black nostrils,
- small black mouth slit,
- continuous cranium/cheek/jaw/chin surface,
- substantial 3D rear skull depth when rotated,
- no white eye bars,
- no white mouth blob,
- no large parent-particle clusters,
- microscopic multicolor living skin,
- subtle interior motion from oblique views,
- shadow/highlight contour while preserving parent identity colors,
- exact restoration of the original Particle Field on RETURN TO FIELD.
