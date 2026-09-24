import { candleBucketMs, groupBolts, notionalScale, priceAxisLabel, STRIKE_MS, strikeScale, type BoltGroup, type TapeBolt, type TapeCandle } from "./replay-tape.ts";

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
  /** Bolt height in CSS pixels before `scale`: 18–22 desktop, 22–26 mobile. */
  boltPx?: number;
  /** Milliseconds since the playhead struck this group, or null when it has not. */
  strikeAge?: (group: BoltGroup) => number | null;
  pad?: { top: number; right: number; bottom: number; left: number };
};

export type BoltHit = { id: string; x: number; y: number; r: number };

/** Sharp four-corner lightning bolt, unit height, centred on the origin. */
const BOLT_SHAPE: readonly [number, number][] = [[0.12, -0.5], [-0.27, 0.07], [-0.02, 0.07], [-0.12, 0.5], [0.28, -0.09], [0.03, -0.09]];

function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, side: "buy" | "sell", height: number, k: number, opts: { selected: boolean; age: number | null }) {
  const palette = BOLT[side], mirror = side === "sell" ? -1 : 1;
  if (opts.age != null && opts.age >= 0 && opts.age < STRIKE_MS) {
    const t = opts.age / STRIKE_MS, radius = height * (0.55 + 1.05 * t);
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, radius);
    bloom.addColorStop(0, palette.glow);
    bloom.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.fillStyle = bloom;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  BOLT_SHAPE.forEach(([px, py], i) => { const bx = x + px * height * mirror, by = y + py * height; if (i) ctx.lineTo(bx, by); else ctx.moveTo(bx, by); });
  ctx.closePath();
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 7 * k;
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineJoin = "miter";
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = Math.max(1, k);
  ctx.stroke();
  if (opts.selected) {
    ctx.strokeStyle = "rgba(255,255,255,.95)";
    ctx.lineWidth = 1.5 * k;
    ctx.beginPath(); ctx.arc(x, y, height * 0.72, 0, Math.PI * 2); ctx.stroke();
  }
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

/** Deterministic tape renderer shared by Replay and the Cut so the export is exactly what was watched. */
export function drawTape(ctx: CanvasRenderingContext2D, frame: TapeFrame): BoltHit[] {
  const { width: w, height: h, candles, bolts, start, end, cursor } = frame;
  const k = frame.scale ?? 1, log = frame.scaleMode === "log";
  const pad = frame.pad ?? { top: 28 * k, right: 64 * k, bottom: 30 * k, left: 18 * k };
  const plotW = Math.max(1, w - pad.left - pad.right), plotH = Math.max(1, h - pad.top - pad.bottom);
  const range = Math.max(1, end - start);
  const xOf = (ms: number) => pad.left + Math.min(1, Math.max(0, (ms - start) / range)) * plotW;
  const cursorX = pad.left + cursor * plotW;
  ctx.save();
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);

  const hits: BoltHit[] = [];
  const font = (weight: number, px: number) => `${weight} ${Math.round(px * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const visible = bolts.filter((bolt) => bolt.cursor <= cursor + 1e-9);
  const groups = groupBolts(visible), allGroups = groupBolts(bolts);
  const baseBolt = (frame.boltPx ?? 20) * k;
  const placeBolt = (group: BoltGroup, x: number, y: number) => {
    const age = frame.strikeAge?.(group) ?? null, selected = group.bolts.some((bolt) => bolt.id === frame.selectedId);
    const size = baseBolt * notionalScale(allGroups.find((row) => row.key === group.key) ?? group, allGroups) * strikeScale(age) * (selected ? 1.08 : 1);
    drawBolt(ctx, x, y, group.side, size, k, { selected, age });
    if (group.count > 1) drawCount(ctx, x + size * 0.34, y - size * 0.42, group.side, group.count, k);
    hits.push({ id: (selected ? group.bolts.find((bolt) => bolt.id === frame.selectedId) : group.lead)?.id ?? group.lead.id, x, y, r: Math.max(14 * k, size * 0.8) });
  };

  if (candles.length) {
    let lo = Infinity, hi = -Infinity;
    for (const c of candles) { lo = Math.min(lo, c.low); hi = Math.max(hi, c.high); }
    const f = (price: number) => (log ? Math.log10(Math.max(price, 1e-18)) : price);
    let fLo = f(lo), fHi = f(hi);
    const span = fHi - fLo || Math.abs(fHi) * 0.02 || 1;
    fLo -= span * 0.12; fHi += span * 0.12;
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

    const bucket = candleBucketMs(candles, range / 40);
    const bodyW = Math.max(2 * k, Math.min(22 * k, (bucket / range) * plotW * 0.7));
    const wickW = Math.max(1, Math.min(2 * k, bodyW * 0.2));
    const centerOf = (timeSec: number) => xOf(timeSec * 1000 + bucket / 2);
    for (const c of candles) {
      const x = centerOf(c.time), revealed = x - bodyW / 2 <= cursorX;
      const tone = c.close >= c.open ? CANDLE.up : CANDLE.down;
      ctx.globalAlpha = revealed ? 1 : 0.08;
      ctx.fillStyle = tone.wick;
      ctx.fillRect(x - wickW / 2, yOf(c.high), wickW, Math.max(1, yOf(c.low) - yOf(c.high)));
      const top = yOf(Math.max(c.open, c.close)), bh = Math.max(1.5 * k, yOf(Math.min(c.open, c.close)) - top);
      ctx.fillStyle = tone.fill;
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      if (bodyW >= 4 * k) { ctx.strokeStyle = tone.edge; ctx.lineWidth = Math.max(1, 0.8 * k); ctx.strokeRect(x - bodyW / 2 + 0.5, top + 0.5, bodyW - 1, Math.max(0.5, bh - 1)); }
    }
    ctx.globalAlpha = 1;
    for (const group of groups) {
      const lead = group.lead;
      if (lead.anchorPrice == null || lead.candleTime == null) continue;
      placeBolt(group, centerOf(lead.candleTime), yOf(lead.anchorPrice));
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
    for (const group of groups) placeBolt(group, xOf(group.lead.timestamp), mid + (group.side === "buy" ? 1 : -1) * baseBolt * 0.62);
  }

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
  ctx.fillText(day(start), pad.left, pad.top + plotH + 10 * k);
  ctx.textAlign = "right";
  ctx.fillText(day(end), pad.left + plotW, pad.top + plotH + 10 * k);
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
