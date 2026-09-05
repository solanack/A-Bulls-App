export type FieldMode =
  | "explore"
  | "intelligence"
  | "query"
  | "trickster"
  | "games"
  | "compare"
  | "what-if"
  | "sequences"
  | "evidence"
  | "replay"
  | "ghost"
  | "social";

export type OrganismState =
  | "idle"
  | "listening"
  | "analyzing"
  | "speaking"
  | "complete"
  | "return";

export type Coverage = "fresh" | "stale" | "degraded" | "empty";

export type GalaxyId = "galaxy-zero" | "pump-fun";
export type GalaxyStatus = "populated" | "staging";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type GalaxyDefinition = {
  readonly id: GalaxyId;
  readonly name: string;
  readonly ecosystem: string;
  readonly status: GalaxyStatus;
  readonly seed: number;
  readonly accent: string;
  readonly description: string;
  readonly coverage: string;
  readonly sources: readonly string[];
};

export type CosmicObjectKind =
  | "galaxy"
  | "star"
  | "planet"
  | "moon"
  | "asteroid-belt"
  | "comet"
  | "black-hole"
  | "supernova"
  | "wormhole"
  | "ghost";

export type EntityKind =
  | "wallet"
  | "transaction"
  | "mint"
  | "nft"
  | "program"
  | "unknown";

export type ParticleCategory =
  | "swap"
  | "transfer"
  | "nft"
  | "staking"
  | "program"
  | "failure"
  | "unknown";

export type FieldParticle = {
  id: string;
  eventId?: string;
  kind: string;
  cosmicKind: CosmicObjectKind;
  readonly originGalaxyId: GalaxyId;
  verificationState: string;
  observedAt: number;
  category: ParticleCategory;
  magnitudeBand: number;
  position: [number, number, number];
  source?: string | null;
  slot?: number | null;
  metadata?: Record<string, JsonValue>;
};

export type FocusedParticle = {
  id: string;
  kind: string;
  cosmicKind: CosmicObjectKind;
  originGalaxyId: GalaxyId;
  category: ParticleCategory;
  observedAt: number;
  verificationState: string;
  magnitudeBand: number;
  eventId?: string;
  source?: string | null;
  slot?: number | null;
  metadata?: Record<string, JsonValue>;
};

export type ReplayState = {
  active: boolean;
  status: "paused" | "playing" | "complete";
  cursor: number;
  windowStart: number;
  windowEnd: number;
  visibleEventCount: number;
  totalEventCount: number;
  samplingPolicy: string;
  coverageStatement: string;
  sources: readonly string[];
};

export type EvidenceRecord = {
  eventId: string;
  kind: string;
  cosmicKind: CosmicObjectKind;
  category: ParticleCategory;
  originGalaxyId: GalaxyId;
  observedAt: number;
  verificationState: string;
  magnitudeBand: number;
  sources: readonly string[];
  samplingPolicy: string;
  coverageStatement: string;
  chartStatus: "available" | "unavailable";
  chartReason: string | null;
  source?: string | null;
  slot?: number | null;
  signature?: string | null;
  wallet?: string | null;
  mint?: string | null;
  metadata?: Record<string, JsonValue>;
};

export type UniverseSnapshot = {
  galaxyId: GalaxyId;
  windowStart: number;
  windowEnd: number;
  observedEventCount: number;
  samplingPolicy: string;
  coverageStatement: string;
  sources: readonly string[];
  particles: readonly FieldParticle[];
};

export type CameraState = {
  yaw: number;
  pitch: number;
  distance: number;
  target: [number, number, number];
};

export type IntelligenceResult = {
  ok: boolean;
  kind: EntityKind;
  query: string;
  shortId: string;
  coverage: Coverage;
  observedAt: string;
  label: string;
  facts: string[];
  spokenText: string;
  disclosure: string | null;
  source: string | null;
};

export const CATEGORY_COLORS: Record<ParticleCategory, [number, number, number]> =
  {
    swap: [0.42, 0.18, 1],
    transfer: [0.08, 0.82, 0.96],
    nft: [1, 0.34, 0.7],
    staking: [0.3, 1, 0.54],
    program: [1, 0.72, 0.2],
    failure: [1, 0.2, 0.2],
    unknown: [0.72, 0.72, 0.8],
  };

export const CATEGORY_INDEX: Record<ParticleCategory, number> = {
  swap: 0,
  transfer: 1,
  nft: 2,
  staking: 3,
  program: 4,
  failure: 5,
  unknown: 6,
};

export const SOLANA_SKIN: [number, number, number][] = [
  [0.42, 0.18, 1.0],
  [0.55, 0.2, 0.92],
  [1.0, 0.34, 0.7],
  [0.08, 0.82, 0.96],
  [0.18, 0.95, 0.78],
  [0.3, 1.0, 0.54],
  [0.22, 0.1, 0.48],
  [0.04, 0.28, 0.34],
];

export const DOCK: { id: FieldMode; label: string }[] = [
  { id: "explore", label: "FIELD" },
  { id: "intelligence", label: "INTELLIGENCE" },
  { id: "query", label: "QUERY" },
  { id: "trickster", label: "CREATE" },
  { id: "games", label: "GAMES" },
];

export const ANALYSIS_MODES: { id: FieldMode; label: string }[] = [
  { id: "replay", label: "REPLAY" },
  { id: "evidence", label: "EVIDENCE" },
  { id: "compare", label: "COMPARE" },
  { id: "what-if", label: "WHAT-IF" },
  { id: "sequences", label: "SEQUENCES" },
  { id: "ghost", label: "GHOST" },
];

export const MODE_HINT: Record<FieldMode, string> = {
  explore: "INTELLIGENCE IS VISIBLE. THE FUTURE IS PARTICLE.",
  intelligence: "Inspect verified activity. Facts only.",
  query: "Paste a public identifier. ASK wakes the Field.",
  trickster: "Compose a data story. Every claim keeps its receipt.",
  games: "Learn from narrated, indexed events. No scores. No missions.",
  compare: "Compare evidence side by side.",
  "what-if": "Simulate from observed evidence. Estimates stay labeled.",
  sequences: "Discover bounded market sequences.",
  evidence: "Verify sources, coverage, and original chain time.",
  replay: "Play, pause, and step through chain time.",
  ghost: "See the indexed counterfactual portfolio. Estimates stay labeled.",
  social: "Follow evidence, creators, wallets, tokens, and galaxies without connecting a wallet.",
};
