import type { FieldSection } from "@/lib/field/types";
import type { TraderSheetDetail } from "@/lib/field/trader-sheet";
import { callsign } from "@/lib/field/trader-sheet";
import { watchShelves, type WatchItem } from "@/lib/field/watchlist";
import { TraderSigil } from "@/components/trader-sigil";

type TraderSection = Extract<FieldSection, { kind: "trader-system" }>;

const ROOM_NAME = { fomo: "Fomo", afterbell: "Afterbell" } as const;
const ROOM_CHIP = { fomo: "FOMO", afterbell: "AFTERBELL" } as const;

/** @deprecated Sheet styles live in design-tokens.css. */
export const FIELD_SHEET_CSS = "";


function timeLabel(at: number) {
  return new Date(at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Shared STAR sheet for both rooms. Everything shown is already on the thread; nothing is guessed. */
export function TraderSheet({
  section,
  selected,
  traderWatched,
  tokenWatched,
  onResearch,
  onWatchTrader,
  onWatchToken,
  onCompare,
}: {
  section: TraderSection;
  selected: { mint: string; symbol: string | null } | null;
  traderWatched: boolean;
  tokenWatched: boolean;
  onResearch: (mode: "replay" | "evidence") => void;
  onWatchTrader: () => void;
  onWatchToken: () => void;
  onCompare: () => void;
}) {
  const detail: TraderSheetDetail | undefined = section.trader;
  const room = detail?.room ?? (section.handle.startsWith("afterbell:") ? "afterbell" : "fomo");
  if (!detail)
    return (
      <aside className="fs-sheet" data-room={room} aria-label={`${ROOM_NAME[room]} trader details`} aria-busy="true">
        <div className="fs-chips"><span className="fs-chip">{ROOM_CHIP[room]}</span></div>
        <strong>{section.label}</strong>
        <p className="fs-latest">Reading this trader's retained prints…</p>
      </aside>
    );
  const researchable = detail.planetCount + detail.cometCount > 0;
  const idLine = [detail.handle && room === "fomo" ? `@${detail.handle}` : null, detail.wallet ? callsign(detail.wallet) : null].filter(Boolean).join(" · ");
  const latest = detail.latestPrint;
  return (
    <aside className="fs-sheet" data-room={room} aria-label={`${ROOM_NAME[room]} trader details`}>
      <div className="fs-chips">
        <span className="fs-chip">{ROOM_CHIP[room]}</span>
        {detail.rank != null ? <span className="fs-chip fs-chip--muted" title={detail.rankBasis}>#{detail.rank}</span> : null}
      </div>
      <div className="fs-identity">
        {detail.wallet ? <TraderSigil wallet={detail.wallet} size={42} title={`Deterministic sigil for ${detail.identity}`} /> : null}
        <div>
          <strong title={detail.wallet ?? undefined}>{detail.identity}</strong>
          {idLine && idLine !== detail.identity ? <div className="fs-id hash">{idLine}</div> : null}
        </div>
      </div>
      <p className="fs-fact">{detail.factLine}</p>
      {latest ? <p className="fs-latest">Latest: {latest.side.toUpperCase()} {latest.symbol ?? "token"} · {timeLabel(latest.at)}</p> : null}
      <div className="fs-actions fs-actions--thumb" aria-label="Trader actions">
        <button type="button" disabled={!researchable} onClick={() => onResearch("replay")}><b>REPLAY</b><small>Play the tape</small></button>
        <button type="button" disabled={!researchable} onClick={() => onResearch("evidence")}><b>EVIDENCE</b><small>Open receipts</small></button>
        <button type="button" disabled={!researchable || !detail.wallet} onClick={onCompare}><b>COMPARE</b><small>Versus another trader</small></button>
        {selected ? (
          <button type="button" aria-pressed={tokenWatched} onClick={onWatchToken}><b>{tokenWatched ? "WATCHING" : "WATCH"}</b><small>{selected.symbol ?? "Selected token"}</small></button>
        ) : (
          <button type="button" aria-pressed={traderWatched} disabled={!detail.wallet} onClick={onWatchTrader}><b>{traderWatched ? "WATCHING" : "WATCH"}</b><small>Save this trader</small></button>
        )}
      </div>
      {!researchable ? <p className="fs-fine">No retained prints for this wallet yet. Replay opens when one is indexed.</p> : null}
      <p className="fs-fine">{detail.sourceLabel} · {detail.cometCount} COMETS · Research only.</p>
    </aside>
  );
}

function ShelfItem({ item, onOpen, onRemove }: { item: WatchItem; onOpen: (item: WatchItem) => void; onRemove: (item: WatchItem) => void }) {
  const room = item.galaxyId === "afterbell" ? "afterbell" : "fomo";
  const token = item.subjectKind === "token";
  const title = token ? item.symbol || item.name || callsign(item.subjectId) : item.name || (item.handle ? `@${item.handle}` : callsign(item.subjectId));
  const sub = item.lastPrint ? `${item.lastPrint.side.toUpperCase()} ${item.lastPrint.symbol ?? ""} · ${timeLabel(item.lastPrint.at)}`.replace(/\s+·/, " ·") : `${ROOM_CHIP[room]}${token && item.wallet ? ` · ${callsign(item.wallet)}` : ""}`;
  return (
    <li>
      <button type="button" className="fs-open" onClick={() => onOpen(item)} aria-label={`Open ${title}`}>
        <span className={`fs-glyph${token ? " fs-glyph--token" : ""}`} data-room={room} aria-hidden="true" />
        <span>{title}<small>{sub}</small></span>
      </button>
      <button type="button" className="fs-remove" aria-label={`Remove ${title} from My Sky`} onClick={() => onRemove(item)}>×</button>
    </li>
  );
}

/** My Sky shelves. On-device only; each item reopens its room and system. */
export function MySkyShelves({ items, onOpen, onRemove, onField }: { items: readonly WatchItem[]; onOpen: (item: WatchItem) => void; onRemove: (item: WatchItem) => void; onField: () => void }) {
  const { traders, tokens } = watchShelves(items);
  if (!traders.length && !tokens.length)
    return (
      <section className="fs-sky" aria-label="My Sky">
        <div className="fs-empty-row">
          <p className="fs-empty">Watch a trader or a token from the Field.</p>
          <button type="button" onClick={onField}>FIELD</button>
        </div>
      </section>
    );
  return (
    <section className="fs-sky" aria-label="My Sky">
      <div className="fs-shelf">
        <h3>TRADERS · {traders.length}</h3>
        {traders.length ? <ul>{traders.map((item) => <ShelfItem key={item.subjectId} item={item} onOpen={onOpen} onRemove={onRemove} />)}</ul> : <p className="fs-empty">No traders watched yet.</p>}
      </div>
      <div className="fs-shelf fs-shelf--tokens">
        <h3>TOKENS · {tokens.length}</h3>
        {tokens.length ? <ul>{tokens.map((item) => <ShelfItem key={item.subjectId} item={item} onOpen={onOpen} onRemove={onRemove} />)}</ul> : <p className="fs-empty">No tokens watched yet.</p>}
      </div>
      <p className="fs-fine">Saved on this device only.</p>
    </section>
  );
}
