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

export function deviceBudget() {
  const memory = Number(
    (globalThis.navigator as Navigator & { deviceMemory?: number })?.deviceMemory ||
      4,
  );
  const saveData = Boolean(
    (globalThis.navigator as Navigator & { connection?: { saveData?: boolean } })
      ?.connection?.saveData,
  );
  const reduced =
    globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  if (reduced || saveData || memory < 4) return { field: 1600, organism: 260000, dpr: 1.5 };
  if (memory >= 8) return { field: 4200, organism: 660000, dpr: 2 };
  return { field: 2800, organism: 450000, dpr: 1.75 };
}
