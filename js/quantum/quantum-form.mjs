const TAU = Math.PI * 2;

const fract = (value) => value - Math.floor(value);

const hash = (value) =>
  fract(Math.sin(value * 12.9898 + 78.233) * 43758.5453123);

export const QUANTUM_ROLE = Object.freeze({
  SURFACE: 1,
  INTERIOR: 2,
  EYE_RIM: 3,
  NOSE: 4,
  MOUTH: 5,
  SILHOUETTE: 6
});

export function createQuantumForm({
  parentCount,
  surfaceTemplate,
  childrenPerParent = 12,
  interiorFraction = 0.24
}) {
  if (!Number.isFinite(parentCount) || parentCount <= 0) {
    throw new TypeError('parentCount must be positive');
  }

  if (!surfaceTemplate?.positions?.length) {
    throw new TypeError('surfaceTemplate.positions is required');
  }

  const childCount = parentCount * childrenPerParent;
  const positions = new Float32Array(childCount * 3);
  const parentIndex = new Uint32Array(childCount);
  const roles = new Uint8Array(childCount);
  const phases = new Float32Array(childCount * 3);

  const template = surfaceTemplate.positions;
  const templateRoles = surfaceTemplate.roles || null;
  const templateCount = Math.floor(template.length / 3);

  for (let i = 0; i < childCount; i += 1) {
    const parent = Math.floor(i / childrenPerParent);
    parentIndex[i] = parent;

    const interior = hash(i * 4.319 + 9.17) < interiorFraction;
    const j = i * 3;

    if (interior) {
      /*
        Interior programmable matter.
        Lives within the head volume rather than on the shell.
      */
      const u = hash(i * 1.17 + 4.2);
      const v = hash(i * 2.41 + 8.6);
      const w = hash(i * 3.73 + 2.8);

      const y = -43 + v * 91;

      const upper =
        Math.exp(-Math.pow((y - 24) / 26, 2));

      const lower =
        Math.max(0, Math.min(1, (y + 45) / 50));

      const rx =
        (13 + 22 * lower + 11 * upper) *
        Math.sqrt(u);

      const rz =
        (11 + 25 * lower + 13 * upper) *
        Math.sqrt(u);

      const theta = w * TAU;

      positions[j] = Math.cos(theta) * rx * 0.72;
      positions[j + 1] = y;
      positions[j + 2] = Math.sin(theta) * rz * 0.72 - 3;

      roles[i] = QUANTUM_ROLE.INTERIOR;
    } else {
      /*
        Surface quantum matter.
        The template is the invisible 3D mold.
      */
      const templateIndex =
        Math.floor(hash(i * 6.97 + 1.4) * templateCount);

      const tj = templateIndex * 3;

      positions[j] = template[tj];
      positions[j + 1] = template[tj + 1];
      positions[j + 2] = template[tj + 2];

      roles[i] =
        templateRoles?.[templateIndex] ||
        QUANTUM_ROLE.SURFACE;
    }

    phases[j] = hash(i * 7.11) * TAU;
    phases[j + 1] = hash(i * 9.31) * TAU;
    phases[j + 2] = hash(i * 13.17) * TAU;
  }

  return {
    childCount,
    childrenPerParent,
    positions,
    parentIndex,
    roles,
    phases
  };
}

export function animateQuantumPosition({
  form,
  index,
  now,
  out = [0, 0, 0]
}) {
  const j = index * 3;

  let x = form.positions[j];
  let y = form.positions[j + 1];
  let z = form.positions[j + 2];

  const role = form.roles[index];

  if (role === QUANTUM_ROLE.INTERIOR) {
    /*
      Interior matter flows continuously through the skull.
    */
    const a =
      now * 0.00038 +
      form.phases[j];

    const b =
      now * 0.00057 +
      form.phases[j + 1];

    const c =
      now * 0.00029 +
      form.phases[j + 2];

    x +=
      Math.sin(a) * 4.8 +
      Math.cos(b * 0.63) * 2.2;

    y +=
      Math.cos(b) * 3.6 +
      Math.sin(c * 1.27) * 1.8;

    z +=
      Math.sin(a * 0.81) * 5.0 +
      Math.cos(c) * 2.3;
  } else {
    /*
      Surface remains anatomically readable,
      but no point is completely static.
    */
    const phase =
      now * 0.0011 +
      form.phases[j];

    x += Math.sin(phase) * 0.16;
    y += Math.cos(phase * 0.83) * 0.13;
    z += Math.sin(phase * 0.59) * 0.18;

    if (role === QUANTUM_ROLE.MOUTH) {
      const speech =
        Math.sin(now * 0.007 + index * 0.27);

      y += speech * 0.72;
      z += Math.abs(speech) * 0.22;
    }
  }

  out[0] = x;
  out[1] = y;
  out[2] = z;

  return out;
}
