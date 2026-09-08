import type { FieldParticle, JsonValue, UniverseSnapshot } from "./types.ts";
import {
  fiveMinuteHeat,
  formatHeat,
  particleMint,
  uniqueTraders,
  liquidityUsd,
  liquiditySol,
  tapeM5,
  type FiveMinuteHeat,
} from "./volume-sky.ts";
import { cosmicLabel, cosmicMeaning, renderCosmicKind } from "./cosmic-visuals.ts";

function shortId(raw: string) {
  const text = raw.trim();
  if (text.length <= 12) return text;
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

function usd(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 0.0001 ? 10 : value < 1 ? 6 : 0,
  });
}

function numeric(value: JsonValue | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function strings(value: JsonValue | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

function observedTime(ms: number) {
  return Number.isFinite(ms) ? new Date(ms).toISOString() : "unavailable";
}

export function containsSafetyBadge(text: string) {
  return /\bSAFE\b/i.test(text) && !/no safety claim/i.test(text);
}

function flagPhrase(flag: string) {
  switch (flag) {
    case "watch-pin":
      return "device watch pin, not a Helius membership";
    case "teaching-body":
      return "teaching body, not a live ranked market";
    case "thin-liquidity":
      return "liquidity below the observed floor";
    case "missing-liquidity":
      return "liquidity not observed";
    case "missing-5m-heat":
      return "no five-minute volume was observed";
    case "thin-traders":
      return "thin unique-trader set";
    case "missing-traders":
      return "unique traders not observed";
    case "one-sided-tape":
      return "one-sided tape in the five-minute window";
    case "wash-like-velocity":
      return "five-minute volume is high versus observed liquidity";
    case "young-pair":
      return "pair younger than three minutes";
    default:
      return flag.replaceAll("-", " ");
  }
}

export type ObservedTokenFacts = {
  query?: string;
  symbol?: string | null;
  name?: string | null;
  network?: string | null;
  mint?: string | null;
  flags: string[];
  priceUsd?: number | null;
  marketCapUsd?: number | null;
  liquidityUsd?: number | null;
  heat?: FiveMinuteHeat | null;
  buysM5?: number | null;
  sellsM5?: number | null;
  uniqueTraders?: number | null;
  disclosure?: string | null;
};

export function speakObservedFacts(facts: ObservedTokenFacts): string {
  const parts: string[] = [];
  if (facts.flags.length) {
    parts.push(`Observed flags first: ${facts.flags.map(flagPhrase).join("; ")}.`);
  } else {
    parts.push("No wash or authority flag is attached. That is not a safety claim.");
  }
  const tokenName = facts.symbol || facts.name || (facts.mint ? `token ending in ${shortId(facts.mint)}` : "this body");
  parts.push(`${tokenName}${facts.network ? ` on ${facts.network}` : ""}.`);
  if (typeof facts.priceUsd === "number") parts.push(`Price ${usd(facts.priceUsd)}.`);
  if (typeof facts.marketCapUsd === "number") parts.push(`Market cap ${usd(facts.marketCapUsd)}.`);
  const heat = formatHeat(facts.heat ?? null);
  if (heat) parts.push(`${heat} volume.`);
  if (typeof facts.liquidityUsd === "number") parts.push(`Liquidity ${usd(facts.liquidityUsd)}.`);
  if (typeof facts.buysM5 === "number" && typeof facts.sellsM5 === "number") {
    parts.push(`${facts.buysM5.toLocaleString()} buys versus ${facts.sellsM5.toLocaleString()} sells in five minutes.`);
  }
  if (typeof facts.uniqueTraders === "number") parts.push(`${facts.uniqueTraders.toLocaleString()} unique traders observed.`);
  if (facts.disclosure) parts.push(facts.disclosure);
  parts.push("Observed data only. No safety claim or price prediction.");
  return parts.join(" ");
}

export function flagsFromResolveMarket(input: {
  mintAuthorityRevoked?: boolean | null;
  freezeAuthorityRevoked?: boolean | null;
  riskFlags?: readonly string[] | null;
  liquidityUsd?: number | null;
  volumeM5Usd?: number | null;
  uniqueTraders?: number | null;
  buysM5?: number | null;
  sellsM5?: number | null;
}): string[] {
  const flags: string[] = [];
  if (input.mintAuthorityRevoked === false) flags.push("mint authority active");
  if (input.freezeAuthorityRevoked === false) flags.push("freeze authority active");
  for (const flag of input.riskFlags ?? []) flags.push(flag);
  if (typeof input.liquidityUsd === "number" && input.liquidityUsd < 10_000) flags.push("thin-liquidity");
  if (typeof input.volumeM5Usd === "number" && typeof input.liquidityUsd === "number" && input.liquidityUsd > 0 && input.volumeM5Usd / input.liquidityUsd > 8) {
    flags.push("wash-like-velocity");
  }
  if (typeof input.uniqueTraders === "number" && input.uniqueTraders < 10) flags.push("thin-traders");
  if (typeof input.buysM5 === "number" && typeof input.sellsM5 === "number" && (input.buysM5 <= 0 || input.sellsM5 <= 0)) {
    flags.push("one-sided-tape");
  }
  return flags;
}

function speakPlanet(particle: FieldParticle) {
  const wallet = typeof particle.metadata?.wallet === "string" ? particle.metadata.wallet : null;
  const linkedMints = strings(particle.metadata?.linkedMints);
  const exits = Array.isArray(particle.metadata?.exits) ? particle.metadata?.exits.length : 0;
  const net = numeric(particle.metadata?.netSolDelta24h);
  const parts = [
    `PLANET. ${cosmicMeaning("planet")}.`,
    wallet ? `Public wallet ${shortId(wallet)}.` : "Public wallet identity is unavailable in this snapshot.",
  ];
  if (linkedMints.length) parts.push(`${linkedMints.length.toLocaleString()} indexed token relationships are attached to this wallet.`);
  if (exits) parts.push(`${exits.toLocaleString()} indexed holder-exit observations are attached in this window.`);
  if (net != null) parts.push(`Observed 24-hour SOL delta ${net.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL.`);
  parts.push(`Observed at ${observedTime(particle.observedAt)}. A public wallet is evidence, not proof of a person's identity or ownership.`);
  return parts.join(" ");
}

function speakComet(particle: FieldParticle) {
  const side = typeof particle.metadata?.side === "string" ? particle.metadata.side : null;
  const solAmount = numeric(particle.metadata?.solAmount);
  const tokenAmount = numeric(particle.metadata?.tokenAmount);
  const priceSol = numeric(particle.metadata?.priceSol);
  const signature = typeof particle.metadata?.sig === "string" ? particle.metadata.sig : particle.eventId;
  const mint = particleMint(particle);
  const parts = [`COMET. ${cosmicMeaning("comet")}.`];
  if (side) parts.push(`Indexed side ${side}.`);
  if (solAmount != null) parts.push(`Observed size ${solAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL.`);
  if (tokenAmount != null) parts.push(`Token amount ${tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}.`);
  if (priceSol != null) parts.push(`Observed price ${priceSol.toLocaleString(undefined, { maximumFractionDigits: 10 })} SOL per token.`);
  if (mint) parts.push(`Token ${shortId(mint)}.`);
  if (signature) parts.push(`Transaction ${shortId(String(signature))}.`);
  parts.push(`Observed at ${observedTime(particle.observedAt)}.`);
  return parts.join(" ");
}

function speakLiquidity(particle: FieldParticle) {
  const usdLiq = liquidityUsd(particle);
  const solLiq = liquiditySol(particle);
  const parent = typeof particle.metadata?.parentMint === "string" ? particle.metadata.parentMint : particleMint(particle);
  const parts = [`ASTEROID BELT. ${cosmicMeaning("asteroid-belt")}.`];
  if (usdLiq != null) parts.push(`Observed liquidity ${usd(usdLiq)}.`);
  else if (solLiq != null) parts.push(`Observed liquidity ${solLiq.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL.`);
  else parts.push("Liquidity is unavailable; this belt should not be certified as observed market evidence.");
  if (parent) parts.push(`It surrounds token ${shortId(parent)}.`);
  parts.push(`Observed at ${observedTime(particle.observedAt)}.`);
  return parts.join(" ");
}

function speakWormhole(particle: FieldParticle) {
  const from = typeof particle.metadata?.from === "string" ? particle.metadata.from : null;
  const to = typeof particle.metadata?.to === "string" ? particle.metadata.to : null;
  const pool = typeof particle.metadata?.pool === "string" ? particle.metadata.pool : null;
  const mint = particleMint(particle);
  const parts = [`WORMHOLE. ${cosmicMeaning("wormhole")}.`];
  if (mint) parts.push(`Token ${shortId(mint)} keeps its original launch galaxy.`);
  if (from && to) parts.push(`Indexed migration from ${shortId(from)} to ${shortId(to)}.`);
  if (pool) parts.push(`Pool ${shortId(pool)}.`);
  parts.push(`Observed at ${observedTime(particle.observedAt)}.`);
  return parts.join(" ");
}

function speakCollapse(particle: FieldParticle, label: "BLACK HOLE" | "SUPERNOVA") {
  const reasons = strings(particle.metadata?.reason);
  const evidence = strings(particle.metadata?.evidence);
  const score = numeric(particle.metadata?.score);
  const mint = particleMint(particle);
  const parts = [
    `${label}. ${cosmicMeaning(label === "BLACK HOLE" ? "black-hole" : "supernova")}.`,
  ];
  if (mint) parts.push(`Token ${shortId(mint)}.`);
  if (reasons.length) parts.push(`Indexed reasons: ${reasons.join(", ")}.`);
  if (score != null) parts.push(`Derived evidence score ${score.toFixed(2)}.`);
  if (evidence.length) parts.push(`Evidence: ${evidence.slice(0, 3).join("; ")}.`);
  parts.push(`Observed at ${observedTime(particle.observedAt)}. This marker describes retained evidence; it is not a safety verdict or prediction.`);
  return parts.join(" ");
}

export function speakObservedParticle(particle: FieldParticle, snapshot: UniverseSnapshot): string {
  const kind = renderCosmicKind(particle);
  if (kind === "dust") {
    return "DUST. This is decorative field fabric, not a live token or certified market evidence.";
  }
  if (kind === "galaxy") {
    const name = typeof particle.metadata?.name === "string" ? particle.metadata.name : cosmicLabel(kind);
    return `GALAXY. ${name}. ${cosmicMeaning("galaxy")}. Enter it to inspect indexed bodies; this directory object is not itself market evidence.`;
  }
  if (kind === "planet") return speakPlanet(particle);
  if (kind === "asteroid-belt") return speakLiquidity(particle);
  if (kind === "comet") return speakComet(particle);
  if (kind === "black-hole") return speakCollapse(particle, "BLACK HOLE");
  if (kind === "supernova") return speakCollapse(particle, "SUPERNOVA");
  if (kind === "wormhole") return speakWormhole(particle);
  if (kind === "ghost") {
    const mint = particleMint(particle);
    const evidence = strings(particle.metadata?.evidence);
    return [
      `GHOST. ${cosmicMeaning("ghost")}.`,
      mint ? `Token ${shortId(mint)}.` : "No token identity is attached to this trace.",
      evidence.length ? `Retained evidence: ${evidence.slice(0, 3).join("; ")}.` : "No additional historical evidence is attached in this snapshot.",
      `Observed at ${observedTime(particle.observedAt)}. No future outcome is estimated.`,
    ].join(" ");
  }
  if (kind === "moon") {
    const name = typeof particle.metadata?.name === "string" ? particle.metadata.name : "related collection";
    return `MOON. ${name}. ${cosmicMeaning("moon")}. Observed at ${observedTime(particle.observedAt)}.`;
  }

  const mint = particleMint(particle);
  const flags = Array.isArray(particle.metadata?.skyFlags)
    ? (particle.metadata?.skyFlags as string[])
    : [];
  const heatMeta = particle.metadata?.skyHeat;
  const unit = particle.metadata?.skyHeatUnit;
  const heat: FiveMinuteHeat | null =
    typeof heatMeta === "number" && (unit === "usd" || unit === "sol")
      ? { value: heatMeta, unit }
      : fiveMinuteHeat(particle, snapshot);
  const liqUsd = liquidityUsd(particle);
  const liqSol = liquiditySol(particle);
  const speech = speakObservedFacts({
    symbol: typeof particle.metadata?.symbol === "string" ? particle.metadata.symbol : null,
    name: typeof particle.metadata?.name === "string" ? particle.metadata.name : null,
    network: particle.originGalaxyId === "pons" ? "Robinhood Chain" : "Solana",
    mint,
    flags,
    liquidityUsd: liqUsd,
    heat,
    uniqueTraders: uniqueTraders(particle),
    buysM5: tapeM5(particle).buys,
    sellsM5: tapeM5(particle).sells,
    disclosure:
      typeof particle.metadata?.liqSol === "number" && liqUsd == null
        ? `Observed liquidity ${particle.metadata.liqSol} SOL.`
        : liqSol != null && liqUsd == null
          ? `Observed liquidity ${liqSol} SOL.`
          : null,
  });
  const belt = liqUsd != null || liqSol != null
    ? " Its asteroid belt represents that observed liquidity; belt size follows the observed depth."
    : " No asteroid belt is certified because liquidity is unavailable in this snapshot.";
  return `STAR. ${cosmicMeaning("star")}. ${speech}${belt}`;
}
