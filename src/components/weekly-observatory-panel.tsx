import { useEffect, useState } from "react";
import { formatDistributionLine } from "@/lib/field/distribution-readout";
import { PNL_CAVEAT } from "@/lib/field/honest-pnl";
import { getWeeklyTraderObservatory } from "@/lib/universe-data/trader-observatory-client";
import type { TraderObservatoryResponse } from "@/lib/universe-data/contracts";

const short = (value: string) => value.length > 12 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value;

function updatedLabel(generatedAt: number | null | undefined) {
  if (!generatedAt) return "not yet produced";
  return new Date(generatedAt * 1000).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Chain-matched weekly ranking. Separate from Fomo-reported figures. */
export function WeeklyObservatoryPanel() {
  const [data, setData] = useState<TraderObservatoryResponse | null>(null);
  useEffect(() => {
    let active = true;
    void getWeeklyTraderObservatory().then(result => { if (active) setData(result); }).catch(() => {
      if (active) setData({ ok: false, coverage: "degraded", items: [], disclosure: "The weekly observatory could not be read. No ranking was invented." });
    });
    return () => { active = false; };
  }, []);
  const minimum = data?.ranking?.minimumMatchedSells ?? 5;
  const tokens = data?.ranking?.minimumDistinctTokens ?? 2;
  const excluded = data?.ranking?.excludedBelowSample;
  return <section className="observatory-readout" aria-label="Weekly trader observatory">
    <style>{`.observatory-readout{display:grid;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(226,236,255,.12)}.observatory-readout h3{margin:0;font:700 12px/1.2 var(--font-display);letter-spacing:.08em}.observatory-readout p,.observatory-readout li{margin:0;color:var(--color-muted);font:500 12px/1.45 var(--font-mono)}.observatory-readout ul{display:grid;gap:6px;margin:0;padding:0;list-style:none}.observatory-readout li{padding:8px;border:1px solid rgba(226,236,255,.1);border-radius:10px;background:rgba(255,255,255,.03)}.observatory-readout strong{color:#f4f7ff;font:650 12px/1.3 var(--font-sans)}.observatory-readout [data-completeness=insufficient]{color:#e7c27a}.observatory-readout [data-completeness=partial]{color:#d5deee}.observatory-readout [data-completeness=complete]{color:#9be7c4}`}</style>
    <h3>WEEKLY OBSERVATORY</h3>
    {!data ? <p>Reading the cached seven-day ranking…</p> : <>
      <p>Last updated {updatedLabel(data.generatedAt)}. Ranked by matched realized SOL over 7 days. Win rate is not the sort. At least {minimum} priced matched sells across {tokens} tokens.{excluded != null ? ` ${excluded} smaller samples were left off the list.` : ""} {data.coverage === "stale" ? "This ranking may be out of date." : ""}</p>
      {data.items.length ? <ul>{data.items.slice(0, 12).map(item => <li key={item.wallet}><strong>#{item.rank} {short(item.wallet)}</strong><span data-completeness={item.completeness?.state}> {formatDistributionLine({ sampleSize: item.sampleSize ?? item.matchedSellCount, medianTradePnl: item.medianTradePnlSol, profitConcentrationTop1: item.profitConcentrationTop1, profitConcentrationTop3: item.profitConcentrationTop3, netOfFeesPnl: item.netOfFeesSol, completenessState: item.completeness?.state, unit: "sol" })}</span></li>)}</ul> : <p>{data.disclosure}</p>}
      <p>{PNL_CAVEAT}. Chain-matched SOL stays separate from Fomo-reported USD.</p>
    </>}
  </section>;
}
