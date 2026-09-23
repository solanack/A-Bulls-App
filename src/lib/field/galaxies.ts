import type { CosmicObjectKind, GalaxyDefinition, GalaxyId } from "./types";
import { mintKey } from "./watchlist.ts";

const GALAXY_REGISTRY = [
  {id:"galaxy-zero",name:"Galaxy Zero",ecosystem:"A Bulls App universe map",status:"populated",seed:861,accent:"var(--color-accent)",description:"The navigable research universe containing Fomo, Afterbell, universal search, Replay, and evidence.",coverage:"Spatial directory; no raw chain events",sources:["a-bulls-galaxy-directory"]},
  {id:"fomo",name:"Fomo",ecosystem:"Trader research galaxy",status:"populated",seed:1299,accent:"#6f80ff",description:"The cached Fomo all-time top 50 become public-wallet stars. Enter a trader to study mapped token positions and retained trade evidence.",coverage:"fomoapi.io all-time leaderboard as reported + retained A Bulls App public-chain evidence",sources:["fomoapi.io","A Bulls App indexed public-chain evidence"]},
  {id:"afterbell",name:"Afterbell",ecosystem:"Tokenized equities research galaxy",status:"populated",seed:1974,accent:"#ead49a",description:"The tokenized-stock trader galaxy. Enter to see ranked public-wallet STARS observed trading supported Solana xStocks after the closing bell, then descend into their stock PLANETS and retained trade COMETS.",coverage:"A Bulls App indexed Solana after-close trade evidence + separately labeled venue-reported xStock market context",sources:["DexScreener venue-reported","A Bulls App indexed Solana evidence"]},
  {id:"solana-core",name:"Solana Core",ecosystem:"Internal Solana provenance",status:"staging",seed:861,accent:"var(--color-accent)",description:"Compatibility provenance for generic Solana evidence. It is not a public Galaxy Zero destination.",coverage:"Internal compatibility provenance",sources:["Solana RPC","Helius indexed history","DexScreener"]},
  {id:"pump-fun",name:"pump.fun",ecosystem:"Legacy pump.fun launch origin",status:"staging",seed:2205,accent:"var(--color-live)",description:"Retired public galaxy. The id remains only for historical launch-origin provenance and old research objects.",coverage:"Historical provenance only",sources:["A Bulls App retained evidence"]},
  {id:"pons",name:"PonsFamily",ecosystem:"Legacy PONS provenance",status:"staging",seed:4663,accent:"#c7f05f",description:"Retired public galaxy. The id remains only for historical compatibility and retained research objects.",coverage:"Historical provenance only",sources:["A Bulls App retained evidence"]},
] as const satisfies readonly GalaxyDefinition[];

export const GALAXIES = GALAXY_REGISTRY.filter(item=>item.id==="galaxy-zero"||item.id==="fomo"||item.id==="afterbell") as readonly GalaxyDefinition[];
export const DEFAULT_GALAXY_ID: GalaxyId = "galaxy-zero";

export const GALAXY_CHAIN_LABEL: Record<GalaxyId, string> = {"galaxy-zero":"UNIVERSE MAP",fomo:"TRADER RESEARCH",afterbell:"SOLANA TOKENIZED EQUITIES","solana-core":"SOLANA","pump-fun":"SOLANA",pons:"ROBINHOOD CHAIN"};
export const GALAXY_ORIGIN_CHIPS: readonly { id: GalaxyId; label: string }[] = [{id:"galaxy-zero",label:"ZERO"},{id:"fomo",label:"FOMO"},{id:"afterbell",label:"AFTERBELL"}];

export const COSMOLOGY_RULES: Record<CosmicObjectKind,{readonly onChainMeaning:string;readonly visualRule:string}> = {
  galaxy:{onChainMeaning:"Research ecosystem or launch-origin lens",visualRule:"Largest durable body; Fomo and Afterbell are research lenses while token PLANETS retain their true launch origin"},
  star:{onChainMeaning:"Public wallet / observed holder or trader",visualRule:"Bright public-wallet body around token PLANETS or inside trader-first galaxies; size follows observed/provider-ranked relationship only when disclosed"},
  planet:{onChainMeaning:"Token or mint",visualRule:"Major navigable world; touch to inspect its local holder/trader sky"},
  moon:{onChainMeaning:"Related NFT collection",visualRule:"Small body orbiting the relevant token planet"},
  "asteroid-belt":{onChainMeaning:"Liquidity pools and LP positions",visualRule:"Wide ring around a token planet; radius/density follow observed liquidity depth"},
  comet:{onChainMeaning:"Near-real-time large trade",visualRule:"Elongated live trajectory with a bright head and fading tail"},
  "black-hole":{onChainMeaning:"Rugged or dead token",visualRule:"Collapsed token world with dark center and visible accretion ring; requires indexed collapse evidence"},
  supernova:{onChainMeaning:"Fast pump-and-death cycle",visualRule:"Large radial burst leaving a permanent discoverable historical scar"},
  wormhole:{onChainMeaning:"Migration or bridge event",visualRule:"Large portal ring; token planet keeps immutable launch origin"},
  ghost:{onChainMeaning:"Dormant or collapsed historical trace",visualRule:"Faint translucent trace linked to indexed historical evidence"},
  dust:{onChainMeaning:"No on-chain meaning — decorative field fabric only",visualRule:"Tiny subdued background point; never interactive market evidence"},
};

export function getGalaxy(id:GalaxyId):GalaxyDefinition{const galaxy=GALAXY_REGISTRY.find(candidate=>candidate.id===id);if(!galaxy)throw new Error(`Unknown galaxy: ${id}`);return galaxy;}
export function isPopulatedGalaxy(id:GalaxyId){return getGalaxy(id).status==="populated";}
export const GALAXY_CONTENT=Object.freeze({
  "galaxy-zero":Object.freeze({durable:["galaxy"],transient:[],excludes:["wallet","transaction","mint","nft","program"]}),
  fomo:Object.freeze({durable:["wallet","token"],transient:["trade"],excludes:["program","nft"]}),
  afterbell:Object.freeze({durable:["token","wallet"],transient:["trade"],excludes:["program","nft"]}),
  "solana-core":Object.freeze({durable:["token","wallet","program"],transient:["transaction"],excludes:[]}),
  "pump-fun":Object.freeze({durable:["token","wallet","liquidity-pool"],transient:["trade","launch","migration"],excludes:["nft"]}),
  pons:Object.freeze({durable:["token","wallet","liquidity-pool"],transient:["trade","launch"],excludes:["nft"]}),
} satisfies Record<GalaxyId,{readonly durable:readonly string[];readonly transient:readonly string[];readonly excludes:readonly string[]}>);

export function cosmicKindForEntity(kind:string):CosmicObjectKind{switch(kind){case"token":case"mint":return"planet";case"wallet":case"holder":case"trader":return"star";case"nft":case"collection":return"moon";case"transaction":case"trade":case"large-trade":return"comet";case"cluster":case"liquidity-pool":case"lp-position":return"asteroid-belt";case"program":case"launchpad":return"galaxy";case"migration":case"bridge":return"wormhole";case"rugged":case"dead-token":return"black-hole";case"pump-death":case"supernova":return"supernova";case"dormant":case"collapsed-trace":return"ghost";default:return"dust";}}
export function preserveLaunchOrigin(existingOrigin:GalaxyId|undefined,observedOrigin:GalaxyId):GalaxyId{if(existingOrigin&&existingOrigin!==observedOrigin)throw new Error(`Launch origin is immutable: ${existingOrigin} cannot become ${observedOrigin}`);return existingOrigin??observedOrigin;}
export function canonicalUniverseId(kind:CosmicObjectKind,sourceId:string,originGalaxyId:GalaxyId){const normalized=mintKey(sourceId);if(!normalized)throw new Error("Universe identity requires a public source id");return kind==="star"?`star:${normalized}`:`${kind}:${originGalaxyId}:${normalized}`;}
