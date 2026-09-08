export function clamp(v: number, a = 0, b = 1) {
  return Math.max(a, Math.min(b, v));
}

export function hash01(value: number) {
  const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

export function mulberry(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shortId(raw: string) {
  const text = raw.trim();
  if (text.length <= 12) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export type DeviceBudget = {
  field: number;
  organism: number;
  dpr: number;
  maxPixels: number;
  mobile: boolean;
};

export type DeviceBudgetSignals = {
  memory?: number;
  saveData?: boolean;
  reducedMotion?: boolean;
  coarsePointer?: boolean;
  width?: number;
  height?: number;
  userAgent?: string;
};

type BudgetProfile = Omit<DeviceBudget, "mobile">;

function positive(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : fallback;
}

function finalizeBudget(
  profile: BudgetProfile,
  mobile: boolean,
  width: number,
  height: number,
): DeviceBudget {
  const area = Math.max(1, width * height);
  const pixelBound = Math.sqrt(profile.maxPixels / area);
  const dpr = Math.max(0.7, Math.min(profile.dpr, pixelBound));
  return { ...profile, dpr, mobile };
}

/**
 * Keep the native Three.js field on phones, but budget by device class and actual
 * viewport area instead of treating more RAM as permission to allocate a huge
 * mobile framebuffer and hundreds of thousands of extra organism particles.
 */
export function computeDeviceBudget(signals: DeviceBudgetSignals = {}): DeviceBudget {
  const memory = positive(signals.memory, 4);
  const width = positive(signals.width, 1024);
  const height = positive(signals.height, 768);
  const minSide = Math.min(width, height);
  const userAgent = String(signals.userAgent || "");
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobile|Silk|Seeker/i.test(userAgent);
  const mobile = mobileUserAgent || Boolean(signals.coarsePointer && minSide <= 900);
  const constrained = Boolean(signals.reducedMotion || signals.saveData || memory < 4);

  if (mobile && constrained) {
    return finalizeBudget(
      { field: 1600, organism: 100000, dpr: 1, maxPixels: 950000 },
      true,
      width,
      height,
    );
  }

  if (mobile) {
    const profile: BudgetProfile = memory >= 6
      ? { field: 2800, organism: 180000, dpr: 1.15, maxPixels: 1400000 }
      : { field: 2200, organism: 140000, dpr: 1.05, maxPixels: 1100000 };
    return finalizeBudget(profile, true, width, height);
  }

  if (constrained) {
    return finalizeBudget(
      { field: 1800, organism: 288000, dpr: 1.2, maxPixels: 2000000 },
      false,
      width,
      height,
    );
  }
  if (memory >= 8) {
    return finalizeBudget(
      { field: 4200, organism: 660000, dpr: 1.75, maxPixels: 5000000 },
      false,
      width,
      height,
    );
  }
  return finalizeBudget(
    { field: 2800, organism: 450000, dpr: 1.5, maxPixels: 3500000 },
    false,
    width,
    height,
  );
}

export function deviceBudget() {
  const navigatorLike = globalThis.navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const memory = Number(navigatorLike?.deviceMemory || 4);
  const saveData = Boolean(navigatorLike?.connection?.saveData);
  const reducedMotion =
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const coarsePointer = globalThis.matchMedia?.("(pointer: coarse)").matches ?? false;
  const width = positive(Number(globalThis.innerWidth || 0), 1024);
  const height = positive(Number(globalThis.innerHeight || 0), 768);

  return computeDeviceBudget({
    memory,
    saveData,
    reducedMotion,
    coarsePointer,
    width,
    height,
    userAgent: navigatorLike?.userAgent || "",
  });
}
