import { groupBolts, priceAxisLabel, strikePhase, tapeAxis, type BoltGroup, type CohortTick, type TapeBolt, type TapeCandle } from "./replay-tape.ts";

export const TAPE_BG = "#0b0c10";
/** Tape colours. Bolts never use these. */
export const CANDLE = {
  up: { fill: "#16A34A", wick: "#15803D", edge: "rgba(74,222,128,.4)" },
  down: { fill: "#DC2626", wick: "#B91C1C", edge: "rgba(248,113,113,.4)" },
} as const;
/** Print colours: electric lime buys, hot rose sells. */
export const BOLT = {
  buy: { fill: "#B8FF3C", glow: "#D9FF8A", outline: "#052E16" },
  sell: { fill: "#FF2D55", glow: "#FF8AA0", outline: "#450A0A" },
} as const;
export const BUY_BOLT = BOLT.buy.fill;
export const SELL_BOLT = BOLT.sell.fill;
const CHAMPAGNE = "rgba(236,218,170,.9)";
/** Cohort ticks are muted so the hero prints stay the only lightning on the tape. */
export const COHORT_TICK = "rgba(214,220,200,.5)";
export const COHORT_TICK_SELECTED = "rgba(244,246,236,.95)";

export type TapeFrame = {
  width: number;
  height: number;
  candles: readonly TapeCandle[];
  bolts: readonly TapeBolt[];
  start: number;
  end: number;
  cursor: number;
  selectedId?: string | null;
  scale?: number;
  scaleMode?: "log" | "linear";
  /** Scar height in CSS pixels before `scale`: 10–12 on phones, 13–14 on desktop. */
  scarPx?: number;
  /** Other wallets in the same room buying after the hero's first print. Omit to hide. */
  cohort?: readonly CohortTick[];
  /** Milliseconds since the playhead struck this group, or null for a visited print (scar only). */
  strikeAge?: (group: BoltGroup) => number | null;
  pad?: { top: number; right: number; bottom: number; left: number };
};

export type BoltHit = { id: string; x: number; y: number; r: number };

/** Sharp four-corner lightning bolt, unit height, centred on the origin. Used for the scar. */
const BOLT_SHAPE: readonly [number, number][] = [[0.12, -0.5], [-0.27, 0.07], [-0.02, 0.07], [-0.12, 0.5], [0.28, -0.09], [0.03, -0.09]];

function drawScar(ctx: CanvasRenderingContext2D, x: number, y: number, side: "buy" | "sell", height: number, k: number, selected: boolean) {
  const palette = BOLT[side], mirror = side === "sell" ? -1 : 1;
  ctx.beginPath();
  BOLT_SHAPE.forEach(([px, py], i) => { const bx = x + px * height * mirror, by = y + py * height; if (i) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); });
  ctx.closePath();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 5 * k;
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineJoin = "miter";
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = Math.max(1, 0.8 * k);
  ctx.stroke();
  if (selected) {
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath(); ctx.arc(x, y, height * 0.85, 0, Math.PI * 2); ctx.stroke();
  }
}

type Pt = [number, number];
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}

/** A jagged bolt from the top of the plot onto the candle, with 2–3 forks. Deterministic per print. */
export function boltPath(key: string, x: number, top: number, y: number, k: number) {
  const rand = seeded(key), length = Math.max(1, y - top), steps = Math.max(5, Math.min(11, Math.round(length / (26 * k))));
  const main: Pt[] = [[x + (rand() - 0.5) * 18 * k, top]];
  for (let i = 1; i < steps; i++) { const f = i / steps, swing = (1 - f * 0.7) * 14 * k; main.push([x + (rand() - 0.5) * 2 * swing, top + f * length]); }
  main.push([x, y]);
  const forkCount = 2 + (rand() > 0.5 ? 1 : 0), forks: { at: number; points: Pt[] }[] = [];
  for (let j = 0; j < forkCount; j++) {
    const at = Math.min(main.length - 3, Math.max(1, Math.floor((0.25 + rand() * 0.45) * main.length))), origin = main[at];
    const dir = (j % 2 ? 1 : -1) * (rand() > 0.3 ? 1 : -1), points: Pt[] = [origin], segs = 2 + Math.floor(rand() * 2);
    for (let s = 1; s <= segs; s++) { const prev = points[s - 1]; points.push([prev[0] + dir * (6 + rand() * 10) * k, prev[1] + (8 + rand() * 12) * k]); }
    forks.push({ at, points });
  }
  return { main, forks };
}

function strokePath(ctx: CanvasRenderingContext2D, points: readonly Pt[]) {
  if (points.length < 2) return;
  ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
}
/** The first `f` (0..1) of a polyline by vertex count, interpolating the last segment. */
function headOf(points: readonly Pt[], f: number): Pt[] {
  const segs = points.length - 1, pos = Math.min(1, Math.max(0, f)) * segs, whole = Math.floor(pos);
  const out = points.slice(0, whole + 1) as Pt[];
  if (whole < segs) { const a = points[whole], b = points[whole + 1], r = pos - whole; out.push([a[0] + (b[0] - a[0]) * r, a[1] + (b[1] - a[1]) * r]); }
  return out;
}
function strokeLightning(ctx: CanvasRenderingContext2D, paths: readonly Pt[][], side: "buy" | "sell", k: number, alpha: number) {
  const palette = BOLT[side];
  ctx.save();
  ctx.lineJoin = "miter"; ctx.lineCap = "round";
  ctx.globalAlpha = 0.4 * alpha; ctx.strokeStyle = palette.glow; ctx.lineWidth = 7 * k; ctx.shadowColor = palette.glow; ctx.shadowBlur = 14 * k;
  paths.forEach((path) => strokePath(ctx, path));
  ctx.shadowBlur = 0; ctx.globalAlpha = alpha; ctx.strokeStyle = palette.fill; ctx.lineWidth = 2.4 * k;
  paths.forEach((path) => strokePath(ctx, path));
  ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 0.9 * k;
  paths.forEach((path) => strokePath(ctx, path));
  ctx.restore();
}

/** Strike: the bolt grows from the top onto the candle. Return: the same bolt climbs back and vanishes. */
function drawLightning(ctx: CanvasRenderingContext2D, key: string, side: "buy" | "sell", x: number, top: number, y: number, k: number, phase: { phase: "down" | "up"; progress: number }) {
  const { main, forks } = boltPath(key, x, top, y, k), segs = main.length - 1;
  if (phase.phase === "down") {
    const head = headOf(main, phase.progress), reached = phase.progress * segs;
    const grown = forks.filter((fork) => fork.at <= reached).map((fork) => headOf(fork.points, Math.min(1, (reached - fork.at) / 2)));
    strokeLightning(ctx, [head, ...grown], side, k, 1);
    return;
  }
  const keep = 1 - phase.progress, alive = forks.filter((fork) => fork.at <= keep * segs).map((fork) => fork.points);
  strokeLightning(ctx, [headOf(main, keep), ...alive], side, k, 0.35 + 0.65 * keep);
}

function drawCount(ctx: CanvasRenderingContext2D, x: number, y: number, side: "buy" | "sell", count: number, k: number) {
  const label = `×${count}`;
  ctx.font = `750 ${Math.round(10 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const w = ctx.measureText(label).width + 8 * k, h = 14 * k;
  ctx.fillStyle = "rgba(8,9,12,.9)";
  ctx.strokeStyle = BOLT[side].fill;
  ctx.lineWidth = Math.max(1, k);
  ctx.beginPath(); ctx.roundRect(x, y - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = BOLT[side].fill;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + 0.5 * k);
}

const quantile = (values: number[], q: number) => {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b), pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

/**
 * Price range that ignores the most extreme 1.5% of wicks so one spike cannot flatten the tape.
 * Prints on the tape are always kept inside the range.
 */
export function robustPriceRange(candles: readonly TapeCandle[], keep: readonly number[] = []) {
  const trim = candles.length >= 40 ? 0.015 : 0;
  let lo = quantile(candles.map((c) => c.low), trim), hi = quantile(candles.map((c) => c.high), 1 - trim);
  for (const value of keep) if (value > 0 && Number.isFinite(value)) { lo = Math.min(lo, value); hi = Math.max(hi, value); }
  return { lo, hi };
}

/** Deterministic tape renderer shared by Replay and the Cut so the export is exactly what was watched. */
export function drawTape(ctx: CanvasRenderingContext2D, frame: TapeFrame): BoltHit[] {
  const { width: w, height: h, candles, bolts, start, end, cursor } = frame;
  const k = frame.scale ?? 1, log = frame.scaleMode === "log";
  const pad = frame.pad ?? { top: 28 * k, right: 64 * k, bottom: 30 * k, left: 18 * k };
  const plotW = Math.max(1, w - pad.left - pad.right), plotH = Math.max(1, h - pad.top - pad.bottom);
  const axis = tapeAxis(candles, start, end);
  const xAt = (frac: number) => pad.left + Math.min(1, Math.max(0, frac)) * plotW;
  const cursorX = xAt(cursor);
  ctx.save();
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);

  const hits: BoltHit[] = [];
  const font = (weight: number, px: number) => `${weight} ${Math.round(px * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const visible = bolts.filter((bolt) => bolt.cursor <= cursor + 1e-9);
  const groups = groupBolts(visible);
  const scar = (frame.scarPx ?? 12) * k;
  const cohort = (frame.cohort ?? []).filter((tick) => tick.cursor <= cursor + 1e-9);
  const strikes: { group: BoltGroup; x: number; y: number; phase: { phase: "down" | "up"; progress: number } }[] = [];
  const placeBolt = (group: BoltGroup, x: number, y: number) => {
    const phase = strikePhase(frame.strikeAge?.(group) ?? null), selected = group.bolts.some((bolt) => bolt.id === frame.selectedId);
    if (phase.phase !== "scar") strikes.push({ group, x, y, phase });
    if (phase.phase !== "down") {
      drawScar(ctx, x, y, group.side, scar * (selected ? 1.12 : 1), k, selected);
      if (group.count > 1) drawCount(ctx, x + scar * 0.45, y - scar * 0.6, group.side, group.count, k);
    }
    hits.push({ id: (selected ? group.bolts.find((bolt) => bolt.id === frame.selectedId) : group.lead)?.id ?? group.lead.id, x, y, r: Math.max(16 * k, scar * 1.3) });
  };
  const placeTick = (tick: CohortTick, x: number, y: number) => {
    const selected = tick.id === frame.selectedId, len = 6 * k;
    ctx.strokeStyle = selected ? COHORT_TICK_SELECTED : COHORT_TICK;
    ctx.lineWidth = Math.max(1, (selected ? 2 : 1.3) * k);
    ctx.beginPath(); ctx.moveTo(x, y + 3 * k); ctx.lineTo(x, y + 3 * k + len); ctx.stroke();
    hits.push({ id: tick.id, x, y: y + 3 * k + len / 2, r: 10 * k });
  };

  if (candles.length) {
    const { lo, hi } = robustPriceRange(candles, bolts.flatMap((bolt) => (bolt.anchorPrice != null ? [bolt.anchorPrice] : [])));
    const f = (price: number) => (log ? Math.log10(Math.max(price, 1e-18)) : price);
    let fLo = f(lo), fHi = f(hi);
    const span = fHi - fLo || Math.abs(fHi) * 0.02 || 1;
    fLo -= span * 0.1; fHi += span * 0.12;
    const yOf = (price: number) => pad.top + (1 - (f(price) - fLo) / (fHi - fLo)) * plotH;
    const priceAt = (frac: number) => { const v = fLo + (fHi - fLo) * frac; return log ? 10 ** v : v; };

    ctx.fillStyle = "rgba(226,226,232,.46)";
    ctx.strokeStyle = "rgba(236,236,240,.14)";
    ctx.lineWidth = 1;
    ctx.font = font(500, 10);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 4; i++) {
      const frac = (i + 0.5) / 4, y = pad.top + (1 - frac) * plotH;
      ctx.beginPath(); ctx.moveTo(pad.left + plotW + 2 * k, y); ctx.lineTo(pad.left + plotW + 6 * k, y); ctx.stroke();
      ctx.fillText(priceAxisLabel(priceAt(frac)), pad.left + plotW + 10 * k, y);
    }

    const slotW = plotW / axis.slots;
    const bodyW = Math.max(1, Math.min(22 * k, slotW * 0.72));
    const wickW = Math.max(1, Math.min(2 * k, bodyW * 0.25));
    const indexOf = new Map(candles.map((c, i) => [c.time, i]));
    const centerOf = (timeSec: number) => xAt(axis.center(indexOf.get(timeSec) ?? 0));
    ctx.save();
    ctx.beginPath(); ctx.rect(pad.left - bodyW, pad.top - 2 * k, plotW + bodyW * 2, plotH + 4 * k); ctx.clip();
    candles.forEach((c, i) => {
      const x = xAt(axis.center(i)), revealed = x - bodyW / 2 <= cursorX;
      const tone = c.close >= c.open ? CANDLE.up : CANDLE.down;
      ctx.globalAlpha = revealed ? 1 : 0.1;
      ctx.fillStyle = tone.wick;
      ctx.fillRect(x - wickW / 2, yOf(c.high), wickW, Math.max(1, yOf(c.low) - yOf(c.high)));
      const top = yOf(Math.max(c.open, c.close)), bh = Math.max(1.5 * k, yOf(Math.min(c.open, c.close)) - top);
      ctx.fillStyle = tone.fill;
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      if (bodyW >= 4 * k) { ctx.strokeStyle = tone.edge; ctx.lineWidth = Math.max(1, 0.8 * k); ctx.strokeRect(x - bodyW / 2 + 0.5, top + 0.5, bodyW - 1, Math.max(0.5, bh - 1)); }
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    for (const tick of cohort) if (tick.candleTime != null && tick.anchorPrice != null) placeTick(tick, xAt(tick.cursor), yOf(tick.anchorPrice));
    const flashes = new Map<number, number>();
    for (const group of groups) {
      const lead = group.lead;
      if (lead.anchorPrice == null || lead.candleTime == null) continue;
      placeBolt(group, centerOf(lead.candleTime), yOf(lead.anchorPrice));
      const last = strikes.at(-1);
      if (last?.group === group) flashes.set(lead.candleTime, last.phase.phase === "down" ? Math.max(0, (last.phase.progress - 0.8) / 0.2) : 1 - last.phase.progress);
    }
    for (const [time, glow] of flashes) {
      const c = candles[indexOf.get(time) ?? 0], x = centerOf(time), top = yOf(Math.max(c.open, c.close)), bh = Math.max(1.5 * k, yOf(Math.min(c.open, c.close)) - top), fw = Math.max(bodyW, 4 * k);
      ctx.globalAlpha = 0.85 * glow; ctx.fillStyle = "#ffffff"; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 12 * k;
      ctx.fillRect(x - fw / 2, top, fw, bh);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
    }
  } else {
    const mid = pad.top + plotH / 2;
    ctx.strokeStyle = "rgba(236,236,240,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, mid); ctx.lineTo(pad.left + plotW, mid); ctx.stroke();
    ctx.fillStyle = "rgba(226,226,232,.56)";
    ctx.font = font(650, 11);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("CANDLES UNAVAILABLE · EVENT TAPE", pad.left, pad.top);
    for (const tick of cohort) placeTick(tick, xAt(tick.cursor), mid + scar);
    for (const group of groups) placeBolt(group, xAt(group.lead.cursor), mid + (group.side === "buy" ? 1 : -1) * scar * 0.9);
  }
  for (const strike of strikes) drawLightning(ctx, strike.group.key, strike.group.side, strike.x, pad.top, strike.y, k, strike.phase);

  if (cursor > 0 && cursor < 1) {
    ctx.strokeStyle = CHAMPAGNE;
    ctx.lineWidth = Math.max(1, 1.2 * k);
    ctx.beginPath(); ctx.moveTo(cursorX, pad.top); ctx.lineTo(cursorX, pad.top + plotH); ctx.stroke();
  }

  ctx.fillStyle = "rgba(226,226,232,.4)";
  ctx.font = font(500, 10);
  ctx.textBaseline = "top";
  const day = (ms: number) => new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  ctx.textAlign = "left";
  ctx.fillText(day(axis.timeAt(0)), pad.left, pad.top + plotH + 10 * k);
  ctx.textAlign = "right";
  ctx.fillText(day(candles.length ? candles[candles.length - 1].timestamp : end), pad.left + plotW, pad.top + plotH + 10 * k);
  ctx.restore();
  return hits;
}

export function hitBolt(hits: readonly BoltHit[], x: number, y: number) {
  let best: BoltHit | null = null, bestD = Infinity;
  for (const hit of hits) {
    const d = Math.hypot(hit.x - x, hit.y - y);
    if (d <= hit.r && d < bestD) { best = hit; bestD = d; }
  }
  return best?.id ?? null;
}
