import { useEffect, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { getSocialWindow } from "@/lib/universe-data/social-window-client";
import { emptySocialWindow, SOCIAL_AFTER_CHIPS, SOCIAL_EMPTY_LINE, SOCIAL_THAT_DAY_MAX, socialCountLine, socialRailCopy, socialSourceChip, type SocialBucket, type SocialPost, type SocialWindow } from "@/lib/field/social-window";

type Props = { mint: string; symbol: string | null; name: string | null; wallet: string; chain: string; room: "fomo" | "afterbell" | null; day0: string; onClose: () => void };

const cache = new Map<string, SocialWindow>();
const time = (ms: number) => new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });

function PostRow({ post }: { post: SocialPost }) {
  return (
    <li className="rss-post">
      <div className="rss-post__head">
        <b>@{post.handle}</b>
        <span>{time(post.postedAt)}</span>
        <span className="rss-chip">{socialSourceChip(post.source)}</span>
        {post.role !== "public" && post.roleSource ? <span className="rss-chip rss-chip--role">{post.role} · {post.roleSource}</span> : null}
        {post.thesisShaped ? <span className="rss-chip">thesis-shaped</span> : null}
        {post.linkedToWallet ? <span className="rss-chip rss-chip--linked">linked to this wallet</span> : null}
      </div>
      {post.excerpt ? <p className="rss-post__text">{post.excerpt}</p> : null}
      {post.url ? <a className="rss-post__link" href={post.url} target="_blank" rel="noreferrer noopener">Open post <ExternalLink size={11} /></a> : null}
    </li>
  );
}

function Section({ title, posts, empty }: { title: string; posts: SocialPost[]; empty?: string }) {
  if (!posts.length && !empty) return null;
  return (
    <section className="rss-section">
      <h3>{title}</h3>
      {posts.length ? <ul>{posts.map((post) => <PostRow key={post.id} post={post} />)}</ul> : <p className="rss-empty">{empty}</p>}
    </section>
  );
}

export function ReplaySocialStrip({ mint, symbol, name, wallet, chain, room, day0, onClose }: Props) {
  const key = `${mint}:${day0}:${room ?? ""}`;
  const [window_, setWindow] = useState<SocialWindow | null>(() => cache.get(key) ?? null);
  const [chip, setChip] = useState<Exclude<SocialBucket, "day0">>("plus1");
  useEffect(() => {
    if (cache.has(key)) { setWindow(cache.get(key) ?? null); return; }
    let cancelled = false;
    setWindow(null);
    void getSocialWindow({ data: { mint, day0, symbol, name, wallet, room, chain } })
      .catch(() => emptySocialWindow({ symbol, name, mint }, day0))
      .then((next) => { cache.set(key, next); if (!cancelled) setWindow(next); });
    return () => { cancelled = true; };
  }, [key, mint, day0, symbol, name, wallet, room, chain]);

  const shown = window_ ?? emptySocialWindow({ symbol, name, mint }, day0);
  const [rail, sourceLine] = socialRailCopy(shown);
  const afterCount = (bucket: Exclude<SocialBucket, "day0">) => shown.after[bucket].length;

  return (
    <aside className="rss" role="dialog" aria-label="That day: dated public posts" data-social-source={shown.source} data-social-total={shown.total}>
      <SocialStripStyles />
      <header className="rss-head">
        <div><span className="rss-kicker">EVIDENCE · THAT DAY</span><b>{window_ ? socialCountLine(shown) : "Reading retained posts…"}</b></div>
        <button type="button" className="rs-icon rs-icon--small" aria-label="Close That day" onClick={onClose}><X size={14} /></button>
      </header>
      <p className="rss-rail">{rail}<br />{sourceLine}</p>
      {window_ ? (
        <div className="rss-body">
          <Section title={`That day · ${shown.day0}`} posts={shown.thatDay.slice(0, SOCIAL_THAT_DAY_MAX)} empty={SOCIAL_EMPTY_LINE} />
          <section className="rss-section">
            <h3>After</h3>
            <div className="rss-chips" role="tablist" aria-label="Days after the first print">
              {SOCIAL_AFTER_CHIPS.map((item) => <button key={item.bucket} type="button" role="tab" aria-selected={chip === item.bucket} onClick={() => setChip(item.bucket)}>{item.label} <small>{afterCount(item.bucket)}</small></button>)}
            </div>
            {shown.after[chip].length ? <ul>{shown.after[chip].map((post) => <PostRow key={post.id} post={post} />)}</ul> : <p className="rss-empty">{SOCIAL_EMPTY_LINE}</p>}
          </section>
          <Section title={room === "afterbell" ? "Issuer and venue notes" : "Team"} posts={shown.team} empty={room === "afterbell" ? SOCIAL_EMPTY_LINE : undefined} />
          <Section title="Thesis-shaped" posts={shown.thesisShaped} />
        </div>
      ) : (
        <div className="rss-body"><span className="rs-pulse" aria-hidden="true" /></div>
      )}
    </aside>
  );
}

function SocialStripStyles() {
  return <style>{`.rss{position:absolute;z-index:3;right:12px;top:64px;bottom:12px;width:min(400px,calc(100% - 24px));display:flex;flex-direction:column;gap:10px;padding:14px 14px 16px;border:1px solid var(--rs-rim);border-radius:18px;background:rgba(14,15,20,.97);box-shadow:0 30px 90px rgba(0,0,0,.5);overflow:hidden}.rss-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.rss-head div{display:grid;gap:5px}.rss-kicker{font:700 8.5px/1 var(--font-display);letter-spacing:.16em;color:var(--rs-ink)}.rss-head b{font:620 14px/1.25 var(--font-sans)}.rss-rail{margin:0;padding:9px 11px;border-radius:12px;background:rgba(255,255,255,.035);font:500 11.5px/1.45 var(--font-sans);color:rgba(236,236,240,.72)}.rss-body{flex:1 1 auto;min-height:0;overflow:auto;display:grid;align-content:start;gap:14px;overscroll-behavior:contain}.rss-section{display:grid;gap:8px}.rss-section h3{margin:0;font:700 9px/1 var(--font-display);letter-spacing:.14em;color:rgba(236,236,240,.6);text-transform:uppercase}.rss-section ul{margin:0;padding:0;list-style:none;display:grid;gap:8px}.rss-empty{margin:0;font:500 12px/1.4 var(--font-sans);color:rgba(236,236,240,.5)}.rss-post{display:grid;gap:5px;padding:10px 11px;border:1px solid rgba(236,236,240,.08);border-radius:12px;background:rgba(255,255,255,.02)}.rss-post__head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font:500 11px/1.2 var(--font-sans);color:rgba(236,236,240,.6)}.rss-post__head b{font:650 12.5px/1.2 var(--font-sans);color:#f4f2ec}.rss-chip{padding:3px 7px;border:1px solid rgba(236,236,240,.14);border-radius:999px;font:600 9px/1 var(--font-mono);color:rgba(236,236,240,.7)}.rss-chip--role{border-color:color-mix(in oklab,var(--rs-ink) 45%,transparent);color:var(--rs-ink)}.rss-chip--linked{border-color:rgba(184,255,60,.45);color:#d9ff8a}.rss-post__text{margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:500 12.5px/1.45 var(--font-sans);color:rgba(244,242,236,.86)}.rss-post__link{justify-self:start;display:inline-flex;align-items:center;gap:4px;font:600 10px/1 var(--font-mono);color:rgba(236,236,240,.7);text-decoration:underline;text-decoration-color:rgba(236,236,240,.25)}.rss-chips{display:flex;gap:6px}.rss-chips button{height:30px;padding:0 12px;border:1px solid var(--rs-rim);border-radius:999px;background:transparent;color:rgba(236,236,240,.75);font:650 11px/1 var(--font-mono)}.rss-chips button small{opacity:.55;margin-left:3px}.rss-chips button[aria-selected=true]{border-color:var(--rs-ink);color:#fff;background:color-mix(in oklab,var(--rs-ink) 12%,transparent)}@media(max-width:560px){.rss{left:8px;right:8px;top:auto;width:auto;max-height:74%;bottom:8px}}`}</style>;
}
