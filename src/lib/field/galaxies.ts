import type { CosmicObjectKind, GalaxyDefinition, GalaxyId } from "./types";
import { mintKey } from "./watchlist.ts";

export const GALAXIES = [
  {
    id: "galaxy-zero",
    name: "Galaxy Zero",
    ecosystem: "A Bulls App universe map",
    status: "populated",
    seed: 861,
    accent: "var(--color-accent)",
    description: "The navigable expanse containing every protocol galaxy, universal search, and Grey.",
    coverage: "Spatial directory; no raw chain events",
    sources: ["a-bulls-galaxy-directory"],
  },
  {
    id: "solana-core",
    name: "Solana Core",
    ecosystem: "Indexed Solana activity",
    status: "populated",
    seed: 861,
    accent: "var(--color-accent)",
    description: "Token planets hold local skies of observed wallet stars; indexed trades cross them as comets.",
    coverage: "Existing bounded Solana field window",
    sources: ["Solana RPC", "Helius indexed history", "DexScreener"],
  },
  {
    id: "pump-fun",
    name: "pump.fun",
    ecosystem: "pump.fun launch origin",
    status: "populated",
    seed: 2205,
    accent: "var(--color-live)",
    description: "Token planets from the indexed pump.fun lifecycle feed, with wallet-star and Replay evidence where retained.",
    coverage: "Indexed births, trades, graduations, migrations, and terminal states",
    sources: ["pump.fun indexed stream", "Helius indexed history"],
  },
  {
    id: "pons",
    name: "PONS",
    ecosystem: "PONS launch origin on Robinhood Chain",
    status: "populated",
    seed: 4663,
    accent: "#c7f05f",
    description: "Token planets proven to originate from verified PONS factory events on Robinhood Chain.",
    coverage: "Verified V1 and V2 factory launches with explicit finality",
    sources: ["Robinhood Chain RPC", "verified PONS factories"],
  },
] as const satisfies readonly GalaxyDefinition[];

export const DEFAULT_GALAXY_ID: GalaxyId = "galaxy-zero";

export const GALAXY_CHAIN_LABEL: Record<GalaxyId, string> = {
  "galaxy-zero": "UNIVERSE MAP",
  "solana-core": "SOLANA",
  "pump-fun": "SOLANA",
  pons: "ROBINHOOD CHAIN",
};

export const GALAXY_ORIGIN_CHIPS: readonly { id: GalaxyId; label: string }[] = [
  { id: "galaxy-zero", label: "ZERO" },
  { id: "solana-core", label: "SOLANA" },
  { id: "pump-fun", label: "PUMP" },
  { id: "pons", label: "PONS" },
];

export const COSMOLOGY_RULES: Record<
  CosmicObjectKind,
  { readonly onChainMeaning: string; readonly visualRule: string }
> = {
  galaxy: {
    onChainMeaning: "Origin ecosystem or launchpad",
    visualRule: "Largest durable body; permanent launch origin",
  },
  star: {
    onChainMeaning: "Public wallet / observed holder or trader",
    visualRule: "Bright sky body around token planets; size follows observed relationship weight when available",
  },
  planet: {
    onChainMeaning: "Token or mint",
    visualRule: "Major navigable world; touch to enter its local holder/trader sky",
  },
  moon: {
    onChainMeaning: "Related NFT collection",
    visualRule: "Small body orbiting the relevant token planet",
  },
  "asteroid-belt": {
    onChainMeaning: "Liquidity pools and LP positions",
    visualRule: "Wide ring around a token planet; radius/density follow observed liquidity depth",
  },
  comet: {
    onChainMeaning: "Near-real-time large trade",
    visualRule: "Elongated live trajectory with a bright head and fading tail",
  },
  "black-hole": {
    onChainMeaning: "Rugged or dead token",
    visualRule: "Collapsed token world with dark center and visible accretion ring; requires indexed collapse evidence",
  },
  supernova: {
    onChainMeaning: "Fast pump-and-death cycle",
    visualRule: "Large radial burst leaving a permanent discoverable historical scar",
  },
  wormhole: {
    onChainMeaning: "Migration or bridge event",
    visualRule: "Large portal ring; token planet keeps immutable launch origin",
  },
  ghost: {
    onChainMeaning: "Dormant or collapsed historical trace",
    visualRule: "Faint translucent trace linked to indexed historical evidence",
  },
  dust: {
    onChainMeaning: "No on-chain meaning — decorative field fabric only",
    visualRule: "Tiny subdued background point; never interactive market evidence",
  },
};

export function getGalaxy(id: GalaxyId): GalaxyDefinition {
  const galaxy = GALAXIES.find((candidate) => candidate.id === id);
  if (!galaxy) throw new Error(`Unknown galaxy: ${id}`);
  return galaxy;
}

export function isPopulatedGalaxy(id: GalaxyId) {
  return getGalaxy(id).status === "populated";
}

export const GALAXY_CONTENT = Object.freeze({
  "galaxy-zero": Object.freeze({ durable: ["galaxy"], transient: [], excludes: ["wallet", "transaction", "mint", "nft", "program"] }),
  "solana-core": Object.freeze({ durable: ["token", "wallet", "program"], transient: ["transaction"], excludes: [] }),
  "pump-fun": Object.freeze({ durable: ["token", "wallet", "liquidity-pool"], transient: ["trade", "launch", "migration"], excludes: ["nft"] }),
  pons: Object.freeze({ durable: ["token", "wallet", "liquidity-pool"], transient: ["trade", "launch"], excludes: ["nft"] }),
} satisfies Record<GalaxyId, { readonly durable: readonly string[]; readonly transient: readonly string[]; readonly excludes: readonly string[] }>);

export function cosmicKindForEntity(kind: string): CosmicObjectKind {
  switch (kind) {
    case "token":
    case "mint":
      return "planet";
    case "wallet":
    case "holder":
    case "trader":
      return "star";
    case "nft":
    case "collection":
      return "moon";
    case "transaction":
    case "trade":
    case "large-trade":
      return "comet";
    case "cluster":
    case "liquidity-pool":
    case "lp-position":
      return "asteroid-belt";
    case "program":
    case "launchpad":
      return "galaxy";
    case "migration":
    case "bridge":
      return "wormhole";
    case "rugged":
    case "dead-token":
      return "black-hole";
    case "pump-death":
    case "supernova":
      return "supernova";
    case "dormant":
    case "collapsed-trace":
      return "ghost";
    default:
      return "dust";
  }
}

export function preserveLaunchOrigin(
  existingOrigin: GalaxyId | undefined,
  observedOrigin: GalaxyId,
): GalaxyId {
  if (existingOrigin && existingOrigin !== observedOrigin) {
    throw new Error(`Launch origin is immutable: ${existingOrigin} cannot become ${observedOrigin}`);
  }
  return existingOrigin ?? observedOrigin;
}

export function canonicalUniverseId(
  kind: CosmicObjectKind,
  sourceId: string,
  originGalaxyId: GalaxyId,
) {
  const normalized = mintKey(sourceId);
  if (!normalized) throw new Error("Universe identity requires a public source id");
  // Public wallet identity is stable across token planets and launch galaxies.
  return kind === "star"
    ? `star:${normalized}`
    : `${kind}:${originGalaxyId}:${normalized}`;
}
