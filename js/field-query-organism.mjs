const TAU = Math.PI * 2;
const KINDS = ['wallet', 'tx', 'token', 'nft', 'program'];

function hash01(value) {
  const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

function eyeMetric(x, y, side) {
  const nx = x / 0.39;
  const ny = y / 0.50;
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

function isFacialVoid(x, y, z) {
  if (z < 0.08) return false;
  if (Math.min(eyeMetric(x, y, -1), eyeMetric(x, y, 1)) < 0.92) return true;
  if (y > -0.18 && y < -0.03 && Math.abs(x) > 0.025 && Math.abs(x) < 0.10) return true;
  if (Math.abs(x) < 0.22 && y > -0.46 && y < -0.37) return true;
  return false;
}

function headPoint(index) {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const u = hash01(index * 3.17 + attempt * 9.13);
    const v = hash01(index * 5.91 + attempt * 2.44);
    const w = hash01(index * 7.33 + attempt * 1.07);
    const y = -0.92 + v * 1.72;
    const width = (y - 0.28) / 0.42;
    const upper = Math.exp(-(width * width));
    const lower = Math.max(0, Math.min(1, (y + 0.88) / 0.95));
    const rx = (0.22 + 0.34 * lower + 0.18 * upper) * Math.sqrt(u);
    const rz = (0.18 + 0.40 * lower + 0.22 * upper) * Math.sqrt(u);
    const theta = w * TAU;
    const x = Math.cos(theta) * rx;
    const z = Math.sin(theta) * rz * 0.86 + 0.08;
    if (!isFacialVoid(x, y, z)) return [x, y, z];
  }
  return [0, 0.2, 0.4];
}

function fieldPoint(index) {
  const u = hash01(index * 1.13 + 4.2);
  const v = hash01(index * 2.71 + 8.6);
  const w = hash01(index * 3.91 + 1.8);
  const radius = 0.35 + u * 1.55;
  const phi = Math.acos(2 * v - 1);
  const theta = w * TAU;
  return [
    Math.sin(phi) * Math.cos(theta) * radius,
    Math.cos(phi) * radius * 0.72,
    Math.sin(phi) * Math.sin(theta) * radius
  ];
}

export class FieldQueryOrganism {
  #host;
  #canvas;
  #ctx;
  #raf = 0;
  #destroyed = false;
  #blend = 0;
  #targetBlend = 0;
  #points;
  #onResize;
  #focus = -1;
  #onFocus;

  constructor({ host, count, onFocus } = {}) {
    if (!(host instanceof Element)) throw new TypeError('host element is required');
    this.#host = host;
    this.#onFocus = onFocus;
    const memory = Number(globalThis.navigator?.deviceMemory || 4);
    const budget = count || (memory >= 8 ? 14000 : memory >= 4 ? 9000 : 5200);
    this.#points = Array.from({ length: budget }, (_, index) => {
      const from = fieldPoint(index);
      const to = headPoint(index);
      return {
        id: index,
        kind: KINDS[Math.floor(hash01(index * 11.3) * KINDS.length)],
        x: from[0], y: from[1], z: from[2],
        tx: to[0], ty: to[1], tz: to[2],
        fx: from[0], fy: from[1], fz: from[2],
        px: 0, py: 0,
        phase: hash01(index * 6.17) * TAU,
        hue: hash01(index * 9.31),
        layer: hash01(index * 17.13 + 3.17) < 0.78 ? 1 : hash01(index * 17.13 + 3.17) < 0.94 ? 2 : 3,
        amp: 0.016 + hash01(index * 4.21) * 0.028
      };
    });
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'field-query-organism';
    Object.assign(this.#canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      pointerEvents: 'auto', zIndex: '2', touchAction: 'none'
    });
    host.append(this.#canvas);
    this.#ctx = this.#canvas.getContext('2d');
    this.#onResize = () => this.#resize();
    this.#canvas.addEventListener('pointerdown', this.#onPointer, { passive: true });
    globalThis.addEventListener('resize', this.#onResize);
    this.#resize();
    this.#raf = requestAnimationFrame(this.#frame);
  }

  setHeadForm(active = true) {
    this.#targetBlend = active ? 1 : 0;
  }

  clearFocus() {
    this.#focus = -1;
    this.#onFocus?.(null);
  }

  #onPointer = (event) => {
    if (this.#targetBlend > 0.6) return;
    const rect = this.#canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    let best = -1;
    let bestDist = 28 * 28;
    for (let i = 0; i < this.#points.length; i += 1) {
      const point = this.#points[i];
      const dx = point.px - x;
      const dy = point.py - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    if (best < 0) {
      this.clearFocus();
      return;
    }
    this.#focus = best;
    const point = this.#points[best];
    this.#onFocus?.({
      id: point.id,
      kind: point.kind,
      line: `${point.kind} · living point`
    });
  };

  #resize() {
    const width = Math.max(1, this.#host.clientWidth || globalThis.innerWidth || 1);
    const height = Math.max(1, this.#host.clientHeight || globalThis.innerHeight || 1);
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 1.5);
    this.#canvas.width = Math.floor(width * ratio);
    this.#canvas.height = Math.floor(height * ratio);
    this.#ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  #project(x, y, z, width, height) {
    const scale = Math.min(width, height) * 0.42;
    const depth = 2.6 + z;
    return {
      px: width * 0.5 + (x * scale) / depth,
      py: height * 0.38 + (y * scale) / depth,
      size: Math.max(0.6, 1.8 / depth)
    };
  }

  #frame = (now) => {
    if (this.#destroyed || !this.#ctx) return;
    this.#blend += (this.#targetBlend - this.#blend) * 0.045;
    const width = this.#host.clientWidth || 1;
    const height = this.#host.clientHeight || 1;
    const ctx = this.#ctx;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#030307';
    ctx.fillRect(0, 0, width, height);
    const t = now * 0.001;
    const lungs = 0.5 + 0.5 * Math.sin(t * 0.62);
    const pulse = 1 + lungs * 0.045 * this.#blend;
    const yaw = Math.sin(t * 0.11) * 0.12 * this.#blend;
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const focused = this.#focus >= 0 ? this.#points[this.#focus] : null;
    for (const point of this.#points) {
      const form = this.#blend;
      const fieldSwirl = Math.sin(t * 0.55 + point.phase) * 0.028 * (1 - form);
      const live = point.amp * (form + (1 - form) * 0.55);
      const flowA = Math.sin(t * (0.55 + point.layer * 0.08) + point.phase);
      const flowB = Math.cos(t * (0.37 + point.layer * 0.05) + point.phase * 1.73);
      const radial = Math.sin(t * 0.29 + point.phase * 0.61) * (point.layer === 1 ? 0.35 : point.layer === 2 ? 0.7 : 1.15);
      let x = point.fx + (point.tx - point.fx) * form + fieldSwirl;
      let y = point.fy + (point.ty - point.fy) * form;
      let z = point.fz + (point.tz - point.fz) * form;
      x += flowA * live + point.tx * lungs * 0.012 * form;
      y += flowB * live * 0.85 + lungs * 0.01 * form;
      z += radial * live;
      if (focused && form < 0.7) {
        const same = point.kind === focused.kind ? 0.035 : 0.012;
        x += (focused.fx - point.fx) * same;
        y += (focused.fy - point.fy) * same;
        z += (focused.fz - point.fz) * same;
      }
      x *= pulse;
      y *= pulse;
      z *= pulse;
      const rx = x * cy + z * sy;
      const rz = z * cy - x * sy;
      const drawn = this.#project(rx, y, rz, width, height);
      point.px = drawn.px;
      point.py = drawn.py;
      const selected = point.id === this.#focus;
      const related = focused && point.kind === focused.kind;
      const glow = 0.32 + form * 0.4 + point.hue * 0.22 + lungs * 0.12 * form + (selected ? 0.45 : related ? 0.18 : 0);
      const alpha = (0.22 + form * 0.5 + (selected ? 0.4 : 0)) * (point.layer === 1 ? 1 : point.layer === 2 ? 0.82 : 0.62);
      ctx.fillStyle = `rgba(${Math.floor(80 + glow * 90)}, ${Math.floor(150 + glow * 80)}, ${Math.floor(200 + glow * 50)}, ${alpha})`;
      const size = drawn.size * (0.85 + lungs * 0.25) * (selected ? 3.2 : related ? 1.35 : 1);
      ctx.fillRect(drawn.px, drawn.py, size, size);
    }
    this.#raf = requestAnimationFrame(this.#frame);
  };

  destroy() {
    this.#destroyed = true;
    cancelAnimationFrame(this.#raf);
    this.#canvas.removeEventListener('pointerdown', this.#onPointer);
    globalThis.removeEventListener('resize', this.#onResize);
    this.#canvas.remove();
  }
}
