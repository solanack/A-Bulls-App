export type FieldMode =
  | "explore"
  | "intelligence"
  | "index"
  | "query"
  | "trickster"
  | "games"
  | "compare"
  | "what-if"
  | "sequences"
  | "evidence"
  | "replay"
  | "ghost"
  | "social"
  | "observatory"
  | "watchlist";

export type OrganismState = "idle" | "listening" | "analyzing" | "speaking" | "complete" | "return";
export type Coverage = "fresh" | "stale" | "degraded" | "empty";
export type GalaxyId = "galaxy-zero" | "fomo" | "afterbell" | "solana-core" | "pump-fun" | "pons";
export type GalaxyStatus = "populated" | "staging";
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type GalaxyDefinition = { readonly id: GalaxyId; readonly name: string; readonly ecosystem: string; readonly status: GalaxyStatus; readonly seed: number; readonly accent: string; readonly description: string; readonly coverage: string; readonly sources: readonly string[]; };
export type CosmicObjectKind = "galaxy" | "star" | "planet" | "moon" | "asteroid-belt" | "comet" | "black-hole" | "supernova" | "wormhole" | "ghost" | "dust";
export type EntityKind = "wallet" | "transaction" | "mint" | "nft" | "program" | "unknown";
export type ParticleCategory = "galaxy" | "swap" | "transfer" | "nft" | "staking" | "program" | "failure" | "unknown";

export type FieldParticle = { id: string; eventId?: string; kind: string; cosmicKind: CosmicObjectKind; readonly originGalaxyId: GalaxyId; verificationState: string; observedAt: number; category: ParticleCategory; magnitudeBand: number; position: [number, number, number]; source?: string | null; slot?: number | null; metadata?: Record<string, JsonValue>; };
export type FocusedParticle = { id: string; kind: string; cosmicKind: CosmicObjectKind; originGalaxyId: GalaxyId; category: ParticleCategory; observedAt: number; verificationState: string; magnitudeBand: number; eventId?: string; source?: string | null; slot?: number | null; metadata?: Record<string, JsonValue>; };
export type ReplayState = { active: boolean; status: "paused" | "playing" | "complete"; cursor: number; windowStart: number; windowEnd: number; visibleEventCount: number; totalEventCount: number; samplingPolicy: string; coverageStatement: string; sources: readonly string[]; };
export type EvidenceRecord = { eventId: string; kind: string; cosmicKind: CosmicObjectKind; category: ParticleCategory; originGalaxyId: GalaxyId; observedAt: number; verificationState: string; magnitudeBand: number; sources: readonly string[]; samplingPolicy: string; coverageStatement: string; chartStatus: "available" | "unavailable"; chartReason: string | null; source?: string | null; slot?: number | null; signature?: string | null; wallet?: string | null; mint?: string | null; metadata?: Record<string, JsonValue>; };
export type UniverseSnapshot = { galaxyId: GalaxyId; windowStart: number; windowEnd: number; observedEventCount: number; samplingPolicy: string; coverageStatement: string; sources: readonly string[]; particles: readonly FieldParticle[]; };
export type CameraState = { yaw: number; pitch: number; distance: number; target: [number, number, number]; };
export type IntelligenceResult = { ok: boolean; kind: EntityKind; query: string; shortId: string; coverage: Coverage; observedAt: string; label: string; facts: string[]; spokenText: string; disclosure: string | null; source: string | null; };

export type FieldSection =
  | { kind: "galaxy"; label: string; count: number }
  | { kind: "token-system"; label: string; mint: string; count: number }
  | { kind: "trader-system"; label: string; handle: string; wallet: string | null; count: number }
  | { kind: "wallet-system"; label: string; wallet: string; count: number }
  | { kind: "observatory"; label: string; count: number }
  | { kind: "watchlist"; label: string; count: number };

export const CATEGORY_COLORS: Record<ParticleCategory, [number, number, number]> = { galaxy: [0.76, 0.84, 1], swap: [0.42, 0.18, 1], transfer: [0.08, 0.82, 0.96], nft: [1, 0.34, 0.7], staking: [0.3, 1, 0.54], program: [1, 0.72, 0.2], failure: [1, 0.2, 0.2], unknown: [0.72, 0.72, 0.8] };
export const CATEGORY_INDEX: Record<ParticleCategory, number> = { galaxy: 0, swap: 1, transfer: 2, nft: 3, staking: 4, program: 5, failure: 6, unknown: 6 };
export const SOLANA_SKIN: [number, number, number][] = [[0.42,0.18,1],[0.55,0.2,0.92],[1,0.34,0.7],[0.08,0.82,0.96],[0.18,0.95,0.78],[0.3,1,0.54],[0.22,0.1,0.48],[0.04,0.28,0.34]];

export const DOCK: { id: FieldMode; label: string }[] = [
  { id: "explore", label: "FIELD" }, { id: "intelligence", label: "INTELLIGENCE" }, { id: "query", label: "QUERY" }, { id: "trickster", label: "Make a Cut" }, { id: "games", label: "GAMES" },
];
/** Slim demo primary (≤4): Cut climax first, then Replay → Evidence → Field. What-If/Compare stay in ADVANCED_MODES. */
export const ANALYSIS_MODES: { id: FieldMode; label: string }[] = [
  { id: "trickster", label: "Make a Cut" },
  { id: "replay", label: "Replay" },
  { id: "evidence", label: "Evidence" },
  { id: "explore", label: "Field" },
];
export const ADVANCED_MODES: { id: FieldMode; label: string }[] = [
  { id: "what-if", label: "What-If" },
  { id: "compare", label: "Compare" },
  { id: "sequences", label: "Sequences" },
  { id: "ghost", label: "Ghost" },
];
export const TOOL_TITLE: Partial<Record<FieldMode, string>> = {
  trickster: "Make a Cut",
  replay: "Watch this trade on the chart",
  evidence: "Receipts for this trade",
  compare: "Compare two traders side by side",
  "what-if": "What if you held instead?",
};
export const MODE_HINT: Record<FieldMode, string> = {
  explore: "Return to the Field.",
  intelligence: "Inspect verified activity. Facts only.",
  index: "Search the permanent research archive and jump between indexed evidence and the Field.",
  query: "Paste a public identifier. ASK wakes the Field.",
  trickster: "Share the story with receipts",
  games: "Learn from narrated, indexed events. No scores. No missions.",
  compare: "Compare two traders side by side",
  "what-if": "What if you held instead?",
  sequences: "Discover bounded market sequences.",
  evidence: "Receipts for this trade",
  replay: "Watch this trade on the chart",
  ghost: "See the indexed counterfactual portfolio. Estimates stay labeled.",
  social: "Follow evidence, creators, wallets, tokens, and galaxies without connecting a wallet.",
  observatory: "Open the Fomo Galaxy and study its cached all-time trader stars. No copy trading.",
  watchlist: "Your saved token planets and wallet stars. Local-first and read-only.",
};
