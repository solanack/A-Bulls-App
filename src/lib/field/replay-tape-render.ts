import type { TapeBolt, TapeCandle } from "./replay-tape.ts";

export const TAPE_BG = "#0b0c10";
export const BUY_BOLT = "#3dffa2";
export const SELL_BOLT = "#ff4d5e";
const IVORY = "rgba(236,231,219,.92)";
const GRAPHITE = "rgba(118,121,136,.9)";
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
  pad?: { top: number; right: number; bottom: number; left: number };
};

export type BoltHit = { id: string; x: number; y: number; r: number };

function boltPath(ctx: CanvasRenderingContext2D, x: number, tipY: number, dir: 1 | -1, size: number) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x + 0.6 * s, tipY + dir * 3.4 * s);
  ctx.lineTo(x - 0.9 * s, tipY + dir * 1.55 * s);
  ctx.lineTo(x - 0.05 * s, tipY + dir * 1.55 * s);
  ctx.lineTo(x - 0.55 * s, tipY);
  ctx.lineTo(x + 0.95 * s, tipY + dir * 1.95 * s);
  ctx.lineTo(x + 0.1 * s, tipY + dir * 1.95 * s);
  ctx.closePath();
}

const MAX_STACK = 3;

function drawBolt(ctx: CanvasRenderingContext2D, x: number, tipY: number, buy: boolean, size: number, glow: number, selected: boolean, k: number) {
  const color = buy ? BUY_BOLT : SELL_BOLT;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  boltPath(ctx, x, tipY, buy ? 1 : -1, size);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = selected ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.35)";
  ctx.lineWidth = (selected ? 1.4 : 0.7) * k;
  ctx.stroke();
}

function priceLabel(value: number) {
  if (!Number.isFinite(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (abs >= 1) return value.toFixed(2);
  if (abs >= 0.01) return value.toFixed(4);
  return value.toPrecision(3);
}

/** Deterministic tape renderer shared by Replay and the Cut so the export is exactly what was watched. */
export function drawTape(ctx: CanvasRenderingContext2D, frame: TapeFrame): BoltHit[] {
  const { width: w, height: h, candles, bolts, start, end, cursor } = frame;
  const k = frame.scale ?? 1;
  const pad = frame.pad ?? { top: 28 * k, right: 64 * k, bottom: 30 * k, left: 18 * k };
  const plotW = Math.max(1, w - pad.left - pad.right), plotH = Math.max(1, h - pad.top - pad.bottom);
  const range = Math.max(1, end - start);
  const xOf = (ms: number) => pad.left + Math.min(1, Math.max(0, (ms - start) / range)) * plotW;
  const cursorX = pad.left + cursor * plotW;
  ctx.save();
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);
  const vignette = ctx.createRadialGradient(w * 0.62, h * 0.18, 0, w * 0.62, h * 0.18, Math.max(w, h) * 0.9);
  vignette.addColorStop(0, "rgba(236,218,170,.045)");
  vignette.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  const hits: BoltHit[] = [];
  const font = (weight: number, px: number) => `${weight} ${Math.round(px * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  if (candles.length) {
    let lo = Infinity, hi = -Infinity;
    for (const c of candles) { lo = Math.min(lo, c.low); hi = Math.max(hi, c.high); }
    const span = hi - lo || Math.abs(hi) * 0.02 || 1;
    lo -= span * 0.14; hi += span * 0.14;
    const yOf = (price: number) => pad.top + (1 - (price - lo) / (hi - lo)) * plotH;

    ctx.strokeStyle = "rgba(236,236,240,.05)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(226,226,232,.42)";
    ctx.font = font(500, 10);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let i = 0; i <= 3; i++) {
      const price = lo + ((hi - lo) * (i + 0.5)) / 4, y = yOf(price);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + plotW, y); ctx.stroke();
      ctx.fillText(priceLabel(price), pad.left + plotW + 10 * k, y);
    }

    const bucket = candles.length > 1 ? (candles[candles.length - 1].timestamp - candles[0].timestamp) / (candles.length - 1) : range / 40;
    const bodyW = Math.max(1.2 * k, Math.min(14 * k, (bucket / range) * plotW * 0.62));
    for (const c of candles) {
      const x = xOf(c.timestamp + bucket / 2), revealed = x <= cursorX;
      const up = c.close >= c.open;
      ctx.globalAlpha = revealed ? 1 : 0.07;
      ctx.strokeStyle = up ? IVORY : GRAPHITE;
      ctx.fillStyle = up ? "rgba(236,231,219,.16)" : GRAPHITE;
      ctx.lineWidth = Math.max(1, 1.1 * k);
      ctx.beginPath(); ctx.moveTo(x, yOf(c.high)); ctx.lineTo(x, yOf(c.low)); ctx.stroke();
      const top = yOf(Math.max(c.open, c.close)), bottom = yOf(Math.min(c.open, c.close)), bh = Math.max(1 * k, bottom - top);
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      if (up) ctx.strokeRect(x - bodyW / 2, top, bodyW, bh);
    }
    ctx.globalAlpha = 1;

    const stacks = new Map<string, number>(), overflow = new Map<string, { x: number; y: number; n: number; buy: boolean }>();
    for (const bolt of bolts) {
      if (bolt.cursor > cursor + 1e-9 || bolt.anchorPrice == null) continue;
      const buy = bolt.side === "buy", key = `${bolt.candleTime}:${bolt.side}`, depth = stacks.get(key) ?? 0;
      stacks.set(key, depth + 1);
      const fresh = cursor - bolt.cursor < 0.018, selected = frame.selectedId === bolt.id;
      const size = (selected ? 7.4 : fresh ? 7 : 5.6) * k, step = 2.5 * 5.6 * k;
      const level = Math.min(depth, MAX_STACK - 1);
      const x = xOf(bolt.timestamp), tipY = yOf(bolt.anchorPrice) + (buy ? 1 : -1) * (5 * k + level * step);
      if (depth >= MAX_STACK) { overflow.set(key, { x, y: tipY + (buy ? 1 : -1) * (step + 6 * k), n: depth - MAX_STACK + 2, buy }); if (!selected) continue; }
      drawBolt(ctx, x, tipY, buy, size, selected || fresh ? 18 * k : 5 * k, selected, k);
      hits.push({ id: bolt.id, x, y: tipY + (buy ? 1 : -1) * 1.7 * size, r: Math.max(14 * k, size * 2.4) });
    }
    ctx.shadowBlur = 0;
    ctx.font = font(650, 10);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const more of overflow.values()) { ctx.fillStyle = more.buy ? "rgba(61,255,162,.8)" : "rgba(255,77,94,.85)"; ctx.fillText(`+${more.n}`, more.x, more.y); }
  } else {
    const mid = pad.top + plotH / 2;
    ctx.strokeStyle = "rgba(236,236,240,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, mid); ctx.lineTo(pad.left + plotW, mid); ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = "rgba(236,236,240,.12)";
    ctx.beginPath(); ctx.moveTo(pad.left, mid); ctx.lineTo(cursorX, mid); ctx.lineWidth = 2 * k; ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(226,226,232,.56)";
    ctx.font = font(650, 11);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("CANDLES UNAVAILABLE · EVENT TAPE", pad.left, pad.top);
    for (const bolt of bolts) {
      if (bolt.cursor > cursor + 1e-9) continue;
      const x = xOf(bolt.timestamp), buy = bolt.side === "buy";
      const tipY = mid + (buy ? 4 : -4) * k;
      const fresh = cursor - bolt.cursor < 0.018, selected = frame.selectedId === bolt.id;
      const size = (selected ? 8 : fresh ? 7.4 : 6) * k;
      drawBolt(ctx, x, tipY, buy, size, selected || fresh ? 18 * k : 5 * k, selected, k);
      hits.push({ id: bolt.id, x, y: tipY + (buy ? 1 : -1) * 1.7 * size, r: Math.max(14 * k, size * 2.4) });
    }
    ctx.shadowBlur = 0;
  }

  if (cursor > 0 && cursor < 1) {
    const glow = ctx.createLinearGradient(cursorX - 18 * k, 0, cursorX, 0);
    glow.addColorStop(0, "rgba(236,218,170,0)");
    glow.addColorStop(1, "rgba(236,218,170,.08)");
    ctx.fillStyle = glow;
    ctx.fillRect(cursorX - 18 * k, pad.top, 18 * k, plotH);
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
