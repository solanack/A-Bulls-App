import { useEffect, useMemo, useRef, useState } from "react";
import {
  duelBarRatio,
  extractDivergeSeries,
  extractDuelFields,
  prefersReducedMotion,
  type Data,
  type SeriesPoint,
} from "@/components/colosseum-metrics-helpers";

export {
  statusBadge,
  prefersReducedMotion,
  extractSparklineValues,
  extractDivergeSeries,
  extractDuelFields,
  duelBarRatio,
  type Data,
  type SeriesPoint,
  type DuelField,
} from "@/components/colosseum-metrics-helpers";

export function CountUp({
  value,
  reducedMotion,
  className,
}: {
  value: string | number;
  reducedMotion?: boolean;
  className?: string;
}) {
  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  const isNumeric = Number.isFinite(numeric) && String(value).trim() !== "" && !/[a-zA-Z]/.test(String(value).replace(/[eE.+-]/g, ""));
  const reduce = reducedMotion ?? prefersReducedMotion();
  const [shown, setShown] = useState(reduce || !isNumeric ? value : 0);
  const frame = useRef(0);

  useEffect(() => {
    if (!isNumeric || reduce) {
      setShown(value);
      return;
    }
    const target = numeric;
    const start = performance.now();
    const duration = 700;
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (target - from) * eased;
      setShown(Number.isInteger(target) ? Math.round(current) : Number(current.toPrecision(6)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setShown(target);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, isNumeric, numeric, reduce]);

  return <strong className={className}>{typeof shown === "number" ? shown : String(shown)}</strong>;
}

export function Sparkline({ values, label }: { values: number[]; label?: string }) {
  const path = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = Math.max(1e-12, max - min);
    const w = 120;
    const h = 28;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / span) * (h - 2) - 1;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [values]);

  if (!path) return null;
  return (
    <svg className="colosseum-sparkline" viewBox="0 0 120 28" role="img" aria-label={label || "Observed series sparkline"}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function DivergeChart({ simulation }: { simulation: Data }) {
  const series = useMemo(() => extractDivergeSeries(simulation), [simulation]);
  if (series.emptyReason) {
    return (
      <div className="colosseum-diverge colosseum-diverge--empty" role="status">
        <span>ACTUAL VS HOLD · NOT DRAWN</span>
        <p className="universe-empty">{series.emptyReason}</p>
        <p className="colosseum-diverge__meta">
          {series.sourceLabel} · {series.timeLabel}
        </p>
      </div>
    );
  }
  const all = [...series.actual.map((p) => p.v), ...series.hold.map((p) => p.v)];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(1e-12, max - min);
  const t0 = series.actual[0].t;
  const t1 = series.actual[series.actual.length - 1].t;
  const tSpan = Math.max(1, t1 - t0);
  const toX = (t: number) => 8 + ((t - t0) / tSpan) * 624;
  const toY = (v: number) => 12 + (1 - (v - min) / span) * 136;
  const line = (pts: SeriesPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.t).toFixed(1)} ${toY(p.v).toFixed(1)}`).join(" ");

  return (
    <div className="colosseum-diverge">
      <span>ACTUAL VS HOLD · OBSERVED ENTRY CUMULATIVE · FIXED-HOLD COUNTERFACTUAL</span>
      <svg viewBox="0 0 640 160" role="img" aria-label="Actual versus hold diverge chart from retained simulation outcomes">
        <path className="colosseum-diverge__actual" d={line(series.actual)} fill="none" strokeWidth="2" />
        <path className="colosseum-diverge__hold" d={line(series.hold)} fill="none" strokeWidth="2" />
      </svg>
      <div className="colosseum-diverge__legend">
        <span className="is-actual">observed entry value (cumulative)</span>
        <span className="is-hold">fixed-hold counterfactual (cumulative)</span>
      </div>
      <p className="colosseum-diverge__meta">
        {series.sourceLabel} · {series.timeLabel} · {new Date(t0).toLocaleString()} → {new Date(t1).toLocaleString()}
      </p>
    </div>
  );
}

export function CompareDuel({
  walletA,
  walletB,
  summaryA,
  summaryB,
  comparison,
  disclaimer,
}: {
  walletA: string;
  walletB: string;
  summaryA: Data;
  summaryB: Data;
  comparison: Data;
  disclaimer: string;
}) {
  const fields = useMemo(() => extractDuelFields(summaryA, summaryB), [summaryA, summaryB]);
  const short = (v: string) => (v.length > 18 ? `${v.slice(0, 8)}…${v.slice(-6)}` : v || "—");

  return (
    <section className="colosseum-duel" aria-label="Observed wallet comparison">
      <div className="colosseum-duel__cards">
        <article className="colosseum-duel__card">
          <span>WALLET A · OBSERVED</span>
          <b>{short(walletA)}</b>
        </article>
        <article className="colosseum-duel__card">
          <span>WALLET B · OBSERVED</span>
          <b>{short(walletB)}</b>
        </article>
      </div>
      {fields.length ? (
        <div className="colosseum-duel__bars">
          {fields.map((field) => {
            const ratio = duelBarRatio(field.a, field.b);
            return (
              <div key={field.key} className="colosseum-duel__row" data-leading={ratio.leading}>
                <div className="colosseum-duel__label">
                  <span>{field.label}</span>
                  <span className="colosseum-duel__hint">
                    {ratio.leading === "gap"
                      ? "gap · value not retained on one side"
                      : ratio.leading === "tie"
                        ? "observed tie"
                        : `higher observed · ${ratio.leading === "a" ? "A" : "B"}`}
                  </span>
                </div>
                <div className="colosseum-duel__track" aria-hidden={ratio.leading === "gap"}>
                  {ratio.leading === "gap" ? (
                    <p className="colosseum-duel__gap">Honest gap — no zero-fill</p>
                  ) : (
                    <>
                      <div className={`colosseum-duel__bar is-a${ratio.leading === "a" ? " is-lead" : ""}`} style={{ width: `${ratio.aPct}%` }}>
                        <em>{field.a}</em>
                      </div>
                      <div className={`colosseum-duel__bar is-b${ratio.leading === "b" ? " is-lead" : ""}`} style={{ width: `${ratio.bPct}%` }}>
                        <em>{field.b}</em>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="universe-empty">No comparable numeric fields retained on both wallet summaries. Bars not invented.</p>
      )}
      {Object.keys(comparison).length ? (
        <p className="colosseum-duel__diff-note">Difference fields shown as observed deltas only — not a skill or ownership rank.</p>
      ) : null}
      {disclaimer ? <p className="universe-disclosure">{disclaimer}</p> : null}
    </section>
  );
}

export function LuxuryMetric({
  label,
  value,
  sparkValues,
  reducedMotion,
}: {
  label: string;
  value: string | number;
  sparkValues?: number[];
  reducedMotion?: boolean;
}) {
  return (
    <div className="colosseum-metric">
      <span>{label}</span>
      <CountUp value={value} reducedMotion={reducedMotion} />
      {sparkValues && sparkValues.length >= 2 ? <Sparkline values={sparkValues} label={`${label} observed series`} /> : null}
    </div>
  );
}