import { ReplayCutPanel as CutPanel } from "@/components/replay-cut-panel";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ReplayLedger } from "@/components/replay-ledger";
import { printLabel, printSource, replayCandleCoverage } from "@/lib/field/replay-director";
import "@/components/replay-director.css";
import { INTELLIGENCE_PUBLIC_ORIGIN } from "@/lib/app-origins";
import { ArrowLeft, Clapperboard, List, CalendarDays, Pause, Play, Share2, SkipBack, SkipForward, Star, Users, Volume2, VolumeX, X } from "lucide-react";
import { callUniverseTool } from "@/lib/universe-intelligence";
import { loadResearchThread, saveResearchThread } from "@/lib/research-thread-store";
import { requestTradeResearchMode } from "@/lib/field/trade-research-navigation";
import { PNL_CAVEAT, PNL_HYPOTHETICAL_LABEL, PNL_REALIZED_LABEL } from "@/lib/field/honest-pnl";
import { observedUsdNotional, reportedPositionUsd, anchorBolts, candleSource, candleSourceLabel, cohortTicks, explorerUrl, formatUsdNotional, formatUsdPrice, fullTape, groupBolts, heldRound, hopSchedule, replayShareUrl, replaySubjectFrom, replayToolInput, STRIKE_MS, tapeAvgEntryMarketCap, tapeAxis, tapeCandles, tapeEvents, tapeEvidenceLine, tapeHeaderLine, tapeMarketCapAt, tapeMarketCapPoints, tapeMarkSummary, tapeMatchedRounds, tapeScaleFor, tapeUsdCoverage, tapeUsdSummary, tapeWindow, type CohortTick, type ReplaySubject, type TapeBolt, type TapeCandle, type TapeMarkSummary, type TapeMarketCapPoint, type TapeUsdSummary } from "@/lib/field/replay-tape";
import { drawTape, hitBolt, liveReducedMotion, type BoltHit } from "@/lib/field/replay-tape-render";
import { callsign } from "@/lib/field/trader-sheet";
import { getAfterbellGalaxy, XSTOCK_REGISTRY } from "@/lib/universe-data/afterbell-client";
import { isWatched, type WatchItem } from "@/lib/field/watchlist";
import { socialDay0 } from "@/lib/field/social-window";
import { prefetchThatDay, ReplaySocialStrip } from "@/components/replay-social-strip";
import { getReplayCohort } from "@/lib/universe-data/replay-cohort-client";
import { TraderSigil } from "@/components/trader-sigil";
import { ReplayVersusPanel } from "@/components/replay-versus-panel";

type Data = Record<string, unknown>;
type Status = "loading" | "building" | "ready" | "empty" | "error";
const obj = (value: unknown): Data => (value && typeof value === "object" && !Array.isArray(value) ? (value as Data) : {});
const MAX_HYDRATION_ATTEMPTS = 18;
const TICKS_KEY = "abulls-replay-ticks";
const COHORT_KEY = "abulls-replay-cohort";
const SPEEDS = [0.5, 1, 2, 10] as const;
const ROOM_CHIP = { fomo: "FOMO", afterbell: "AFTERBELL" } as const;
const when = (ms: number) => new Date(ms).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const amountLabel = (value: number | null) => (value == null ? null : value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : value >= 1 ? value.toFixed(2) : value.toPrecision(3));
const signedUsd = (value: number | null) => value == null || !Number.isFinite(value) ? "—" : value === 0 ? "$0" : `${value > 0 ? "+" : "−"}${formatUsdNotional(Math.abs(value))}`;
const formatHeld = (ms: number) => { const minutes = Math.max(0, Math.round(ms / 60000)); const hours = Math.floor(minutes / 60); const rest = minutes % 60; return hours <= 0 ? `${rest}m` : `${hours}h ${rest}m`; };

export function replayImpactStrength(bolt: TapeBolt, bolts: readonly TapeBolt[]) {
  const value = observedUsdNotional(bolt);
  if (value == null || value <= 0) return 0.36;
  const known = bolts.flatMap((row) => { const v = observedUsdNotional(row); return v != null && v > 0 ? [Math.log10(v)] : []; });
  if (!known.length) return 0.5;
  const lo = Math.min(...known), hi = Math.max(...known), unit = hi > lo ? (Math.log10(value) - lo) / (hi - lo) : 0.5;
  return Math.max(0.32, Math.min(1, 0.38 + unit * 0.62));
}

function initialSubject() {
  if (typeof window === "undefined") return null;
  return replaySubjectFrom(window.location.search, loadResearchThread());
}

export type ReplayWatchRequest = { kind: "wallet" | "token"; wallet: string; mint: string; chainKey: string; room: "fomo" | "afterbell" | null; name: string | null; handle: string | null; symbol: string | null; lastPrint: { side: string; at: number; symbol: string | null } | null };

export function ReplayStudio({ muted, onToggleMute, onBack, onOpenRoom, watchlist = [], onToggleWatch }: { muted: boolean; onToggleMute?: () => void; onBack: () => void; onOpenRoom: (room: "fomo" | "afterbell") => void; watchlist?: readonly WatchItem[]; onToggleWatch?: (request: ReplayWatchRequest) => void }) {
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
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [cutOpen, setCutOpen] = useState(false);
  const [socialOpen, setSocialOpen] = useState(false);
  const [whatIf, setWhatIf] = useState(false);
  const [versusOpen, setVersusOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);
  const [ticksOn, setTicksOn] = useState(() => { try { return globalThis.localStorage?.getItem(TICKS_KEY) === "1"; } catch { return false; } });
  const [cohortOn, setCohortOn] = useState(() => { try { return globalThis.localStorage?.getItem(COHORT_KEY) !== "0"; } catch { return true; } });
  const [cohortItems, setCohortItems] = useState<unknown[] | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null), frameRef = useRef<HTMLDivElement | null>(null), hitsRef = useRef<BoltHit[]>([]), audioRef = useRef<{ ctx: AudioContext; tone: GainNode } | null>(null), lastTickRef = useRef(0), cursorRef = useRef(cursor), progressRef = useRef(0), strikesRef = useRef(new Map<string, number>()), visitedRef = useRef(new Set<string>()), drawRef = useRef<() => void>(() => {}), hitStopUntilRef = useRef(0), impactRef = useRef({ started: 0, until: 0, strength: 0 }), scrubbingRef = useRef(false), lastHapticRef = useRef(-1);
  const audible = ticksOn && !muted;
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const sizeRef = useRef(size);
  sizeRef.current = size;

  const retainedCandles = useMemo(() => tapeCandles(bundle?.candles), [bundle]);
  const events = useMemo(() => tapeEvents(bundle?.events, obj(bundle?.subject).quoteMint), [bundle]);
  const candleCoverage = useMemo(() => replayCandleCoverage(retainedCandles, events), [retainedCandles, events]);
  // Keep every valid retained OHLC candle on screen even when some Replay events
  // fall outside candle coverage. Uncovered events remain time-only; the renderer
  // never pins them to an unrelated candle.
  const candles = retainedCandles;
  const window_ = useMemo(() => (subject ? tapeWindow(bundle?.window, candles, events, subject) : { start: 0, end: 1 }), [bundle, candles, events, subject]);
  const view = useMemo(() => fullTape(candles, events, window_), [candles, events, window_]);
  const bolts = useMemo(() => anchorBolts(events, candles, view.start, view.end), [events, candles, view]);
  const ticks = useMemo(() => cohortTicks(cohortItems, candles, view.start, view.end), [cohortItems, candles, view]);
  const firstBuy = events.find((event) => event.side === "buy")?.timestamp ?? null;
  const groups = useMemo(() => groupBolts(bolts), [bolts]);
  const schedule = useMemo(() => hopSchedule(bolts.map((bolt) => bolt.cursor)), [bolts]);
  const playMs = Math.min(16_000, Math.max(4_000, schedule.stops.length * 900));
  const selected = bolts.find((bolt) => bolt.id === selectedId) ?? null;
  const selectedTick = cohortOn ? ticks.find((tick) => tick.id === selectedId) ?? null : null;
  const visible = bolts.filter((bolt) => bolt.cursor <= cursor);
  const usdSummary = tapeUsdSummary(visible);
  const visibleTime=tapeAxis(candles,view.start,view.end).timeAt(cursor);
  const visibleCandles=candles.filter((candle)=>candle.timestamp<=visibleTime);
  const mark=tapeMarkSummary(visible,visibleCandles);
  const bundleWindow=obj(bundle?.window),coverage=obj(bundle?.coverage),indexing=obj(bundle?.indexing);
  const historyLabel=String(bundleWindow.historyMode)==="full"?"FULL HISTORY":"EXACT WINDOW";
  const coverageLabel=coverage.complete===true?"COMPLETE":indexing.requested===true?"EXTENDING":"PARTIAL";
  const marketCapPoints=useMemo(()=>tapeMarketCapPoints(bundle?.referenceSeries,bundle?.marketCapSeries,bundle?.market,bundle?.events,bundle),[bundle]);
  const marketCapUsd=tapeMarketCapAt(marketCapPoints,visibleTime,cursor>=.999);
  const avgEntryMarketCap=tapeAvgEntryMarketCap(visible,marketCapPoints);
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
        const response = obj(await callUniverseTool({ data: { tool: "replay", input: replayToolInput({ ...subject, room }) } }));
        if (cancelled) return;
        if (response.ok === false) throw new Error(String(response.error ?? "Replay is unavailable right now."));
        const next = obj(response.bundle), indexing = obj(next.indexing), market = obj(next.marketHydration);
        const pending = Boolean(indexing.requested) || ["queued", "running", "queued-or-running"].includes(String(indexing.state)) || Boolean(market.pending) || ["queued", "running"].includes(String(market.state));
        const nextEvents = tapeEvents(next.events, obj(next.subject).quoteMint), nextCandles = tapeCandles(next.candles), nextCandleCoverage = replayCandleCoverage(nextCandles, nextEvents);
        const hasEvents = nextEvents.length > 0;
        setBundle(next);
        if (!hasEvents && pending && attempts < MAX_HYDRATION_ATTEMPTS) { setStatus("building"); setAttempts((value) => value + 1); return; }
        if (hasEvents && pending && !nextCandleCoverage.usable && attempts < MAX_HYDRATION_ATTEMPTS) setAttempts((value) => value + 1);
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

  useLayoutEffect(() => {
    const host = frameRef.current;
    if (!host) return;
    const measure = () => {
      const next = { w: host.clientWidth, h: host.clientHeight, dpr: Math.min(2, globalThis.devicePixelRatio || 1) };
      if (!next.w || !next.h) return;
      sizeRef.current = next;
      setSize((prev) => (prev.w === next.w && prev.h === next.h && prev.dpr === next.dpr ? prev : next));
      drawRef.current();
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [status]);

  drawRef.current = () => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    const size = sizeRef.current;
    if (!canvas || !ctx || !size.w || !size.h) return;
    const px = Math.round(size.w * size.dpr), py = Math.round(size.h * size.dpr);
    if (canvas.width !== px || canvas.height !== py) { canvas.width = px; canvas.height = py; }
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    const compact = size.w < 560, now = performance.now(), impact = impactRef.current;
    const activeImpact = !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches && now < impact.until;
    ctx.save();
    if (activeImpact) {
      const life = Math.max(0, Math.min(1, (impact.until - now) / Math.max(1, impact.until - impact.started)));
      const shake = impact.strength * life * 7;
      const sx = Math.sin(now * 0.19) * shake, sy = Math.cos(now * 0.23) * shake * 0.55;
      const push = 1 + impact.strength * life * 0.018;
      ctx.translate(size.w / 2 + sx, size.h / 2 + sy); ctx.scale(push, push); ctx.translate(-size.w / 2, -size.h / 2);
    }
    hitsRef.current = (globalThis as typeof globalThis & { __ABULLS_BOLTS?: BoltHit[] }).__ABULLS_BOLTS = drawTape(ctx, { width: size.w, height: size.h, candles, bolts, start: view.start, end: view.end, cursor, selectedId, scaleMode, scarPx: compact ? 16 : 18, hypothetical: whatIf ? { cursor, side: latest?.side === "buy" ? "sell" : "buy", label: "HYPOTHETICAL" } : null, strikeAge: (bolt) => { const at = strikesRef.current.get(bolt.id); return at == null ? null : now - at; }, pad: { top: compact ? 64 : 78, right: compact ? 50 : 66, bottom: 22, left: compact ? 4 : 8 } });
    ctx.restore();
  };

  useEffect(() => { drawRef.current(); }, [size, candles, bolts, ticks, cohortOn, view, cursor, selectedId, scaleMode,marketCapUsd,mark,subject,handle,whatIf,latest]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = now - last; last = now;
      if (now < hitStopUntilRef.current) { raf = requestAnimationFrame(tick); return; }
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
    if (cursor < previous - 1e-9) {
      // A rewind must let each individual receipt strike again on the next pass.
      for (const bolt of bolts) if (bolt.cursor >= cursor - 1e-9) visitedRef.current.delete(bolt.id);
      strikesRef.current.clear();
      return;
    }
    if (cursor <= previous + 1e-9) return;
    const crossed = bolts.filter((bolt) => bolt.cursor >= previous - 1e-9 && bolt.cursor <= cursor + 1e-9);
    const fresh = crossed.filter((bolt) => !visitedRef.current.has(bolt.id));
    crossed.forEach((bolt) => visitedRef.current.add(bolt.id));
    if (!fresh.length) return;
    const struck = fresh[fresh.length - 1], now = performance.now(), strength = replayImpactStrength(struck, bolts);
    if (!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const freezeMs = 24 + Math.round(strength * 56);
      hitStopUntilRef.current = Math.max(hitStopUntilRef.current, now + freezeMs);
      impactRef.current = { started: now, until: now + 150 + strength * 150, strength };
      for (const bolt of fresh) strikesRef.current.set(bolt.id, now);
      let raf = 0;
      const animate = (t: number) => {
        drawRef.current();
        if (t - now < STRIKE_MS + 40) raf = requestAnimationFrame(animate);
        else for (const bolt of fresh) strikesRef.current.delete(bolt.id);
      };
      raf = requestAnimationFrame(animate);
      window.setTimeout(() => cancelAnimationFrame(raf), STRIKE_MS + 400);
    }
    const audio = audioRef.current;
    if (audible && audio && now - lastTickRef.current >= 55) { lastTickRef.current = now; playTick(audio.ctx, struck.side, strength); }
    if (!liveReducedMotion() && typeof navigator.vibrate === "function") navigator.vibrate(Math.round(8 + strength * 18));
  }, [cursor, bolts, audible]);

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
      if ((event.target as HTMLElement | null)?.closest("input,select,textarea,button,a,[contenteditable=true]")) return;
      if (cutOpen) return;
      if (event.key === " ") { event.preventDefault(); toggle(); }
      else if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
      else if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      else if (event.key === "Home") { event.preventDefault(); setPlaying(false); setCursor(0); }
      else if (event.key === "End") { event.preventDefault(); setPlaying(false); setCursor(1); }
      else if (event.key === "Escape") { if (stripOpen) setStripOpen(false); else if (selectedId) setSelectedId(null); else if (socialOpen) setSocialOpen(false); else if (cutOpen) setCutOpen(false); else onBack(); }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    const pauseHidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", pauseHidden);
    return () => document.removeEventListener("visibilitychange", pauseHidden);
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (liveReducedMotion() || document.hidden) { drawRef.current(); return; }
      if (now - last > 32) { last = now; drawRef.current(); }
      raf = requestAnimationFrame(loop);
    };
    const watch = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onChange = () => { cancelAnimationFrame(raf); last = 0; raf = requestAnimationFrame(loop); };
    const onVis = () => { cancelAnimationFrame(raf); last = 0; if (!document.hidden) raf = requestAnimationFrame(loop); };
    watch?.addEventListener?.("change", onChange);
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); watch?.removeEventListener?.("change", onChange); document.removeEventListener("visibilitychange", onVis); };
  }, [status]);

  function primeAudio(explicit = false) {
    if (audioRef.current) { void audioRef.current.ctx.resume().catch(() => {}); return; }
    if (!explicit && (!ticksOn || muted)) return;
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
  function onScrubKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (status !== "ready") return;
    if (event.key === "Home") { event.preventDefault(); setPlaying(false); setCursor(0); }
    else if (event.key === "End") { event.preventDefault(); setPlaying(false); setCursor(1); }
    else if (event.key === " " || event.key === "Spacebar") { event.preventDefault(); toggle(); }
  }
  function step(direction: -1 | 1) {
    setPlaying(false);
    const stops = schedule.stops.filter((stop) => stop < 1);
    const next = direction > 0 ? stops.find((stop) => stop > cursor + 1e-6) : [...stops].reverse().find((stop) => stop < cursor - 1e-6);
    setCursor(next ?? (direction > 0 ? 1 : 0));
    setSelectedId(null);
  }
  function toggleTicks() {
    const next = !audible;
    setTicksOn(next);
    try { globalThis.localStorage?.setItem(TICKS_KEY, next ? "1" : "0"); } catch { /* optional */ }
    if (next) { if (muted) onToggleMute?.(); primeAudio(true); }
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
    else if (id) { primeAudio(); setPlaying(false); setSelectedId(id); setSocialOpen(false); const bolt = bolts.find((row) => row.id === id); if (bolt && audioRef.current && audible) playTick(audioRef.current.ctx, bolt.side, replayImpactStrength(bolt, bolts)); }
    else setSelectedId(null);
  }
  function selectPrint(bolt: TapeBolt) {
    setPlaying(false); setCursor(bolt.cursor); setSelectedId(bolt.id); setSocialOpen(false);
  }
  async function share() {
    if (!subject) return;
    const url = replayShareUrl(window.location.origin, { ...subject, fromTs: view.start, toTs: view.end, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol }, cursor);
    try {
      if (typeof navigator.share === "function" && window.innerWidth < 760) { await navigator.share({ title: `A Bulls App · ${title}`, url }); setShareNote("Shared"); return; }
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") return;
      setShareNote(url);
    }
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

  const verifyNote = selected ? `${printSource(selected)} · ${selected.signature ? "transaction reference attached" : "no receipt attached"}` : "";
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
  const roundLine = tapeMatchedRounds(visible, mark.realizedUsd).line;
  const verifyHref = subject ? replayShareUrl(typeof window === "undefined" ? INTELLIGENCE_PUBLIC_ORIGIN : window.location.origin, { ...subject, fromTs: view.start, toTs: view.end, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol }) : null;
  const round = heldRound(bolts, cursor);
  const scrubRound = heldRound(bolts, 1);
  const heldMs = round.entry ? (round.exit ? round.exit.timestamp : visibleTime) - round.entry.timestamp : null;
  const heldLabel = heldMs == null || heldMs < 0 ? "—" : formatHeld(heldMs);
  const sizeLabel = usdSummary.boughtUsd != null ? formatUsdNotional(usdSummary.boughtUsd) : "—";
  const tapeKind = candles.length ? "CANDLE TAPE" : "EVENT TAPE";

  return (
    <section className="rs" data-ledger={ledgerOpen} data-room={room ?? undefined} data-status={status} aria-label="Replay">
      <ReplayStudioStyles />
      <header className="rs-head">
        <button type="button" className="rs-icon" aria-label="Back to the Field" onClick={onBack}><ArrowLeft size={17} /></button>
        <div className="rs-title">
          <TraderSigil wallet={subject.wallet} size={28} className="rs-title__sigil" title={`Deterministic wallet sigil for ${traderLabel}`}/>
          {room ? <span className="rs-chip">{ROOM_CHIP[room]}</span> : null}
          <div className="rs-title__text">
            <h1>{title}</h1>
          </div>
        </div>
        <div className="rs-head-tools">
          <div className="rs-view-switch" aria-label="Replay view">
            <button type="button" aria-pressed={!ledgerOpen} onClick={() => setLedgerOpen(false)}><Clapperboard size={15} aria-hidden="true"/><span className="rs-btn-label">Cinema</span></button>
            <button type="button" aria-pressed={ledgerOpen} onClick={() => setLedgerOpen(true)}><List size={15} aria-hidden="true"/><span className="rs-btn-label">Trade log</span></button>
          </div>
          {onToggleWatch ? <button type="button" className="rs-watch" aria-pressed={traderWatched} onClick={() => watch("wallet")}><Star size={15} aria-hidden="true"/><span className="rs-btn-label">{traderWatched ? "Saved trader" : "Watch trader"}</span></button> : null}
          <button type="button" className="rs-icon" aria-label={audible ? "Turn tick sound off" : "Turn tick sound on"} aria-pressed={audible} title={muted ? "Sound is muted in the Field" : undefined} onClick={toggleTicks}>{audible ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
        </div>
      </header>
      <div className="rs-body">
      <div className="rs-frame" ref={frameRef} data-replay-tape data-scale={scaleMode} data-view-start={Math.round(view.start)} data-view-end={Math.round(view.end)} data-candles={candles.length} data-bolt-groups={groups.length} data-cohort={cohortOn ? ticks.length : 0}>
        {status === "ready" ? <canvas ref={canvasRef} className="rs-canvas" onPointerDown={onCanvasPointer} aria-label={`${candles.length ? "Candles" : "Event tape"} with ${bolts.length} buy and sell bolts. Tap a bolt for its evidence.`} role="img" /> : null}
        {status === "loading" || status === "building" ? <div className="rs-state rs-skeleton" aria-live="polite"><div className="rs-skeleton__chart" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><p><b>Grey is reading prints</b><span>{status === "building" ? "Extending retained history without inventing missing evidence." : "Matching receipts to the tape and checking candle coverage."}</span></p></div> : null}
        {status === "empty" ? <div className="rs-state"><p>No retained buy or sell prints for this wallet and token in this window yet.</p><small>Nothing is drawn until a print is indexed.</small></div> : null}
        {status === "error" ? <div className="rs-state"><p>{error}</p><button type="button" onClick={() => { setStatus("loading"); setAttempts((value) => value + 1); }}>TRY AGAIN</button></div> : null}
      </div>

      {ledgerOpen && status === "ready" ? <ReplayLedger bolts={bolts} cursor={cursor} selectedId={selectedId} onSelect={selectPrint} onClose={() => setLedgerOpen(false)}/> : null}
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
              <b data-side={selected.side}>{printLabel(selected).toUpperCase()}</b>
              <span>{when(selected.timestamp)}</span>
              <strong data-side={selected.side}>{observedUsdNotional(selected) != null ? formatUsdNotional(observedUsdNotional(selected)!) : reportedPositionUsd(selected) != null ? `${formatUsdNotional(reportedPositionUsd(selected)!)} · reported position` : "Fill USD unavailable"}</strong>
              {amountLabel(selected.amount) ? <span>{amountLabel(selected.amount)} {subject.symbol ?? resolvedSymbol ?? "tokens"}</span> : null}
              {selected.verification === "provider-reported" && selected.priceUsd ? <span>Fomo-reported ${selected.priceUsd.toPrecision(3)}</span> : null}
              <button type="button" className="rs-icon rs-icon--small" aria-label="Close evidence" onClick={() => setSelectedId(null)}><X size={14} /></button>
            </div>
            {selectedGroup && selectedGroup.count > 1 ? <p className="rs-evidence__meta">{selectedGroup.count} prints on this bar</p> : null}
            <p className="rs-evidence__meta">{verifyNote}{selected.sources.length ? ` · ${selected.sources.join(" · ")}` : ""}</p>
            {selected.signature ? <p className="rs-evidence__sig">{explorer ? <a href={explorer} target="_blank" rel="noreferrer">{selected.signature}</a> : selected.signature}</p> : null}
            <div className="rs-actions"><button type="button" onClick={() => openEvidence(selected)}>ALL RECEIPTS</button></div>
          </div>
        ) : null}
          <>
            {status === "ready" ? <div className="rs-strip" data-replay-strip aria-label="Matched results scoreboard">
              <div className="rs-strip__row">
                <div className="rs-strip__line" onClick={() => setStripOpen((value) => !value)}>
                  <strong data-number="true" data-sign={mark.realizedUsd==null?"unknown":mark.realizedUsd>=0?"up":"down"}>{signedUsd(mark.realizedUsd)}</strong>
                  <span>{PNL_REALIZED_LABEL}</span>
                  <span>GROSS</span>
                  <span>NET —</span>
                  <span>{historyLabel}</span>
                  <span data-coverage={coverageLabel.toLowerCase()}>{coverageLabel}</span>
                  <span>SIZE {sizeLabel}</span>
                  <span>HELD {heldLabel}</span>
                  <span>{tapeKind}</span>
                  <span className="rs-count">{buys} entries · {visible.length - buys} exits</span>
                </div>
                <button type="button" className="rs-strip__expand" aria-expanded={stripOpen} aria-controls="replay-strip-panel" onClick={() => setStripOpen((value) => !value)}>{stripOpen ? "Hide" : "Details"}</button>
              </div>
              {stripOpen ? <div id="replay-strip-panel" className="rs-strip__panel">
                <div className="rs-hud rs-scoreboard">
                  <div className="rs-hud__mode"><b>MATCHED RESULTS</b><span data-coverage={coverageLabel.toLowerCase()}>{coverageLabel}</span></div>
                  {headerLine ? <p className="rs-line" data-testid="replay-header-line">{headerLine}</p> : null}
                  <div className="rs-hud__metric rs-hud__metric--pnl"><span>{PNL_REALIZED_LABEL}</span><strong data-number="true" data-sign={mark.realizedUsd==null?"unknown":mark.realizedUsd>=0?"up":"down"}>{signedUsd(mark.realizedUsd)}</strong>{verifyHref?<a href={verifyHref}>VERIFY</a>:null}</div>
                  <div className="rs-hud__metric rs-hud__metric--pnl"><span>{PNL_HYPOTHETICAL_LABEL}</span><strong data-number="true" data-sign={mark.deltaUsd==null?"unknown":mark.deltaUsd>=0?"up":"down"}>{signedUsd(mark.deltaUsd)}</strong>{verifyHref?<a href={verifyHref}>VERIFY</a>:null}</div>
                  <div className="rs-hud__metric"><span>MATCHED EXITS</span><strong data-number="true">{mark.realizedUsd==null?"—":visible.filter(row=>row.side==="sell").length}</strong></div>
                  <div className="rs-hud__metric"><span>REMAINING</span><strong data-number="true">{mark.remainingTokens==null?"—":amountLabel(mark.remainingTokens)}</strong></div>
                  <div className="rs-hud__metric"><span>GROSS</span><strong data-number="true">{signedUsd(mark.realizedUsd)}</strong></div>
                  <div className="rs-hud__metric"><span>NET</span><strong data-number="true">—</strong></div>
                  <small className="rs-hud__note">{roundLine} · {visible.length}/{bolts.length} prints · unknowns stay —</small>
                  <small className="rs-hud__note">GROSS uses observed fill notionals. NET is unavailable because fees are not retained in this window.</small>
                  {status === "ready" && !candleCoverage.usable && retainedCandles.length > 0 ? <small className="rs-hud__note">Cached candles cover {candleCoverage.covered} of {candleCoverage.total} events. Showing all available OHLC; uncovered events stay time-only and are never placed on an unrelated candle.</small> : null}
                </div>
                <ReplayUsdTotals summary={usdSummary} buyCoverage={buyCoverage} sellCoverage={sellCoverage}/>
                <button type="button" className="rs-strip__dismiss" onClick={() => setStripOpen(false)}>Dismiss</button>
              </div> : null}
            </div> : null}
            <div className="rs-scrubber">
              <div className="rs-scrub-ticks" aria-hidden="true">
                {groups.map((group) => <i key={group.key} data-side={group.side} data-mark={group.bolts.some((bolt) => bolt.id === scrubRound.entry?.id || bolt.id === scrubRound.exit?.id) ? "hero" : undefined} style={{ left: `${group.cursor * 100}%` }} />)}
              </div>
              {status === "ready" ? <span className="rs-scrub-now" aria-hidden="true" style={{ left: `clamp(48px, ${cursor * 100}%, calc(100% - 48px))` }}>{when(visibleTime)}</span> : null}
              <input className="rs-scrub" type="range" min={0} max={1000} value={Math.round(cursor * 1000)} aria-label="Hold and scrub Replay position" aria-valuetext={status === "ready" ? when(visibleTime) : undefined} disabled={status !== "ready"} onKeyDown={onScrubKey} onPointerDown={()=>{scrubbingRef.current=true;setPlaying(false);}} onPointerUp={()=>{scrubbingRef.current=false;}} onPointerCancel={()=>{scrubbingRef.current=false;}} onInput={(event) => { setPlaying(false); const next=Number((event.target as HTMLInputElement).value)/1000; setCursor(next); if(scrubbingRef.current){const notch=Math.round(next*24);if(notch!==lastHapticRef.current){lastHapticRef.current=notch;if(!liveReducedMotion()&&typeof navigator.vibrate==="function")navigator.vibrate(5);}} }} />
            </div>
            <div className="rs-controls">
              <div className="rs-transport">
                <button type="button" className="rs-icon" aria-label="Previous print" disabled={status !== "ready"} onClick={() => step(-1)}><SkipBack size={15} /></button>
                <button type="button" className="rs-play" aria-label={playing ? "Pause" : "Play"} disabled={status !== "ready"} onClick={toggle}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
                <button type="button" className="rs-icon" aria-label="Next print" disabled={status !== "ready"} onClick={() => step(1)}><SkipForward size={15} /></button>
                <button type="button" className="rs-speed" aria-label="Playback speed" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed}×</button>
              </div>
              <div className="rs-control-actions">
                <button type="button" className="rs-pill" aria-pressed={whatIf} onClick={()=>setWhatIf(value=>!value)}>WHAT-IF</button>
                <button type="button" className="rs-pill rs-pill--versus" onClick={()=>{setPlaying(false);setVersusOpen(true);}}>VERSUS</button>
                <button type="button" className="rs-pill" onClick={() => void share()} aria-label="Copy a link to this Replay"><Share2 size={13} /> {shareNote && shareNote.length < 20 ? shareNote : "SHARE"}</button>
                <button type="button" className="rs-pill rs-pill--cut" disabled={status !== "ready"} onClick={() => { setPlaying(false); setCutOpen(true); }}>CUT</button>
              </div>
            </div>
            <p className="rs-source">{candles.length ? `Candles · ${candleSourceLabel(source)}${!candleCoverage.usable ? ` · ${candleCoverage.covered}/${candleCoverage.total} events candle-covered` : ""}` : status === "ready" ? "Dark tape · price candles unavailable · event timing only" : ""}{status === "ready" ? ` · ${bolts.length} events${events.some((row) => row.verification === "provider-reported") ? " · Fomo-reported" : ""}` : ""}</p>
            <p className="rs-disclaimer">{PNL_CAVEAT}</p>
          </>
        {shareNote ? <p className="rs-share-status" role="status">{shareNote.startsWith("http") ? <>Copy this Replay link: <a href={shareNote}>{shareNote}</a></> : shareNote}</p> : null}
      </footer>
      {versusOpen?<ReplayVersusPanel subject={{...subject,displayName:subject.displayName??handle,symbol:subject.symbol??resolvedSymbol}} traderLabel={traderLabel} candles={candles} heroBolts={bolts} start={view.start} end={view.end} cursor={cursor} scaleMode={scaleMode} onClose={()=>setVersusOpen(false)}/>:null}
      {cutOpen && subject ? <CutPanel subject={{ ...subject, displayName: subject.displayName ?? handle, symbol: subject.symbol ?? resolvedSymbol }} title={title} trader={traderLabel} room={room} bolts={bolts} cohort={cohortOn && ticks.length ? ticks : []} candles={candles} marketCapPoints={marketCapPoints} candleCount={candles.length} start={view.start} end={view.end} scaleMode={scaleMode} source={source} evidenceLine={evidenceLine} onClose={() => setCutOpen(false)} /> : null}
      {socialOpen && day0 ? <ReplaySocialStrip mint={subject.mint} symbol={subject.symbol ?? resolvedSymbol} name={null} wallet={subject.wallet} chain={subject.chainKey} room={room} day0={day0} onClose={() => setSocialOpen(false)} /> : null}
    </section>
  );
}

function playTick(ctx: AudioContext, side: "buy" | "sell", strength = 0.5) {
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain(), pitch = 0.86 + Math.max(0, Math.min(1, strength)) * 0.46;
    osc.type = "sine";
    osc.frequency.setValueAtTime((side === "buy" ? 1480 : 980) * pitch, now);
    osc.frequency.exponentialRampToValueAtTime((side === "buy" ? 1180 : 760) * pitch, now + 0.045);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025 + strength * 0.035, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.06);
  } catch { /* sound is optional */ }
}

function ReplayUsdTotals({summary,buyCoverage,sellCoverage}:{summary:TapeUsdSummary;buyCoverage:string|null;sellCoverage:string|null}){return <div className="rs-usd" aria-label="Retained fill USD sizes"><div><span>Bought</span><b data-tone="buy">{summary.boughtUsd!=null?formatUsdNotional(summary.boughtUsd):"—"}</b></div><div><span>Sold</span><b data-tone="sell">{summary.soldUsd!=null?formatUsdNotional(summary.soldUsd):"—"}</b></div><div><span>Avg buy</span><b>{formatUsdPrice(summary.avgBuyUsd)}</b></div><div><span>Avg sell</span><b>{formatUsdPrice(summary.avgSellUsd)}</b></div>{buyCoverage?<small>{buyCoverage}</small>:null}{sellCoverage?<small>{sellCoverage}</small>:null}</div>}

function ReplayStudioStyles(){return null;}
