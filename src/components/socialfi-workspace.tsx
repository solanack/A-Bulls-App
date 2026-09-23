import { useEffect, useState } from "react";
import { Activity, Bookmark, Radio, ShieldCheck, Users } from "lucide-react";
import { loadSocialCapabilities, loadSocialFeed } from "@/lib/socialfi/client";
import {
  SOCIAL_RELEASE_POLICY,
  type SocialCapabilities,
  type SocialFeedItem,
  type SocialFeedScope,
} from "@/lib/socialfi/contracts";

const SCOPES: { id: SocialFeedScope; label: string; icon: typeof Radio }[] = [
  { id: "discover", label: "DISCOVER", icon: Radio },
  { id: "following", label: "FOLLOWING", icon: Users },
  { id: "watchlist", label: "WATCHLIST", icon: Bookmark },
  { id: "creators", label: "CREATORS", icon: Activity },
];

export function SocialFiWorkspace() {
  const [scope, setScope] = useState<SocialFeedScope>("discover");
  const [capabilities, setCapabilities] = useState<SocialCapabilities | null>(null);
  const [items, setItems] = useState<readonly SocialFeedItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setMessage("");
    void loadSocialCapabilities(controller.signal)
      .then(async (nextCapabilities) => {
        setCapabilities(nextCapabilities);
        if (!nextCapabilities.socialEnabled) {
          setItems([]);
          setMessage("The SocialFi service is installed but remains disabled for this release.");
          return;
        }
        const feed = await loadSocialFeed(scope, controller.signal);
        setItems(feed.items);
        if (!feed.items.length)
          setMessage("No verified social signals are available in this scope yet.");
      })
      .catch(() => {
        setItems([]);
        setMessage("The SocialFi service has not been enabled on the Intelligence Worker.");
      })
      .finally(() => setBusy(false));
    return () => controller.abort();
  }, [scope]);

  return (
    <article className="socialfi-workspace">
      <header className="socialfi-head">
        <span>SOCIAL INTELLIGENCE · NO WALLET REQUIRED</span>
        <h2>The Signal</h2>
        <p>
          Follow evidence, creators, wallets, tokens, and launchpad galaxies without surrendering
          custody.
        </p>
      </header>

      <nav className="socialfi-tabs" aria-label="Social feed scopes">
        {SCOPES.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={scope === id} onClick={() => setScope(id)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </nav>

      <section className="socialfi-policy">
        <ShieldCheck size={17} />
        <div>
          <b>READ-ONLY WALLET POLICY</b>
          <span>{capabilities?.releasePolicy ?? SOCIAL_RELEASE_POLICY}</span>
        </div>
      </section>

      {busy ? <p className="socialfi-state">Reading the social signal…</p> : null}
      {!busy && message ? <p className="socialfi-state">{message}</p> : null}
      <div className="socialfi-feed">
        {items.map((item) => (
          <SignalCard key={item.id} item={item} />
        ))}
      </div>
    </article>
  );
}

function SignalCard({ item }: { item: SocialFeedItem }) {
  return (
    <article className="signal-card">
      <header>
        <div>
          <b>{item.actor.displayName}</b>
          <span>@{item.actor.handle}</span>
        </div>
        <time>{new Date(item.createdAt).toLocaleString()}</time>
      </header>
      <p>{item.body}</p>
      <footer>
        <span>{item.galaxyId ?? "FIELD"}</span>
        {item.evidenceId ? <span>EVIDENCE ATTACHED</span> : <span>OPINION</span>}
        <span>{item.reactions} SIGNALS</span>
      </footer>
    </article>
  );
}
