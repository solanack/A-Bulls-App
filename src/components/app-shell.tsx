import { useEffect, useRef, useState } from "react";
import { Menu, Volume2, VolumeX } from "lucide-react";
import type { FieldOS } from "@/lib/field/field-os";
import type { UniverseDataStatus } from "@/lib/universe-data/contracts";
import { UniverseWorkspace } from "@/components/universe-workspace";
import { SocialFiWorkspace } from "@/components/socialfi-workspace";
import { GALAXIES, getGalaxy } from "@/lib/field/galaxies";
import type {
  FieldMode,
  FocusedParticle,
  GalaxyDefinition,
  IntelligenceResult,
  OrganismState,
  EvidenceRecord,
} from "@/lib/field/types";

const EXAMPLES = [
  { label: "WRAPPED SOL", value: "So11111111111111111111111111111111111111112" },
  { label: "SYSTEM PROGRAM", value: "11111111111111111111111111111111" },
];

const SOCIALFI_UI_ENABLED = import.meta.env.VITE_SOCIALFI_UI_ENABLED === "true";

const MENU_ITEMS: { id: FieldMode; label: string }[] = [
  { id: "replay", label: "REPLAY" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "compare", label: "COMPARE" },
  { id: "what-if", label: "WHAT-IF" },
  { id: "sequences", label: "SEQUENCES" },
  { id: "ghost", label: "GHOST" },
  { id: "intelligence", label: "INTELLIGENCE" },
  ...(SOCIALFI_UI_ENABLED ? [{ id: "social" as const, label: "SOCIAL" }] : []),
  { id: "query", label: "QUERY" },
  { id: "trickster", label: "CREATE" },
  { id: "explore", label: "FIELD" },
];

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [queryActive, setQueryActive] = useState(false);
  const [organismState, setOrganismState] = useState<OrganismState>("idle");
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [focus, setFocus] = useState<FocusedParticle | null>(null);
  const [galaxy, setGalaxy] = useState<GalaxyDefinition>(() => getGalaxy("galaxy-zero"));
  const [, setGalaxies] = useState<readonly GalaxyDefinition[]>(GALAXIES);
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
        setEvidence(event.evidence);
        setDataStatus(event.dataStatus);
      });
      osRef.current = os;
      if (new URLSearchParams(globalThis.location?.search ?? "").has("tour")) os.setMode("trickster");
    });
    return () => {
      cancelled = true;
      os?.destroy();
      osRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    globalThis.addEventListener("keydown", close);
    return () => globalThis.removeEventListener("keydown", close);
  }, [menuOpen]);

  function onAsk(value: string) {
    const query = value.trim();
    if (query) void osRef.current?.submitQuery(query);
  }

  function onQueryMode() {
    setMenuOpen(false);
    osRef.current?.setMode("query");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectMode(id: FieldMode) {
    setMenuOpen(false);
    if (id === "query") onQueryMode();
    else osRef.current?.setMode(id);
  }

  const workspaceOpen = mode !== "explore" && mode !== "query" && !queryActive;
  const timelineOpen = mode === "replay" || mode === "evidence";
  const slotValue = focus
    ? `${focus.cosmicKind.replace("-", " ")} · ${focus.kind} · ${galaxy.name}`
    : `FIELD · SOLANA · ${galaxy.name}`;

  return (
    <main className={`field-shell${queryActive ? " field-shell--query" : ""}`} data-mode={queryActive ? "query" : mode} data-galaxy={galaxy.id}>
      <style>{`
        .gz-top{position:absolute;top:max(12px,env(safe-area-inset-top));left:12px;right:12px;z-index:25;display:flex;align-items:center;gap:10px;pointer-events:none}.gz-menu-wrap{position:relative;flex:0 0 auto;pointer-events:auto}.gz-menu-button{width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--color-line-strong);border-radius:14px;background:rgba(8,8,12,.62);color:var(--color-fg);backdrop-filter:blur(14px);box-shadow:var(--shadow-field)}.gz-menu{position:absolute;top:52px;left:0;width:168px;display:grid;padding:6px;border:1px solid var(--color-line);border-radius:14px;background:rgba(7,7,11,.9);backdrop-filter:blur(20px);box-shadow:var(--shadow-field)}.gz-menu button{min-height:32px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--color-muted);text-align:left;font:600 9px/1 var(--font-display);letter-spacing:.12em}.gz-menu button:hover,.gz-menu button[aria-pressed=true]{background:rgba(255,255,255,.06);color:var(--color-fg)}.gz-menu-status{margin:5px 6px 3px;padding-top:7px;border-top:1px solid var(--color-line);color:var(--color-muted);font:600 8px/1.35 var(--font-mono);letter-spacing:.08em}.gz-search{pointer-events:auto;flex:1 1 auto;min-width:0;max-width:640px;margin:0 auto;height:44px;display:flex;align-items:center;gap:10px;padding:0 14px;border:1px solid var(--color-line-strong);border-radius:999px;background:rgba(8,8,12,.62);box-shadow:var(--shadow-field);backdrop-filter:blur(14px)}.gz-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:var(--color-fg);font:500 14px/1 var(--font-sans)}.gz-search input::placeholder{color:var(--color-muted)}.gz-search button{height:28px;padding:0 12px;border:1px solid var(--color-line-strong);border-radius:999px;background:rgba(255,255,255,.08);color:var(--color-fg);font:600 10px/1 var(--font-display);letter-spacing:.14em}.gz-bottom{position:absolute;z-index:24;left:12px;right:12px;bottom:max(10px,env(safe-area-inset-bottom));min-height:32px;display:flex;align-items:center;justify-content:center;gap:8px;overflow-x:auto;white-space:nowrap;pointer-events:auto;color:var(--color-muted);font:600 9px/1 var(--font-mono);letter-spacing:.08em;scrollbar-width:none}.gz-bottom::-webkit-scrollbar{display:none}.gz-bottom span,.gz-bottom button{flex:0 0 auto}.gz-bottom button{border:0;border-left:1px solid var(--color-line);padding:2px 0 2px 8px;background:transparent;color:var(--color-muted);font:inherit;letter-spacing:inherit}.field-shell__chrome{padding:0}.field-shell__tag,.field-shell__focus,.field-shell__chips,.field-shell__commands,.field-shell__mode-tools,.field-shell__galaxy-trigger,.field-shell__data-status,.field-shell__brand{display:none!important}@media(max-width:560px){.gz-top{gap:7px}.gz-menu-button{width:40px;height:40px}.gz-search{height:40px;padding:0 9px}.gz-search input{font-size:12px}.gz-search button{height:26px;padding:0 9px}.gz-bottom{justify-content:flex-start;font-size:8px}}
      `}</style>
      <div ref={hostRef} className="field-shell__field" />

      <div className="field-shell__chrome" hidden={queryActive} aria-hidden={queryActive}>
        <header className="gz-top">
          <div className="gz-menu-wrap">
            <button type="button" className="gz-menu-button" aria-label="Open Galaxy Zero menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
              <Menu size={19} />
            </button>
            {menuOpen ? (
              <nav className="gz-menu" aria-label="Galaxy Zero modes">
                {MENU_ITEMS.map((item) => (
                  <button key={item.id} type="button" aria-pressed={mode === item.id} onClick={() => selectMode(item.id)}>{item.label}</button>
                ))}
                <p className="gz-menu-status" title={dataStatus.disclosure}>
                  {dataStatus.store === "d1" ? "INDEXED" : "PROTOTYPE"} · {dataStatus.coverage.toUpperCase()}
                </p>
              </nav>
            ) : null}
          </div>
          <form className="gz-search" role="search" onSubmit={(event) => { event.preventDefault(); onAsk(inputRef.current?.value ?? ""); }}>
            <input ref={inputRef} type="search" autoComplete="off" spellCheck={false} placeholder="Wallet, tx, token, NFT, program" aria-label="Ask the field a public identifier" />
            <button type="submit">ASK</button>
          </form>
        </header>

        <div className="gz-bottom" aria-label="Current field tags">
          <span>{slotValue}</span>
          {EXAMPLES.map((item) => (
            <button key={item.value} type="button" onClick={() => { if (inputRef.current) inputRef.current.value = item.value; onAsk(item.value); }}>{item.label}</button>
          ))}
        </div>
      </div>

      {queryActive ? (
        <div className="query-experience">
          <button type="button" className="query-mute" aria-label={muted ? "Unmute" : "Mute"} onClick={() => osRef.current?.setMuted(!muted)}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <div className="query-chin">
            <form className="query-experience__form" onSubmit={(event) => { event.preventDefault(); onAsk(queryInputRef.current?.value ?? ""); }}>
              <input ref={queryInputRef} type="search" autoComplete="off" spellCheck={false} placeholder="Ask again · wallet, tx, mint, NFT, program" aria-label="Ask the living field" />
              <button className="query-experience__submit" type="submit">ASK</button>
            </form>
            <div className="query-status"><b>{STATE_LABEL[organismState]}</b>{result?.spokenText ? <p>{result.spokenText}</p> : null}</div>
            <button type="button" className="query-experience__back" onClick={() => void osRef.current?.returnToField()}>RETURN TO FIELD</button>
          </div>
        </div>
      ) : null}

      <section className={`field-shell__workspace${timelineOpen ? " field-shell__workspace--timeline" : ""}`} hidden={!workspaceOpen}>
        <div className="field-shell__workspace-head">
          <strong>{mode.toUpperCase().replace("WHAT-IF", "WHAT-IF · ESTIMATE")}</strong>
          <button type="button" className="field-shell__close" onClick={() => osRef.current?.setMode("explore")}>RETURN TO FIELD</button>
        </div>
        <div className="field-shell__workspace-body">
          {mode === "intelligence" ? <IntelligencePanel result={result} onAsk={() => onQueryMode()} /> : null}
          {mode === "social" ? <SocialFiWorkspace /> : null}
          {mode !== "intelligence" && mode !== "social" ? <UniverseWorkspace mode={mode} galaxy={galaxy} evidence={evidence} onNarrate={(text) => osRef.current?.narrateObserved(text)} /> : null}
        </div>
      </section>
    </main>
  );
}

function IntelligencePanel({ result, onAsk }: { result: IntelligenceResult | null; onAsk: () => void }) {
  if (!result) {
    return (
      <article className="workspace-copy">
        <h2>Public memory, observed facts</h2>
        <p>ASK a public identifier on the Field. The same particles become the Grey and speak only what the public chain shows.</p>
        <button type="button" className="query-experience__submit" onClick={onAsk}>ASK THE FIELD</button>
      </article>
    );
  }
  return (
    <article className="workspace-copy">
      <h2>{result.label} · {result.shortId}</h2>
      <p>{result.spokenText}</p>
      <p>Coverage {result.coverage}{result.source ? ` · ${result.source}` : ""}{result.disclosure ? ` · ${result.disclosure}` : ""}</p>
      <ul className="workspace-facts">{result.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
    </article>
  );
}
