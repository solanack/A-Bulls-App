import { createServerFn } from "@tanstack/react-start";
import type { Coverage, EntityKind, IntelligenceResult } from "@/lib/field/types";
import { shortId } from "@/lib/field/hash";

const WORKER = "https://black-bull-run-sol.ckdsigns1.workers.dev";

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
  readOnly?: boolean;
  disclosure?: string | null;
  coverage?: Coverage;
  cache?: "fresh" | "stale" | "miss";
  budget?: {
    blocked?: boolean;
    unitsSpent?: number;
    monthlyLimit?: number;
    circuitBreakerRatio?: number;
  } | null;
  context?: {
    signers?: string[];
    tokenMints?: string[];
    accountCount?: number;
    instructionCount?: number;
  };
  error?: string;
};

function classifyKind(label: string, parsedType?: string, executable?: boolean): EntityKind {
  const l = label.toLowerCase();
  if (l.includes("transaction")) return "transaction";
  if (l.includes("nft")) return "nft";
  if (l.includes("mint") || parsedType === "mint") return "mint";
  if (l.includes("program") || executable) return "program";
  if (l.includes("wallet") || l.includes("system") || l.includes("account")) return "wallet";
  return "unknown";
}

function lamportsToSol(lamports: number) {
  return (lamports / 1_000_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
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

export const resolvePublicIdentifier = createServerFn({ method: "POST" })
  .validator((input: { query: string }) => input)
  .handler(async ({ data }): Promise<IntelligenceResult> => {
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

    let body: ResolveBody;
    try {
      const res = await fetch(
        `${WORKER}/api/intelligence/field/resolve?query=${encodeURIComponent(query)}`,
        { headers: { accept: "application/json" }, cache: "no-store" },
      );
      body = (await res.json()) as ResolveBody;
    } catch {
      body = { ok: false, state: "not-found", error: "resolver_unavailable" };
    }
    const forcedCoverage = body.coverage ?? null;
    const budgetDisclosure =
      body.cache === "fresh"
        ? "Served from the Intelligence Worker cache."
        : body.cache === "stale"
          ? "Served from stale Intelligence Worker evidence; no live provider request was issued."
          : body.budget?.blocked
            ? "The Intelligence Worker provider circuit breaker is active."
            : null;

    const extra: string[] = [];
    const kind = classifyKind(body.label || "", body.parsedType, body.executable);

    const coverage =
      forcedCoverage ??
      (body.error === "resolver_unavailable" ? "degraded" : coverageFrom(body));
    if (coverage === "degraded" && !body.ok) {
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

    const spoken = speakFromResolve(query, body, extra);
    return {
      ok: Boolean(body.ok && body.state !== "not-found"),
      kind,
      query,
      shortId: shortId(body.address || body.signature || query),
      coverage,
      observedAt,
      label: body.label || "unknown",
      facts: factsFromResolve(body, extra),
      spokenText: spoken,
      disclosure: [body.disclosure, budgetDisclosure].filter(Boolean).join(" · ") || null,
      source: body.source ?? null,
    };
  });
