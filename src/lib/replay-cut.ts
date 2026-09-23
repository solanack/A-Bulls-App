import { synthesizeCutNarration } from "@/lib/alien-voice";
import { drawTape, TAPE_BG } from "@/lib/field/replay-tape-render";
import { CUT_SIZE, type CutFormat, type TapeBolt, type TapeCandle } from "@/lib/field/replay-tape";

export type ReplayCutInput = {
  format: CutFormat;
  title: string;
  roomLabel: string;
  candles: readonly TapeCandle[];
  bolts: readonly TapeBolt[];
  start: number;
  end: number;
  replayUrl: string;
  sourceLine: string;
  greyLine: string | null;
  onProgress?: (value: number, label: string) => void;
};
export type ReplayCutResult = { blob: Blob; mimeType: string; extension: "mp4" | "webm"; greyIncluded: boolean };

const FPS = 30;
const TAPE_SECONDS = 12;
const HOLD_SECONDS = 0.8;
const VERIFY_SECONDS = 3;
export const CUT_SECONDS = TAPE_SECONDS + HOLD_SECONDS + VERIFY_SECONDS;

const when = (ms: number) => new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function wrap(ctx: CanvasRenderingContext2D, value: string, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of value) {
    if (ctx.measureText(line + ch).width > maxWidth && line) { lines.push(line); line = ""; }
    line += ch;
  }
  if (line) lines.push(line);
  return lines;
}

function drawVerify(ctx: CanvasRenderingContext2D, w: number, h: number, input: ReplayCutInput, alpha: number) {
  const k = Math.min(w, h) / 1080;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(236,218,170,.95)";
  ctx.font = `700 ${Math.round(132 * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("VERIFY", w / 2, h * 0.36);
  ctx.fillStyle = "rgba(244,242,236,.82)";
  ctx.font = `500 ${Math.round(34 * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("Every bolt is a retained print. Open the link to check it.", w / 2, h * 0.36 + 120 * k);
  ctx.fillStyle = "rgba(236,236,240,.9)";
  ctx.font = `500 ${Math.round(26 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const lines = wrap(ctx, input.replayUrl, w * 0.84);
  lines.slice(0, 6).forEach((line, i) => ctx.fillText(line, w / 2, h * 0.36 + 220 * k + i * 40 * k));
  ctx.fillStyle = "rgba(236,236,240,.46)";
  ctx.font = `600 ${Math.round(22 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText("A BULLS APP · RESEARCH ONLY · NOT A BROKER", w / 2, h - 90 * k);
  ctx.restore();
}

/** One Cut frame. t is seconds into the Cut. */
export function drawCutFrame(ctx: CanvasRenderingContext2D, input: ReplayCutInput, t: number) {
  const { width: w, height: h } = CUT_SIZE[input.format];
  const portrait = input.format === "portrait";
  const k = Math.min(w, h) / 1080;
  const cursor = Math.min(1, Math.max(0, t / TAPE_SECONDS));
  const chartTop = portrait ? 380 * k : 190 * k, chartBottom = portrait ? h - 520 * k : h - 250 * k;
  ctx.save();
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(0, chartTop);
  drawTape(ctx, { width: w, height: chartBottom - chartTop, candles: input.candles, bolts: input.bolts, start: input.start, end: input.end, cursor, scale: portrait ? 3 : 2.4, pad: { top: 24 * k, right: (portrait ? 230 : 250) * k, bottom: 64 * k, left: 56 * k } });
  ctx.restore();

  const left = 56 * k;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(236,218,170,.9)";
  ctx.font = `700 ${Math.round(24 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(input.roomLabel, left, (portrait ? 190 : 78) * k);
  ctx.fillStyle = "#f4f2ec";
  ctx.font = `680 ${Math.round((portrait ? 70 : 60) * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(wrap(ctx, input.title, w - left * 2)[0] ?? input.title, left, (portrait ? 276 : 146) * k);

  const visible = input.bolts.filter((bolt) => bolt.cursor <= cursor);
  const latest = visible.at(-1);
  const buys = visible.filter((bolt) => bolt.side === "buy").length, sells = visible.length - buys;
  const lowerTop = portrait ? h - 440 * k : h - 200 * k;
  ctx.fillStyle = "rgba(255,255,255,.06)";
  ctx.fillRect(left, lowerTop - 30 * k, w - left * 2, 1.5 * k);
  if (latest) {
    ctx.fillStyle = latest.side === "buy" ? "#3dffa2" : "#ff4d5e";
    ctx.font = `700 ${Math.round(40 * k)}px ui-sans-serif, system-ui, sans-serif`;
    const label = latest.side.toUpperCase();
    ctx.fillText(label, left, lowerTop + 22 * k);
    const offset = ctx.measureText(label).width + 18 * k;
    ctx.fillStyle = "#f4f2ec";
    ctx.font = `560 ${Math.round(36 * k)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(`· ${when(latest.timestamp)}`, left + offset, lowerTop + 22 * k);
  }
  ctx.fillStyle = "rgba(236,236,240,.7)";
  ctx.font = `500 ${Math.round(28 * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(`${buys} ${buys === 1 ? "buy" : "buys"} · ${sells} ${sells === 1 ? "sell" : "sells"} on the tape`, left, lowerTop + 80 * k);
  ctx.fillStyle = "rgba(236,236,240,.44)";
  ctx.font = `500 ${Math.round(22 * k)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  wrap(ctx, input.sourceLine, w - left * 2).slice(0, 2).forEach((line, i) => ctx.fillText(line, left, lowerTop + 132 * k + i * 32 * k));

  const verifyStart = TAPE_SECONDS + HOLD_SECONDS;
  if (t >= verifyStart) drawVerify(ctx, w, h, input, Math.min(1, (t - verifyStart) / 0.35));
}

function tickTimes(bolts: readonly TapeBolt[]) {
  const out: { at: number; side: "buy" | "sell" }[] = [];
  let last = -1;
  for (const bolt of bolts) {
    const at = bolt.cursor * TAPE_SECONDS;
    if (at - last < 0.05) continue;
    out.push({ at, side: bolt.side });
    last = at;
  }
  return out;
}

async function greyBuffer(context: BaseAudioContext, line: string | null) {
  if (!line) return null;
  try {
    const delivery = await synthesizeCutNarration({ data: { text: line, role: "grey" } });
    if (!delivery.ok || !delivery.audioBase64) return null;
    const raw = atob(delivery.audioBase64), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return await context.decodeAudioData(bytes.buffer.slice(0) as ArrayBuffer);
  } catch {
    return null;
  }
}

/** Near-silent room tone, one soft tick per bolt, optional Grey line. */
async function renderCutAudio(input: ReplayCutInput) {
  const sampleRate = 48_000, context = new OfflineAudioContext(2, Math.ceil((CUT_SECONDS + 0.1) * sampleRate), sampleRate);
  const tone = context.createOscillator(), toneGain = context.createGain();
  tone.type = "sine"; tone.frequency.value = 55;
  toneGain.gain.setValueAtTime(0.0001, 0);
  toneGain.gain.linearRampToValueAtTime(0.006, 0.6);
  toneGain.gain.setValueAtTime(0.006, CUT_SECONDS - 0.6);
  toneGain.gain.linearRampToValueAtTime(0.0001, CUT_SECONDS);
  tone.connect(toneGain).connect(context.destination);
  tone.start(0); tone.stop(CUT_SECONDS);
  for (const tick of tickTimes(input.bolts)) {
    const osc = context.createOscillator(), gain = context.createGain(), at = tick.at + 0.02;
    osc.type = "sine";
    osc.frequency.setValueAtTime(tick.side === "buy" ? 1480 : 980, at);
    osc.frequency.exponentialRampToValueAtTime(tick.side === "buy" ? 1180 : 760, at + 0.045);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.05, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    osc.connect(gain).connect(context.destination);
    osc.start(at); osc.stop(at + 0.06);
  }
  const grey = await greyBuffer(context, input.greyLine);
  if (grey) {
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = grey; gain.gain.value = 0.9;
    source.connect(gain).connect(context.destination);
    source.start(0.5, 0, Math.min(grey.duration, TAPE_SECONDS));
  }
  return { buffer: await context.startRendering(), greyIncluded: Boolean(grey) };
}

export async function recordReplayCut(input: ReplayCutInput): Promise<ReplayCutResult> {
  const progress = input.onProgress ?? (() => {});
  const { width, height } = CUT_SIZE[input.format];
  const canvas = document.createElement("canvas") as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable in this browser.");
  progress(0.02, input.greyLine ? "Preparing sound and the Grey line" : "Preparing sound");
  const audio = await renderCutAudio(input);
  const totalFrames = Math.ceil(CUT_SECONDS * FPS);
  try {
    const media = await import("mediabunny");
    const videoQuality = new media.Quality({ bitrate: 8_000_000 }), audioQuality = new media.Quality({ bitrate: 128_000 });
    const videoOk = await media.canEncodeVideo("avc", { width, height, frameRate: FPS, quality: videoQuality });
    const audioCodec = (await media.canEncodeAudio("aac", { numberOfChannels: 2, sampleRate: 48_000, quality: audioQuality })) ? "aac" : (await media.canEncodeAudio("opus", { numberOfChannels: 2, sampleRate: 48_000, quality: audioQuality })) ? "opus" : null;
    if (!videoOk || !audioCodec) throw new Error("codec_unsupported");
    const target = new media.BufferTarget();
    const output = new media.Output({ format: new media.Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const video = new media.CanvasSource(canvas, { codec: "avc", quality: videoQuality });
    const sound = new media.AudioBufferSource({ codec: audioCodec, quality: audioQuality });
    output.addVideoTrack(video); output.addAudioTrack(sound);
    output.setMetadataTags({ title: `A Bulls App · ${input.title}`, artist: "A Bulls App", comment: input.replayUrl });
    await output.start();
    await sound.add(audio.buffer); sound.close();
    for (let frame = 0; frame < totalFrames; frame++) {
      drawCutFrame(ctx, input, frame / FPS);
      await video.add(frame / FPS, 1 / FPS, frame % FPS === 0 ? { keyFrame: true } : undefined);
      if (frame % 15 === 0) progress(0.08 + 0.9 * (frame / totalFrames), `Rendering frame ${frame + 1} of ${totalFrames}`);
    }
    video.close();
    await output.finalize();
    if (!target.buffer?.byteLength) throw new Error("empty_cut");
    progress(1, "Cut ready");
    return { blob: new Blob([target.buffer], { type: "video/mp4" }), mimeType: "video/mp4", extension: "mp4", greyIncluded: audio.greyIncluded };
  } catch (error) {
    if (typeof MediaRecorder !== "function" || typeof canvas.captureStream !== "function") throw error instanceof Error ? error : new Error("This browser cannot export video.");
    const mimeType = ["video/mp4;codecs=avc1", "video/webm;codecs=vp9,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported?.(type)) ?? "video/webm";
    const live = new AudioContext(), destination = live.createMediaStreamDestination(), source = live.createBufferSource();
    source.buffer = audio.buffer; source.connect(destination);
    const stream = new MediaStream([...canvas.captureStream(FPS).getVideoTracks(), ...destination.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 }), chunks: Blob[] = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
    recorder.start(500); source.start();
    const began = performance.now();
    await new Promise<void>((resolve) => {
      const draw = () => {
        const t = (performance.now() - began) / 1000;
        drawCutFrame(ctx, input, Math.min(CUT_SECONDS, t));
        progress(0.08 + 0.9 * Math.min(1, t / CUT_SECONDS), "Recording in real time");
        if (t >= CUT_SECONDS) resolve(); else requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    });
    recorder.stop(); await stopped;
    stream.getTracks().forEach((track) => track.stop());
    await live.close();
    progress(1, "Cut ready");
    return { blob: new Blob(chunks, { type: mimeType }), mimeType, extension: mimeType.startsWith("video/mp4") ? "mp4" : "webm", greyIncluded: audio.greyIncluded };
  }
}
