export type CutRatio = "9:16" | "16:9" | "1:1";
export type CutExportKind = "webcodecs" | "media-recorder" | "poster";

export type CutCandle = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type CutEvent = {
  timestamp: number;
  side?: string;
  signature?: string;
  verification?: string;
};

export type CutShareInput = {
  candles: readonly CutCandle[];
  events: readonly CutEvent[];
  coverageStatement: string;
  verifyUrl: string;
  shareId: string;
  tokenLabel: string;
  fromTs: number;
  toTs: number;
  aspectRatio: CutRatio;
};

export type CutPaintContext = {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  globalAlpha: number;
  lineWidth: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number, maxWidth?: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  arc(x: number, y: number, r: number, a0: number, a1: number): void;
  fill(): void;
};

export const CUT_EXPORT_SIZE: Record<CutRatio, { w: number; h: number }> = {
  "9:16": { w: 1080, h: 1920 },
  "16:9": { w: 1920, h: 1080 },
  "1:1": { w: 1080, h: 1080 },
};

const SHORT_SIG = (value: string) =>
  value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;

export function exportCanvasSize(ratio: CutRatio = "9:16") {
  return CUT_EXPORT_SIZE[ratio] ?? CUT_EXPORT_SIZE["9:16"];
}

export function shareIdFromLocationSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  return String(params.get("verify") || params.get("tour") || "").trim();
}

export function cutVerifyHref(origin: string, shareId: string): string {
  const base = origin.replace(/\/$/, "") || "https://abullsapp.com";
  return `${base}/?verify=${encodeURIComponent(shareId)}`;
}

export function probeCutExportCapability(
  win: { VideoEncoder?: unknown; MediaRecorder?: unknown } = globalThis,
): CutExportKind {
  if (typeof win.VideoEncoder === "function") return "webcodecs";
  if (typeof win.MediaRecorder === "function") return "media-recorder";
  return "poster";
}

export function preferredCutArtifactKind(
  win: { MediaRecorder?: unknown } = globalThis,
): "webm" | "png" {
  try {
    const Recorder = win.MediaRecorder as { isTypeSupported?: (type: string) => boolean } | undefined;
    if (typeof Recorder?.isTypeSupported === "function" && (Recorder.isTypeSupported("video/webm;codecs=vp9") || Recorder.isTypeSupported("video/webm"))) {
      return "webm";
    }
  } catch {
    /* poster fallback */
  }
  return "png";
}

export function formatCutWindow(fromTs: number, toTs: number): string {
  const from = formatCutTime(fromTs);
  const to = formatCutTime(toTs);
  if (from === "time unavailable" && to === "time unavailable") return "time window unavailable";
  return `${from} → ${to}`;
}

export function formatCutTime(value: number): string {
  if (!value) return "time unavailable";
  const ms = value < 10_000_000_000 ? value * 1000 : value;
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "time unavailable";
  }
}

/** Burn-in lines for the share artifact. Missing stays missing — no invented signatures. */
export function cutShareReceiptLines(input: CutShareInput): string[] {
  const sigs = input.events
    .map((event) => String(event.signature ?? "").trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((sig) => `SIG ${SHORT_SIG(sig)}`);
  const lines = [
    "INDEXED",
    formatCutWindow(input.fromTs, input.toTs),
    ...sigs,
    `VERIFY ${input.verifyUrl}`,
  ];
  if (!sigs.length) lines.splice(2, 0, "signature unavailable");
  return lines;
}

export function paintCutPoster(ctx: CutPaintContext, input: CutShareInput, size = exportCanvasSize(input.aspectRatio)): void {
  const { w, h } = size;
  ctx.fillStyle = "#05060c";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(76,68,240,0.16)";
  ctx.fillRect(0, 0, w, Math.round(h * 0.38));
  ctx.fillStyle = "rgba(8,210,205,0.08)";
  ctx.fillRect(0, Math.round(h * 0.55), w, Math.round(h * 0.45));

  const pad = Math.round(w * 0.07);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#65f4d2";
  ctx.font = `700 ${Math.round(w * 0.028)}px ui-monospace, monospace`;
  ctx.fillText("INDEXED", pad, pad + Math.round(w * 0.04));

  ctx.fillStyle = "#f5f8ff";
  ctx.font = `600 ${Math.round(w * 0.062)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(input.tokenLabel || "This trade", pad, pad + Math.round(w * 0.12), w - pad * 2);

  ctx.fillStyle = "#8ee9ff";
  ctx.font = `500 ${Math.round(w * 0.028)}px ui-monospace, monospace`;
  ctx.fillText(formatCutWindow(input.fromTs, input.toTs), pad, pad + Math.round(w * 0.17), w - pad * 2);

  const chartTop = pad + Math.round(w * 0.22);
  const chartH = Math.round(h * (input.aspectRatio === "9:16" ? 0.42 : 0.36));
  const chartW = w - pad * 2;
  paintIndexedChart(ctx, input.candles, input.events, pad, chartTop, chartW, chartH);

  const receiptTop = chartTop + chartH + Math.round(w * 0.06);
  ctx.fillStyle = "#f5f8ff";
  ctx.font = `650 ${Math.round(w * 0.032)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("Receipts for this trade", pad, receiptTop);
  ctx.fillStyle = "#9ab0c2";
  ctx.font = `500 ${Math.round(w * 0.026)}px ui-monospace, monospace`;
  const receiptLines = cutShareReceiptLines(input).filter((line) => line !== "INDEXED");
  receiptLines.forEach((line, index) => {
    ctx.fillText(line, pad, receiptTop + Math.round(w * 0.05) + index * Math.round(w * 0.04), w - pad * 2);
  });

  ctx.fillStyle = "#8298aa";
  ctx.font = `500 ${Math.round(w * 0.022)}px ui-monospace, monospace`;
  ctx.fillText(
    input.coverageStatement || "Currently indexed evidence only. Missing coverage stays missing.",
    pad,
    h - pad,
    w - pad * 2,
  );
}

function paintIndexedChart(
  ctx: CutPaintContext,
  candles: readonly CutCandle[],
  events: readonly CutEvent[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "rgba(2,4,10,0.72)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(142,233,255,0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y);
  ctx.stroke();

  const rows = candles.filter((row) => Number.isFinite(row.high) || Number.isFinite(row.low));
  if (rows.length < 2) {
    ctx.fillStyle = "#8e9db0";
    ctx.font = "500 28px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("No indexed OHLC. Receipts only.", x + w / 2, y + h / 2);
    ctx.fillText("No price path was invented.", x + w / 2, y + h / 2 + 40);
    ctx.textAlign = "left";
    return;
  }

  const shown = rows.slice(-110);
  const highs = shown.map((row) => row.high);
  const lows = shown.map((row) => row.low);
  const high = Math.max(...highs);
  const low = Math.min(...lows);
  const range = Math.max(Number.EPSILON, high - low);
  const innerX = (index: number) => x + 16 + (index * (w - 32)) / Math.max(1, shown.length - 1);
  const innerY = (value: number) => y + 16 + (1 - (value - low) / range) * (h - 32);

  shown.forEach((row, index) => {
    const px = innerX(index);
    const up = row.close >= row.open;
    ctx.strokeStyle = up ? "#42efbd" : "#ff5b82";
    ctx.fillStyle = up ? "#42efbd" : "#ff5b82";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, innerY(row.high));
    ctx.lineTo(px, innerY(row.low));
    ctx.stroke();
    const top = Math.min(innerY(row.open), innerY(row.close));
    const height = Math.max(2, Math.abs(innerY(row.open) - innerY(row.close)));
    ctx.fillRect(px - 3, top, 6, height);
  });

  events.forEach((event) => {
    if (!event.timestamp) return;
    const nearest = shown.reduce(
      (best, row, index) => {
        const delta = Math.abs(row.timestamp - event.timestamp);
        return delta < best.delta ? { index, delta } : best;
      },
      { index: 0, delta: Number.POSITIVE_INFINITY },
    );
    const px = innerX(nearest.index);
    ctx.fillStyle = "#8ee9ff";
    ctx.beginPath();
    ctx.arc(px, y + 28, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function cutShareFilename(shareId: string, kind: "png" | "webm" = "png"): string {
  return `abulls-cut-${shareId.slice(0, 8)}.${kind}`;
}

export function cutShareCopy(verifyUrl: string): { title: string; text: string } {
  return {
    title: "VERIFY this Cut",
    text: `Indexed receipts for this trade. VERIFY: ${verifyUrl}`,
  };
}

export async function canvasToBlob(
  canvas: { toBlob?: (cb: (blob: Blob | null) => void, type?: string) => void; convertToBlob?: (opts?: { type?: string }) => Promise<Blob> },
  type = "image/png",
): Promise<Blob> {
  if (typeof canvas.convertToBlob === "function") return canvas.convertToBlob({ type });
  const toBlob = canvas.toBlob;
  if (typeof toBlob !== "function") throw new Error("canvas_blob_unavailable");
  return await new Promise((resolve, reject) => {
    toBlob.call(canvas, (blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas_blob_unavailable"));
    }, type);
  });
}

export async function recordCanvasWebm(
  canvas: { captureStream?: (fps?: number) => MediaStream },
  ms = 1600,
  rec: { MediaRecorder?: typeof MediaRecorder; setTimeout?: typeof setTimeout } = globalThis,
): Promise<Blob | null> {
  const stream = canvas.captureStream?.(15);
  const Recorder = rec.MediaRecorder;
  if (!stream || typeof Recorder !== "function") return null;
  const mime = Recorder.isTypeSupported?.("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : Recorder.isTypeSupported?.("video/webm")
      ? "video/webm"
      : "";
  if (!mime) return null;
  return await new Promise((resolve) => {
    const chunks: BlobPart[] = [];
    const recorder = new Recorder(stream, { mimeType: mime });
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onerror = () => resolve(null);
    recorder.onstop = () => resolve(chunks.length ? new Blob(chunks, { type: mime }) : null);
    try {
      recorder.start();
      (rec.setTimeout ?? setTimeout)(() => {
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      }, ms);
    } catch {
      resolve(null);
    }
  });
}

export function downloadCutFile(blob: Blob, filename: string): void {
  const doc = globalThis.document;
  if (!doc) return;
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function shareCutArtifact(input: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
  url: string;
  nav?: Pick<Navigator, "share" | "canShare" | "clipboard">;
}): Promise<"shared" | "copied" | "downloaded" | "cancelled"> {
  const file = new File([input.blob], input.filename, { type: input.blob.type || "image/png" });
  const nav = input.nav ?? (typeof navigator === "undefined" ? undefined : navigator);
  const withFile = { files: [file], title: input.title, text: input.text };
  const withLink = { title: input.title, text: input.text, url: input.url };
  try {
    // Files + url together is often rejected by Web Share; put VERIFY in the text instead.
    if (nav && typeof nav.share === "function") {
      try {
        if (typeof nav.canShare === "function" && nav.canShare(withFile)) {
          await nav.share(withFile);
          return "shared";
        }
      } catch {
        /* canShare throws on some browsers when files are unsupported */
      }
      await nav.share(withLink);
      return "shared";
    }
    if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
      await nav.clipboard.writeText(input.url);
      return "copied";
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
  }
  return "downloaded";
}
