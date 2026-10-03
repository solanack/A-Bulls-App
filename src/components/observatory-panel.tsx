import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ComplianceNotice } from "@/components/compliance-notice";
import { getWeeklyTraderObservatory } from "@/lib/universe-data/trader-observatory-client";
import type { TraderObservatoryResponse } from "@/lib/universe-data/contracts";
import {
  FEE_GROSS_UNLESS_EMBEDDED,
  OBSERVATORY_RANKED_NOTICE,
  observatoryMethodLabel,
  pnlCardNotice,
  staleRankingNotice,
  windowRangeLabel,
} from "../../js/compliance-notice.mjs";

const short = (value: string) => (value.length > 14 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value);

export function ObservatoryPanel() {
  const [data, setData] = useState<TraderObservatoryResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getWeeklyTraderObservatory()
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(result.ok ? "" : result.error || "The cached observatory is unavailable.");
      })
      .catch(() => {
        if (active) setError("The cached observatory is unavailable.");
      });
    return () => {
      active = false;
    };
  }, []);

  const method = observatoryMethodLabel(data?.method);
  const windowLabel = data?.window?.from && data.window.to
    ? windowRangeLabel(data.window.from, data.window.to, data.window.label || "7D")
    : "7D";
  const stale = data?.coverage === "stale" ? staleRankingNotice(data.window?.to) : null;
  const coverage = (data?.coverage ?? "degraded").toUpperCase();

  return (
    <section className="observatory-panel" aria-label="Weekly trader observatory">
      <p className="observatory-panel__meta">
        <span className="observatory-panel__badge" data-coverage={data?.coverage ?? "degraded"}>{coverage}</span>
        {" "}{method} · {FEE_GROSS_UNLESS_EMBEDDED} · {windowLabel}
      </p>
      {stale ? <ComplianceNotice text={stale} /> : null}
      <ComplianceNotice text={OBSERVATORY_RANKED_NOTICE} />
      <ComplianceNotice text={pnlCardNotice({ method, fees: FEE_GROSS_UNLESS_EMBEDDED, windowLabel })} />
      {!data ? (
        <p className="universe-empty"><LoaderCircle size={12} /> Reading the cached 7D observatory…</p>
      ) : error && !data.items.length ? (
        <p className="universe-empty">DEGRADED · {error}</p>
      ) : data.items.length ? (
        <div className="observatory-panel__list">
          {data.items.slice(0, 50).map((item) => (
            <div className="observatory-panel__row" key={`${item.rank}-${item.wallet}`}>
              <b>#{item.rank}</b>
              <span>{short(item.wallet)} · {item.matchedSellCount} matched sells · 7D</span>
              <strong className="observatory-panel__pnl" data-number="true">{item.realizedSol >= 0 ? "+" : ""}{item.realizedSol.toFixed(4)} SOL</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="universe-empty">No matched sells are retained for this 7D window. Missing coverage is not zero.</p>
      )}
      {data?.disclosure ? <p className="universe-disclosure">{data.disclosure}</p> : null}
    </section>
  );
}
