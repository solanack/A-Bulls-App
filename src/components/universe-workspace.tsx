import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, LoaderCircle, Play, Share2 } from "lucide-react";
import { callUniverseTool, type UniverseTool } from "@/lib/universe-intelligence";
import type { EvidenceRecord, FieldMode, GalaxyDefinition } from "@/lib/field/types";

const WSOL = "So11111111111111111111111111111111111111112";
type Data = Record<string, unknown>;

const obj = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown) => value == null ? "" : String(value);
const num = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const short = (value: unknown) => {
  const valueText = text(value);
  return valueText.length > 18 ? `${valueText.slice(0, 8)}…${valueText.slice(-6)}` : valueText;
};

export function UniverseWorkspace({
  mode,
  galaxy,
  evidence,
  askMint,
  onNarrate,
}: {
  mode: FieldMode;
  galaxy: GalaxyDefinition;
  evidence: EvidenceRecord | null;
  askMint?: string;
  onNarrate: (text: string) => void;
}) {
  const [wallet, setWallet] = useState("");
  const [walletB, setWalletB] = useState("");
  const [mint, setMint] = useState(evidence?.mint ?? askMint ?? "");
  const [quoteMint, setQuoteMint] = useState(WSOL);
  const [sequenceScope, setSequenceScope] = useState<"mint" | "wallet">("mint");
  const [holdDays, setHoldDays] = useState(7);
  const [result, setResult] = useState<Data | null>(null);
  const [replay, setReplay] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (evidence?.mint) setMint(evidence.mint);
    else if (askMint) setMint(askMint);
  }, [evidence?.mint, askMint]);

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location?.search ?? "");
    const shareId = params.get("tour");
    if (!shareId || mode !== "trickster") return;
    void execute("trickster-read", { shareId });
  }, [mode]);

  async function execute(tool: UniverseTool, input: Data) {
    setBusy(true);
    setError("");
    try {
      const response = obj(await callUniverseTool({ data: { tool, input } }));
      if (response.ok === false) throw new Error(text(response.error) || "The indexed record is unavailable.");
      setResult(response);
      if (tool === "replay") setReplay(obj(response.bundle));
      return response;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The indexed record is unavailable.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const common = { wallet, mint, quoteMint };
  const replayBundle = replay ?? obj(result?.bundle);

  if (mode === "replay") {
    return (
      <WorkspaceFrame eyebrow={`${galaxy.name} · PLAYABLE DATA`} title="Replay indexed chain time" busy={busy} error={error}>
        <InputGrid wallet={wallet} setWallet={setWallet} mint={mint} setMint={setMint} quoteMint={quoteMint} setQuoteMint={setQuoteMint} />
        <Action onClick={() => void execute("replay", { wallets: [wallet].filter(Boolean), mint, quoteMint, bucketSeconds: 60 })} disabled={!wallet || !mint}>LOAD REPLAY</Action>
        <ReplayView bundle={replayBundle} waitingMint={mint} />
      </WorkspaceFrame>
    );
  }

  if (mode === "evidence") {
    const context = obj(result?.context);
    const eventMint = evidence?.mint ?? mint;
    return (
      <WorkspaceFrame eyebrow="SOURCE RECEIPT" title="Evidence and market context" busy={busy} error={error}>
        {evidence ? <Receipt evidence={evidence} /> : <p className="universe-empty">Select a revealed field event, or enter a token and timestamp below.</p>}
        <InputGrid wallet={wallet} setWallet={setWallet} mint={eventMint} setMint={setMint} quoteMint={quoteMint} setQuoteMint={setQuoteMint} hideQuote />
        <Action onClick={() => void execute("evidence", { mint: eventMint, subjectWallet: evidence?.wallet ?? wallet, signature: evidence?.signature, timestamp: evidence ? evidence.observedAt * (evidence.observedAt < 10_000_000_000 ? 1000 : 1) : Date.now() })} disabled={!eventMint}>LOAD VERIFIED CONTEXT</Action>
        <EvidenceContext context={context} />
      </WorkspaceFrame>
    );
  }

  if (mode === "compare") {
    return (
      <WorkspaceFrame eyebrow="WALLET VS WALLET" title="Compare observed activity" busy={busy} error={error}>
        <label>PUBLIC WALLET A<input value={wallet} onChange={(event) => setWallet(event.target.value.trim())} /></label>
        <label>PUBLIC WALLET B<input value={walletB} onChange={(event) => setWalletB(event.target.value.trim())} /></label>
        <Action onClick={() => void execute("compare", { walletA: wallet, walletB })} disabled={!wallet || !walletB}>COMPARE EVIDENCE</Action>
        <MetricObject value={obj(result?.comparison)} />
        <Disclosure>{text(obj(result?.comparison).disclaimer) || "Observed public activity only. No skill, ownership, or identity ranking."}</Disclosure>
      </WorkspaceFrame>
    );
  }

  if (mode === "what-if") {
    return (
      <WorkspaceFrame eyebrow="ESTIMATE · NOT A PREDICTION" title="Parallel Universe" busy={busy} error={error}>
        <InputGrid wallet={wallet} setWallet={setWallet} mint={mint} setMint={setMint} quoteMint={quoteMint} setQuoteMint={setQuoteMint} />
        <label>FIXED HOLD DAYS<input type="number" min="1" max="365" value={holdDays} onChange={(event) => setHoldDays(Number(event.target.value))} /></label>
        <Action onClick={() => void execute("what-if", { ...common, holdDays })} disabled={!wallet || !quoteMint}>CALCULATE HISTORICAL COUNTERFACTUAL</Action>
        <SimulationView simulation={obj(result?.simulation)} />
      </WorkspaceFrame>
    );
  }

  if (mode === "ghost") {
    return (
      <WorkspaceFrame eyebrow="COUNTERFACTUAL HOLDING" title="Ghost portfolio" busy={busy} error={error}>
        <InputGrid wallet={wallet} setWallet={setWallet} mint={mint} setMint={setMint} quoteMint={quoteMint} setQuoteMint={setQuoteMint} hideMint />
        <Action onClick={() => void execute("ghost", { wallet, quoteMint })} disabled={!wallet || !quoteMint}>REVEAL GHOST POSITIONS</Action>
        <SimulationView simulation={obj(result?.simulation)} />
      </WorkspaceFrame>
    );
  }

  if (mode === "sequences") {
    return (
      <WorkspaceFrame eyebrow="BOUNDED CHRONOLOGY" title="Market sequences" busy={busy} error={error}>
        <label>SCOPE<select value={sequenceScope} onChange={(event) => setSequenceScope(event.target.value as "mint" | "wallet")} id="sequence-scope"><option value="mint">TOKEN</option><option value="wallet">WALLET</option></select></label>
        <label>PUBLIC TOKEN OR WALLET<input value={mint} onChange={(event) => setMint(event.target.value.trim())} /></label>
        <Action onClick={() => void execute("sequences", { scopeType: sequenceScope, scopeValue: mint, limit: 80 })} disabled={!mint}>LOAD SEQUENCE</Action>
        <EventList events={arr(result?.events)} />
        <Disclosure>{text(result?.disclaimer) || "Chronology does not prove economic causation."}</Disclosure>
      </WorkspaceFrame>
    );
  }

  if (mode === "trickster") {
    return (
      <WorkspaceFrame eyebrow="CREATE · RECEIPTS REQUIRED" title="Trickster evidence story" busy={busy} error={error}>
        <InputGrid wallet={wallet} setWallet={setWallet} mint={mint} setMint={setMint} quoteMint={quoteMint} setQuoteMint={setQuoteMint} />
        <div className="universe-actions">
          <Action onClick={() => void execute("replay", { wallets: [wallet].filter(Boolean), mint, quoteMint, bucketSeconds: 60 })} disabled={!wallet || !mint}><Play size={14} /> BUILD FROM REPLAY</Action>
          <Action onClick={() => void publishStory(replayBundle, execute)} disabled={!arr(replayBundle.events).length}><Share2 size={14} /> VALIDATE & SHARE</Action>
        </div>
        <ReplayView bundle={replayBundle} compact />
        {result?.shareId ? <ShareReceipt id={text(result.shareId)} /> : null}
        <Disclosure>Every narration claim is derived from the loaded Replay events. Missing evidence blocks publishing.</Disclosure>
      </WorkspaceFrame>
    );
  }

  if (mode === "games") {
    const anomalies = arr(result?.anomalies);
    return (
      <WorkspaceFrame eyebrow="NARRATED EDUCATION · NO SCORE" title="Learn from observed history" busy={busy} error={error}>
        <p className="universe-lede">The Grey explains descriptive chain patterns. There are no missions, rankings, prizes, or progression loops.</p>
        <Action onClick={async () => {
          const response = await execute("education", {});
          const first = obj(arr(response?.anomalies)[0]);
          const narration = first.headline ? `Observed pattern: ${text(first.headline)}. This is descriptive evidence, not a prediction.` : "No indexed anomaly is available to narrate. I will not invent one.";
          onNarrate(narration);
        }}><BookOpen size={14} /> ASK THE GREY TO TEACH</Action>
        <EventList events={anomalies} />
        <Disclosure>{text(result?.disclaimer) || "Observed anomalies are descriptive, not predictions or recommendations."}</Disclosure>
      </WorkspaceFrame>
    );
  }

  return null;
}

function WorkspaceFrame({ eyebrow, title, busy, error, children }: { eyebrow: string; title: string; busy: boolean; error: string; children: React.ReactNode }) {
  return <article className="universe-workspace"><header><span>{eyebrow}</span><h2>{title}</h2></header>{busy ? <p className="universe-busy"><LoaderCircle size={15} /> Reading the indexed universe…</p> : null}{error ? <p className="universe-error">{error}</p> : null}<div className="universe-workspace__body">{children}</div></article>;
}

function InputGrid({ wallet, setWallet, mint, setMint, quoteMint, setQuoteMint, hideMint = false, hideQuote = false }: { wallet: string; setWallet: (v: string) => void; mint: string; setMint: (v: string) => void; quoteMint: string; setQuoteMint: (v: string) => void; hideMint?: boolean; hideQuote?: boolean }) {
  return <div className="universe-inputs"><label>PUBLIC WALLET<input value={wallet} onChange={(event) => setWallet(event.target.value.trim())} placeholder="Wallet address" /></label>{!hideMint ? <label>TOKEN MINT<input value={mint} onChange={(event) => setMint(event.target.value.trim())} placeholder="Token mint" /></label> : null}{!hideQuote ? <label>QUOTE MINT<input value={quoteMint} onChange={(event) => setQuoteMint(event.target.value.trim())} /></label> : null}</div>;
}

function Action({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button className="universe-action" type="button" onClick={onClick} disabled={disabled}>{children}</button>;
}

function ReplayView({ bundle, compact = false, waitingMint = "" }: { bundle: Data; compact?: boolean; waitingMint?: string }) {
  const events = arr(bundle.events), candles = arr(bundle.candles);
  if (!events.length && !candles.length) {
    if (waitingMint) {
      return <p className="universe-empty">WAIT_TAPE · mint is held. Indexed tape has not arrived. Empty coverage stays empty — no path was invented.</p>;
    }
    return <p className="universe-empty">EMPTY_TAPE · no mint is held and no replay is loaded. Indexed results will appear here.</p>;
  }
  return <section className="universe-result"><div className="universe-metrics"><Metric label="EVENTS" value={events.length} /><Metric label="CANDLES" value={candles.length} /><Metric label="SOURCES" value={arr(bundle.sources).length} /></div>{candles.length ? <CandleChart candles={candles} /> : <p className="universe-empty">No indexed OHLC series exists for this selection. No price series was invented.</p>}{!compact ? <EventList events={events} /> : null}<Disclosure>{text(obj(bundle.coverage).statement)} {arr(bundle.caveats).map(text).join(" ")}</Disclosure></section>;
}

function EvidenceContext({ context }: { context: Data }) {
  if (!Object.keys(context).length) return null;
  const pairs = arr(context.pricePairs), pair = obj(pairs[0]);
  return <section className="universe-result"><div className="universe-metrics"><Metric label="EVENTS" value={num(obj(context.activity).eventCount)} /><Metric label="WALLETS" value={num(obj(context.activity).walletCount)} /><Metric label="ROUTES" value={num(obj(context.routes).routeRows)} /></div>{arr(pair.candles).length ? <CandleChart candles={arr(pair.candles)} /> : <p className="universe-empty">No indexed price series exists around this event.</p>}<EventList events={arr(obj(context.activity).events)} /><Disclosure>{text(context.disclosure)}</Disclosure></section>;
}

function Receipt({ evidence }: { evidence: EvidenceRecord }) {
  return <div className="evidence-receipt"><CheckCircle2 size={18} /><div><b>{short(evidence.eventId)}</b><span>{evidence.verificationState} · slot {evidence.slot ?? "not indexed"}</span><span>{evidence.source ?? evidence.sources.join(" · ")}</span></div></div>;
}

function CandleChart({ candles }: { candles: unknown[] }) {
  const rows = candles.map(obj).filter((row) => num(row.high) || num(row.low));
  const range = useMemo(() => {
    const highs = rows.map((row) => num(row.high)), lows = rows.map((row) => num(row.low));
    return { high: Math.max(...highs, 1), low: Math.min(...lows, 0) };
  }, [rows]);
  if (!rows.length) return null;
  const y = (value: number) => 12 + (1 - (value - range.low) / Math.max(.0000001, range.high - range.low)) * 136;
  return <div className="candle-chart"><span>INDEXED OHLC · OBSERVED SWAPS</span><svg viewBox="0 0 640 160" role="img" aria-label="Indexed candlestick chart">{rows.slice(-90).map((row, index, shown) => { const x = 8 + index * (624 / Math.max(1, shown.length)); const up = num(row.close) >= num(row.open); return <g key={`${text(row.timestamp)}-${index}`} className={up ? "candle-up" : "candle-down"}><line x1={x} x2={x} y1={y(num(row.high))} y2={y(num(row.low))} /><rect x={x - 2} y={Math.min(y(num(row.open)), y(num(row.close)))} width="4" height={Math.max(1, Math.abs(y(num(row.open)) - y(num(row.close))))} /></g>; })}</svg></div>;
}

function EventList({ events }: { events: unknown[] }) {
  if (!events.length) return null;
  return <div className="universe-events">{events.slice(0, 40).map((item, index) => { const row = obj(item); return <div key={text(row.id ?? row.signature ?? index)}><time>{row.timestamp ? new Date(num(row.timestamp)).toLocaleString() : text(row.observed_at ?? row.observedAt)}</time><b>{text(row.side ?? row.kind ?? row.sequence_type ?? row.headline ?? "observed event")}</b><span>{short(row.signature ?? row.scope_value ?? row.source)}</span></div>; })}</div>;
}

function MetricObject({ value }: { value: Data }) {
  const entries = Object.entries(value).filter(([, entry]) => ["string", "number", "boolean"].includes(typeof entry));
  if (!entries.length) return null;
  return <div className="universe-metrics universe-metrics--wrap">{entries.map(([key, value]) => <Metric key={key} label={key.replaceAll(/([A-Z])/g, " $1").toUpperCase()} value={text(value)} />)}</div>;
}

function SimulationView({ simulation }: { simulation: Data }) {
  if (!Object.keys(simulation).length) return null;
  const outcomes = arr(simulation.outcomes ?? simulation.positions);
  return <section className="universe-result"><MetricObject value={simulation} /><EventList events={outcomes} /><Disclosure>{text(simulation.disclaimer)}</Disclosure></section>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Disclosure({ children }: { children: React.ReactNode }) { return children ? <p className="universe-disclosure">{children}</p> : null; }

async function publishStory(bundle: Data, execute: (tool: UniverseTool, input: Data) => Promise<Data | null>) {
  const events = arr(bundle.events).map(obj).slice(0, 8);
  if (!events.length) return;
  const evidence = events.map((event, index) => ({ id: `receipt-${index}`, signature: text(event.signature) || null, slot: event.slot ?? null, blockTime: num(event.timestamp) / 1000 || null, source: text(arr(event.sources)[0] ?? "indexed-intelligence"), sourceReference: event.signature ? null : `indexed-event:${text(event.id ?? index)}` }));
  const claims = events.map((event, index) => ({ id: `claim-${index}`, kind: "observed", statement: `${text(event.side ?? event.kind ?? "Event")} observed for ${short(event.wallet)} at ${new Date(num(event.timestamp)).toISOString()}.`, evidenceIds: [`receipt-${index}`] }));
  const manifest = { id: `tour-${Date.now()}`, storyType: "transaction-replay", subject: { kind: "token", id: text(obj(bundle.subject).mint) }, coverage: { from: num(obj(bundle.window).from), to: num(obj(bundle.window).to), verifiedPercent: events.length ? Math.round(events.filter((event) => ["verified", "finalized"].includes(text(event.verification))).length / events.length * 100) : 0, statement: text(obj(bundle.coverage).statement) || "Currently indexed evidence only." }, evidence, claims, scenes: claims.map((claim, index) => ({ id: `scene-${index}`, type: "evidence-event", durationFrames: 90, claimIds: [claim.id] })), output: { aspectRatio: "9:16", locale: "en-US", theme: "hyperspace", rendererVersion: "living-universe-v1" } };
  const validated = await execute("trickster-validate", manifest);
  if (validated?.ok) await execute("trickster-share", manifest);
}

function ShareReceipt({ id }: { id: string }) {
  const href = `${globalThis.location?.origin ?? "https://abullsapp.com"}/?tour=${encodeURIComponent(id)}`;
  return <div className="share-receipt"><CheckCircle2 size={18} /><div><b>FROZEN EVIDENCE TOUR</b><a href={href}>{href}</a></div></div>;
}
