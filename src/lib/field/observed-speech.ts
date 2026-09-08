import type { FieldParticle, UniverseSnapshot } from "./types.ts";
import { fiveMinuteHeat, formatHeat, particleMint, uniqueTraders, liquidityUsd, liquiditySol, tapeM5, type FiveMinuteHeat } from "./volume-sky.ts";

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
  const liqSol = undefined;
  void liqSol;
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

export function speakObservedParticle(particle: FieldParticle, snapshot: UniverseSnapshot): string {
  const mint = particleMint(particle);
  const flags = Array.isArray(particle.metadata?.skyFlags)
    ? (particle.metadata?.skyFlags as string[])
    : [];
  if (particle.metadata?.skyRole === "wallpaper") {
    return "This is a background field marker, not a live market body. Select a live token star for observed market data.";
  }
  const heatMeta = particle.metadata?.skyHeat;
  const unit = particle.metadata?.skyHeatUnit;
  const heat: FiveMinuteHeat | null =
    typeof heatMeta === "number" && (unit === "usd" || unit === "sol")
      ? { value: heatMeta, unit }
      : fiveMinuteHeat(particle, snapshot);
  return speakObservedFacts({
    symbol: typeof particle.metadata?.symbol === "string" ? particle.metadata.symbol : null,
    name: typeof particle.metadata?.name === "string" ? particle.metadata.name : null,
    network: particle.originGalaxyId === "pons" ? "Robinhood Chain" : "Solana",
    mint,
    flags,
    liquidityUsd: liquidityUsd(particle),
    heat,
    uniqueTraders: uniqueTraders(particle),
    buysM5: tapeM5(particle).buys,
    sellsM5: tapeM5(particle).sells,
    disclosure:
      typeof particle.metadata?.liqSol === "number" && liquidityUsd(particle) == null
        ? `Observed liquidity ${particle.metadata.liqSol} SOL.`
        : liquiditySol(particle) != null && liquidityUsd(particle) == null
          ? `Observed liquidity ${liquiditySol(particle)} SOL.`
          : null,
  });
}
