import type { FieldSection } from "@/lib/field/types";
import type { TraderSheetDetail } from "@/lib/field/trader-sheet";
import { callsign } from "@/lib/field/trader-sheet";
import { watchShelves, type WatchItem } from "@/lib/field/watchlist";

type TraderSection = Extract<FieldSection, { kind: "trader-system" }>;

const ROOM_NAME = { fomo: "Fomo", afterbell: "Afterbell" } as const;
const ROOM_CHIP = { fomo: "FOMO", afterbell: "AFTERBELL" } as const;

export const FIELD_SHEET_CSS = `.fs-sheet{position:absolute;right:12px;top:68px;z-index:23;width:min(340px,calc(100vw - 24px));padding:15px 16px 13px;border:1px solid var(--room-rim);border-radius:18px;background:linear-gradient(160deg,rgba(17,18,24,.9),rgba(11,12,16,.86));backdrop-filter:blur(20px) saturate(125%);box-shadow:0 22px 60px rgba(0,0,0,.42),inset 0 1px rgba(255,255,255,.04);pointer-events:auto;color:#f4f2ec;animation:ui-pop .2s cubic-bezier(.22,1,.36,1)}.fs-sheet[data-room=fomo]{--room-rim:rgba(190,160,255,.34);--room-ink:#cdb8ff;--room-glow:rgba(160,120,255,.16)}.fs-sheet[data-room=afterbell]{--room-rim:rgba(236,218,170,.32);--room-ink:#eadcb4;--room-glow:rgba(200,225,255,.12)}.fs-chips{display:flex;gap:6px;align-items:center;margin-bottom:9px}.fs-chip{padding:4px 8px;border:1px solid var(--room-rim);border-radius:999px;color:var(--room-ink);background:var(--room-glow);font:700 8.5px/1 var(--font-display);letter-spacing:.14em}.fs-chip--muted{border-color:rgba(236,236,240,.14);background:transparent;color:rgba(236,236,240,.7)}.fs-sheet strong{display:block;font:680 17px/1.2 var(--font-sans);letter-spacing:.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fs-id{margin-top:3px;color:rgba(226,226,232,.56);font:500 10.5px/1.3 var(--font-mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fs-fact{margin:10px 0 0;font:560 13px/1.35 var(--font-sans);color:#f1efe8}.fs-latest{margin:4px 0 0;font:500 11px/1.4 var(--font-sans);color:rgba(226,226,232,.66)}.fs-selected{margin:10px 0 0;padding:7px 9px;border:1px solid var(--room-rim);border-radius:11px;background:var(--room-glow);font:600 11px/1.3 var(--font-sans)}.fs-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.fs-actions button{flex:1 1 auto;min-height:36px;padding:0 12px;border:1px solid rgba(236,236,240,.15);border-radius:999px;background:rgba(255,255,255,.035);color:#f4f2ec;font:700 9px/1 var(--font-display);letter-spacing:.14em;transition:border-color .15s,background .15s,transform .15s}.fs-actions button:first-child{border-color:var(--room-rim);background:var(--room-glow)}.fs-actions button:not(:disabled):hover,.fs-actions button:focus-visible{transform:translateY(-1px);border-color:var(--room-ink);outline:none}.fs-actions button[aria-pressed=true]{border-color:var(--room-ink);color:var(--room-ink)}.fs-actions button:disabled{opacity:.42}.fs-fine{margin:10px 0 0;font:500 9.5px/1.45 var(--font-sans);color:rgba(226,226,232,.5)}.fs-sky{position:absolute;left:50%;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 48px);transform:translateX(-50%);z-index:23;width:min(720px,calc(100vw - 24px));max-height:min(46vh,420px);overflow:auto;padding:14px 16px;border:1px solid rgba(236,236,240,.12);border-radius:20px;background:linear-gradient(160deg,rgba(17,18,24,.9),rgba(11,12,16,.86));backdrop-filter:blur(20px);box-shadow:0 22px 60px rgba(0,0,0,.42);pointer-events:auto;color:#f4f2ec;overscroll-behavior:contain}.fs-shelf+.fs-shelf{margin-top:14px}.fs-shelf h3{margin:0 0 8px;font:700 9px/1 var(--font-display);letter-spacing:.18em;color:rgba(236,236,240,.6)}.fs-shelf ul{list-style:none;margin:0;padding:0;display:flex;gap:8px;overflow-x:auto;scrollbar-width:none}.fs-shelf li{flex:0 0 auto;display:flex;align-items:center;gap:6px;padding:5px 5px 5px 6px;border:1px solid rgba(236,236,240,.12);border-radius:999px;background:rgba(255,255,255,.03)}.fs-shelf--tokens li{border-radius:12px}.fs-open{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:inherit;padding:0 4px 0 0;font:600 12px/1.2 var(--font-sans);text-align:left}.fs-open small{display:block;color:rgba(226,226,232,.55);font:500 10px/1.2 var(--font-mono)}.fs-glyph{flex:0 0 auto;width:26px;height:26px;display:grid;place-items:center;border-radius:999px;background:radial-gradient(circle at 50% 45%,#fff 0 2px,var(--glyph) 3px,transparent 12px);box-shadow:0 0 12px var(--glyph)}.fs-glyph--token{border-radius:50%;background:radial-gradient(circle at 38% 34%,rgba(255,255,255,.7),var(--glyph) 45%,rgba(0,0,0,.3) 75%);box-shadow:inset -3px -3px 6px rgba(0,0,0,.35);outline:1.5px solid rgba(255,255,255,.18);outline-offset:3px}.fs-glyph[data-room=fomo]{--glyph:rgba(180,140,255,.85)}.fs-glyph[data-room=afterbell]{--glyph:rgba(226,214,176,.85)}.fs-remove{width:26px;height:26px;border:1px solid rgba(236,236,240,.12);border-radius:999px;background:transparent;color:rgba(236,236,240,.6);font:600 13px/1 var(--font-sans)}.fs-remove:hover,.fs-remove:focus-visible{color:#fff;border-color:rgba(236,236,240,.4);outline:none}.fs-empty{margin:0;font:560 13px/1.45 var(--font-sans);color:rgba(236,236,240,.8)}.fs-empty-row{display:flex;align-items:center;justify-content:space-between;gap:12px}.fs-empty-row button{min-height:34px;padding:0 14px;border:1px solid rgba(236,236,240,.2);border-radius:999px;background:rgba(255,255,255,.04);color:#f4f2ec;font:700 9px/1 var(--font-display);letter-spacing:.14em}@media(max-width:560px){.fs-sheet{top:auto;right:8px;left:8px;width:auto;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 46px);padding:13px 14px 11px}.fs-sheet strong{font-size:15px}.fs-sky{left:8px;right:8px;width:auto;transform:none}}@media(prefers-reduced-motion:reduce){.fs-sheet{animation:none}}`;

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
}: {
  section: TraderSection;
  selected: { mint: string; symbol: string | null } | null;
  traderWatched: boolean;
  tokenWatched: boolean;
  onResearch: (mode: "replay" | "evidence") => void;
  onWatchTrader: () => void;
  onWatchToken: () => void;
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
      <strong title={detail.wallet ?? undefined}>{detail.identity}</strong>
      {idLine && idLine !== detail.identity ? <div className="fs-id">{idLine}</div> : null}
      <p className="fs-fact">{detail.factLine}</p>
      {latest ? <p className="fs-latest">Latest print: {latest.side.toUpperCase()} {latest.symbol ?? "token"} · {timeLabel(latest.at)}</p> : null}
      {selected ? <p className="fs-selected">Selected {selected.symbol ?? callsign(selected.mint)}</p> : null}
      <div className="fs-actions">
        <button type="button" disabled={!researchable} onClick={() => onResearch("replay")}>REPLAY</button>
        {selected ? (
          <button type="button" aria-pressed={tokenWatched} onClick={onWatchToken}>{tokenWatched ? "WATCHING TOKEN" : "WATCH TOKEN"}</button>
        ) : (
          <button type="button" aria-pressed={traderWatched} disabled={!detail.wallet} onClick={onWatchTrader}>{traderWatched ? "WATCHING" : "WATCH TRADER"}</button>
        )}
        <button type="button" disabled={!researchable} onClick={() => onResearch("evidence")}>EVIDENCE</button>
      </div>
      {!researchable ? <p className="fs-fine">No retained prints for this wallet yet. Replay opens when one is indexed.</p> : null}
      <p className="fs-fine">
        Identity source: {detail.identitySource} · Latest COMETS: {detail.cometCount} · {detail.rankBasis} {detail.sourceLabel}.
        <br />
        Research only. A Bulls App is not a broker and never executes trades.
      </p>
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
