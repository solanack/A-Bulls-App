export type Data = Record<string, unknown>;

const obj = (value: unknown): Data =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {};
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (value == null ? "" : String(value));
const finite = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export type SeriesPoint = { t: number; v: number };

/** Honest LOCAL vs INDEXED — never INDEXED on memory-fallback / synthetic, never a DEMO brand state. */
export function statusBadge(store: string | null | undefined): "INDEXED" | "LOCAL" {
  return store === "d1" ? "INDEXED" : "LOCAL";
}

export function prefersReducedMotion(win: { matchMedia?: (q: string) => { matches: boolean } } | null | undefined = globalThis): boolean {
  try {
    return Boolean(win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

/** Extract candle closes only when finite — no invented points. */
export function extractSparklineValues(source: unknown): number[] {
  const rows = arr(source);
  const values: number[] = [];
  for (const row of rows) {
    if (typeof row === "number" && Number.isFinite(row)) {
      values.push(row);
      continue;
    }
    const item = obj(row);
    const close = finite(item.close ?? item.v ?? item.value ?? item.y);
    if (close != null) values.push(close);
  }
  return values;
}

/**
 * What-If diverge: actual (observed entry value) vs hold (counterfactual) from retained outcomes only.
 * Cumulative by blockTime. Empty → empty (no invented series).
 */
export function extractDivergeSeries(simulation: Data): {
  actual: SeriesPoint[];
  hold: SeriesPoint[];
  sourceLabel: string;
  timeLabel: string;
  emptyReason: string | null;
} {
  const outcomes = arr(simulation.outcomes ?? simulation.positions).map(obj);
  const rule = obj(simulation.rule);
  const holdDays = finite(rule.holdDays);
  const coverage = obj(simulation.coverage);
  const sourceBits = [
    text(simulation.wallet) ? `wallet ${text(simulation.wallet).slice(0, 8)}…` : "",
    text(simulation.quoteMint) ? `quote ${text(simulation.quoteMint).slice(0, 8)}…` : "",
    text(coverage.statement || coverage.level || coverage.state),
  ].filter(Boolean);
  const sourceLabel = sourceBits.join(" · ") || "indexed simulation payload";
  const timeLabel =
    holdDays != null
      ? `fixed hold ${holdDays}d · outcome times from blockTime`
      : text(rule.type) || "outcome times from blockTime";

  const points: { t: number; actual: number; hold: number }[] = [];
  for (const row of outcomes) {
    const t = finite(row.blockTime ?? row.block_time ?? row.observedAt ?? row.timestamp);
    const actual = finite(row.entryValueQuote ?? row.hypotheticalHoldValueAtEntry ?? row.entryValue);
    const hold = finite(
      row.counterfactualValueQuote ??
        row.hypotheticalHoldValueAtLatestIndexedCandle ??
        row.holdValueQuote ??
        row.targetValueQuote,
    );
    if (t == null || actual == null || hold == null) continue;
    points.push({ t: t < 1_000_000_000_000 ? t * 1000 : t, actual, hold });
  }
  points.sort((a, b) => a.t - b.t || a.actual - b.actual);

  if (points.length < 2) {
    return {
      actual: [],
      hold: [],
      sourceLabel,
      timeLabel,
      emptyReason:
        points.length === 0
          ? "No comparable actual-vs-hold series in this simulation payload. Chart not invented."
          : "Only one comparable point retained — diverge chart needs at least two observed points.",
    };
  }

  let cumA = 0;
  let cumH = 0;
  const actual: SeriesPoint[] = [];
  const hold: SeriesPoint[] = [];
  for (const p of points) {
    cumA += p.actual;
    cumH += p.hold;
    actual.push({ t: p.t, v: cumA });
    hold.push({ t: p.t, v: cumH });
  }
  return { actual, hold, sourceLabel, timeLabel, emptyReason: null };
}

export type DuelField = {
  key: string;
  label: string;
  a: number | null;
  b: number | null;
};

const DUEL_FIELDS: { key: string; alt?: string[]; label: string }[] = [
  { key: "tx_count", alt: ["txCount"], label: "TX COUNT" },
  { key: "mint_count", alt: ["mintCount"], label: "MINT BREADTH" },
  { key: "swap_events", alt: ["swapEvents"], label: "SWAP EVENTS" },
  { key: "fees_sol", alt: ["feesSol"], label: "FEES SOL" },
];

function pickNum(row: Data, key: string, alt: string[] = []): number | null {
  const direct = finite(row[key]);
  if (direct != null) return direct;
  for (const k of alt) {
    const v = finite(row[k]);
    if (v != null) return v;
  }
  return null;
}

/** Comparable numeric fields already present on wallet summaries — gaps stay null (no zero-fill). */
export function extractDuelFields(a: Data, b: Data): DuelField[] {
  return DUEL_FIELDS.map(({ key, alt = [], label }) => ({
    key,
    label,
    a: pickNum(a, key, alt),
    b: pickNum(b, key, alt),
  })).filter((field) => field.a != null || field.b != null);
}

/**
 * Bar ratios from retained numbers only. Missing side → gap (not zero-filled).
 * leading is observed magnitude only — not skill/ownership ranking.
 */
export function duelBarRatio(
  a: number | null,
  b: number | null,
): { aPct: number; bPct: number; leading: "a" | "b" | "tie" | "gap" } {
  if (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b)) {
    return { aPct: 0, bPct: 0, leading: "gap" };
  }
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  const max = Math.max(absA, absB);
  if (max === 0) return { aPct: 0, bPct: 0, leading: "tie" };
  const aPct = (absA / max) * 100;
  const bPct = (absB / max) * 100;
  if (absA === absB) return { aPct, bPct, leading: "tie" };
  return { aPct, bPct, leading: absA > absB ? "a" : "b" };
}
