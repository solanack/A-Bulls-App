import type { Coverage, EntityKind, IntelligenceResult } from "@/lib/field/types";
import { shortId } from "./field/hash.ts";
import { fetchIntelligence } from "./intelligence-origin.ts";

type ThesisSpeechResolution = {
  atPublishMarketCap?: number | null;
  atResolveMarketCap?: number | null;
  atPublishLiquidity?: number | null;
  atResolveLiquidity?: number | null;
  atPublishTopHolderPct?: number | null;
  atResolveTopHolderPct?: number | null;
  evidenceQuality?: string;
  resolvedAt?: number | null;
};

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
    liquidityToMarketCapPct?: number | null;
    pairCreatedAt?: number | null;
    transactions?: Record<string, { buys?: number | null; sells?: number | null }> | null;
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
  activity?: { pressure?: Record<string, { buys?: number | null; sells?: number | null; buySharePct?: number | null; buySellRatio?: number | null }> };
  launchpad?: { name?: string | null; associated?: boolean; status?: string; rank24h?: number | null; rank1h?: number | null; firstObservedAt?: number | null; evidence?: string };
  token?: { decimals?: number | null; mintAuthority?: string | null; freezeAuthority?: string | null; mintAuthorityRevoked?: boolean; freezeAuthorityRevoked?: boolean };
  creator?: { coverage?: string; address?: string | null; statement?: string };
  bundles?: { coverage?: string; statement?: string };
  smartMoney?: { coverage?: string; statement?: string };
  risk?: { level?: string; flags?: string[]; statement?: string };
  theses?: {
    coverage?: string;
    count?: number;
    records?: Array<{
      id?: string;
      claim?: string;
      status?: string;
      resolution?: ThesisSpeechResolution | null;
    }>;
  };
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
    maximumFractionDigits: value < 0.0001 ? 10 : value < 1 ? 6 : 0,
  });
}

function percent(value: number) {
  return `${value.toFixed(1)} percent`;
}

function observedAge(timestampMs: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (seconds < 3600) return `${Math.max(1, Math.floor(seconds / 60))} minutes`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
  return `${Math.floor(seconds / 86400)} days`;
}

function coverageFrom(body: ResolveBody): Coverage {
  if (!body?.ok || body.state === "not-found") return "empty";
  if (body.source) return "fresh";
  return "degraded";
}

function comparableResolutionParts(resolution: ThesisSpeechResolution): string[] {
  const parts: string[] = [];
  if (typeof resolution.atPublishMarketCap === "number" && typeof resolution.atResolveMarketCap === "number") {
    const delta = resolution.atResolveMarketCap - resolution.atPublishMarketCap;
    parts.push(`market cap ${usd(resolution.atPublishMarketCap)} to ${usd(resolution.atResolveMarketCap)}, a ${delta >= 0 ? "rise" : "fall"} of ${usd(Math.abs(delta))}`);
  }
  if (typeof resolution.atPublishLiquidity === "number" && typeof resolution.atResolveLiquidity === "number") {
    const delta = resolution.atResolveLiquidity - resolution.atPublishLiquidity;
    parts.push(`liquidity ${usd(resolution.atPublishLiquidity)} to ${usd(resolution.atResolveLiquidity)}, a ${delta >= 0 ? "rise" : "fall"} of ${usd(Math.abs(delta))}`);
  }
  if (typeof resolution.atPublishTopHolderPct === "number" && typeof resolution.atResolveTopHolderPct === "number") {
    const delta = resolution.atResolveTopHolderPct - resolution.atPublishTopHolderPct;
    parts.push(`raw top-holder concentration ${resolution.atPublishTopHolderPct.toFixed(1)} to ${resolution.atResolveTopHolderPct.toFixed(1)} percent, ${Math.abs(delta).toFixed(1)} percentage points ${delta >= 0 ? "higher" : "lower"}`);
  }
  return parts;
}

function appendThesisSpeech(parts: string[], body: ResolveBody) {
  const records = body.theses?.records ?? [];
  const count = typeof body.theses?.count === "number" ? body.theses.count : records.length;
  if (!count || !records.length) return;
  parts.push(`${count} cited claim${count === 1 ? " is" : "s are"} on record for this star.`);
  for (const record of records.slice(0, 3)) {
    const claim = String(record.claim || "").trim();
    if (claim) parts.push(`User claim: “${claim.replaceAll("“", "\"").replaceAll("”", "\"")}”`);
    const resolution = record.resolution;
    if (!resolution) {
      parts.push("A 24-hour resolution is not available yet.");
      continue;
    }
    const observed = comparableResolutionParts(resolution);
    if (observed.length) parts.push(`Observed after 24 hours: ${observed.join("; ")}. Evidence quality: ${resolution.evidenceQuality || "partial"}.`);
    else parts.push(`Observed after 24 hours: comparable market-cap, liquidity, and concentration evidence is unavailable. Evidence quality: ${resolution.evidenceQuality || "unavailable"}.`);
  }
}

export function speakFromResolve(query: string, body: ResolveBody, extra: string[] = []): string {
  const id = shortId(body.address || body.signature || query);
  if (!body?.ok || body.state === "not-found") {
    return `This identifier ending in ${id} is not covered in the public record I can see. The memory is empty, or the address has not been observed. I will not guess.`;
  }
  if (body.kind === "evm-token" || body.kind === "solana-token") {
    const market = body.market ?? {};
    const parts: string[] = [];
    const network = body.network || (body.kind === "solana-token" ? "Solana" : "Robinhood Chain");
    const tokenName = market.symbol || market.name || `token ending in ${id}`;
    parts.push(`${tokenName} on ${network}.`);
    const firstObservedAt = market.pairCreatedAt ?? body.launchpad?.firstObservedAt;
    if (body.coverage === "stale") parts.push("These are cached observations; current market data is unavailable.");
    const valuation: string[] = [];
    if (typeof market.priceUsd === "number") valuation.push(`price ${usd(market.priceUsd)}`);
    if (typeof market.marketCapUsd === "number") valuation.push(`market cap ${usd(market.marketCapUsd)}`);
    if (typeof market.fdvUsd === "number") valuation.push(`FDV ${usd(market.fdvUsd)}`);
    if (valuation.length) parts.push(`${valuation.join(", ")}.`);
    const period = typeof market.volumeUsd?.m5 === "number" || typeof market.priceChangePct?.m5 === "number" ? "m5" : "h1";
    const periodLabel = period === "m5" ? "five minutes" : "one hour";
    const movement: string[] = [];
    const change = market.priceChangePct?.[period];
    const volume = market.volumeUsd?.[period];
    if (typeof change === "number") movement.push(`${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} percent`);
    if (typeof volume === "number") movement.push(`${usd(volume)} volume`);
    if (movement.length) parts.push(`Over ${periodLabel}: ${movement.join(", ")}.`);
    const pressure = body.activity?.pressure?.[period] ?? market.transactions?.[period];
    if (typeof pressure?.buys === "number" && typeof pressure?.sells === "number") parts.push(`${pressure.buys.toLocaleString()} buys versus ${pressure.sells.toLocaleString()} sells in that window.`);
    if (typeof market.liquidityUsd === "number") parts.push(`Liquidity is ${usd(market.liquidityUsd)}${typeof market.liquidityToMarketCapPct === "number" ? `, ${market.liquidityToMarketCapPct.toFixed(1)} percent of market cap` : ""}.`);
    if (typeof body.holders?.top10Pct === "number") parts.push(`The raw top ten accounts hold ${percent(body.holders.top10Pct)} of supply.`);
    if (typeof firstObservedAt === "number") parts.push(`Market age: ${observedAge(firstObservedAt)}.`);
    if (body.launchpad?.name) parts.push(`${body.launchpad.name} status: ${body.launchpad.status || "observed"}${body.pons?.rank ? `, galaxy rank ${body.pons.rank}` : body.launchpad.rank24h ? `, twenty-four-hour rank ${body.launchpad.rank24h}` : ""}.`);
    const authorityFlags: string[] = [];
    if (body.token?.mintAuthorityRevoked === false) authorityFlags.push("mint authority active");
    if (body.token?.freezeAuthorityRevoked === false) authorityFlags.push("freeze authority active");
    if (authorityFlags.length) parts.push(`Observed flags: ${authorityFlags.join(" and ")}.`);
    else if (body.risk?.flags?.length) parts.push(`Observed flag: ${body.risk.flags[0]}.`);
    if (!valuation.length && !movement.length) parts.push("Current price and trading activity are unavailable for this token.");
    appendThesisSpeech(parts, body);
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
  if (body.kind === "evm-token" || body.kind === "solana-token") {
    const market = body.market ?? {};
    facts.push(`Network · ${body.network || (body.kind === "solana-token" ? "Solana" : "Robinhood Chain")}`);
    if (market.symbol) facts.push(`Symbol · ${market.symbol}`);
    if (typeof market.priceUsd === "number") facts.push(`Price · ${usd(market.priceUsd)}`);
    if (typeof market.marketCapUsd === "number") facts.push(`Market cap · ${usd(market.marketCapUsd)}`);
    if (typeof market.fdvUsd === "number") facts.push(`FDV · ${usd(market.fdvUsd)}`);
    if (typeof market.liquidityUsd === "number") facts.push(`Liquidity · ${usd(market.liquidityUsd)}`);
    if (typeof market.liquidityToMarketCapPct === "number") facts.push(`Liquidity / market cap · ${market.liquidityToMarketCapPct.toFixed(2)}%`);
    for (const period of ["m5", "h1", "h6", "h24"] as const) {
      const change = market.priceChangePct?.[period];
      const volume = market.volumeUsd?.[period];
      if (typeof change === "number") facts.push(`Price ${period} · ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`);
      if (typeof volume === "number") facts.push(`Volume ${period} · ${usd(volume)}`);
    }
    for (const period of ["m5", "h1", "h24"] as const) {
      const pressure = body.activity?.pressure?.[period];
      if (typeof pressure?.buys === "number" && typeof pressure?.sells === "number") facts.push(`Trades ${period} · ${pressure.buys} buys / ${pressure.sells} sells`);
      if (typeof pressure?.buySharePct === "number") facts.push(`Buy share ${period} · ${pressure.buySharePct.toFixed(1)}%`);
    }
    if (typeof body.holders?.count === "number") facts.push(`Holders · ${body.holders.count.toLocaleString()}`);
    if (typeof body.holders?.top10Pct === "number") facts.push(`Raw top 10 · ${body.holders.top10Pct.toFixed(2)}%`);
    if (typeof body.holders?.top20Pct === "number") facts.push(`Raw top 20 · ${body.holders.top20Pct.toFixed(2)}%`);
    if (body.launchpad?.name) facts.push(`Launchpad · ${body.launchpad.name} · ${body.launchpad.status || "observed"}`);
    const firstObservedAt = market.pairCreatedAt ?? body.launchpad?.firstObservedAt;
    if (typeof firstObservedAt === "number") facts.push(`Market age · ${observedAge(firstObservedAt)}`);
    if (body.pons) facts.push(`PONS origin · ${body.pons.verified ? "verified" : "not verified"}`);
    if (body.pons?.rank) facts.push(`PONS rank · ${body.pons.rank}`);
    if (body.launchpad?.rank24h) facts.push(`24h launchpad rank · ${body.launchpad.rank24h}`);
    if (typeof body.token?.mintAuthorityRevoked === "boolean") facts.push(`Mint authority · ${body.token.mintAuthorityRevoked ? "revoked" : "active"}`);
    if (typeof body.token?.freezeAuthorityRevoked === "boolean") facts.push(`Freeze authority · ${body.token.freezeAuthorityRevoked ? "revoked" : "active"}`);
    for (const flag of body.risk?.flags ?? []) facts.push(`Observed flag · ${flag}`);
    facts.push(`Risk coverage · ${body.risk?.level || "insufficient-evidence"}`);
  }
  const traderToken = body.kind === "evm-token" || body.kind === "solana-token";
  if (!traderToken) {
    if (body.label) facts.push(`Label · ${body.label}`);
    if (body.parsedType) facts.push(`Parsed · ${body.parsedType}`);
    if (body.owner) facts.push(`Owner · ${shortId(body.owner)}`);
    if (typeof body.lamports === "number") facts.push(`Lamports · ${body.lamports.toLocaleString()}`);
    if (body.slot) facts.push(`Slot · ${body.slot}`);
    if (typeof body.feeLamports === "number") facts.push(`Fee · ${body.feeLamports} lamports`);
    if (body.executable) facts.push("Executable · yes");
    if (body.failed) facts.push("Status · failed");
  }
  facts.push(...extra);
  if (body.source) facts.push(`Source · ${body.source}`);
  return facts;
}

async function attachCitedClaims(body: ResolveBody, query: string) {
  if (!body.ok || body.kind !== "solana-token") return;
  const targetId = String(body.address || query || "").trim();
  if (!targetId) return;
  try {
    const params = new URLSearchParams({ targetKind: "star", targetId, limit: "10" });
    const response = await fetchIntelligence(`/api/intelligence/theses?${params.toString()}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = await response.json() as { coverage?: string; items?: ResolveBody["theses"] extends infer _T ? unknown[] : never };
    const items = Array.isArray(payload.items) ? payload.items : [];
    body.theses = {
      coverage: payload.coverage,
      count: items.length,
      records: items.map((item) => {
        const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          id: typeof row.id === "string" ? row.id : undefined,
          claim: typeof row.claim === "string" ? row.claim : undefined,
          status: typeof row.status === "string" ? row.status : undefined,
          resolution: row.resolution && typeof row.resolution === "object" ? row.resolution as ThesisSpeechResolution : null,
        };
      }),
    };
  } catch {
    // Thesis speech is an optional D1-only layer. Market facts still answer if it is unavailable.
  }
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
      const res = await fetchIntelligence(
        `/api/intelligence/field/resolve?query=${encodeURIComponent(query)}`,
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
          "Market lookup is temporarily unavailable. Please try this token again shortly.",
        disclosure: budgetDisclosure ?? "Degraded · resolver unavailable",
        source: null,
      };
    }

    if (body) await attachCitedClaims(body, query);
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
      disclosure: [...new Set([body?.disclosure, budgetDisclosure].filter(Boolean))].join(" · ") || null,
      source: body?.source ?? null,
    };
  }
