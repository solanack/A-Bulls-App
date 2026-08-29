import { useEffect, useRef, useState } from "react";
import { FileSearch, Orbit, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import type { FieldOS } from "@/lib/field/field-os";
import type { UniverseDataStatus } from "@/lib/universe-data/contracts";
import { COSMOLOGY_RULES, GALAXIES, getGalaxy } from "@/lib/field/galaxies";
import {
  DOCK,
  MODE_HINT,
  type FieldMode,
  type FocusedParticle,
  type GalaxyDefinition,
  type IntelligenceResult,
  type OrganismState,
  type EvidenceRecord,
  type ReplayState,
} from "@/lib/field/types";

const EXAMPLES = [
  { label: "WRAPPED SOL", value: "So11111111111111111111111111111111111111112" },
  { label: "SYSTEM PROGRAM", value: "11111111111111111111111111111111" },
];

const STARMAP_LEGEND = [
  ["star", "STAR"],
  ["planet", "PLANET"],
  ["comet", "COMET"],
  ["ghost", "GHOST"],
] as const;

const STATE_LABEL: Record<OrganismState, string> = {
  idle: "THE FIELD IS CONSCIOUS",
  listening: "LISTENING",
  analyzing: "ANALYZING PUBLIC MEMORY",
  speaking: "SPEAKING OBSERVED FACTS",
  complete: "COMPLETE",
  return: "RETURNING TO FIELD",
};

export function AppShell() {
  const hostRef = useRef<HTMLDivElement>(null);
  const osRef = useRef<FieldOS | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<FieldMode>("explore");
  const [queryActive, setQueryActive] = useState(false);
  const [organismState, setOrganismState] = useState<OrganismState>("idle");
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [focus, setFocus] = useState<FocusedParticle | null>(null);
  const [galaxy, setGalaxy] = useState<GalaxyDefinition>(() => getGalaxy("galaxy-zero"));
  const [galaxies, setGalaxies] = useState<readonly GalaxyDefinition[]>(GALAXIES);
  const [starmapOpen, setStarmapOpen] = useState(false);
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord | null>(null);
  const [dataStatus, setDataStatus] = useState<UniverseDataStatus>({
    store: "memory-fallback",
    coverage: "degraded",
    circuitBreaker: null,
    disclosure: "Checking indexed universe coverage.",
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let os: FieldOS | null = null;
    void import("@/lib/field/field-os").then(({ FieldOS }) => {
      if (cancelled || !hostRef.current) return;
      os = new FieldOS(hostRef.current, (event) => {
        setMode(event.mode);
        setQueryActive(event.queryActive);
        setOrganismState(event.organismState);
        setResult(event.result);
        setMuted(event.muted);
        setFocus(event.focus);
        setGalaxy(event.galaxy);
        setGalaxies(event.galaxies);
        setReplay(event.replay);
        setEvidence(event.evidence);
        setDataStatus(event.dataStatus);
      });
      osRef.current = os;
    });
    return () => {
      cancelled = true;
      os?.destroy();
      osRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!starmapOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setStarmapOpen(false);
    };
    globalThis.addEventListener("keydown", onKeyDown);
    return () => globalThis.removeEventListener("keydown", onKeyDown);
  }, [starmapOpen]);

  function onAsk(value: string) {
    const query = value.trim();
    if (!query) return;
    void osRef.current?.submitQuery(query);
  }

  function onQueryMode() {
    osRef.current?.setMode("query");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const workspaceOpen = ["intelligence", "trickster", "games", "replay", "evidence"].includes(mode) && !queryActive;
  const timelineOpen = mode === "replay" || mode === "evidence";
  const slotValue = focus
    ? `${focus.cosmicKind.replace("-", " ")} · ${focus.kind} · ${galaxy.name}`
    : null;

  return (
    <main
      className={`field-shell${queryActive ? " field-shell--query" : ""}`}
      data-mode={queryActive ? "query" : mode}
      data-galaxy={galaxy.id}
    >
      <div ref={hostRef} className="field-shell__field" />
      <div className="field-shell__chrome" hidden={queryActive} aria-hidden={queryActive}>
        <header className="field-shell__top">
          <button type="button" className="field-shell__brand" onClick={() => osRef.current?.setMode("explore")}>
            A BULLS APP
          </button>
          <form
            className="field-shell__search"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              onAsk(inputRef.current?.value ?? "");
            }}
          >
            <input
              ref={inputRef}
              type="search"
              autoComplete="off"
              spellCheck={false}
              placeholder="Wallet, tx, token, NFT, program"
              aria-label="Ask the field a public identifier"
            />
            <button className="field-shell__ask" type="submit">
              ASK
            </button>
          </form>
        </header>
        <button
          type="button"
          className="field-shell__galaxy-trigger"
          onClick={() => setStarmapOpen(true)}
          aria-haspopup="dialog"
        >
          <Orbit size={15} aria-hidden="true" />
          <span>{galaxy.name}</span>
          <small>ORIGIN MAP</small>
        </button>
        <p
          className="field-shell__data-status"
          data-coverage={dataStatus.coverage}
          title={dataStatus.disclosure}
        >
          <span>{dataStatus.store === "d1" ? "INDEXED" : "PROTOTYPE"}</span>
          {dataStatus.coverage.toUpperCase()}
        </p>
        <p className="field-shell__tag">
          <strong>{galaxy.name.toUpperCase()} · THE BLOCKCHAIN IS ALIVE</strong>
          {MODE_HINT[mode]}
        </p>
        {focus ? <p className="field-shell__focus">{slotValue}</p> : null}
        <div className="field-shell__chips">
          {EXAMPLES.map((item) => (
            <button
              key={item.value}
              type="button"
              className="query-chip"
              onClick={() => {
                if (inputRef.current) inputRef.current.value = item.value;
                onAsk(item.value);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="field-shell__mode-tools" aria-label="Time and provenance tools">
          <button type="button" aria-pressed={mode === "replay"} onClick={() => osRef.current?.setMode("replay")}>
            <Play size={13} aria-hidden="true" /> REPLAY
          </button>
          <button type="button" aria-pressed={mode === "evidence"} onClick={() => osRef.current?.setMode("evidence")}>
            <FileSearch size={13} aria-hidden="true" /> EVIDENCE
          </button>
        </div>
        <nav className="field-shell__commands" aria-label="Primary modes">
          {DOCK.map((item) => (
            <button
              key={item.id}
              type="button"
              className="field-shell__command"
              aria-pressed={mode === item.id || (item.id === "query" && queryActive)}
              onClick={() => {
                if (item.id === "query") onQueryMode();
                else osRef.current?.setMode(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {starmapOpen && !queryActive ? (
        <Starmap
          galaxies={galaxies}
          current={galaxy}
          onClose={() => setStarmapOpen(false)}
          onSelect={(id) => {
            if (osRef.current?.setGalaxy(id)) setStarmapOpen(false);
          }}
        />
      ) : null}

      {queryActive ? (
        <div className="query-experience">
          <button
            type="button"
            className="query-mute"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={() => osRef.current?.setMuted(!muted)}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="query-chin">
            <form
              className="query-experience__form"
              onSubmit={(event) => {
                event.preventDefault();
                onAsk(queryInputRef.current?.value ?? "");
              }}
            >
              <input
                ref={queryInputRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Ask again · wallet, tx, mint, NFT, program"
                aria-label="Ask the living field"
              />
              <button className="query-experience__submit" type="submit">
                ASK
              </button>
            </form>
            <div className="query-status">
              <b>{STATE_LABEL[organismState]}</b>
              {result?.spokenText ? <p>{result.spokenText}</p> : null}
            </div>
            <button
              type="button"
              className="query-experience__back"
              onClick={() => void osRef.current?.returnToField()}
            >
              RETURN TO FIELD
            </button>
          </div>
        </div>
      ) : null}

      <section className={`field-shell__workspace${timelineOpen ? " field-shell__workspace--timeline" : ""}`} hidden={!workspaceOpen}>
        <div className="field-shell__workspace-head">
          <strong>{mode === "intelligence" ? "INTELLIGENCE" : mode === "trickster" ? "CREATE · TRICKSTER" : mode === "replay" ? "REPLAY · CHAIN TIME" : mode === "evidence" ? "EVIDENCE · PROVENANCE" : "GAMES"}</strong>
          <button type="button" className="field-shell__close" onClick={() => osRef.current?.setMode("explore")}>
            RETURN TO FIELD
          </button>
        </div>
        <div className="field-shell__workspace-body">
          {mode === "intelligence" ? (
            <IntelligencePanel result={result} onAsk={() => onQueryMode()} />
          ) : null}
          {mode === "trickster" ? (
            <article className="workspace-copy">
              <h2>Create stays publish-only</h2>
              <p>
                Trickster composes evidence-backed clips from indexed chain events. This assignment keeps the
                field and QUERY organism intact. No wallet connect. No commerce.
              </p>
            </article>
          ) : null}
          {mode === "games" ? (
            <article className="workspace-copy">
              <h2>Learn from observed chain history</h2>
              <p>
                The Grey will guide narrated examples using real indexed events. This is education without
                scores, missions, progression, or competitive mechanics.
              </p>
            </article>
          ) : null}
          {mode === "replay" && replay ? (
            <ReplayPanel
              replay={replay}
              dataStatus={dataStatus}
              onToggle={() => osRef.current?.toggleReplay()}
              onSeek={(cursor) => osRef.current?.seekReplay(cursor)}
              onStep={(direction) => osRef.current?.stepReplay(direction)}
              onEvidence={() => osRef.current?.setMode("evidence")}
            />
          ) : null}
          {mode === "evidence" ? (
            <EvidencePanel
              evidence={evidence}
              onReplay={() => osRef.current?.setMode("replay")}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

function ReplayPanel({
  replay,
  dataStatus,
  onToggle,
  onSeek,
  onStep,
  onEvidence,
}: {
  replay: ReplayState;
  dataStatus: UniverseDataStatus;
  onToggle: () => void;
  onSeek: (cursor: number) => void;
  onStep: (direction: -1 | 1) => void;
  onEvidence: () => void;
}) {
  const elapsed = (replay.windowEnd - replay.windowStart) * replay.cursor;
  return (
    <article className="replay-panel">
      <div className="replay-panel__readout">
        <span>CHAIN TIME</span>
        <strong>+{(elapsed / 1000).toFixed(1)}s</strong>
        <b>{replay.visibleEventCount.toLocaleString()} / {replay.totalEventCount.toLocaleString()} EVENTS VISIBLE</b>
      </div>
      <div className="replay-panel__controls">
        <button type="button" onClick={() => onStep(-1)} aria-label="Previous event"><SkipBack size={17} /></button>
        <button type="button" className="replay-panel__play" onClick={onToggle} aria-label={replay.status === "playing" ? "Pause replay" : "Play replay"}>
          {replay.status === "playing" ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button type="button" onClick={() => onStep(1)} aria-label="Next event"><SkipForward size={17} /></button>
        <input
          type="range"
          min="0"
          max="1000"
          value={Math.round(replay.cursor * 1000)}
          onChange={(event) => onSeek(Number(event.currentTarget.value) / 1000)}
          aria-label="Replay position"
        />
      </div>
      <div className="replay-panel__provenance">
        <p><b>WINDOW COVERAGE</b> {replay.coverageStatement}</p>
        <p><b>POLICY</b> {replay.samplingPolicy}</p>
        <button type="button" onClick={onEvidence}>INSPECT EVIDENCE</button>
      </div>
      <p className="replay-panel__data"><b>DATA SPINE</b> {dataStatus.disclosure}</p>
      {dataStatus.circuitBreaker ? (
        <p className="replay-panel__data">
          <b>PROVIDER BUDGET</b> {dataStatus.circuitBreaker.unitsSpent.toLocaleString()} / {Math.floor(dataStatus.circuitBreaker.monthlyLimit * dataStatus.circuitBreaker.circuitBreakerRatio).toLocaleString()} guarded units
        </p>
      ) : null}
      <p className="replay-panel__instruction">Tap any revealed particle to load its evidence receipt.</p>
    </article>
  );
}

function EvidencePanel({ evidence, onReplay }: { evidence: EvidenceRecord | null; onReplay: () => void }) {
  if (!evidence) {
    return (
      <article className="evidence-panel evidence-panel--empty">
        <FileSearch size={24} aria-hidden="true" />
        <h2>No event selected</h2>
        <p>Return to Replay, reveal an event, then tap its particle. Only visible events can be inspected.</p>
        <button type="button" onClick={onReplay}>RETURN TO REPLAY</button>
      </article>
    );
  }
  return (
    <article className="evidence-panel">
      <div className="evidence-panel__grid">
        <div><span>EVENT</span><strong>{evidence.eventId}</strong></div>
        <div><span>OBSERVED</span><strong>+{(evidence.observedAt / 1000).toFixed(2)}s prototype time</strong></div>
        <div><span>OBJECT</span><strong>{evidence.cosmicKind} · {evidence.kind}</strong></div>
        <div><span>VERIFICATION</span><strong>{evidence.verificationState}</strong></div>
      </div>
      <div className="evidence-panel__chart" data-status={evidence.chartStatus}>
        <span>PRICE HISTORY</span>
        <strong>NOT AVAILABLE</strong>
        <p>{evidence.chartReason}</p>
      </div>
      <p><b>SOURCES</b> {evidence.sources.join(" · ")}</p>
      <p><b>COVERAGE</b> {evidence.coverageStatement}</p>
      <button type="button" onClick={onReplay}>RETURN TO REPLAY</button>
    </article>
  );
}

function Starmap({
  galaxies,
  current,
  onClose,
  onSelect,
}: {
  galaxies: readonly GalaxyDefinition[];
  current: GalaxyDefinition;
  onClose: () => void;
  onSelect: (id: GalaxyDefinition["id"]) => void;
}) {
  return (
    <section className="starmap" role="dialog" aria-modal="true" aria-labelledby="starmap-title">
      <div className="starmap__veil" onClick={onClose} aria-hidden="true" />
      <div className="starmap__surface">
        <header className="starmap__header">
          <div>
            <span>THE LIVING UNIVERSE</span>
            <h1 id="starmap-title">Origin starmap</h1>
          </div>
          <button
            type="button"
            className="starmap__close"
            onClick={onClose}
            aria-label="Close starmap"
            autoFocus
          >
            <X size={18} />
          </button>
        </header>
        <p className="starmap__rule">
          A token's home galaxy is fixed by where it launched. Trading elsewhere creates a route; it never
          rewrites origin.
        </p>
        <div className="starmap__field" aria-label="Available galaxies">
          <div className="starmap__orbit starmap__orbit--outer" />
          <div className="starmap__orbit starmap__orbit--inner" />
          {galaxies.map((item, index) => {
            const selected = item.id === current.id;
            const available = item.status === "populated";
            return (
              <button
                key={item.id}
                type="button"
                className={`starmap__galaxy starmap__galaxy--${index + 1}`}
                data-current={selected || undefined}
                data-status={item.status}
                disabled={!available}
                onClick={() => onSelect(item.id)}
                style={{ "--galaxy-accent": item.accent } as React.CSSProperties}
              >
                <span className="starmap__core" />
                <strong>{item.name}</strong>
                <small>{selected ? "CURRENT GALAXY" : available ? "ENTER GALAXY" : "CALIBRATING"}</small>
              </button>
            );
          })}
        </div>
        <div className="starmap__details">
          <div>
            <span>CURRENT ORIGIN</span>
            <strong>{current.ecosystem}</strong>
            <p>{current.description}</p>
          </div>
          <div className="starmap__legend" aria-label="Universe taxonomy">
            {STARMAP_LEGEND.map(([kind, label]) => (
              <span key={kind}>
                <b>{label}</b>
                {COSMOLOGY_RULES[kind].onChainMeaning}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function IntelligencePanel({
  result,
  onAsk,
}: {
  result: IntelligenceResult | null;
  onAsk: () => void;
}) {
  if (!result) {
    return (
      <article className="workspace-copy">
        <h2>Public memory, observed facts</h2>
        <p>
          ASK a public identifier on the Field. The same particles become the Grey and speak only what the
          public chain shows.
        </p>
        <button type="button" className="query-experience__submit" onClick={onAsk}>
          ASK THE FIELD
        </button>
      </article>
    );
  }
  return (
    <article className="workspace-copy">
      <h2>
        {result.label} · {result.shortId}
      </h2>
      <p>{result.spokenText}</p>
      <p>
        Coverage {result.coverage}
        {result.source ? ` · ${result.source}` : ""}
        {result.disclosure ? ` · ${result.disclosure}` : ""}
      </p>
      <ul className="workspace-facts">
        {result.facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    </article>
  );
}
