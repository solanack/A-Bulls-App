import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { FieldOS } from "@/lib/field/field-os";
import {
  DOCK,
  MODE_HINT,
  type FieldMode,
  type FocusedParticle,
  type IntelligenceResult,
  type OrganismState,
} from "@/lib/field/types";

const EXAMPLES = [
  { label: "WRAPPED SOL", value: "So11111111111111111111111111111111111111112" },
  { label: "SYSTEM PROGRAM", value: "11111111111111111111111111111111" },
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
  const [queryActive, setQueryActive] = useState(false);
  const [organismState, setOrganismState] = useState<OrganismState>("idle");
  const [result, setResult] = useState<IntelligenceResult | null>(null);
  const [muted, setMuted] = useState(false);
  const [focus, setFocus] = useState<FocusedParticle | null>(null);

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
      });
      osRef.current = os;
    });
    return () => {
      cancelled = true;
      os?.destroy();
      osRef.current = null;
    };
  }, []);

  function onAsk(value: string) {
    const query = value.trim();
    if (!query) return;
    void osRef.current?.submitQuery(query);
  }

  function onQueryMode() {
    osRef.current?.setMode("query");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const workspaceOpen = (mode === "intelligence" || mode === "trickster" || mode === "games") && !queryActive;
  const slotValue = focus ? `${focus.kind} · living point` : null;

  return (
    <main className={`field-shell${queryActive ? " field-shell--query" : ""}`} data-mode={queryActive ? "query" : mode}>
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
        <p className="field-shell__tag">
          <strong>THE BLOCKCHAIN IS ALIVE</strong>
          {MODE_HINT[mode === "query" ? "query" : "explore"]}
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

      <section className="field-shell__workspace" hidden={!workspaceOpen}>
        <div className="field-shell__workspace-head">
          <strong>{mode === "intelligence" ? "INTELLIGENCE" : mode === "trickster" ? "CREATE · TRICKSTER" : "GAMES"}</strong>
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
              <h2>Folklore stays downstream</h2>
              <p>
                Missions are generated from real indexed events. They remain reachable in the product. This
                surface does not revive abandoned game trees.
              </p>
            </article>
          ) : null}
        </div>
      </section>
    </main>
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
