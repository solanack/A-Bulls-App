import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, ListFilter, X } from "lucide-react";
import { formatUsdNotional, observedUsdNotional, reportedPositionUsd, type TapeBolt } from "@/lib/field/replay-tape";
import { printLabel, printSource, replayCoverage } from "@/lib/field/replay-director";

export function ReplayLedger({ bolts, cursor, selectedId, onSelect, onClose }: {
  bolts: readonly TapeBolt[]; cursor: number; selectedId: string | null;
  onSelect: (bolt: TapeBolt) => void; onClose: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "buy" | "sell">("all");
  const [page, setPage] = useState(1);
  const coverage = useMemo(() => replayCoverage(bolts), [bolts]);
  const rows = useMemo(() => bolts.filter(bolt => filter === "all" || bolt.side === filter), [bolts, filter]);
  return <aside className="rs-ledger" aria-label="Trade log">
    <header className="rs-ledger__head"><h2>Trade log <span>{bolts.length}</span></h2><button type="button" className="rs-icon" aria-label="Close trade log" onClick={onClose}><X size={16}/></button></header>
    <p className="rs-ledger__intro">Choose an event to seek the tape and inspect its source.</p>
    <dl className="rs-coverage" aria-label="Evidence coverage for this window">
      <div><dt>Receipt attached</dt><dd>{coverage.receipts}<span> / {coverage.total}</span></dd></div>
      <div><dt>Fill USD available</dt><dd>{coverage.priced}<span> / {coverage.total}</span></dd></div>
      <div><dt>Provider-reported</dt><dd>{coverage.provider}<span> / {coverage.total}</span></dd></div>
    </dl>
    {coverage.summaries > 0 ? <p className="rs-ledger__note">{coverage.summaries} position {coverage.summaries === 1 ? "summary" : "summaries"}. Average position prices and remaining balances are not individual fill sizes.</p> : null}
    <div className="rs-ledger__filters" aria-label="Filter trade log"><ListFilter size={14}/>{(["all", "buy", "sell"] as const).map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>{value === "all" ? "All events" : value === "buy" ? "Buys / entries" : "Sells / exits"}</button>)}</div>
    <ol className="rs-ledger__list">{rows.slice(0, page * 60).map(bolt => {
      const usd = observedUsdNotional(bolt),reported = reportedPositionUsd(bolt);
      return <li key={bolt.id}><button type="button" className="rs-ledger__event" aria-current={selectedId === bolt.id ? "true" : undefined} data-side={bolt.side} data-reached={bolt.cursor <= cursor} onClick={() => onSelect(bolt)}>
        <span className="rs-ledger__direction" aria-hidden="true">{bolt.side === "buy" ? <ArrowDownLeft size={18}/> : <ArrowUpRight size={18}/>}</span>
        <span className="rs-ledger__copy"><b>{printLabel(bolt)}</b><time dateTime={new Date(bolt.timestamp).toISOString()}>{new Date(bolt.timestamp).toLocaleString(undefined, {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</time><small>{printSource(bolt)}{bolt.signature ? " · receipt" : " · no receipt"}</small></span>
        <span className="rs-ledger__value">{usd != null ? formatUsdNotional(usd) : reported != null ? <><b>{formatUsdNotional(reported)}</b><small>reported position</small></> : <small>USD unavailable</small>}{selectedId === bolt.id ? <Check size={13}/> : null}</span>
      </button></li>;
    })}{!rows.length ? <li className="rs-ledger__note">No events match this filter.</li> : null}</ol>
    {rows.length > page * 60 ? <button type="button" className="rs-pill" onClick={() => setPage(value => value + 1)}>Show more events</button> : null}
    <p className="rs-ledger__foot">Coverage describes retained events in this window. A receipt link does not independently verify a provider’s figures.</p>
  </aside>;
}
