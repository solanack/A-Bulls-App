import { CUT_TITLE_SECONDS, cutDuration, cutTapeSeconds, cutTiming, type CutSoundtrack } from "@/lib/field/replay-director";
import { synthesizeCutNarration } from "@/lib/alien-voice";
import { BOLT, drawTape, TAPE_BG } from "@/lib/field/replay-tape-render";
import { PNL_CAVEAT, PNL_HYPOTHETICAL_LABEL, PNL_REALIZED_LABEL } from "@/lib/field/honest-pnl";
import { cutFrameLayout } from "@/lib/field/replay-cut-layout";
import { CUT_SIZE, formatUsdNotional, formatUsdPrice, tapeAvgEntryMarketCap, tapeAxis, tapeMarketCapAt, tapeMarkSummary, tapeMatchedRounds, tapeUsdSummary, type CohortTick, type CutFormat, type TapeBolt, type TapeCandle, type TapeMarketCapPoint, type TapeMarkSummary, type TapeUsdSummary } from "@/lib/field/replay-tape";
import { drawTraderSigil } from "@/lib/field/trader-sigil";
import { drawVerifyQr } from "@/lib/verify-qr";
import { cutExportNotice, FEE_GROSS_UNLESS_EMBEDDED, FIFO_MATCHED, windowRangeLabel } from "../../js/compliance-notice.mjs";

export { cutTiming } from "@/lib/field/replay-director";

export type ReplayCutInput = {
  format: CutFormat;
  tapeSeconds?: number;
  soundtrack?: CutSoundtrack;
  title: string;
  roomLabel: string;
  /** Hero trader label for the footer. */
  trader?: string;
  wallet?: string;
  candles: readonly TapeCandle[];
  bolts: readonly TapeBolt[];
  /** Cohort ticks, only when the COHORT toggle was on. */
  cohort?: readonly CohortTick[];
  marketCapPoints?: readonly TapeMarketCapPoint[];
  evidenceLine?: string | null;
  heroGlyph?: string | null;
  start: number;
  end: number;
  scaleMode?: "log" | "linear";
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
export const CUT_SECONDS = TAPE_SECONDS + CUT_TITLE_SECONDS + HOLD_SECONDS + VERIFY_SECONDS;

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

function replayCutNotice(input: ReplayCutInput) {
  return cutExportNotice({
    method: FIFO_MATCHED,
    fees: FEE_GROSS_UNLESS_EMBEDDED,
    windowLabel: windowRangeLabel(input.start, input.end),
    verifyUrl: input.replayUrl,
  });
}

function drawNoticeBand(ctx: CanvasRenderingContext2D, w: number, h: number, k: number, notice: string) {
  const font = Math.max(32, Math.round(32 * k));
  ctx.save();
  ctx.font = `500 ${font}px ui-sans-serif,system-ui,sans-serif`;
  const lines = wrap(ctx, notice, w * 0.9).slice(0, 8);
  const lineH = Math.round(font * 1.25);
  const bandH = lines.length * lineH + 28 * k;
  const y = h - bandH - 16 * k;
  ctx.fillStyle = "rgba(5,7,13,.92)";
  ctx.fillRect(0, y, w, h - y);
  ctx.fillStyle = "#f4f1ea";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => ctx.fillText(line, w * 0.05, y + 14 * k + i * lineH));
  ctx.restore();
  return y;
}

function drawVerify(ctx: CanvasRenderingContext2D, w: number, h: number, input: ReplayCutInput, alpha: number) {
  const k = Math.min(w, h) / 1080, qrSize = Math.min(w * .48, 460 * k), qrX = (w - qrSize) / 2, qrY = h * .42;
  ctx.save();ctx.globalAlpha = alpha;ctx.fillStyle = TAPE_BG;ctx.fillRect(0, 0, w, h);
  if(input.wallet)drawTraderSigil(ctx,input.wallet,w/2-58*k,h*.16,116*k,{foreground:"rgba(236,218,170,.96)",background:"rgba(255,255,255,.035)"});
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="rgba(236,218,170,.97)";ctx.font=`800 ${Math.round(116*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillText("VERIFY",w/2,h*.31);
  ctx.fillStyle="rgba(244,242,236,.78)";ctx.font=`540 ${Math.round(30*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillText("Scan to reopen the evidence-backed Replay.",w/2,h*.36);
  drawVerifyQr(ctx,input.replayUrl,qrX,qrY,qrSize);
  ctx.fillStyle="rgba(236,236,240,.7)";ctx.font=`520 ${Math.round(32*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillText(shortUrl(input.replayUrl).slice(0,72),w/2,qrY+qrSize+48*k);
  const bandTop = drawNoticeBand(ctx, w, h, k, replayCutNotice(input));
  const researchY = bandTop - 28 * k;
  if (researchY > qrY + qrSize + 64 * k) {
    ctx.fillStyle = "#f4f1ea";
    ctx.font = `700 ${Math.max(32, Math.round(32 * k))}px ui-sans-serif,system-ui,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("RESEARCH ONLY · NOT A BROKER", w / 2, researchY);
  }
  ctx.restore();
}

const timingCache = new WeakMap<readonly TapeBolt[], Map<number, ReturnType<typeof cutTiming>>>();
function timingFor(bolts: readonly TapeBolt[], tapeSeconds = TAPE_SECONDS) {
  const seconds = cutTapeSeconds(tapeSeconds);
  let byPace = timingCache.get(bolts);
  if (!byPace) { byPace = new Map(); timingCache.set(bolts, byPace); }
  let timing = byPace.get(seconds);
  if (!timing) { timing = cutTiming(bolts, seconds); byPace.set(seconds, timing); }
  return timing;
}
function shortUrl(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

function drawTitleCard(ctx:CanvasRenderingContext2D,w:number,h:number,input:ReplayCutInput,t:number){
  const k=Math.min(w,h)/1080,progress=Math.min(1,Math.max(0,t/CUT_TITLE_SECONDS)),ease=1-Math.pow(1-progress,3);
  ctx.save();ctx.fillStyle=TAPE_BG;ctx.fillRect(0,0,w,h);
  ctx.globalAlpha=.12+.18*ease;ctx.fillStyle=input.roomLabel==="FOMO"?"#7d33d9":"#ead9a8";ctx.beginPath();ctx.arc(w*.5,h*.44,(140+360*ease)*k,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;if(input.wallet)drawTraderSigil(ctx,input.wallet,w/2-78*k,h*.23,156*k,{foreground:input.roomLabel==="FOMO"?"#d7b5ff":"#fff0bf",background:"rgba(255,255,255,.025)"});
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle=input.roomLabel==="FOMO"?"#d7b5ff":"#ead9a8";ctx.font=`800 ${Math.round(24*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillText(input.roomLabel,w/2,h*.43);
  ctx.fillStyle="#f4f2ec";ctx.font=`760 ${Math.round(64*k)}px ui-sans-serif,system-ui,sans-serif`;const lines=wrap(ctx,input.title,w*.82);lines.slice(0,2).forEach((line,i)=>ctx.fillText(line,w/2,h*.50+i*74*k));
  ctx.fillStyle="rgba(236,236,240,.48)";ctx.font=`620 ${Math.round(20*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillText("STUDY THE TRADER · REPLAY THE TRADE · VERIFY THE STORY",w/2,h*.68);ctx.restore();
}

function drawGreyCaption(ctx:CanvasRenderingContext2D,w:number,h:number,line:string|null,k:number,alpha:number){
  if(!line||alpha<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,alpha);ctx.font=`620 ${Math.round(28*k)}px ui-sans-serif,system-ui,sans-serif`;const lines=wrap(ctx,line,w*.78).slice(0,3),lineH=38*k,boxH=lines.length*lineH+34*k,y=h*.72-boxH/2;
  ctx.fillStyle="rgba(5,6,10,.82)";ctx.beginPath();ctx.roundRect(w*.1,y,w*.8,boxH,16*k);ctx.fill();ctx.strokeStyle="rgba(236,218,170,.22)";ctx.stroke();ctx.fillStyle="#f4f2ec";ctx.textAlign="center";ctx.textBaseline="middle";lines.forEach((text,i)=>ctx.fillText(text,w/2,y+22*k+i*lineH));ctx.restore();
}
function drawReceiptStamp(ctx:CanvasRenderingContext2D,w:number,h:number,k:number,progress:number){
  if(progress<=0)return;const pop=1+Math.sin(Math.min(1,progress)*Math.PI)*.18;ctx.save();ctx.translate(w*.73,h*.72);ctx.rotate(-.11);ctx.scale(pop,pop);ctx.globalAlpha=Math.min(1,progress*2);ctx.strokeStyle="rgba(212,57,65,.92)";ctx.fillStyle="rgba(212,57,65,.92)";ctx.lineWidth=6*k;ctx.strokeRect(-155*k,-44*k,310*k,88*k);ctx.font=`900 ${Math.round(36*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("RECEIPT VERIFIED",0,0);ctx.restore();
}

function cutMarkUsd(value:number|null){return value==null?"—":value===0?"$0":formatUsdNotional(value);}
function cutSignedUsd(value:number|null){if(value==null||!Number.isFinite(value))return"—";if(value===0)return"$0";return `${value>0?"+":"−"}${formatUsdNotional(Math.abs(value))}`;}
function cutPct(value:number|null){if(value==null||!Number.isFinite(value))return null;const pct=value*100;return `${pct>=0?"+":"−"}${Math.abs(pct)>=10?Math.abs(pct).toFixed(0):Math.abs(pct).toFixed(1)}%`;}
function drawPositionCard(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,k:number,summary:TapeUsdSummary,mark:TapeMarkSummary,avgEntryMc:number|null){
  const rows:{label:string;value:string;tone?:"buy"|"sell"}[]=[
    {label:"Bought · retained fills",value:summary.boughtUsd!=null?formatUsdNotional(summary.boughtUsd):"—",tone:"buy"},
    {label:"Marked · current tape",value:cutMarkUsd(mark.markedUsd)},
  ];
  rows.push({label:PNL_REALIZED_LABEL,value:cutSignedUsd(mark.realizedUsd),tone:mark.realizedUsd!=null&&mark.realizedUsd>=0?"buy":mark.realizedUsd!=null?"sell":undefined});
  const unrealizedPct=cutPct(mark.deltaPct);rows.push({label:PNL_HYPOTHETICAL_LABEL,value:`${cutSignedUsd(mark.deltaUsd)}${unrealizedPct?` · ${unrealizedPct}`:""}`,tone:mark.deltaUsd!=null&&mark.deltaUsd>=0?"buy":mark.deltaUsd!=null?"sell":undefined});
  rows.push({label:"Avg buy",value:formatUsdPrice(summary.avgBuyUsd)});
  if(avgEntryMc!=null)rows.push({label:"Avg entry MC",value:formatUsdNotional(avgEntryMc)});
  if(summary.sellTotal>0){rows.push({label:"Sold",value:summary.soldUsd!=null?formatUsdNotional(summary.soldUsd):"—",tone:"sell"});rows.push({label:"Avg sell",value:formatUsdPrice(summary.avgSellUsd)});}
  const columns = w > 1200 * k ? 2 : 1, perColumn = Math.ceil(rows.length / columns), columnW = w / columns;
  const rowH=34*k,h=perColumn*rowH+28*k;ctx.save();ctx.fillStyle="rgba(9,10,14,.82)";ctx.strokeStyle="rgba(236,236,240,.16)";ctx.lineWidth=1.2*k;ctx.beginPath();ctx.roundRect(x,y,w,h,16*k);ctx.fill();ctx.stroke();
  rows.forEach((row,i)=>{const yy=y+22*k+(i % perColumn)*rowH, xx=x+Math.floor(i / perColumn)*columnW;ctx.textAlign="left";ctx.textBaseline="middle";ctx.font=`560 ${Math.round(22*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillStyle="rgba(236,236,240,.58)";ctx.fillText(row.label,xx+18*k,yy);ctx.textAlign="right";ctx.font=`780 ${Math.round(24*k)}px ui-sans-serif,system-ui,sans-serif`;ctx.fillStyle=row.tone==="buy"?BOLT.buy.fill:row.tone==="sell"?BOLT.sell.fill:"#eadcaa";ctx.fillText(row.value,xx+columnW-18*k,yy);});
  ctx.restore();return h;
}


/** One Cut frame. t is seconds into the Cut. */
export function drawCutFrame(ctx: CanvasRenderingContext2D, input: ReplayCutInput, t: number) {
  const { width: w, height: h } = CUT_SIZE[input.format];
  const portrait = input.format === "portrait";
  const k = Math.min(w, h) / 1080;
  const tapeSeconds = cutTapeSeconds(input.tapeSeconds);
  if(t<CUT_TITLE_SECONDS){drawTitleCard(ctx,w,h,input,t);return;}
  const tapeT=Math.max(0,t-CUT_TITLE_SECONDS),timing = timingFor(input.bolts, tapeSeconds);
  const cursor = timing.schedule.cursorAt(Math.min(1, Math.max(0, tapeT / tapeSeconds)));
  const visible = input.bolts.filter((bolt) => bolt.cursor <= cursor);
  const tapeTime=tapeAxis(input.candles,input.start,input.end).timeAt(cursor),visibleCandles=input.candles.filter((candle)=>candle.timestamp<=tapeTime);
  const mark=tapeMarkSummary(visible,visibleCandles),summary=tapeUsdSummary(visible),marketCap=tapeMarketCapAt(input.marketCapPoints??[],tapeTime,cursor>=.999),avgEntryMc=tapeAvgEntryMarketCap(visible,input.marketCapPoints??[]),roundLine=tapeMatchedRounds(visible,mark.realizedUsd).line;
  const strikeAge = (bolt: TapeBolt) => { const at = timing.arrivalAt.get(bolt.id); return at == null || tapeT < at ? null : (tapeT - at) * 1000; };
  const left = 56 * k;
  const rowCount = 5 + (avgEntryMc != null ? 1 : 0) + (summary.sellTotal > 0 ? 2 : 0);
  const noticeFont = Math.max(32, Math.round(32 * k));
  ctx.font = `500 ${noticeFont}px ui-sans-serif, system-ui, sans-serif`;
  const notice = replayCutNotice(input);
  const noticeLines = wrap(ctx, notice, w - left * 2 - 24 * k).slice(0, 8);
  ctx.font = `520 ${Math.round(20 * k)}px ui-sans-serif, system-ui, sans-serif`;
  const sourceLines = wrap(ctx, input.sourceLine, w - left * 2).slice(0, 2);
  const layout = cutFrameLayout({ format: input.format, rowCount, evidence: Boolean(input.evidenceLine), sourceLines: sourceLines.length, noticeLines: noticeLines.length });
  const chartTop = layout.chartTop, chartBottom = layout.chartBottom;
  ctx.save();
  ctx.fillStyle = TAPE_BG;
  ctx.fillRect(0, 0, w, h);
  ctx.translate(0, chartTop);
  drawTape(ctx, { width: w, height: chartBottom - chartTop, candles: input.candles, bolts: input.bolts, cohort: input.cohort?.length ? input.cohort : undefined, marketCapUsd:marketCap, mark, heroGlyph:input.heroGlyph??input.trader??null, start: input.start, end: input.end, cursor, scaleMode: input.scaleMode ?? "log", scarPx: 18, strikeAge, scale: portrait ? 3 : 2.4, pad: { top: 78 * k, right: (portrait ? 210 : 230) * k, bottom: 64 * k, left: 24 * k } });
  ctx.restore();

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(236,218,170,.9)";
  ctx.font = `800 ${Math.round(24 * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(input.roomLabel, left, (portrait ? 190 : 78) * k);
  ctx.fillStyle = "#f4f2ec";
  ctx.font = `680 ${Math.round((portrait ? 70 : 60) * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(wrap(ctx, input.title, w - left * 2)[0] ?? input.title, left, (portrait ? 276 : 146) * k);

  const lowerTop = layout.lowerTop;
  const cardW = w - left * 2;
  drawPositionCard(ctx, left, lowerTop, cardW, k, summary, mark, avgEntryMc);
  ctx.fillStyle = "rgba(236,236,240,.62)";
  ctx.font = `560 ${Math.round(20 * k)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText(`${roundLine} · ${PNL_CAVEAT}`, left, layout.roundY);
  if (input.evidenceLine && layout.evidenceY != null) {
    ctx.fillStyle = "rgba(236,236,240,.52)";
    ctx.font = `520 ${Math.round(22 * k)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(input.evidenceLine, left, layout.evidenceY);
  }
  ctx.fillStyle = "rgba(236,236,240,.44)";
  ctx.font = `520 ${Math.round(20 * k)}px ui-sans-serif, system-ui, sans-serif`;
  sourceLines.forEach((line, i) => ctx.fillText(line, left, layout.sourceY + i * 28 * k));

  ctx.fillStyle = "rgba(236,218,170,.62)";
  ctx.font = `650 ${Math.max(32, Math.round(20 * k))}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText(`VERIFY · ${wrap(ctx, shortUrl(input.replayUrl), w - left * 2 - 150 * k)[0] ?? ""}`, left, layout.verifyY);
  if (layout.noticeY != null && noticeLines.length) {
    const lineH = 40 * k;
    const boxH = noticeLines.length * lineH + 16 * k;
    ctx.fillStyle = "rgba(5,7,13,.92)";
    ctx.beginPath();
    ctx.roundRect(left, layout.noticeY - 28 * k, cardW, boxH, 12 * k);
    ctx.fill();
    ctx.fillStyle = "#f4f1ea";
    ctx.font = `500 ${noticeFont}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    noticeLines.forEach((line, i) => ctx.fillText(line, left + 12 * k, layout.noticeY! + i * lineH));
  }

  const captionAlpha=tapeT<Math.min(7,tapeSeconds)?Math.min(1,tapeT/0.45)*Math.min(1,(Math.min(7,tapeSeconds)-tapeT)/.5):0;
  drawGreyCaption(ctx,w,h,input.greyLine,k,captionAlpha);
  const stampProgress=Math.max(0,Math.min(1,(tapeT-tapeSeconds)/Math.max(.01,HOLD_SECONDS)));
  drawReceiptStamp(ctx,w,h,k,stampProgress);
  const verifyStart = CUT_TITLE_SECONDS + tapeSeconds + HOLD_SECONDS;
  if (t >= verifyStart) drawVerify(ctx, w, h, input, Math.min(1, (t - verifyStart) / 0.35));
}

function tickTimes(bolts: readonly TapeBolt[], tapeSeconds: number) {
  const timing = timingFor(bolts, tapeSeconds);
  const seen = new Set<string>();
  return bolts.flatMap(bolt => {
    if (bolt.eventScope === "position-summary") return [];
    const at = timing.arrivalAt.get(bolt.id) ?? bolt.cursor * tapeSeconds;
    const key = `${Math.round(at * 1000)}:${bolt.side}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ at, side: bolt.side }];
  });
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
  const tapeSeconds = cutTapeSeconds(input.tapeSeconds), seconds = cutDuration(tapeSeconds);
  const soundtrack = input.soundtrack ?? "minimal";
  const sampleRate = 48_000, context = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  if (soundtrack !== "silent") {
  const tone = context.createOscillator(), toneGain = context.createGain();
  tone.type = "sine"; tone.frequency.value = 55;
  toneGain.gain.setValueAtTime(0.0001, 0);
  toneGain.gain.linearRampToValueAtTime(0.006, 0.6);
  toneGain.gain.setValueAtTime(0.006, seconds - 0.6);
  toneGain.gain.linearRampToValueAtTime(0.0001, seconds);
  tone.connect(toneGain).connect(context.destination);
  tone.start(0); tone.stop(seconds);
  for (const tick of tickTimes(input.bolts, tapeSeconds)) {
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
  if (soundtrack === "pulse") {
    // Original synthesized bed; no remote music or licensing dependency.
    const notes = [110, 164.81, 146.83, 130.81];
    for (let beat = 0; beat * 0.6 < tapeSeconds; beat++) {
      const at = beat * 0.6, osc = context.createOscillator(), gain = context.createGain();
      osc.type = "sine"; osc.frequency.value = notes[Math.floor(beat / 4) % notes.length];
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(input.greyLine ? 0.014 : 0.026, at + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.48);
      osc.connect(gain).connect(context.destination); osc.start(at); osc.stop(at + 0.5);
    }
  }
  }
  const grey = await greyBuffer(context, soundtrack === "silent" ? null : input.greyLine);
  if (grey) {
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = grey; gain.gain.value = 0.9;
    source.connect(gain).connect(context.destination);
    source.start(0.7, 0, Math.min(grey.duration, tapeSeconds));
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
  const seconds = cutDuration(input.tapeSeconds);
  const totalFrames = Math.ceil(seconds * FPS);
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
        drawCutFrame(ctx, input, Math.min(seconds, t));
        progress(0.08 + 0.9 * Math.min(1, t / seconds), "Recording in real time");
        if (t >= seconds) resolve(); else requestAnimationFrame(draw);
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
