import type { CosmicObjectKind, GalaxyDefinition, GalaxyId } from "./types";

export const GALAXIES = [
  {
    id: "galaxy-zero",
    name: "Galaxy Zero",
    ecosystem: "A Bulls App indexed Solana field",
    status: "populated",
    seed: 861,
    accent: "var(--color-accent)",
    description: "The original living field and reference galaxy for every universe mode.",
    coverage: "Existing bounded field window",
    sources: ["synthetic-prototype"],
  },
  {
    id: "pump-fun",
    name: "pump.fun",
    ecosystem: "pump.fun launch origin",
    status: "populated",
    seed: 2205,
    accent: "var(--color-live)",
    description: "The first additional galaxy, populated from the indexed pump.fun lifecycle feed.",
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
    description:
      "Tokens proven to originate from verified PONS factory events on Robinhood Chain.",
    coverage: "Verified V1 and V2 factory launches with explicit finality",
    sources: ["Robinhood Chain RPC", "verified PONS factories"],
  },
] as const satisfies readonly GalaxyDefinition[];

export const DEFAULT_GALAXY_ID: GalaxyId = "galaxy-zero";

export const GALAXY_CHAIN_LABEL: Record<GalaxyId, string> = {
  "galaxy-zero": "SOLANA",
  "pump-fun": "SOLANA",
  pons: "ROBINHOOD CHAIN",
};

export const GALAXY_ORIGIN_CHIPS: readonly { id: GalaxyId; label: string }[] = [
  { id: "galaxy-zero", label: "ZERO" },
  { id: "pump-fun", label: "PUMP" },
  { id: "pons", label: "PONS" },
];

export const COSMOLOGY_RULES: Record<
  CosmicObjectKind,
  { readonly onChainMeaning: string; readonly visualRule: string }
> = {
  galaxy: {
    onChainMeaning: "Origin ecosystem or launchpad",
    visualRule: "Permanent launch origin",
  },
  star: {
    onChainMeaning: "Token or mint",
    visualRule: "Brightness follows liquidity and volume; color follows health",
  },
  planet: {
    onChainMeaning: "Major holder wallet",
    visualRule: "Size follows bag share; orbit follows trading frequency",
  },
  moon: {
    onChainMeaning: "Related NFT collection",
    visualRule: "Orbits its relevant planet or star",
  },
  "asteroid-belt": {
    onChainMeaning: "Liquidity pools and LP positions",
    visualRule: "Density follows liquidity depth",
  },
  comet: {
    onChainMeaning: "Near-real-time large trade",
    visualRule: "Live trajectory, never a batch-only signal",
  },
  "black-hole": {
    onChainMeaning: "Rugged or dead token",
    visualRule: "Pulls in planets as holders exit",
  },
  supernova: {
    onChainMeaning: "Fast pump-and-death cycle",
    visualRule: "Leaves a permanent discoverable scar",
  },
  wormhole: {
    onChainMeaning: "Migration or bridge event",
    visualRule: "Traversable route without changing origin",
  },
  ghost: {
    onChainMeaning: "Dormant or collapsed object",
    visualRule: "Translucent trace linked to chart evidence",
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

export function cosmicKindForEntity(kind: string): CosmicObjectKind {
  switch (kind) {
    case "token":
      return "star";
    case "wallet":
      return "planet";
    case "nft":
      return "moon";
    case "transaction":
      return "comet";
    case "cluster":
      return "asteroid-belt";
    case "program":
      return "galaxy";
    case "migration":
    case "bridge":
      return "wormhole";
    default:
      return "ghost";
  }
}

export function preserveLaunchOrigin(
  existingOrigin: GalaxyId | undefined,
  observedOrigin: GalaxyId,
): GalaxyId {
  if (existingOrigin && existingOrigin !== observedOrigin) {
    throw new Error(
      `Launch origin is immutable: ${existingOrigin} cannot become ${observedOrigin}`,
    );
  }
  return existingOrigin ?? observedOrigin;
}

export function canonicalUniverseId(
  kind: CosmicObjectKind,
  sourceId: string,
  originGalaxyId: GalaxyId,
) {
  const normalized = sourceId.trim().toLowerCase();
  if (!normalized) throw new Error("Universe identity requires a public source id");
  return kind === "planet"
    ? `planet:${normalized}`
    : `${kind}:${originGalaxyId}:${normalized}`;
}
