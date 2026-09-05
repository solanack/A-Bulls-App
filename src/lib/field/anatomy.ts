import { ALIEN_HEAD_TEMPLATE } from "./alien-head-template.mjs";
import { CATEGORY_COLORS, type ParticleCategory } from "./types";
import { clamp, hash01 } from "./hash";

const ROLE = { SURFACE: 1, EYE_RIM: 3, NOSE: 4, MOUTH: 5, SILHOUETTE: 6 } as const;
const TEMPLATE_SCALE = 0.82;

type Bounds = {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
};

type FeatureBounds = Bounds & { mean: [number, number, number]; count: number };

export type SkinBuffers = {
  count: number;
  parentIndex: Uint32Array;
  parentPos: Float32Array;
  targetPos: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  amps: Float32Array;
  layers: Float32Array;
  speech: Float32Array;
  attention: Float32Array;
  normals: Float32Array;
  delays: Float32Array;
  arcs: Float32Array;
  fromColors: Float32Array;
  orientation: {
    facing: "+Z";
    yawCorrection: 0;
    verified: true;
    noseZ: number;
    rearZ: number;
  };
};

export type CoreBuffers = {
  count: number;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
};

export type DermalBuffers = {
  count: number;
  positions: Float32Array;
  normals: Float32Array;
  phases: Float32Array;
  features: Float32Array;
};

function rawBounds(): Bounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = ALIEN_HEAD_TEMPLATE.positions[i * 3 + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
    }
  }
  const center: [number, number, number] = [
    (min[0] + max[0]) * 0.5,
    (min[1] + max[1]) * 0.5,
    (min[2] + max[2]) * 0.5,
  ];
  return {
    min,
    max,
    center,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

const RAW_BOUNDS = rawBounds();

function templatePoint(index: number): [number, number, number] {
  const j = index * 3;
  return [
    (ALIEN_HEAD_TEMPLATE.positions[j] - RAW_BOUNDS.center[0]) * TEMPLATE_SCALE,
    (ALIEN_HEAD_TEMPLATE.positions[j + 1] - RAW_BOUNDS.center[1]) * TEMPLATE_SCALE,
    (ALIEN_HEAD_TEMPLATE.positions[j + 2] - RAW_BOUNDS.center[2]) * TEMPLATE_SCALE,
  ];
}

function featureBounds(role: number, side = 0): FeatureBounds {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const sum: [number, number, number] = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
    if (ALIEN_HEAD_TEMPLATE.roles[i] !== role) continue;
    const p = templatePoint(i);
    if (side && Math.sign(p[0]) !== side) continue;
    count++;
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
      sum[axis] += p[axis];
    }
  }
  if (!count) throw new Error(`Alien template role ${role} has no samples`);
  const center: [number, number, number] = [
    (min[0] + max[0]) * 0.5,
    (min[1] + max[1]) * 0.5,
    (min[2] + max[2]) * 0.5,
  ];
  return {
    min,
    max,
    center,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    mean: [sum[0] / count, sum[1] / count, sum[2] / count],
    count,
  };
}

export const ALIEN_BOUNDS = Object.freeze({
  min: RAW_BOUNDS.min.map((value, axis) => (value - RAW_BOUNDS.center[axis]) * TEMPLATE_SCALE) as [
    number,
    number,
    number,
  ],
  max: RAW_BOUNDS.max.map((value, axis) => (value - RAW_BOUNDS.center[axis]) * TEMPLATE_SCALE) as [
    number,
    number,
    number,
  ],
  center: [0, 0, 0] as [number, number, number],
  size: RAW_BOUNDS.size.map((value) => value * TEMPLATE_SCALE) as [number, number, number],
});

const LEFT_EYE = featureBounds(ROLE.EYE_RIM, -1);
const RIGHT_EYE = featureBounds(ROLE.EYE_RIM, 1);
const MOUTH_FEATURE = featureBounds(ROLE.MOUTH);
const NOSE_FEATURE = featureBounds(ROLE.NOSE);

function eyeFromFeature(feature: FeatureBounds, rotation: number) {
  return {
    x: feature.mean[0],
    y: feature.mean[1],
    z: feature.mean[2] + feature.size[2] * 0.04,
    rx: feature.size[0] * 0.405,
    ry: feature.size[1] * 0.365,
    rz: Math.max(1.65, feature.size[2] * 0.19),
    rot: rotation,
  };
}

export const EYE = {
  left: eyeFromFeature(LEFT_EYE, -0.16),
  right: eyeFromFeature(RIGHT_EYE, 0.16),
};

export const MOUTH = {
  x: MOUTH_FEATURE.mean[0],
  y: MOUTH_FEATURE.mean[1] + 0.2,
  z: MOUTH_FEATURE.max[2] - MOUTH_FEATURE.size[2] * 0.34,
  w: MOUTH_FEATURE.size[0] * 0.44,
  h: Math.max(0.48, MOUTH_FEATURE.size[1] * 0.07),
  d: Math.max(0.72, MOUTH_FEATURE.size[2] * 0.12),
};

export const NOSTRIL = {
  y: NOSE_FEATURE.mean[1] - NOSE_FEATURE.size[1] * 0.1,
  z: NOSE_FEATURE.max[2] - NOSE_FEATURE.size[2] * 0.2,
  spread: Math.max(1.25, NOSE_FEATURE.size[0] * 0.25),
  r: Math.max(0.34, NOSE_FEATURE.size[0] * 0.06),
};

function templateNormal(x: number, y: number, z: number): [number, number, number] {
  const sx = Math.max(1, ALIEN_BOUNDS.size[0] * 0.5);
  const sy = Math.max(1, ALIEN_BOUNDS.size[1] * 0.5);
  const sz = Math.max(1, ALIEN_BOUNDS.size[2] * 0.5);
  const nx = x / (sx * sx);
  const ny = y / (sy * sy);
  const nz = z / (sz * sz);
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function tangentBasis(nx: number, ny: number, nz: number) {
  const ax = Math.abs(ny) > 0.86 ? 1 : 0;
  const ay = Math.abs(ny) > 0.86 ? 0 : 1;
  let tx = ay * nz;
  let ty = -ax * nz;
  let tz = ax * ny - ay * nx;
  const tl = Math.hypot(tx, ty, tz) || 1;
  tx /= tl;
  ty /= tl;
  tz /= tl;
  return {
    t: [tx, ty, tz] as [number, number, number],
    b: [ny * tz - nz * ty, nz * tx - nx * tz, nx * ty - ny * tx] as [number, number, number],
  };
}

function eyeDistance(x: number, y: number, eye: typeof EYE.left) {
  const dx = (x - eye.x) / Math.max(1, eye.rx);
  const dy = (y - eye.y) / Math.max(1, eye.ry);
  return Math.hypot(dx, dy);
}

function isMouthSlit(x: number, y: number, z: number) {
  const dx = (x - MOUTH.x) / Math.max(0.1, MOUTH.w * 0.58);
  const dy = (y - MOUTH.y) / Math.max(0.1, MOUTH.h * 1.2);
  const dz = (z - MOUTH.z) / Math.max(0.1, MOUTH.d * 2.2);
  return dx * dx + dy * dy + dz * dz < 1;
}

export function confirmAlienOrientation() {
  let noseZ = 0;
  let noseCount = 0;
  let rearZ = Infinity;
  for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
    const [, , z] = templatePoint(i);
    if (ALIEN_HEAD_TEMPLATE.roles[i] === ROLE.NOSE) {
      noseZ += z;
      noseCount++;
    }
    rearZ = Math.min(rearZ, z);
  }
  const nose = noseCount ? noseZ / noseCount : 0;
  if (!(nose > 20 && rearZ < -20)) throw new Error("Alien template orientation is not +Z facing");
  return {
    facing: "+Z" as const,
    yawCorrection: 0 as const,
    verified: true as const,
    noseZ: nose,
    rearZ,
  };
}

export function buildCoreBuffers(shells = 3): CoreBuffers {
  const shellCount = Math.max(2, shells);
  const count = ALIEN_HEAD_TEMPLATE.count * shellCount;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  let cursor = 0;
  for (let shell = 0; shell < shellCount; shell++) {
    const shrink = 0.94 - shell * 0.075;
    for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
      const [x, y, z] = templatePoint(i);
      const j = cursor * 3;
      positions[j] = x * shrink;
      positions[j + 1] = y * shrink;
      positions[j + 2] = z * shrink;
      const depth = 0.012 + shell * 0.006;
      colors[j] = depth * 0.44;
      colors[j + 1] = depth * 0.68;
      colors[j + 2] = depth;
      sizes[cursor] = 1.7 + shell * 0.32;
      cursor++;
    }
  }
  return { count, positions, colors, sizes };
}

/**
 * A restrained, low-overdraw anatomical veil sampled directly from the supplied
 * alien template. It gives the character a continuous silhouette and readable
 * facial planes without replacing the particle identity with a solid mesh.
 */
export function buildDermalBuffers(limit = 18000): DermalBuffers {
  const pool: number[] = [];
  for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
    const role = ALIEN_HEAD_TEMPLATE.roles[i];
    const [x, y, z] = templatePoint(i);
    if (role === ROLE.EYE_RIM) continue;
    if (role === ROLE.MOUTH && isMouthSlit(x, y, z)) continue;
    pool.push(i);
  }
  const count = Math.min(Math.max(6000, limit), pool.length);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const features = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const sample = pool[Math.floor((i / count) * pool.length)];
    const [x, y, z] = templatePoint(sample);
    const [nx, ny, nz] = templateNormal(x, y, z);
    const j = i * 3;
    positions[j] = x - nx * 0.08;
    positions[j + 1] = y - ny * 0.08;
    positions[j + 2] = z - nz * 0.08;
    normals[j] = nx;
    normals[j + 1] = ny;
    normals[j + 2] = nz;
    phases[i] = hash01(i * 5.317 + 0.91) * Math.PI * 2;
    const role = ALIEN_HEAD_TEMPLATE.roles[sample];
    features[i] =
      role === ROLE.NOSE || role === ROLE.MOUTH ? 1 : role === ROLE.SILHOUETTE ? 0.4 : 0;
  }
  return { count, positions, normals, phases, features };
}

export function buildLivingSkin(options: {
  parentPositions: Float32Array;
  parentColors: Float32Array;
  parentCount: number;
  childBudget: number;
}): SkinBuffers {
  const parentCount = Math.max(1, options.parentCount);
  const count = Math.max(12000, options.childBudget);
  const pool: number[] = [];
  for (let i = 0; i < ALIEN_HEAD_TEMPLATE.count; i++) {
    const role = ALIEN_HEAD_TEMPLATE.roles[i];
    const [x, y, z] = templatePoint(i);
    if (role === ROLE.EYE_RIM) continue;
    if (role === ROLE.MOUTH && isMouthSlit(x, y, z)) continue;
    pool.push(i);
  }
  if (!pool.length) throw new Error("Alien template has no usable surface samples");

  const parentIndex = new Uint32Array(count);
  const parentPos = new Float32Array(count * 3);
  const targetPos = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const amps = new Float32Array(count);
  const layers = new Float32Array(count);
  const speech = new Float32Array(count);
  const attention = new Float32Array(count);
  const normals = new Float32Array(count * 3);
  const delays = new Float32Array(count);
  const arcs = new Float32Array(count * 3);
  const fromColors = new Float32Array(count * 3);
  const orientation = confirmAlienOrientation();

  for (let i = 0; i < count; i++) {
    const parent = Math.min(parentCount - 1, Math.floor(hash01(i * 1.371 + 4.2) * parentCount));
    parentIndex[i] = parent;
    const pj = parent * 3;
    parentPos[i * 3] = options.parentPositions[pj] ?? 0;
    parentPos[i * 3 + 1] = options.parentPositions[pj + 1] ?? 0;
    parentPos[i * 3 + 2] = options.parentPositions[pj + 2] ?? 0;

    const sampleIndex = pool[Math.floor(hash01(i * 7.917 + 11.31) * pool.length)];
    const [sx, sy, sz] = templatePoint(sampleIndex);
    const [nx, ny, nz] = templateNormal(sx, sy, sz);
    const basis = tangentBasis(nx, ny, nz);
    const h = hash01(i * 17.133 + 3.17);
    const layer = h < 0.91 ? 1 : h < 0.982 ? 2 : 3;
    const angle = hash01(i * 1.913 + 2.7) * Math.PI * 2;
    const tangentRadius =
      layer === 1
        ? 0.025 + hash01(i * 3.731) * 0.22
        : layer === 2
          ? 0.12 + hash01(i * 3.731) * 0.38
          : 0.35 + hash01(i * 3.731) * 0.9;
    const depth =
      layer === 1
        ? 0.01 + hash01(i * 5.117) * 0.13
        : layer === 2
          ? 0.22 + hash01(i * 5.117) * 0.72
          : 1.1 + hash01(i * 5.117) * 3.1;
    const ta = Math.cos(angle) * tangentRadius;
    const tb = Math.sin(angle) * tangentRadius;
    const offset = layer === 1 ? 0.08 : -depth;
    const x = sx + basis.t[0] * ta + basis.b[0] * tb + nx * offset;
    const y = sy + basis.t[1] * ta + basis.b[1] * tb + ny * offset;
    const z = sz + basis.t[2] * ta + basis.b[2] * tb + nz * offset;

    const j = i * 3;
    targetPos[j] = x;
    targetPos[j + 1] = y;
    targetPos[j + 2] = z;
    normals[j] = nx;
    normals[j + 1] = ny;
    normals[j + 2] = nz;
    layers[i] = layer;

    const parentColor: [number, number, number] = [
      options.parentColors[pj] ?? 0.4,
      options.parentColors[pj + 1] ?? 0.2,
      options.parentColors[pj + 2] ?? 0.9,
    ];
    const side = clamp(x / Math.max(1, ALIEN_BOUNDS.size[0] * 0.44), -1, 1) * 0.5 + 0.5;
    const elevation = clamp((y - ALIEN_BOUNDS.min[1]) / ALIEN_BOUNDS.size[1]);
    const purple: [number, number, number] = [0.76, 0.13, 1];
    const magenta: [number, number, number] = [0.98, 0.2, 0.68];
    const cyan: [number, number, number] = [0.08, 0.9, 0.94];
    const mint: [number, number, number] = [0.12, 1, 0.55];
    const leftMix = 1 - elevation * 0.62;
    const rightMix = 1 - elevation * 0.46;
    const left: [number, number, number] = [
      purple[0] + (magenta[0] - purple[0]) * leftMix,
      purple[1] + (magenta[1] - purple[1]) * leftMix,
      purple[2] + (magenta[2] - purple[2]) * leftMix,
    ];
    const right: [number, number, number] = [
      cyan[0] + (mint[0] - cyan[0]) * rightMix,
      cyan[1] + (mint[1] - cyan[1]) * rightMix,
      cyan[2] + (mint[2] - cyan[2]) * rightMix,
    ];
    const twinkle = 0.78 + hash01(i * 4.17) * 0.38;
    const shade = layer === 3 ? 0.28 : layer === 2 ? 0.6 : 1;
    const nearEye = clamp(
      1 - Math.min(eyeDistance(x, y, EYE.left), eyeDistance(x, y, EYE.right)) / 1.45,
    );
    const socketShade = 1 - nearEye * 0.62;
    const identity = 0.035;
    let cr = (left[0] * (1 - side) + right[0] * side) * twinkle * shade * socketShade;
    let cg = (left[1] * (1 - side) + right[1] * side) * twinkle * shade * socketShade;
    let cb = (left[2] * (1 - side) + right[2] * side) * twinkle * shade * socketShade;
    cr = cr * (1 - identity) + parentColor[0] * identity;
    cg = cg * (1 - identity) + parentColor[1] * identity;
    cb = cb * (1 - identity) + parentColor[2] * identity;
    colors[j] = clamp(cr);
    colors[j + 1] = clamp(cg);
    colors[j + 2] = clamp(cb);
    fromColors[j] = parentColor[0];
    fromColors[j + 1] = parentColor[1];
    fromColors[j + 2] = parentColor[2];

    sizes[i] =
      layer === 1
        ? 1.18 + hash01(i * 2.37) * 0.54
        : layer === 2
          ? 0.84 + hash01(i * 2.37) * 0.38
          : 0.64 + hash01(i * 2.37) * 0.28;
    phases[i] = hash01(i * 5.91) * Math.PI * 2;
    amps[i] =
      layer === 1
        ? 0.1 + hash01(i * 4.21) * 0.13
        : layer === 2
          ? 0.18 + hash01(i * 4.21) * 0.2
          : 0.28 + hash01(i * 4.21) * 0.3;
    const featureDelay = nearEye > 0.45 ? 0.12 : 0;
    delays[i] = clamp(hash01(i * 13.71 + 2.4) * 0.43 + featureDelay, 0, 0.68);
    const arcRadius = 18 + hash01(i * 8.13) * 46;
    const arcAngle = hash01(i * 2.47) * Math.PI * 2;
    arcs[j] = (basis.t[0] * Math.cos(arcAngle) + basis.b[0] * Math.sin(arcAngle)) * arcRadius;
    arcs[j + 1] =
      (basis.t[1] * Math.cos(arcAngle) + basis.b[1] * Math.sin(arcAngle)) * arcRadius +
      8 +
      hash01(i * 4.9) * 14;
    arcs[j + 2] = (basis.t[2] * Math.cos(arcAngle) + basis.b[2] * Math.sin(arcAngle)) * arcRadius;

    const role = ALIEN_HEAD_TEMPLATE.roles[sampleIndex];
    const mouthDx = (x - MOUTH.x) / Math.max(1, MOUTH.w * 1.45);
    const mouthDy = (y - MOUTH.y) / Math.max(1, MOUTH.h * 7);
    const mouthWeight = clamp(1 - Math.hypot(mouthDx, mouthDy));
    speech[i] = role === ROLE.MOUTH ? mouthWeight : mouthWeight * 0.18;
    attention[i] = nearEye;
  }

  return {
    count,
    parentIndex,
    parentPos,
    targetPos,
    colors,
    sizes,
    phases,
    amps,
    layers,
    speech,
    attention,
    normals,
    delays,
    arcs,
    fromColors,
    orientation,
  };
}

export function parentColorForCategory(category: ParticleCategory): [number, number, number] {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.unknown;
}
