export type CutFormatName = "portrait" | "landscape";

const CUT_SIZE: Record<CutFormatName, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
};

export type CutFrameLayout = {
  width: number;
  height: number;
  k: number;
  chartTop: number;
  chartBottom: number;
  lowerTop: number;
  cardH: number;
  roundY: number;
  evidenceY: number | null;
  sourceY: number;
  sourceLineCount: number;
  verifyY: number;
  lastBaseline: number;
};

export function cutPositionCardHeight(rowCount: number, width: number, k: number) {
  const columns = width > 1200 * k ? 2 : 1;
  const perColumn = Math.ceil(Math.max(1, rowCount) / columns);
  return perColumn * 34 * k + 28 * k;
}

/** Place the position card and source lines above the VERIFY footer on both canvases. */
export function cutFrameLayout(input: { format: CutFormatName; rowCount: number; evidence: boolean; sourceLines: number }): CutFrameLayout {
  const { width: w, height: h } = CUT_SIZE[input.format];
  const portrait = input.format === "portrait";
  const k = Math.min(w, h) / 1080;
  const cardH = cutPositionCardHeight(input.rowCount, w, k);
  const sourceLineCount = Math.max(1, Math.min(2, Math.trunc(input.sourceLines) || 1));
  const verifyY = h - (portrait ? 56 : 30) * k;
  const baselineGap = 40 * k;
  const afterCard = 26 * k + 28 * k + (input.evidence ? 34 * k : 0) + (sourceLineCount - 1) * 28 * k;
  const preferredLower = portrait ? h - 500 * k : h - 274 * k;
  const lowerTop = Math.min(preferredLower, verifyY - baselineGap - afterCard - cardH);
  const chartTop = portrait ? 330 * k : 170 * k;
  const preferredChartBottom = portrait ? h - 560 * k : h - 300 * k;
  const chartBottom = Math.max(chartTop + 120 * k, Math.min(preferredChartBottom, lowerTop - 16 * k));
  const roundY = lowerTop + cardH + 26 * k;
  const evidenceY = input.evidence ? roundY + 28 * k : null;
  const sourceY = roundY + 28 * k + (input.evidence ? 34 * k : 0);
  const lastBaseline = sourceY + (sourceLineCount - 1) * 28 * k;
  return { width: w, height: h, k, chartTop, chartBottom, lowerTop, cardH, roundY, evidenceY, sourceY, sourceLineCount, verifyY, lastBaseline };
}
