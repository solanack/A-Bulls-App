import { useEffect, useMemo, useRef, useState } from "react";
import { INTELLIGENCE_PUBLIC_ORIGIN } from "@/lib/app-origins";
import { ArrowLeft, CalendarDays, Pause, Play, Share2, SkipBack, SkipForward, Star, Users, Volume2, VolumeX, X } from "lucide-react";
import { callUniverseTool } from "@/lib/universe-intelligence";
import { loadResearchThread, saveResearchThread } from "@/lib/research-thread-store";
import { requestTradeResearchMode } from "@/lib/field/trade-research-navigation";
import { anchorBolts, buildCutManifest, candleSource, candleSourceLabel, cohortTicks, explorerUrl, formatUsdNotional, formatUsdPrice, fullTape, groupBolts, hopSchedule, replayShareUrl, replaySubjectFrom, replayToolInput, STRIKE_MS, tapeCandles, tapeEvents, tapeEvidenceLine, tapeHeaderLine, tapeScaleFor, tapeUsdCoverage, tapeUsdSummary, tapeWindow, type CohortTick, type CutFormat, type ReplaySubject, type TapeBolt, type TapeCandle, type TapeUsdSummary } from "@/lib/field/replay-tape";
import { drawTape, hitBolt, type BoltHit } from "@/lib/field/replay-tape-render";
import { callsign } from "@/lib/field/trader-sheet";
import { getAfterbellGalaxy, XSTOCK_REGISTRY } from "@/lib/universe-data/afterbell-client";
import { isWatched, type WatchItem } from "@/lib/field/watchlist";
import { socialDay0 } from "@/lib/field/social-window";
import { prefetchThatDay, ReplaySocialStrip } from "@/components/replay-social-strip";
import { getReplayCohort } from "@/lib/universe-data/replay-cohort-client";

type Data = Record<string, unknown>;
type Status = "loading" | "building" | "ready" | "empty" | "error";
const obj = (value: unknown): Data => (value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {});
const MAX_HYDRATION_ATTEMPTS = 18;
const TICKS_KEY = "abulls-replay-ticks";
const COHORT_KEY = "abulls-replay-cohort";
const SPEEDS = [0.5, 1, 2, 4] as const;
const ROOM_CHIP = { fomo: "FOMO", afterbell: "AFTERBELL" } as const;
const when = (ms: number) => new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const amountLabel = (value: number | null) => (value == null ? null : value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value >= 1 ? value.toFixed(2) : value.toPrecision(3));

function initialSubject() {
  if (typeof window === "undefined") return null;
  return replaySubjectFrom(window.location.search, loadResearchThread());
}

export type ReplayWatchRequest = { kind: "wallet" | "token"; wallet: string; mint: string; chainKey: string; room: "fomo" | "afterbell" | null; name: string | null; handle: string | null; symbol: string | null; lastPrint: { side: string; at: number; symbol: string | null } | null };

export function ReplayStudio({ muted, onBack, onOpenRoom, watchlist = [], onToggleWatch }: { muted: boolean; onToggleMute?: () => void; onBack: () => void; onOpenRoom: (room: "fomo" | "afterbell") => void; watchlist?: readonly WatchItem[]; onToggleWatch?: (request: ReplayWatchRequest) => void }) {
  const [subject] = useState<ReplaySubject | null>(initialSubject);
  const [bundle, setBundle] = useState<Data | null>(null);
  const [status, setStatus] = useState<Status>(subject ? "loading" : "empty");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [cursor, setCursor] = useState(subject?.cursor ?? 0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareNote, setShareNote] = useState("");
  const [cutOpen, setCutOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [ticksOn, setTicksOn] = useState(() => { try { return globalThis.localStorage?.getItem(TICKS_KEY) === "1"; } catch { return false; } });
  const [cohortOn, setCohortOn] = useState(() => { try { return globalThis.localStorage?.getItem(COHORT_KEY) !== "0"; } catch { return true; } });
  const [cohortItems, setCohortItems] = useState<unknown[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null), frameRef = useRef<HTMLDivElement | null>(null), hitsRef = useRef<BoltHit[]>([]), audioRef = useRef<{ ctx: AudioContext; tone: GainNode } | null>(null), lastTickRef = useRef(0), cursorRef = useRef(cursor), progressRef = useRef(0), strikesRef = useRef(new Map<string, number>()), visitedRef = useRef(new Set<string>()), drawRef = useRef<() => void>(() => {});
  const audible = ticksOn && !muted;
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });

  const candles = useMemo(() => tapeCandles(bundle?.candles), [bundle]);
  const events = useMemo(() => tapeEvents(bundle?.events), [bundle]);
  const window_ = useMemo(() => (subject ? tapeWindow(bundle?.window, candles, events, subject) : { start: 0, end: 1 }), [bundle, candles, events, subject]);
  const view = useMemo(() => fullTape(candles, events, window_), [candles, events, window_]);
  const bolts = useMemo(() => anchorBolts(events, candles, view.start, view.end), [events, candles, view]);
  const ticks = useMemo(() => cohortTicks(cohortItems, candles, view.start, view.end), [cohortItems, candles, view]);
  const firstBuy = events.find((event) => event.side === "buy")?.timestamp ?? null;
  const groups = useMemo(() => groupBolts(bolts), [bolts]);
  const schedule = useMemo(() => hopSchedule(groups.map((group) => group.cursor)), [groups]);
  const playMs = Math.min(16_000, Math.max(4_000, schedule.stops.length * 900));
  const selected = bolts.find((bolt) => bolt.id === selectedId) ?? null;
  const selectedTick = cohortOn ? ticks.find((tick) => tick.id === selectedId) ?? null : null;
  const visible = bolts.filter((bolt) => bolt.cursor <= cursor);
  const usdSummary = tapeUsdSummary(visible);
  const latest = visible.at(-1) ?? null;
  const source = candleSource(bundle?.candles);
  const room = subject?.room ?? (subject?.chainKey === "solana" && /^Xs/.test(subject.mint) ? "afterbell" : subject ? "fomo" : null);
  const scaleMode = tapeScaleFor(room);
  const [resolvedSymbol, setResolvedSymbol] = useState<string | null>(null);
  const handle = useMemo(() => { for (const row of Array.isArray(bundle?.events) ? bundle.events : []) { const value = obj(obj(row).evidence).handle; if (typeof value === "string" && value.trim()) return value.trim(); } return null; }, [bundle]);
  const title = subject ? `${subject.displayName ?? handle ?? callsign(subject.wallet)} · ${subject.symbol ?? resolvedSymbol ?? callsign(subject.mint)}` : "Replay";
  useEffect(() => {
    if (!subject || subject.symbol || subject.chainKey !== "solana") return;
    const known = XSTOCK_REGISTRY.find((item) => item.mintHint === subject.mint);
    if (known) { setResolvedSymbol(known.symbol); return; }
    let cancelled = false;
    void getAfterbellGalaxy().then((data) => { if (!cancelled && data.ok) setResolvedSymbol(data.planets.find((row) => row.mint === subject.mint)?.symbol ?? null); }).catch(() => {});
    return () => { cancelled = true; };
  }, [subject]);

  useEffect(() => {
    if (!subject || status !== "ready" || !events.length) return;
    void prefetchThatDay({ mint: subject.mint, day0: socialDay0(events[0].timestamp), symbol: subject.symbol ?? resolvedSymbol, name: null, wallet: subject.wallet, room, chain: subject.chainKey }).catch(() => null);
  }, [subject, status, events, resolvedSymbol, room]);

  useEffect(() => {
    if (!subject || !room || firstBuy == null || status !== "ready") return;
    let cancelled = false;
    void getReplayCohort({ data: { room, chain: subject.chainKey, mint: subject.mint, wallet: subject.wallet, after: firstBuy / 1000, to: view.end / 1000 } }).then((result) => { if (!cancelled) setCohortItems(result.ok ? result.items : []); }).catch(() => { if (!cancelled) setCohortItems([]); });
    return () => { cancelled = true; };
  }, [subject, room, firstBuy, status, view.end]);

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    const delay = attempts === 0 ? 0 : 5000;
    const timer = window.setTimeout(async () => {
      try {
        const response = obj(await callUniverseTool({ data: { tool: "replay", input: replayToolInput(subject) } }));
        if (cancelled) return;
        if (response.ok === false) throw new Error(String(response.error ?? "Replay is unavailable right now."));
        const next = obj(response.bundle), indexing = obj(next.indexing), market = obj(next.marketHydration);
        const pending = Boolean(indexing.requested) || ["queued", "running", "queued-or-running"].includes(String(indexing.state)) || Boolean(market.pending) || ["queued", "running"].includes(String(market.state));
        const hasEvents = tapeEvents(next.events).length > 0;
        setBundle(next);
        if (!hasEvents && pending && attempts < MAX_HYDRATION_ATTEMPTS) { setStatus("building"); setAttempts((value) => value + 1); return; }
        if (hasEvents && pending && tapeCandles(next.candles).length === 0 && attempts < MAX_HYDRATION_ATTEMPTS) setAttempts((value) => value + 1);
        setStatus(hasEvents ? "ready" : "empty");
      } catch (cause) {
        if (!cancelled) { setError(cause instanceof Error ? cause.message : "Replay is unavailable right now."); setStatus("error"); }
      }
    }, delay);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [subject, attempts]);

  useEffect(() => {
    if (status !== "ready" || subject?.cursor != null) return;
    const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) setCursor(1); else setPlaying(true);
  }, [status]);

  useEffect(() => {
    const host = frameRef.current;
    if (!host) return;
    const measure = () => setSize({ w: host.clientWidth, h: host.clientHeight, dpr: Math.min(2, globalThis.devicePixelRatio || 1) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [status]);

  drawRef.current = () => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size.w || !size.h) return;
    const px = Math.round(size.w * size.dpr), py = Math.round(size.h * size.dpr);
    if (canvas.width !== px || canvas.height !== py) { canvas.width = px; canvas.height = py; }
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    const compact = size.w < 560, now = performance.now();
    hitsRef.current = (globalThis as typeof globalThis & { __ABULLS_BOLTS?: BoltHit[] }).__ABULLS_BOLTS = drawTape(ctx, { width: size.w, height: size.h, candles, bolts, cohort: cohortOn ? ticks : undefined, start: view.start, end: view.end, cursor, selectedId, scaleMode, scarPx: compact ? 17 : 18, strikeAge: (group) => { const at = strikesRef.current.get(group.key); return at == null ? null : now - at; }, pad: { top: compact ? 62 : 66, right: compact ? 52 : 72, bottom: 28, left: compact ? 8 : 20 } });
  };

  useEffect(() => { drawRef.current(); }, [size, candles, bolts, ticks, cohortOn, view, cursor, selectedId, scaleMode]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      progressRef.current = Math.min(1, progressRef.current + (dt * speed) / playMs);
      setCursor(schedule.cursorAt(progressRef.current));
      if (progressRef.current >= 1) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, schedule, playMs]);

  useEffect(() => {
    const previous = cursorRef.current;
    cursorRef.current = cursor;
    if (cursor <= previous + 1e-9) return;
    const crossed = groups.filter((group) => group.cursor >= previous - 1e-9 && group.cursor <= cursor + 1e-9);
    if (!crossed.length) return;
    const fresh = crossed.filter((group) => !visitedRef.current.has(group.key));
    crossed.forEach((group) => visitedRef.current.add(group.key));
    if (!fresh.length) return;
    const struck = fresh[fresh.length - 1], now = performance.now();
    if (!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      strikesRef.current.set(struck.key, now);
      let raf = 0;
      const animate = (t: number) => { drawRef.current(); if (t - now < STRIKE_MS + 40) raf = requestAnimationFrame(animate); else strikesRef.current.delete(struck.key); };
      raf = requestAnimationFrame(animate);
      window.setTimeout(() => cancelAnimationFrame(raf), STRIKE_MS + 400);
    }
    const audio = audioRef.current;
    if (audible && audio && now - lastTickRef.current >= 55) { lastTickRef.current = now; playTick(audio.ctx, struck.side); }
  }, [cursor, groups, audible]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.tone.gain.setTargetAtTime(playing && audible ? 0.006 : 0, audio.ctx.currentTime, 0.4);
  }, [playing, audible]);

  useEffect(() => () => { try { void audioRef.current?.ctx.close(); } catch { /* closed */ } }, []);

  useEffect(() => {
    if (!subject) return;
    const timer = window.setTimeout(() => saveResearchThread({ wallet: subject.wallet, mint: subject.mint, chainKey: subject.chainKey, galaxyId: room, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol, fromTs: window_.start || subject.fromTs, toTs: window_.end > 1 ? window_.end : subject.toTs, replayCursor: cursor, replaySpeed: speed }), playing ? 900 : 150);
    return () => window.clearTimeout(timer);
  }, [subject, cursor, speed, playing, room, window_, handle, resolvedSymbol]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input,select,textarea")) return;
      if (event.key === " ") { event.preventDefault(); toggle(); }
      else if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "Escape") { if (selectedId) setSelectedId(null); else if (socialOpen) setSocialOpen(false); else if (cutOpen) setCutOpen(false); else onBack(); }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  });

  function primeAudio() {
    if (audioRef.current || !ticksOn || muted) return;
    try {
      const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor(), osc = ctx.createOscillator(), tone = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc.type = "sine"; osc.frequency.value = 55; filter.type = "lowpass"; filter.frequency.value = 180; tone.gain.value = 0;
      osc.connect(filter).connect(tone).connect(ctx.destination); osc.start();
      audioRef.current = { ctx, tone };
    } catch { /* sound is optional */ }
  }
  function toggle() {
    primeAudio();
    if (!playing) { const from = cursor >= 1 ? 0 : cursor; if (cursor >= 1) setCursor(0); progressRef.current = from <= 0 ? 0 : schedule.progressAt(from); }
    setPlaying((value) => !value);
  }
  function step(direction: -1 | 1) {
    setPlaying(false);
    const stops = schedule.stops.filter((stop) => stop < 1);
    const next = direction > 0 ? stops.find((stop) => stop > cursor + 1e-6) : [...stops].reverse().find((stop) => stop < cursor - 1e-6);
    setCursor(next ?? (direction > 0 ? 1 : 0));
    setSelectedId(null);
  }
  function toggleTicks() {
    const next = !ticksOn;
    setTicksOn(next);
    try { globalThis.localStorage?.setItem(TICKS_KEY, next ? "1" : "0"); } catch { /* optional */ }
    if (next && !muted && !audioRef.current) window.setTimeout(primeAudio, 0);
  }
  function toggleCohort() {
    const next = !cohortOn;
    setCohortOn(next);
    if (!next && selectedId?.startsWith("cohort:")) setSelectedId(null);
    try { globalThis.localStorage?.setItem(COHORT_KEY, next ? "1" : "0"); } catch { /* optional */ }
  }
  function watch(kind: "wallet" | "token") {
    if (!subject || !onToggleWatch) return;
    const last = bolts.at(-1);
    onToggleWatch({ kind, wallet: subject.wallet, mint: subject.mint, chainKey: subject.chainKey, room, name: subject.displayName ?? handle ?? null, handle: room === "fomo" ? handle : null, symbol: subject.symbol ?? resolvedSymbol, lastPrint: last ? { side: last.side, at: last.timestamp, symbol: subject.symbol ?? resolvedSymbol } : null });
  }
  function onCanvasPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const id = hitBolt(hitsRef.current, event.clientX - rect.left, event.clientY - rect.top);
    if (id?.startsWith("cohort:")) { setPlaying(false); setSelectedId(id); setSocialOpen(false); }
    else if (id) { primeAudio(); setPlaying(false); setSelectedId(id); setSocialOpen(false); const bolt = bolts.find((row) => row.id === id); if (bolt && audioRef.current && audible) playTick(audioRef.current.ctx, bolt.side); }
    else setSelectedId(null);
  }
  async function share() {
    if (!subject) return;
    const url = replayShareUrl(window.location.origin, { ...subject, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol }, cursor);
    try {
      if (typeof navigator.share === "function" && window.innerWidth < 760) { await navigator.share({ title: `A Bulls App · ${title}`, url }); setShareNote("Shared"); return; }
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch {
      setShareNote(url);
    }
    window.setTimeout(() => setShareNote(""), 2400);
  }
  function openEvidence(bolt: TapeBolt) {
    if (!subject) return;
    const prior = loadResearchThread();
    saveResearchThread({ wallet: subject.wallet, mint: subject.mint, chainKey: subject.chainKey, entrySignature: bolt.signature, evidenceIds: [...new Set([...prior.evidenceIds, bolt.id])], replayCursor: cursor });
    requestTradeResearchMode("evidence");
  }

  if (!subject)
    return (
      <section className="rs rs--empty" aria-label="Replay">
        <ReplayStudioStyles />
        <div className="rs-empty">
          <p className="rs-empty__title">Pick a trader in FOMO or AFTERBELL, then tap Replay.</p>
          <div className="rs-empty__actions">
            <button type="button" onClick={() => onOpenRoom("fomo")}>FOMO</button>
            <button type="button" onClick={() => onOpenRoom("afterbell")}>AFTERBELL</button>
            <button type="button" onClick={onBack}>BACK</button>
          </div>
        </div>
      </section>
    );

  const verifyNote = selected ? (selected.signature ? "Observed on-chain" : selected.verification === "provider-reported" ? "Fomo-reported · no transaction receipt attached" : selected.verification) : "";
  const explorer = selected ? explorerUrl(subject.chainKey, selected.signature) : null;
  const buys = visible.filter((bolt) => bolt.side === "buy").length;
  const selectedGroup = selected ? groups.find((group) => group.bolts.some((bolt) => bolt.id === selected.id)) ?? null : null;
  const day0 = events.length ? socialDay0(events[0].timestamp) : null;
  const traderWatched = isWatched(watchlist, "wallet", subject.wallet);
  const tokenWatched = isWatched(watchlist, "token", subject.mint);
  const tokenLabel = subject.symbol ?? resolvedSymbol ?? callsign(subject.mint), traderLabel = subject.displayName ?? handle ?? callsign(subject.wallet);
  const headerLine = status === "ready" ? tapeHeaderLine({ token: tokenLabel, trader: traderLabel, bolts, cohortCount: cohortItems ? ticks.length : null }) : null;
  const evidenceLine = status === "ready" ? tapeEvidenceLine(bolts) : null;
  const buyCoverage = tapeUsdCoverage(visible, "buy"), sellCoverage = tapeUsdCoverage(visible, "sell");

  return (
    <section className="rs" data-room={room ?? undefined} data-status={status} aria-label="Replay">
      <ReplayStudioStyles />
      <header className="rs-head">
        <button type="button" className="rs-icon" aria-label="Back to the Field" onClick={onBack}><ArrowLeft size={17} /></button>
        <div className="rs-title">
          {room ? <span className="rs-chip">{ROOM_CHIP[room]}</span> : null}
          <div className="rs-title__text">
            <h1>{title}</h1>
            {headerLine ? <p className="rs-line" data-testid="replay-header-line">{headerLine}</p> : null}
          </div>
        </div>
        {status === "ready" ? <div className="rs-usd-stack"><ReplayUsdBox summary={usdSummary} buyCoverage={buyCoverage} sellCoverage={sellCoverage}/>{evidenceLine?<span className="rs-evidence-line">{evidenceLine}</span>:null}</div> : null}
        <button type="button" className="rs-icon" aria-label={ticksOn ? "Turn tick sound off" : "Turn tick sound on"} aria-pressed={ticksOn} title={muted ? "Sound is muted in the Field" : undefined} onClick={toggleTicks}>{audible ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
      </header>
      <nav className="rs-acts" aria-label="Replay actions">
        {onToggleWatch ? <button type="button" className="rs-act" aria-pressed={traderWatched} onClick={() => watch("wallet")}><Star size={12} fill={traderWatched ? "currentColor" : "none"} /> {traderWatched ? "WATCHING TRADER" : "WATCH TRADER"}</button> : null}
        {onToggleWatch ? <button type="button" className="rs-act" aria-pressed={tokenWatched} onClick={() => watch("token")}><Star size={12} fill={tokenWatched ? "currentColor" : "none"} /> {tokenWatched ? "WATCHING TOKEN" : "WATCH TOKEN"}</button> : null}
        <button type="button" className="rs-act" aria-pressed={socialOpen} disabled={!day0} onClick={() => { setSelectedId(null); setSocialOpen((value) => !value); }}><CalendarDays size={12} /> THAT DAY</button>
        {room ? <button type="button" className="rs-act" aria-pressed={cohortOn} onClick={toggleCohort} title="Other wallets in this room buying this token after this print. Timing only."><Users size={12} /> COHORT{cohortItems ? ` ${ticks.length}` : ""}</button> : null}
      </nav>

      <div className="rs-frame" ref={frameRef} data-scale={scaleMode} data-view-start={Math.round(view.start)} data-view-end={Math.round(view.end)} data-candles={candles.length} data-bolt-groups={groups.length} data-cohort={cohortOn ? ticks.length : 0}>
        {status === "ready" ? <canvas ref={canvasRef} className="rs-canvas" onPointerDown={onCanvasPointer} aria-label={`${candles.length ? "Candles" : "Event tape"} with ${bolts.length} buy and sell bolts. Tap a bolt for its evidence.`} role="img" /> : null}
        {status === "loading" || status === "building" ? <div className="rs-state"><span className="rs-pulse" aria-hidden="true" /><p>{status === "building" ? "Indexing this wallet's prints. The tape starts on its own when they land." : "Reading the tape…"}</p></div> : null}
        {status === "empty" ? <div className="rs-state"><p>No retained buy or sell prints for this wallet and token in this window yet.</p><small>Nothing is drawn until a print is indexed.</small></div> : null}
        {status === "error" ? <div className="rs-state"><p>{error}</p><button type="button" onClick={() => { setStatus("loading"); setAttempts((value) => value + 1); }}>TRY AGAIN</button></div> : null}
      </div>

      <footer className="rs-third">
        {selectedTick ? (
          <div className="rs-evidence" role="dialog" aria-label="Cohort buy">
            <div className="rs-evidence__row">
              <b className="rs-cohort-chip">COHORT BUY</b>
              <span>{selectedTick.callsign}</span>
              <span>{when(selectedTick.time)}</span>
              <button type="button" className="rs-icon rs-icon--small" aria-label="Close cohort buy" onClick={() => setSelectedId(null)}><X size={14} /></button>
            </div>
            <p className="rs-evidence__meta"><span className="rs-src">{selectedTick.sourceKind === "observed-fact" ? "Observed on-chain" : "Fomo-reported"} · {selectedTick.source}</span></p>
            <p className="rs-evidence__meta">Same room, same token, after {traderLabel}'s first print. Timing only.</p>
            {selectedTick.txId ? <p className="rs-evidence__sig">{explorerUrl(subject.chainKey, selectedTick.txId) ? <a href={explorerUrl(subject.chainKey, selectedTick.txId) ?? undefined} target="_blank" rel="noreferrer">{selectedTick.txId}</a> : selectedTick.txId}</p> : null}
          </div>
        ) : selected ? (
          <div className="rs-evidence" role="dialog" aria-label="Evidence for this print">
            <div className="rs-evidence__row">
              <b data-side={selected.side}>{selected.side.toUpperCase()}</b>
              <span>{when(selected.timestamp)}</span>
              {amountLabel(selected.amount) ? <span>{amountLabel(selected.amount)} {subject.symbol ?? resolvedSymbol ?? "tokens"}</span> : null}
              {selected.verification === "provider-reported" && selected.priceUsd ? <span>Fomo-reported ${selected.priceUsd.toPrecision(3)}</span> : null}
              <button type="button" className="rs-icon rs-icon--small" aria-label="Close evidence" onClick={() => setSelectedId(null)}><X size={14} /></button>
            </div>
            {selectedGroup && selectedGroup.count > 1 ? <p className="rs-evidence__meta">{selectedGroup.count} prints on this bar</p> : null}
            <p className="rs-evidence__meta">{verifyNote}{selected.sources.length ? ` · ${selected.sources.join(" · ")}` : ""}</p>
            {selected.signature ? <p className="rs-evidence__sig">{explorer ? <a href={explorer} target="_blank" rel="noreferrer">{selected.signature}</a> : selected.signature}</p> : null}
            <div className="rs-actions"><button type="button" onClick={() => openEvidence(selected)}>ALL RECEIPTS</button></div>
          </div>
        ) : (
          <>
            <div className="rs-now">
              {latest ? <><b data-side={latest.side}>{latest.side.toUpperCase()}</b><span>{when(latest.timestamp)}</span></> : <span>{status === "ready" ? "Press play. Each bolt is a retained print." : "\u00a0"}</span>}
              <span className="rs-count">{buys} {buys === 1 ? "buy" : "buys"} · {visible.length - buys} {visible.length - buys === 1 ? "sell" : "sells"}</span>
            </div>
            <input className="rs-scrub" type="range" min={0} max={1000} value={Math.round(cursor * 1000)} aria-label="Replay position" disabled={status !== "ready"} onChange={(event) => { setPlaying(false); setCursor(Number(event.target.value) / 1000); }} />
            <div className="rs-controls">
              <button type="button" className="rs-icon" aria-label="Previous print" disabled={status !== "ready"} onClick={() => step(-1)}><SkipBack size={15} /></button>
              <button type="button" className="rs-play" aria-label={playing ? "Pause" : "Play"} disabled={status !== "ready"} onClick={toggle}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
              <button type="button" className="rs-icon" aria-label="Next print" disabled={status !== "ready"} onClick={() => step(1)}><SkipForward size={15} /></button>
              <button type="button" className="rs-speed" aria-label="Playback speed" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed}×</button>
              <span className="rs-spacer" />
              <button type="button" className="rs-pill" onClick={() => void share()} aria-label="Copy a link to this Replay"><Share2 size={13} /> {shareNote && shareNote.length < 20 ? shareNote : "SHARE"}</button>
              <button type="button" className="rs-pill rs-pill--cut" disabled={status !== "ready"} onClick={() => { setPlaying(false); setCutOpen(true); }}>CUT</button>
            </div>
            <p className="rs-source">{candles.length ? `Candles · ${candleSourceLabel(source)}` : status === "ready" ? "Candles unavailable · event tape only · no price path drawn" : ""}{status === "ready" ? ` · ${bolts.length} prints${events.some((row) => row.verification === "provider-reported") ? " · Fomo-reported" : ""}` : ""}</p>
          </>
        )}
      </footer>
      {cutOpen && subject ? <CutPanel subject={{ ...subject, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol }} title={title} trader={traderLabel} room={room} bolts={bolts} cohort={cohortOn ? ticks : []} candles={candles} candleCount={candles.length} start={view.start} end={view.end} scaleMode={scaleMode} source={source} onClose={() => setCutOpen(false)} /> : null}
      {socialOpen && day0 ? <ReplaySocialStrip mint={subject.mint} symbol={subject.symbol ?? resolvedSymbol} name={null} wallet={subject.wallet} chain={subject.chainKey} room={room} day0={day0} onClose={() => setSocialOpen(false)} /> : null}
    </section>
  );
}

function playTick(ctx: AudioContext, side: "buy" | "sell") {
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(side === "buy" ? 1480 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(side === "buy" ? 1180 : 760, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.04, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.06);
  } catch { /* sound is optional */ }
}

function CutPanel({ subject, title, trader, room, bolts, cohort, candles, candleCount, start, end, scaleMode, source, onClose }: { subject: ReplaySubject; title: string; trader: string; room: "fomo" | "afterbell" | null; bolts: TapeBolt[]; cohort: CohortTick[]; candles: TapeCandle[]; candleCount: number; start: number; end: number; scaleMode: "log" | "linear"; source: string | null; onClose: () => void }) {
  const [format, setFormat] = useState<CutFormat>("portrait");
  const [grey, setGrey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ value: 0, label: "" });
  const [result, setResult] = useState<{ videoUrl: string; manifestUrl: string; extension: string; greyIncluded: boolean } | null>(null);
  const [error, setError] = useState("");
  const replayUrl = replayShareUrl(typeof window === "undefined" ? INTELLIGENCE_PUBLIC_ORIGIN : window.location.origin, subject);
  const buys = bolts.filter((bolt) => bolt.side === "buy").length, sells = bolts.length - buys;
  const greyLine = `${subject.displayName ?? "This wallet"} printed ${buys} buys and ${sells} sells of ${subject.symbol ?? "this token"} in this window. Every one is on the tape.`;
  const sourceLine = `${candleCount ? `Candles: ${candleSourceLabel(source)}` : "Candles unavailable: event tape only"} · ${bolts.length} prints · ${subject.chainKey}`;
  const slug = `abulls-replay-${(subject.symbol ?? subject.mint.slice(0, 6)).replace(/[^a-z0-9]+/gi, "").toLowerCase()}-${format}`;

  useEffect(() => () => { if (result) { URL.revokeObjectURL(result.videoUrl); URL.revokeObjectURL(result.manifestUrl); } }, [result]);

  async function render() {
    setBusy(true); setError(""); setResult(null);
    try {
      const { recordReplayCut } = await import("@/lib/replay-cut");
      const cut = await recordReplayCut({ format, title, roomLabel: room ? ROOM_CHIP[room] : "REPLAY", trader, candles, bolts, cohort, start, end, scaleMode, replayUrl, sourceLine, greyLine: grey ? greyLine : null, onProgress: (value, label) => setProgress({ value, label }) });
      const manifest = buildCutManifest({ subject, bolts, cohortCount: cohort.length, candleCount, candleSource: source, start, end, replayUrl, format, greyLine: grey && cut.greyIncluded ? greyLine : null });
      setResult({ videoUrl: URL.createObjectURL(cut.blob), manifestUrl: URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })), extension: cut.extension, greyIncluded: cut.greyIncluded });
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? `The Cut could not be rendered here: ${cause.message}` : "The Cut could not be rendered in this browser.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rs-cut" role="dialog" aria-label="Make a Cut">
      <div className="rs-cut__card">
        <header><b>Cut</b><button type="button" className="rs-icon rs-icon--small" aria-label="Close Cut" onClick={onClose}><X size={14} /></button></header>
        <p className="rs-cut__lede">Exports the full tape with {trader}'s prints{cohort.length ? ` and ${cohort.length} cohort ${cohort.length === 1 ? "tick" : "ticks"}` : ""}. The last frame is VERIFY with the Replay link.</p>
        <div className="rs-seg" role="radiogroup" aria-label="Cut format">
          <button type="button" role="radio" aria-checked={format === "portrait"} onClick={() => setFormat("portrait")}>1080 × 1920</button>
          <button type="button" role="radio" aria-checked={format === "landscape"} onClick={() => setFormat("landscape")}>1920 × 1080</button>
        </div>
        <label className="rs-toggle"><input type="checkbox" checked={grey} onChange={(event) => setGrey(event.target.checked)} /> Add the Grey line <small>off by default</small></label>
        {grey ? <p className="rs-cut__grey">“{greyLine}”</p> : null}
        {busy ? <div className="rs-progress" aria-live="polite"><i style={{ width: `${Math.round(progress.value * 100)}%` }} /><span>{progress.label}</span></div> : null}
        {error ? <p className="rs-cut__error">{error}</p> : null}
        {result ? (
          <div className="rs-cut__done">
            <video src={result.videoUrl} controls playsInline muted className={format === "portrait" ? "is-portrait" : ""} />
            <div className="rs-actions">
              <a href={result.videoUrl} download={`${slug}.${result.extension}`}>DOWNLOAD VIDEO</a>
              <a href={result.manifestUrl} download={`${slug}.manifest.json`}>MANIFEST</a>
            </div>
            {grey && !result.greyIncluded ? <p className="rs-cut__error">Grey is unavailable right now, so this Cut has ticks only.</p> : null}
          </div>
        ) : (
          <div className="rs-actions"><button type="button" disabled={busy} onClick={() => void render()}>{busy ? "RENDERING…" : "RENDER CUT"}</button></div>
        )}
        <p className="rs-cut__fine">Manifest lists wallet, mint, window, every signature and the candle source.</p>
      </div>
    </div>
  );
}

function ReplayUsdBox({summary,buyCoverage,sellCoverage}:{summary:TapeUsdSummary;buyCoverage:string|null;sellCoverage:string|null}){return <div className="rs-usd" aria-label="Observed USD trade sizes"><div><span>Bought</span><b data-tone="buy">{summary.boughtUsd!=null?formatUsdNotional(summary.boughtUsd):"—"}</b></div><div><span>Sold</span><b data-tone="sell">{summary.soldUsd!=null?formatUsdNotional(summary.soldUsd):"—"}</b></div><div><span>Avg buy</span><b>{formatUsdPrice(summary.avgBuyUsd)}</b></div><div><span>Avg sell</span><b>{formatUsdPrice(summary.avgSellUsd)}</b></div>{buyCoverage?<small>{buyCoverage}</small>:null}{sellCoverage?<small>{sellCoverage}</small>:null}</div>}

function ReplayStudioStyles() {
  return <style>{`.rs{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;background:#0b0c10;color:#f4f2ec;--rs-rim:rgba(236,236,240,.12);--rs-ink:#eadcb4}.rs[data-room=fomo]{--rs-ink:#cdb8ff}.rs-head{flex:0 0 auto;display:flex;align-items:center;gap:12px;padding:max(12px,env(safe-area-inset-top)) 16px 6px}.rs-title{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:10px}.rs-title__text{min-width:0;display:grid;gap:3px}.rs-line{margin:0;font:520 11px/1.3 var(--font-mono);color:rgba(236,236,240,.62);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-cohort-chip{color:rgba(214,220,200,.9)}.rs-src{display:inline-block;padding:2px 7px;border:1px solid var(--rs-rim);border-radius:999px;font:500 10px/1.3 var(--font-mono)}.rs-usd-stack{flex:0 0 auto;display:grid;gap:4px}.rs-usd{display:grid;grid-template-columns:auto auto;gap:5px 14px;padding:9px 11px;border:1px solid rgba(236,236,240,.16);border-radius:12px;background:rgba(9,10,14,.72);backdrop-filter:blur(14px);box-shadow:0 12px 34px rgba(0,0,0,.24),inset 0 1px rgba(255,255,255,.035);font:650 10px/1.2 var(--font-mono)}.rs-usd div{display:contents}.rs-usd span,.rs-usd small{color:rgba(236,236,240,.58)}.rs-usd b{text-align:right;color:#eadcaa;font-size:11px}.rs-usd b[data-tone=buy]{color:#B8FF3C}.rs-usd b[data-tone=sell]{color:#FF2D55}.rs-usd small{grid-column:1/-1;font-size:8px;line-height:1.25}.rs-evidence-line{font:500 11px/1.2 var(--font-mono);color:rgba(236,236,240,.48);text-align:right}.rs-title h1{margin:0;font:680 17px/1.2 var(--font-sans);letter-spacing:.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-chip{flex:0 0 auto;padding:4px 8px;border:1px solid color-mix(in oklab,var(--rs-ink) 45%,transparent);border-radius:999px;color:var(--rs-ink);font:700 8.5px/1 var(--font-display);letter-spacing:.14em}.rs-icon{flex:0 0 auto;width:40px;height:40px;display:grid;place-items:center;border:1px solid var(--rs-rim);border-radius:999px;background:rgba(255,255,255,.03);color:#f4f2ec;transition:border-color .15s,background .15s}.rs-icon:hover:not(:disabled),.rs-icon:focus-visible{border-color:rgba(236,236,240,.34);outline:none}.rs-icon:disabled{opacity:.35}.rs-icon--small{width:28px;height:28px}.rs-frame{position:relative;flex:1 1 auto;min-height:0;margin:0}.rs-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:manipulation;cursor:crosshair}.rs-state{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center}.rs-state p{margin:0;max-width:440px;font:540 14px/1.5 var(--font-sans);color:rgba(236,236,240,.82)}.rs-state small{color:rgba(236,236,240,.5)}.rs-state button,.rs-empty__actions button,.rs-actions button,.rs-actions a{min-height:38px;padding:0 16px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--rs-rim);border-radius:999px;background:rgba(255,255,255,.04);color:#f4f2ec;font:700 9px/1 var(--font-display);letter-spacing:.14em;text-decoration:none}.rs-pulse{width:44px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--rs-ink),transparent);animation:rs-sweep 1.4s ease-in-out infinite}@keyframes rs-sweep{0%{transform:translateX(-30px);opacity:.2}50%{opacity:1}100%{transform:translateX(30px);opacity:.2}}.rs-third{flex:0 0 auto;min-height:clamp(132px,20vh,190px);display:flex;flex-direction:column;justify-content:flex-end;gap:8px;padding:10px 18px max(14px,env(safe-area-inset-bottom));border-top:1px solid rgba(236,236,240,.06);background:linear-gradient(180deg,rgba(11,12,16,0),rgba(16,17,22,.9))}.rs-now{display:flex;align-items:baseline;gap:10px;font:560 13px/1.3 var(--font-sans);color:rgba(236,236,240,.8)}.rs-now b,.rs-evidence__row b{font:750 12px/1 var(--font-display);letter-spacing:.14em}[data-side=buy]{color:#B8FF3C}[data-side=sell]{color:#FF2D55}.rs-acts{flex:0 0 auto;display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding:2px 16px 6px 68px}.rs-acts::-webkit-scrollbar{display:none}.rs-act{height:30px;padding:0 11px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--rs-rim);border-radius:999px;background:rgba(255,255,255,.03);color:rgba(236,236,240,.82);font:700 8.5px/1 var(--font-display);letter-spacing:.13em}.rs-act[aria-pressed=true]{border-color:color-mix(in oklab,var(--rs-ink) 60%,transparent);color:var(--rs-ink)}.rs-act:disabled{opacity:.35}.rs-count{margin-left:auto;font:500 11px/1 var(--font-mono);color:rgba(236,236,240,.5)}.rs-scrub{width:100%;accent-color:#eadcb4;height:22px}.rs-controls{display:flex;align-items:center;gap:8px}.rs-play{width:48px;height:48px;display:grid;place-items:center;border:1px solid color-mix(in oklab,var(--rs-ink) 50%,transparent);border-radius:999px;background:color-mix(in oklab,var(--rs-ink) 12%,transparent);color:#fff}.rs-play:disabled,.rs-pill:disabled{opacity:.35}.rs-speed{min-width:44px;height:34px;border:1px solid var(--rs-rim);border-radius:999px;background:transparent;color:rgba(236,236,240,.8);font:600 11px/1 var(--font-mono)}.rs-spacer{flex:1 1 auto}.rs-pill{height:36px;padding:0 14px;display:inline-flex;align-items:center;gap:6px;border:1px solid var(--rs-rim);border-radius:999px;background:rgba(255,255,255,.035);color:#f4f2ec;font:700 9px/1 var(--font-display);letter-spacing:.14em}.rs-pill--cut{border-color:color-mix(in oklab,var(--rs-ink) 55%,transparent);color:var(--rs-ink)}.rs-source{margin:0;font:500 10px/1.3 var(--font-mono);color:rgba(236,236,240,.42);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-evidence{display:grid;gap:6px}.rs-evidence__row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;font:560 13px/1.3 var(--font-sans)}.rs-evidence__row .rs-icon{margin-left:auto}.rs-evidence__meta{margin:0;font:500 11px/1.4 var(--font-sans);color:rgba(236,236,240,.6)}.rs-evidence__sig{margin:0;font:500 10.5px/1.4 var(--font-mono);word-break:break-all;color:rgba(236,236,240,.72)}.rs-evidence__sig a{color:inherit;text-decoration:underline;text-decoration-color:rgba(236,236,240,.3)}.rs-actions{display:flex;gap:8px;flex-wrap:wrap}.rs-empty{margin:auto;display:grid;gap:16px;justify-items:center;padding:24px;text-align:center}.rs-empty__title{margin:0;font:600 16px/1.45 var(--font-sans);max-width:380px}.rs-empty__actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.rs-cut{position:absolute;inset:0;z-index:2;display:grid;place-items:center;padding:16px;background:rgba(5,6,9,.66);backdrop-filter:blur(10px)}.rs-cut__card{width:min(440px,100%);max-height:calc(100vh - 32px);overflow:auto;display:grid;gap:12px;padding:18px;border:1px solid var(--rs-rim);border-radius:20px;background:#111217;box-shadow:0 30px 90px rgba(0,0,0,.5)}.rs-cut__card header{display:flex;align-items:center;justify-content:space-between}.rs-cut__card header b{font:700 15px/1 var(--font-sans)}.rs-cut__lede,.rs-cut__fine,.rs-cut__grey{margin:0;font:500 12px/1.45 var(--font-sans);color:rgba(236,236,240,.7)}.rs-cut__fine{font-size:10.5px;color:rgba(236,236,240,.45)}.rs-cut__grey{font-style:italic}.rs-cut__error{margin:0;font:500 12px/1.4 var(--font-sans);color:#ffb3b3}.rs-seg{display:grid;grid-template-columns:1fr 1fr;gap:6px}.rs-seg button{height:38px;border:1px solid var(--rs-rim);border-radius:12px;background:transparent;color:rgba(236,236,240,.75);font:600 11px/1 var(--font-mono)}.rs-seg button[aria-checked=true]{border-color:var(--rs-ink);color:#fff;background:color-mix(in oklab,var(--rs-ink) 10%,transparent)}.rs-toggle{display:flex;align-items:center;gap:8px;font:560 12.5px/1.2 var(--font-sans)}.rs-toggle small{color:rgba(236,236,240,.45)}.rs-progress{position:relative;height:30px;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.04)}.rs-progress i{position:absolute;inset:0 auto 0 0;background:color-mix(in oklab,var(--rs-ink) 22%,transparent)}.rs-progress span{position:relative;display:block;padding:9px 10px;font:500 10.5px/1 var(--font-mono);color:rgba(236,236,240,.8)}.rs-cut__done{display:grid;gap:10px}.rs-cut__done video{width:100%;max-height:320px;border-radius:12px;background:#000}.rs-cut__done video.is-portrait{width:auto;justify-self:center}@media(max-width:560px){.rs-head{flex-wrap:wrap}.rs-usd-stack{order:3;width:100%}.rs-usd{width:100%;grid-template-columns:1fr auto}.rs-evidence-line{text-align:left}.rs-line{font-size:10px;white-space:normal}.rs-head{padding-left:10px;padding-right:10px}.rs-acts{padding-left:10px;padding-right:10px}.rs-title h1{font-size:15px}.rs-third{padding-left:12px;padding-right:12px}.rs-pill{padding:0 11px}}@media(prefers-reduced-motion:reduce){.rs-pulse{animation:none}}`}</style>;
}
