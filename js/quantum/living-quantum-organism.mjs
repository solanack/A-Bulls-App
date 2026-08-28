export const LIVING_QUANTUM_ORGANISM = Object.freeze({
  orientationY: Math.PI,
  layers: Object.freeze({ dermal: 0.60, subdermal: 0.25, core: 0.15 }),
  pointBudget: Object.freeze({ low: 64000, normal: 96000, high: 128000 }),
  shader: Object.freeze({ pointScale: 94, halo: 0.045, alpha: 0.82 }),
  lighting: Object.freeze({
    key: [0.38, 0.72, 0.58],
    fill: [-0.45, 0.18, 0.42],
    rim: [-0.22, 0.28, -0.92],
    ambient: 0.24,
    keyStrength: 0.92,
    fillStrength: 0.18,
    rimStrength: 0.28
  })
});

export function hash01(value) {
  const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

export function eyeMetric(x, y, side) {
  const nx = x / 39;
  const ny = y / 50;
  const ex = side * 0.39;
  const ey = 0.20;
  const dx = nx - ex;
  const dy = ny - ey;
  const a = side * 0.16;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rx = dx * ca - dy * sa;
  const ry = dx * sa + dy * ca;
  return (rx / 0.36) ** 2 + (ry / 0.22) ** 2;
}

export function isFacialVoid(x, y, z) {
  if (z < 5) return false;
  if (Math.min(eyeMetric(x, y, -1), eyeMetric(x, y, 1)) < 0.92) return true;
  const nx = x / 39;
  const ny = y / 50;
  if (-0.18 < ny && ny < -0.03 && 0.025 < Math.abs(nx) && Math.abs(nx) < 0.10) return true;
  if (Math.abs(nx) < 0.22 && ny > -0.46 && ny < -0.37) return true;
  return false;
}

export function basisFromPoint(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  const nx = x / len, ny = y / len, nz = z / len;
  let ax = 0, ay = 1, az = 0;
  if (Math.abs(ny) > 0.86) { ax = 1; ay = 0; az = 0; }
  let tx = ay * nz - az * ny;
  let ty = az * nx - ax * nz;
  let tz = ax * ny - ay * nx;
  const tl = Math.hypot(tx, ty, tz) || 1;
  tx /= tl; ty /= tl; tz /= tl;
  const bx = ny * tz - nz * ty;
  const by = nz * tx - nx * tz;
  const bz = nx * ty - ny * tx;
  return { n:[nx,ny,nz], t:[tx,ty,tz], b:[bx,by,bz] };
}

export function lightingForNormal(nx, ny, nz, depth = 0) {
  const cfg = LIVING_QUANTUM_ORGANISM.lighting;
  const dot = (a) => Math.max(0, nx*a[0] + ny*a[1] + nz*a[2]);
  let light = cfg.ambient + dot(cfg.key)*cfg.keyStrength + dot(cfg.fill)*cfg.fillStrength + Math.pow(dot(cfg.rim), 3)*cfg.rimStrength;
  light *= 1 - Math.min(0.58, depth * 0.48);
  return Math.max(0.16, Math.min(1.22, light));
}
