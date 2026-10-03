import { candleBucketMs, groupBolts, hopSchedule, observedUsdNotional, type TapeBolt, type TapeCandle, type TapeEvent } from "./replay-tape.ts";

export type CutSoundtrack = "minimal" | "pulse" | "silent";
export type CutPace = 12 | 24 | 36;
export const CUT_PACES: readonly CutPace[] = [12, 24, 36];
export function cutTapeSeconds(value?: number): CutPace {
  return value === 24 || value === 36 ? value : 12;
}
export const CUT_TITLE_SECONDS = 1.4;
export function cutDuration(value?: number) { return cutTapeSeconds(value) + CUT_TITLE_SECONDS + 3.8; }

/** Never pin an out-of-coverage event to an unrelated first/last candle. */
export function replayCandleCoverage(candles: readonly TapeCandle[], events: readonly TapeEvent[]) {
  const bucket = candleBucketMs(candles);
  let index = 0, covered = 0;
  for (const event of events) {
    while (index + 1 < candles.length && candles[index + 1].timestamp <= event.timestamp) index++;
    const candle = candles[index];
    if (candle && event.timestamp >= candle.timestamp && event.timestamp < candle.timestamp + (candle.bucketSeconds ? candle.bucketSeconds * 1000 : bucket)) covered++;
  }
  return { covered, total: events.length, usable: candles.length > 0 && covered === events.length };
}

export function replayCoverage(bolts: readonly TapeBolt[]) {
  return {
    total: bolts.length,
    receipts: bolts.filter(bolt => Boolean(bolt.signature)).length,
    priced: bolts.filter(bolt => observedUsdNotional(bolt) != null).length,
    summaries: bolts.filter(bolt => bolt.eventScope === "position-summary").length,
    provider: bolts.filter(bolt => /provider|fomo/i.test(bolt.verification)).length,
  };
}

export function printSource(bolt: TapeBolt) {
  if (/provider|fomo/i.test(bolt.verification)) return "Provider-reported";
  if (["observed", "observed-fact", "verified"].includes(bolt.verification.toLowerCase())) return "Chain observation";
  return "Source unverified";
}

export function printLabel(bolt: TapeBolt) {
  return bolt.eventScope === "position-summary"
    ? bolt.side === "buy" ? "Position opened" : "Position closed"
    : bolt.side === "buy" ? "Buy" : "Sell";
}

/** Playhead timing for the Cut: the same bolt-to-bolt hops as the studio, stretched over TAPE_SECONDS. */
export function cutTiming(bolts: readonly TapeBolt[], tapeSeconds = 12) {
  const groups = groupBolts(bolts);
  const schedule = hopSchedule(bolts.map((bolt) => bolt.cursor));
  const arrivalAt = new Map<string, number>();
  for (const bolt of bolts) {
    const i = schedule.stops.findIndex((stop) => Math.abs(stop - Math.min(1, Math.max(0, bolt.cursor))) < 1e-9);
    arrivalAt.set(bolt.id, (i < 0 ? bolt.cursor : schedule.arrivals[i]) * cutTapeSeconds(tapeSeconds));
  }
  return { groups, schedule, arrivalAt };
}
