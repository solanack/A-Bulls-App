export type TraderSigil = Readonly<{
  wallet: string;
  packed: number;
  cells: readonly boolean[];
  label: string;
}>;

function fnv1a32(value: string) {
  let hash = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash >>> 0;
}

export function traderSigilPacked(wallet: string) {
  const normalized = String(wallet ?? "").trim().toLowerCase();
  const hash = fnv1a32(normalized || "public-wallet");
  // 15 bits become a mirrored 5×5 glyph: 3 source columns × 5 rows.
  let packed = hash & 0x7fff;
  // Avoid visually empty or nearly full glyphs.
  const ones = Array.from({ length: 15 }, (_, i) => (packed >>> i) & 1).reduce((a, b) => a + b, 0);
  if (ones < 4) packed ^= 0b101_010_111_010_101;
  if (ones > 12) packed ^= 0b010_101_000_101_010;
  return packed & 0x7fff;
}

export function traderSigil(wallet: string): TraderSigil {
  const packed = traderSigilPacked(wallet);
  const cells: boolean[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const sourceX = x > 2 ? 4 - x : x;
      const bit = y * 3 + sourceX;
      cells.push(Boolean((packed >>> bit) & 1));
    }
  }
  const clean = String(wallet ?? "").trim();
  const label = clean.length > 10 ? `${clean.slice(0, 4)}…${clean.slice(-4)}` : clean || "public wallet";
  return Object.freeze({ wallet: clean, packed, cells: Object.freeze(cells), label });
}

export function drawTraderSigil(
  ctx: CanvasRenderingContext2D,
  wallet: string,
  x: number,
  y: number,
  size: number,
  options: { foreground?: string; background?: string | null; alpha?: number } = {},
) {
  const sigil = traderSigil(wallet);
  const cell = size / 5;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(x, y, size, size);
  }
  ctx.fillStyle = options.foreground ?? "#f4f2ec";
  for (let index = 0; index < sigil.cells.length; index++) {
    if (!sigil.cells[index]) continue;
    const cx = index % 5, cy = Math.floor(index / 5);
    const inset = Math.max(0.6, cell * 0.09);
    ctx.fillRect(x + cx * cell + inset, y + cy * cell + inset, Math.max(1, cell - inset * 2), Math.max(1, cell - inset * 2));
  }
  ctx.restore();
  return sigil;
}
