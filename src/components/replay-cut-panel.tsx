import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { INTELLIGENCE_PUBLIC_ORIGIN } from "@/lib/app-origins";
import { CUT_PACES, cutDuration, replayCoverage, type CutPace, type CutSoundtrack } from "@/lib/field/replay-director";
import { buildCutManifest, candleSourceLabel, CUT_SIZE, replayShareUrl, type CohortTick, type CutFormat, type ReplaySubject, type TapeBolt, type TapeCandle, type TapeMarketCapPoint } from "@/lib/field/replay-tape";
import type { ReplayCutInput } from "@/lib/replay-cut";

export function ReplayCutPanel({ subject, title, trader, room, bolts, cohort, candles, marketCapPoints, candleCount, start, end, scaleMode, source, evidenceLine, onClose }: {
  subject: ReplaySubject; title: string; trader: string; room: "fomo" | "afterbell" | null;
  bolts: TapeBolt[]; cohort: CohortTick[]; candles: TapeCandle[]; marketCapPoints: readonly TapeMarketCapPoint[];
  candleCount: number; start: number; end: number; scaleMode: "log" | "linear"; source: string | null;
  evidenceLine: string | null; onClose: () => void;
}) {
  const [format, setFormat] = useState<CutFormat>("portrait");
  const [pace, setPace] = useState<CutPace>(12);
  const [soundtrack, setSoundtrack] = useState<CutSoundtrack>("minimal");
  const [grey, setGrey] = useState(false);
  const [preview, setPreview] = useState(0.65);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ value: 0, label: "" });
  const [result, setResult] = useState<{ videoUrl: string; manifestUrl: string; extension: string; greyIncluded: boolean } | null>(null);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const replayUrl = replayShareUrl(typeof window === "undefined" ? INTELLIGENCE_PUBLIC_ORIGIN : window.location.origin, { ...subject, fromTs: start, toTs: end });
  const coverage = replayCoverage(bolts);
  const greyLine = `${subject.displayName ?? "This wallet"} has ${bolts.length} retained events for ${subject.symbol ?? "this token"} in this window. ${coverage.summaries ? `${coverage.summaries} are provider-reported position summaries, not individual fills. ` : ""}${coverage.receipts} have transaction references. Open Replay to inspect the sources.`;
  const sourceLine = `${candleCount ? `Candles: ${candleSourceLabel(source)}` : "Candles unavailable: event tape only"} · ${bolts.length} events · ${coverage.provider} provider-reported · ${coverage.summaries} summaries · ${subject.chainKey}`;
  const input = useMemo<ReplayCutInput>(() => ({ format, tapeSeconds: pace, soundtrack, title, roomLabel: room === "afterbell" ? "AFTERBELL" : room === "fomo" ? "FOMO" : "REPLAY", trader, heroGlyph: trader, candles, bolts, cohort, marketCapPoints, evidenceLine, start, end, scaleMode, replayUrl, sourceLine, greyLine: grey && soundtrack !== "silent" ? greyLine : null }), [format, pace, soundtrack, title, room, trader, candles, bolts, cohort, marketCapPoints, evidenceLine, start, end, scaleMode, replayUrl, sourceLine, grey, greyLine]);
  const slug = `abulls-replay-${(subject.symbol ?? subject.mint.slice(0, 6)).replace(/[^a-z0-9]+/gi, "").toLowerCase()}-${format}`;

  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  useEffect(() => () => { if (result) { URL.revokeObjectURL(result.videoUrl); URL.revokeObjectURL(result.manifestUrl); } }, [result]);
  useEffect(() => { setResult(null); setError(""); }, [format, pace, soundtrack, grey]);
  useEffect(() => {
    let cancelled = false;
    void import("@/lib/replay-cut").then(({ drawCutFrame }) => {
      if (cancelled) return;
      const ctx = canvas.current?.getContext("2d");
      if (ctx) drawCutFrame(ctx, input, preview * cutDuration(pace));
    }).catch(() => { if (!cancelled) setError("Preview could not load. Close Cut and try again."); });
    return () => { cancelled = true; };
  }, [input, preview, pace]);

  async function render() {
    setBusy(true); setError(""); setResult(null);
    try {
      const { recordReplayCut } = await import("@/lib/replay-cut");
      const cut = await recordReplayCut({ ...input, onProgress: (value, label) => setProgress({ value, label }) });
      const manifest = buildCutManifest({ subject, bolts, cohortCount: cohort.length, candleCount, candleSource: source, start, end, replayUrl, format, tapeSeconds: pace, soundtrack, greyLine: cut.greyIncluded ? input.greyLine : null });
      setResult({ videoUrl: URL.createObjectURL(cut.blob), manifestUrl: URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })), extension: cut.extension, greyIncluded: cut.greyIncluded });
    } catch (cause) {
      setError(cause instanceof Error ? `Cut could not render: ${cause.message}` : "Cut could not render in this browser. Try another browser.");
    } finally { setBusy(false); }
  }

  return <dialog ref={dialog} className="rs-cut" aria-label="Make a Cut" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className="rs-cut__card">
      <header><b>Make a Cut</b><button autoFocus type="button" className="rs-icon" aria-label="Close Cut" disabled={busy} onClick={onClose}><X size={18}/></button></header>
      <p className="rs-cut__lede">Direct {trader}’s retained timeline. Your video closes with VERIFY and the exact Replay link.</p>
      <div className="rs-cut__layout">
        <fieldset className="rs-cut__settings" disabled={busy}>
          <legend className="sr-only">Cut settings</legend>
          <label className="rs-cut__setting">Format<select value={format} onChange={e => setFormat(e.target.value as CutFormat)}><option value="portrait">Portrait · 1080 × 1920</option><option value="landscape">Landscape · 1920 × 1080</option></select></label>
          <label className="rs-cut__setting">Pacing<select value={pace} onChange={e => setPace(Number(e.target.value) as CutPace)}>{CUT_PACES.map((value, i) => <option key={value} value={value}>{["Quick", "Measured", "Deep dive"][i]} · {cutDuration(value).toFixed(1)} seconds</option>)}</select></label>
          <label className="rs-cut__setting">Sound<select value={soundtrack} onChange={e => setSoundtrack(e.target.value as CutSoundtrack)}><option value="minimal">Minimal · fill ticks + room tone</option><option value="pulse">Pulse · original synth bed + fill ticks</option><option value="silent">Silent · no audio or narration</option></select></label>
          <label className="rs-toggle"><input type="checkbox" checked={grey && soundtrack !== "silent"} disabled={soundtrack === "silent"} onChange={e => setGrey(e.target.checked)}/> Add Grey’s source summary</label>
          {grey && soundtrack !== "silent" ? <p className="rs-cut__grey">“{greyLine}”</p> : null}
          <p className="rs-cut__fine">{sourceLine}. Missing fill USD stays unavailable.</p>
        </fieldset>
        <div className="rs-cut__preview">
          <canvas ref={canvas} width={CUT_SIZE[format].width} height={CUT_SIZE[format].height} role="img" aria-label="Cut frame preview"/>
          <input type="range" min={0} max={1000} value={Math.round(preview * 1000)} aria-label="Cut preview position" onChange={e => setPreview(Number(e.target.value) / 1000)}/>
          <p>Frame preview · {(preview * cutDuration(pace)).toFixed(1)} / {cutDuration(pace).toFixed(1)}s · export includes selected sound</p>
        </div>
      </div>
      {busy ? <div className="rs-progress" role="status"><i style={{ width: `${Math.round(progress.value * 100)}%` }}/><span>{progress.label}</span></div> : null}
      {error ? <p className="rs-cut__error" role="alert">{error}</p> : null}
      {result ? <div className="rs-cut__done">
        <video src={result.videoUrl} controls playsInline className={format === "portrait" ? "is-portrait" : ""}/>
        <div className="rs-actions"><a href={result.videoUrl} download={`${slug}.${result.extension}`}>DOWNLOAD VIDEO</a><a href={result.manifestUrl} download={`${slug}.manifest.json`}>MANIFEST</a></div>
        {input.greyLine && !result.greyIncluded ? <p className="rs-cut__error">Grey is unavailable. The Cut includes your selected soundtrack without narration.</p> : null}
      </div> : <div className="rs-actions"><button type="button" disabled={busy} onClick={() => void render()}>{busy ? "RENDERING…" : `RENDER ${cutDuration(pace).toFixed(1)}s CUT`}</button></div>}
      <p className="rs-cut__fine">The manifest retains source labels, position-summary distinctions, signatures, pacing, and the verification link.</p>
    </div>
  </dialog>;
}
