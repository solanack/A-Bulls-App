import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { ThesisCitation } from "@/lib/universe-data/contracts";
import type { ThesisRecord } from "@/lib/socialfi/contracts";
import { listTheses, publishThesis } from "@/lib/theses";

type Data = Record<string, unknown>;
const obj = (value: unknown): Data => value && typeof value === "object" && !Array.isArray(value) ? value as Data : {};
const arr = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown) => value == null ? "" : String(value);
const finite = (value: unknown): number | null => value != null && Number.isFinite(Number(value)) ? Number(value) : null;
const timestampMs = (value: unknown): number | null => {
  const number = finite(value);
  return number != null && Number.isInteger(number) && number >= 1_000_000_000_000 ? number : null;
};
const short = (value: string) => value.length > 24 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
const usd = (value: number) => value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: value < 1 ? 6 : 0 });

function resolutionLine(thesis: ThesisRecord) {
  const resolution = thesis.resolution;
  if (!resolution) return thesis.status === "open" ? "24-hour resolution pending." : "24-hour resolution evidence is unavailable.";
  const parts: string[] = [];
  if (resolution.atPublishMarketCap != null && resolution.atResolveMarketCap != null) parts.push(`market cap ${usd(resolution.atPublishMarketCap)} → ${usd(resolution.atResolveMarketCap)}`);
  if (resolution.atPublishLiquidity != null && resolution.atResolveLiquidity != null) parts.push(`liquidity ${usd(resolution.atPublishLiquidity)} → ${usd(resolution.atResolveLiquidity)}`);
  if (resolution.atPublishTopHolderPct != null && resolution.atResolveTopHolderPct != null) parts.push(`raw top ten ${resolution.atPublishTopHolderPct.toFixed(1)}% → ${resolution.atResolveTopHolderPct.toFixed(1)}%`);
  return parts.length
    ? `Observed after 24 hours · ${parts.join(" · ")} · evidence ${resolution.evidenceQuality}.`
    : `Observed after 24 hours · comparable cached metrics unavailable · evidence ${resolution.evidenceQuality}.`;
}

export function ThesisEvidencePanel({ mint, refreshKey = "" }: { mint: string; refreshKey?: string }) {
  const [items, setItems] = useState<readonly ThesisRecord[]>([]);
  const [coverage, setCoverage] = useState<"fresh" | "empty" | "degraded">("empty");
  const [disclosure, setDisclosure] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!mint) {
      setItems([]);
      setCoverage("empty");
      setDisclosure("");
      return;
    }
    setBusy(true);
    void listTheses({ data: { targetKind: "star", targetId: mint } })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items ?? []);
        setCoverage(response.coverage ?? "degraded");
        setDisclosure(response.disclosure ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setCoverage("degraded");
        setDisclosure("The cited-claim store is unavailable. No live fallback was attempted.");
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [mint, refreshKey]);

  if (!mint) return <p className="universe-empty">Focus an indexed star to read cited claims.</p>;
  if (busy) return <p className="universe-busy"><LoaderCircle size={15} /> Reading cited claims from D1…</p>;
  if (coverage === "degraded") return <p className="universe-empty">PROTOTYPE / DEGRADED · {disclosure || "The thesis store is unavailable."}</p>;
  if (!items.length) return <p className="universe-empty">No published cited claims are on record for this star.</p>;

  return (
    <section className="universe-result" aria-label="Cited claims on this star">
      <div className="universe-events">
        {items.map((thesis) => (
          <div key={thesis.id}>
            <time>{new Date(thesis.createdAt).toLocaleString()}</time>
            <b>{thesis.claim}</b>
            <span>{thesis.body}</span>
            <span>{thesis.citations.length} indexed citation{thesis.citations.length === 1 ? "" : "s"} · {resolutionLine(thesis)}</span>
          </div>
        ))}
      </div>
      <p className="universe-disclosure">{disclosure || "Claims are user speech attached to indexed evidence, not observed market facts."}</p>
    </section>
  );
}

function citationChoices(mint: string, replayBundle: Data): ThesisCitation[] {
  const subject = obj(replayBundle.subject);
  if (!mint || text(subject.mint) !== mint) return [];
  const choices: ThesisCitation[] = [];
  const seen = new Set<string>();
  for (const value of arr(replayBundle.events)) {
    const event = obj(value);
    const signature = text(event.signature);
    const observedTs = timestampMs(event.timestamp);
    if (!signature || observedTs == null) continue;
    const key = `tx:${signature}:${observedTs}`;
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push({ kind: "tx", ref: signature, observedTs, label: `${text(event.side ?? event.kind ?? "transaction")} · ${short(signature)}` });
  }
  for (const value of arr(replayBundle.candles)) {
    const candle = obj(value);
    const observedTs = timestampMs(candle.timestamp);
    const close = finite(candle.close);
    if (observedTs == null || close == null || close <= 0) continue;
    const ref = `candle:${observedTs}:${close}`;
    const key = `candle:${ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    choices.push({ kind: "candle", ref, observedTs, label: `Indexed candle · ${new Date(observedTs).toLocaleString()} · close ${close}` });
  }
  return choices.slice(0, 20);
}

export function ThesisCreatePanel({ mint, galaxyId, replayBundle }: { mint: string; galaxyId: string; replayBundle: Data }) {
  const { user, isPending } = useCurrentUserState();
  const [claim, setClaim] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [publishedId, setPublishedId] = useState("");
  const choices = useMemo(() => citationChoices(mint, replayBundle), [mint, replayBundle]);
  const window = obj(replayBundle.window);
  const fromTs = timestampMs(window.startTime);
  const toTs = timestampMs(window.endTime);
  const replayReady = Boolean(mint && fromTs != null && toTs != null && choices.length);
  const draftKey = mint ? `abulls-thesis-draft:${mint}` : "";

  useEffect(() => {
    setPublishedId("");
    setSelected(new Set());
    if (!draftKey) { setClaim(""); setBody(""); return; }
    try {
      const saved = JSON.parse(globalThis.localStorage?.getItem(draftKey) || "null") as { claim?: string; body?: string } | null;
      setClaim(saved?.claim ?? "");
      setBody(saved?.body ?? "");
    } catch { setClaim(""); setBody(""); }
  }, [draftKey]);

  useEffect(() => {
    if (!choices.length) { setSelected(new Set()); return; }
    setSelected((current) => current.size ? current : new Set([`${choices[0].kind}:${choices[0].ref}:${choices[0].observedTs}`]));
  }, [choices]);

  useEffect(() => {
    if (!draftKey || publishedId) return;
    try { globalThis.localStorage?.setItem(draftKey, JSON.stringify({ claim, body })); } catch { /* local drafts are best effort only */ }
  }, [draftKey, claim, body, publishedId]);

  if (publishedId) {
    return (
      <section className="universe-result">
        <div className="evidence-receipt"><CheckCircle2 size={18} /><div><b>CITED CLAIM PUBLISHED</b><span>Returned to Evidence for this star.</span></div></div>
        <ThesisEvidencePanel mint={mint} refreshKey={publishedId} />
      </section>
    );
  }

  const realAccount = Boolean(user && !user.isDevFallback);
  const selectedCitations = choices.filter((citation) => selected.has(`${citation.kind}:${citation.ref}:${citation.observedTs}`));

  return (
    <section className="universe-result" aria-label="Create cited claim">
      <div className="universe-inputs">
        <label>CITED CLAIM<input maxLength={180} value={claim} onChange={(event) => setClaim(event.target.value)} placeholder="Short claim" /></label>
        <label>BODY<textarea maxLength={4000} rows={4} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What do you think the cited replay evidence means?" /></label>
      </div>
      {!replayReady ? <p className="universe-empty">Load a bounded Replay for this star first. Publish stays blocked until that Replay contains an indexed transaction or candle citation.</p> : (
        <div className="universe-events">
          {choices.map((citation) => {
            const key = `${citation.kind}:${citation.ref}:${citation.observedTs}`;
            return (
              <div key={key}>
                <time>{new Date(citation.observedTs).toLocaleString()}</time>
                <b><label><input type="checkbox" checked={selected.has(key)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(key); else next.delete(key); return next; })} /> {citation.kind.toUpperCase()}</label></b>
                <span>{citation.label}</span>
              </div>
            );
          })}
        </div>
      )}
      {isPending ? <p className="universe-disclosure">Checking existing A Bulls App account session…</p> : !realAccount ? <p className="universe-disclosure">Publishing requires an existing A Bulls App account session. This unsigned draft stays local and never appears in Evidence.</p> : null}
      {error ? <p className="universe-error">{error}</p> : null}
      <button className="universe-action" type="button" disabled={busy || !realAccount || !replayReady || !claim.trim() || !body.trim() || selectedCitations.length < 1} onClick={() => {
        if (fromTs == null || toTs == null) return;
        setBusy(true);
        setError("");
        void publishThesis({ data: {
          targetKind: "star",
          targetId: mint,
          galaxyId,
          claim: claim.trim(),
          body: body.trim(),
          replayWindowId: null,
          fromTs,
          toTs,
          citations: selectedCitations,
        } }).then((response) => {
          if (!response.ok || !response.id) throw new Error(response.error || "The cited claim could not be published.");
          try { if (draftKey) globalThis.localStorage?.removeItem(draftKey); } catch { /* no-op */ }
          setPublishedId(response.id);
        }).catch((cause) => setError(cause instanceof Error ? cause.message : "The cited claim could not be published.")).finally(() => setBusy(false));
      }}>{busy ? "PUBLISHING…" : "PUBLISH CITED CLAIM"}</button>
      <p className="universe-disclosure">User speech stays separate from observed market evidence. A 24-hour cache-only observation may later record market cap, liquidity, and raw top-holder concentration; missing evidence stays unavailable.</p>
    </section>
  );
}
