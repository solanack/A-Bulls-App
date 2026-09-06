import type { Coverage, EntityKind, IntelligenceResult } from "@/lib/field/types";
import { shortId } from "@/lib/field/hash";

const WORKER = "https://abullsapp.com";

type ResolveBody = {
  ok?: boolean;
  kind?: string;
  address?: string;
  signature?: string;
  state?: string;
  label?: string;
  owner?: string;
  executable?: boolean;
  parsedType?: string;
  lamports?: number;
  slot?: number;
  feeLamports?: number;
  failed?: boolean;
  blockTime?: number;
  source?: string;
  coverage?: Coverage;
  cache?: string;
  readOnly?: boolean;
  disclosure?: string | null;
  context?: {
    signers?: string[];
    tokenMints?: string[];
    accountCount?: number;
    instructionCount?: number;
  };
  chainId?: number;
  network?: string;
  pons?: {
    verified?: boolean;
    rank?: number | null;
    factory?: string | null;
    factoryVersion?: string | null;
    deployer?: string | null;
    pool?: string | null;
    transactionHash?: string | null;
  };
  market?: {
    symbol?: string | null;
    name?: string | null;
    priceUsd?: number | null;
    marketCapUsd?: number | null;
    fdvUsd?: number | null;
    liquidityUsd?: number | null;
    volumeUsd?: { m5?: number | null; h1?: number | null; h6?: number | null; h24?: number | null };
    priceChangePct?: { m5?: number | null; h1?: number | null; h6?: number | null; h24?: number | null };
    circulatingSupply?: number | null;
    totalSupply?: number | null;
    dexId?: string | null;
  };
  holders?: {
    count?: number | null;
    top10Pct?: number | null;
    top20Pct?: number | null;
    method?: string;
    coverage?: string;
  };
  risk?: { level?: string; statement?: string };
  error?: string;
};

function classifyKind(label: string, parsedType?: string, executable?: boolean): EntityKind {
  const l = label.toLowerCase();
  if (l.includes("transaction")) return "transaction";
  if (l.includes("nft")) return "nft";
  if (l.includes("mint") || l.includes("token") || parsedType === "mint") return "mint";
  if (l.includes("program") || executable) return "program";
  if (l.includes("wallet") || l.includes("system") || l.includes("account")) return "wallet";
  return "unknown";
}

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function usd(value: number) {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 0,
  });
}

function percent(value: number) {
  return `${value.toFixed(1)} percent`;
}

function coverageFrom(body: ResolveBody): Coverage {
  if (!body?.ok || body.state === "not-found") return "empty";
  if (body.source) return "fresh";
  return "degraded";
}

function speakFromResolve(query: string, body: ResolveBody, extra: string[] = []): string {
  const id = shortId(body.address || body.signature || query);
  if (!body?.ok || body.state === "not-found") {
    return `This identifier ending in ${id} is not covered in the public record I can see. The memory is empty, or the address has not been observed. I will not guess.`;
  }
  if (body.kind === "evm-token") {
    const market = body.market ?? {};
    const parts: string[] = [];
    const tokenName = market.symbol || market.name || `contract ending in ${id}`;
    parts.push(`I am reading ${tokenName} on Robinhood Chain.`);
    if (body.pons?.verified) {
      parts.push(`PONS launch origin is verified${body.pons.rank ? `, with galaxy rank ${body.pons.rank}` : ""}.`);
    } else {
      parts.push("This is a verified Robinhood Chain contract, but PONS launch origin is not yet verified.");
    }
    if (typeof market.marketCapUsd === "number") parts.push(`Market cap is ${usd(market.marketCapUsd)}.`);
    if (typeof market.fdvUsd === "number") parts.push(`Fully diluted valuation is ${usd(market.fdvUsd)}.`);
    if (typeof market.liquidityUsd === "number") parts.push(`Observed liquidity is ${usd(market.liquidityUsd)}.`);
    if (typeof market.volumeUsd?.h24 === "number") parts.push(`Twenty four hour volume is ${usd(market.volumeUsd.h24)}.`);
    if (typeof market.volumeUsd?.h1 === "number") parts.push(`One hour volume is ${usd(market.volumeUsd.h1)}.`);
    if (typeof body.holders?.count === "number") parts.push(`${body.holders.count.toLocaleString()} current holders were observed.`);
    if (typeof body.holders?.top10Pct === "number") parts.push(`The raw top ten hold ${percent(body.holders.top10Pct)} of supply.`);
    if (typeof body.holders?.top20Pct === "number") parts.push(`The raw top twenty hold ${percent(body.holders.top20Pct)} of supply.`);
    if (body.risk?.level === "insufficient-evidence") {
      parts.push("Trade-safety coverage is incomplete. I will not call this token safe.");
    }
    parts.push("Read only. Public-chain observations. No wallet signing and no price prediction.");
    if (body.disclosure) parts.push(body.disclosure);
    return parts.join(" ");
  }
  const parts: string[] = [];
  const kind = classifyKind(body.label || "", body.parsedType, body.executable);
  if (kind === "mint") {
    parts.push(`I am reading a public Solana token mint ending in ${id}.`);
    if (body.owner) parts.push(`Owner program ends in ${shortId(body.owner)}.`);
    if (body.parsedType) parts.push(`Parsed type: ${body.parsedType}.`);
    if (typeof body.lamports === "number") {
      parts.push(`Rent-exempt lamports at rest: ${body.lamports.toLocaleString()}.`);
    }
  } else if (kind === "transaction") {
    parts.push(`I am reading a public Solana transaction ending in ${id}.`);
    if (body.slot) parts.push(`Slot ${body.slot}.`);
    parts.push(body.failed ? "The transaction failed." : "The transaction is confirmed or observed.");
    if (typeof body.feeLamports === "number") {
      parts.push(`Fee ${body.feeLamports.toLocaleString()} lamports.`);
    }
    const signers = body.context?.signers?.length ?? 0;
    const mints = body.context?.tokenMints?.length ?? 0;
    if (signers) parts.push(`${signers} observed signer${signers === 1 ? "" : "s"}.`);
    if (mints) parts.push(`${mints} observed token mint${mints === 1 ? "" : "s"}.`);
  } else if (kind === "program") {
    parts.push(`I am reading a public Solana program ending in ${id}.`);
    parts.push("Executable: yes.");
    if (typeof body.lamports === "number") {
      parts.push(`Account lamports: ${body.lamports.toLocaleString()}.`);
    }
  } else {
    parts.push(`I am reading a public Solana ${body.label || "account"} ending in ${id}.`);
    if (body.owner) parts.push(`Owner ends in ${shortId(body.owner)}.`);
    if (typeof body.lamports === "number") {
      parts.push(`Observed balance: ${lamportsToSol(body.lamports)} SOL.`);
    }
  }
  parts.push(...extra);
  if (body.source) parts.push(`Source: ${body.source.replaceAll("-", " ")}.`);
  parts.push("Read only. Observed public-chain activity. No identity claim. No price prediction.");
  if (body.disclosure) parts.push(body.disclosure);
  return parts.join(" ");
}

function factsFromResolve(body: ResolveBody, extra: string[]): string[] {
  const facts: string[] = [];
  if (body.kind === "evm-token") {
    const market = body.market ?? {};
    facts.push(`Network · ${body.network || "Robinhood Chain"}`);
    facts.push(`PONS origin · ${body.pons?.verified ? "verified" : "not verified"}`);
    if (body.pons?.rank) facts.push(`PONS rank · ${body.pons.rank}`);
    if (market.symbol) facts.push(`Symbol · ${market.symbol}`);
    if (typeof market.marketCapUsd === "number") facts.push(`Market cap · ${usd(market.marketCapUsd)}`);
    if (typeof market.fdvUsd === "number") facts.push(`FDV · ${usd(market.fdvUsd)}`);
    if (typeof market.liquidityUsd === "number") facts.push(`Liquidity · ${usd(market.liquidityUsd)}`);
    if (typeof market.volumeUsd?.m5 === "number") facts.push(`Volume 5m · ${usd(market.volumeUsd.m5)}`);
    if (typeof market.volumeUsd?.h1 === "number") facts.push(`Volume 1h · ${usd(market.volumeUsd.h1)}`);
    if (typeof market.volumeUsd?.h6 === "number") facts.push(`Volume 6h · ${usd(market.volumeUsd.h6)}`);
    if (typeof market.volumeUsd?.h24 === "number") facts.push(`Volume 24h · ${usd(market.volumeUsd.h24)}`);
    if (typeof body.holders?.count === "number") facts.push(`Holders · ${body.holders.count.toLocaleString()}`);
    if (typeof body.holders?.top10Pct === "number") facts.push(`Raw top 10 · ${body.holders.top10Pct.toFixed(2)}%`);
    if (typeof body.holders?.top20Pct === "number") facts.push(`Raw top 20 · ${body.holders.top20Pct.toFixed(2)}%`);
    facts.push(`Risk · ${body.risk?.level || "insufficient-evidence"}`);
  }
  if (body.label) facts.push(`Label · ${body.label}`);
  if (body.parsedType) facts.push(`Parsed · ${body.parsedType}`);
  if (body.owner) facts.push(`Owner · ${shortId(body.owner)}`);
  if (typeof body.lamports === "number") facts.push(`Lamports · ${body.lamports.toLocaleString()}`);
  if (body.slot) facts.push(`Slot · ${body.slot}`);
  if (typeof body.feeLamports === "number") facts.push(`Fee · ${body.feeLamports} lamports`);
  if (body.executable) facts.push("Executable · yes");
  if (body.failed) facts.push("Status · failed");
  facts.push(...extra);
  if (body.source) facts.push(`Source · ${body.source}`);
  return facts;
}

export async function resolvePublicIdentifier({
  data,
}: {
  data: { query: string };
}): Promise<IntelligenceResult> {
    const query = String(data.query || "").trim();
    const observedAt = new Date().toISOString();
    if (!query) {
      return {
        ok: false,
        kind: "unknown",
        query,
        shortId: "",
        coverage: "empty",
        observedAt,
        label: "empty",
        facts: ["No identifier was provided."],
        spokenText:
          "I was given nothing to read. Paste a public wallet, transaction, mint, NFT, or program.",
        disclosure: null,
        source: null,
      };
    }

    let body: ResolveBody | null = null;
    let forcedCoverage: Coverage | null = null;
    let budgetDisclosure: string | null = null;
    try {
      const res = await fetch(
        `${WORKER}/api/intelligence/field/resolve?query=${encodeURIComponent(query)}`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
      body = (await res.json()) as ResolveBody;
      forcedCoverage = body.coverage ?? null;
      budgetDisclosure = body.disclosure ?? null;
      if (!res.ok && !body.error) body.error = `resolver_http_${res.status}`;
    } catch {
      body = { ok: false, state: "not-found", error: "resolver_unavailable" };
      forcedCoverage = "degraded";
      budgetDisclosure = "The Intelligence Worker could not be reached. No fallback provider request was issued.";
    }

    const extra: string[] = [];
    const kind = classifyKind(body?.label || "", body?.parsedType, body?.executable);

    const coverage =
      forcedCoverage ??
      (body?.error === "resolver_unavailable" ? "degraded" : coverageFrom(body ?? {}));
    if (coverage === "degraded" && !body?.ok) {
      return {
        ok: false,
        kind: "unknown",
        query,
        shortId: shortId(query),
        coverage,
        observedAt,
        label: "degraded",
        facts: ["The intelligence resolver could not be reached. No label was guessed."],
        spokenText:
          "The intelligence record is degraded. I could not reach the resolver. I will not invent an answer.",
        disclosure: budgetDisclosure ?? "Degraded · resolver unavailable",
        source: null,
      };
    }

    const spoken = speakFromResolve(query, body ?? {}, extra);
    return {
      ok: Boolean(body?.ok && body.state !== "not-found"),
      kind,
      query,
      shortId: shortId(body?.address || body?.signature || query),
      coverage,
      observedAt,
      label: body?.label || "unknown",
      facts: factsFromResolve(body ?? {}, extra),
      spokenText: spoken,
      disclosure: [body?.disclosure, budgetDisclosure].filter(Boolean).join(" · ") || null,
      source: body?.source ?? null,
    };
  }
