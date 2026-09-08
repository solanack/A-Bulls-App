/** Field v0 adapter. Legacy producer names stay stable, but cosmology is:
 * token snapshot -> PLANET; wallet snapshot -> STAR.
 * Evidence-only: incomplete lifecycle signals stay omitted/labeled.
 */
import type { CosmicObjectKind, FieldParticle, GalaxyId, ParticleCategory, UniverseSnapshot } from "./types";
import { canonicalUniverseId, preserveLaunchOrigin } from "./galaxies.ts";

export const FIELD_V0_VERSION = 1 as const;
export type FieldV0Envelope = { readonly v: typeof FIELD_V0_VERSION; readonly chain: "solana"; readonly ts: number; readonly source: "helius" | "pumpfun" | "derived"; readonly mint: string; readonly sig: string | null; };
export type FieldV0TradeEvent = FieldV0Envelope & { readonly type: "token.trade"; readonly side: "buy" | "sell"; readonly wallet: string; readonly solAmount: number; readonly tokenAmount: number; readonly priceSol: number; readonly slot: number; };
export type FieldV0BirthEvent = FieldV0Envelope & { readonly type: "token.birth"; readonly creator: string; readonly name?: string; readonly symbol?: string; readonly uri?: string; readonly bondingCurve?: string; };
export type FieldV0GraduatedEvent = FieldV0Envelope & { readonly type: "token.graduated" | "token.migrated"; readonly from: string; readonly to: string; readonly pool: string; };
export type FieldV0DyingEvent = FieldV0Envelope & { readonly type: "token.dying"; readonly reason: readonly ("liquidity_drain" | "activity_collapse" | "holder_decay")[]; readonly score: number; readonly metrics?: { readonly uniqueTraders24h?: number; readonly volumeSol24h?: number; readonly holderDelta24h?: number; readonly liqSol?: number; }; readonly evidence?: readonly string[]; readonly incomplete?: boolean; };
export type FieldV0HolderExitEvent = FieldV0Envelope & { readonly type: "holder.exit"; readonly wallet: string; readonly soldAmount: number; readonly solReceived: number; readonly remainingPct: number; readonly isFullExit: boolean; };
export type FieldV0Event = FieldV0TradeEvent | FieldV0BirthEvent | FieldV0GraduatedEvent | FieldV0DyingEvent | FieldV0HolderExitEvent;

/** Producer contract name retained for compatibility: this is a TOKEN snapshot -> PLANET. */
export type FieldV0StarSnapshot = { readonly mint: string; readonly symbol?: string; readonly name?: string; readonly state: "birth" | "active" | "graduating" | "migrated" | "dying"; readonly visualDrivers?: { readonly score?: number; readonly volumeSol24h?: number; readonly uniqueTraders24h?: number; readonly liqSol?: number; readonly holderDelta24h?: number; }; readonly lastTrade?: { readonly side: "buy" | "sell"; readonly priceSol: number; readonly ts: number; } | null; readonly wormhole?: { readonly from: string; readonly to: string; readonly pool: string; } | null; readonly incomplete?: boolean; };
/** Producer contract name retained for compatibility: this is a WALLET snapshot -> STAR. */
export type FieldV0PlanetSnapshot = { readonly wallet: string; readonly linkedMints: readonly string[]; readonly exits?: readonly { readonly mint: string; readonly remainingPct: number; readonly isFullExit: boolean; readonly solReceived?: number; readonly ts: number; }[]; readonly netSolDelta24h?: number; readonly incomplete?: boolean; };
export type FieldV0AdaptOptions = { readonly galaxyId?: GalaxyId; readonly windowStart?: number; readonly windowEnd?: number; };

function clamp01(value: number) { return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0)); }
function hashUnit(input: string) { let h=2166136261; for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619);} return (h>>>0)/4294967295; }
function positionForId(id: string, radiusBase=28, radiusSpan=70): [number,number,number] { const u=hashUnit(id),v=hashUnit(`${id}:y`),w=hashUnit(`${id}:z`),radius=radiusBase+u*radiusSpan,angle=v*Math.PI*2; return [Math.cos(angle)*radius,(w-.5)*64,Math.sin(angle)*radius]; }
function tokenCosmicKind(token: FieldV0StarSnapshot): CosmicObjectKind { return token.state==="dying"&&token.incomplete!==true?"black-hole":"planet"; }
function magnitudeFromDrivers(token: FieldV0StarSnapshot) { const d=token.visualDrivers;if(!d)return .35;if(token.state==="dying"&&typeof d.score==="number")return clamp01(d.score);if(typeof d.volumeSol24h==="number")return clamp01(Math.log10(1+Math.max(0,d.volumeSol24h))/4);if(typeof d.liqSol==="number")return clamp01(Math.log10(1+Math.max(0,d.liqSol))/4);return .35; }

/** Legacy function name retained: token snapshot -> PLANET / BLACK HOLE. */
export function starToParticle(token: FieldV0StarSnapshot, options: FieldV0AdaptOptions = {}): FieldParticle {
  const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId),cosmicKind=tokenCosmicKind(token),observedAt=token.lastTrade?.ts??options.windowEnd??Date.now(),incomplete=token.incomplete===true;
  return { id:canonicalUniverseId(cosmicKind,token.mint,originGalaxyId), eventId:token.lastTrade?`trade:${token.mint}:${token.lastTrade.ts}`:undefined, kind:token.state==="dying"?"dying-token":"token", cosmicKind, originGalaxyId, verificationState:incomplete?"incomplete":"observed", observedAt, category:token.lastTrade?.side==="sell"?"transfer":"swap", magnitudeBand:magnitudeFromDrivers(token), position:positionForId(token.mint), source:"indexer-field-v0", metadata:{ mint:token.mint,symbol:token.symbol??null,name:token.name??null,state:token.state,incomplete,visualDrivers:token.visualDrivers??null,volumeSol24h:token.visualDrivers?.volumeSol24h??null,uniqueTraders24h:token.visualDrivers?.uniqueTraders24h??null,liqSol:token.visualDrivers?.liqSol??null,lastTrade:token.lastTrade??null,wormhole:token.wormhole??null,fieldContract:"v0" } };
}

/** Legacy function name retained: wallet snapshot -> STAR. */
export function planetToParticle(wallet: FieldV0PlanetSnapshot, options: FieldV0AdaptOptions = {}): FieldParticle {
  const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId),exits=wallet.exits??[],latest=exits.reduce<(typeof exits)[number]|null>((best,row)=>!best||row.ts>best.ts?row:best,null),observedAt=latest?.ts??options.windowEnd??Date.now(),incomplete=wallet.incomplete===true;
  return { id:canonicalUniverseId("star",wallet.wallet,originGalaxyId), kind:"wallet", cosmicKind:"star", originGalaxyId, verificationState:incomplete?"incomplete":"observed", observedAt, category:"transfer", magnitudeBand:clamp01(exits.length/8), position:positionForId(wallet.wallet,18,55), source:"indexer-field-v0", metadata:{ wallet:wallet.wallet,linkedMints:[...wallet.linkedMints],exits:exits.map(row=>({...row})),netSolDelta24h:wallet.netSolDelta24h??null,incomplete,hasExitTrails:exits.length>0&&!incomplete,fieldContract:"v0" } };
}

export function tradeToParticle(trade: FieldV0TradeEvent, options: FieldV0AdaptOptions = {}): FieldParticle {
  const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId),sourceId=trade.sig??`${trade.mint}:${trade.ts}:${trade.wallet}`,category:ParticleCategory=trade.side==="buy"?"swap":"transfer";
  return { id:canonicalUniverseId("comet",sourceId,originGalaxyId),eventId:trade.sig??undefined,kind:"transaction",cosmicKind:"comet",originGalaxyId,verificationState:"observed",observedAt:trade.ts,category,magnitudeBand:clamp01(Math.log10(1+Math.max(0,trade.solAmount))/3),position:positionForId(sourceId,40,90),source:trade.source,slot:trade.slot,metadata:{type:trade.type,mint:trade.mint,wallet:trade.wallet,side:trade.side,solAmount:trade.solAmount,tokenAmount:trade.tokenAmount,priceSol:trade.priceSol,sig:trade.sig,fieldContract:"v0"} };
}

export function migrationToParticle(migration: FieldV0GraduatedEvent, options: FieldV0AdaptOptions = {}): FieldParticle {
  const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId),sourceId=migration.sig??`${migration.mint}:${migration.ts}:${migration.from}:${migration.to}`;
  return { id:canonicalUniverseId("wormhole",sourceId,originGalaxyId),eventId:migration.sig??undefined,kind:"migration",cosmicKind:"wormhole",originGalaxyId,verificationState:"observed",observedAt:migration.ts,category:"program",magnitudeBand:.82,position:positionForId(migration.mint),source:migration.source,metadata:{type:migration.type,mint:migration.mint,from:migration.from,to:migration.to,pool:migration.pool,sig:migration.sig,fieldContract:"v0"} };
}
export function wormholeFromStar(token: FieldV0StarSnapshot, options: FieldV0AdaptOptions = {}): FieldParticle | null { if(!token.wormhole||token.incomplete===true)return null;const observedAt=token.lastTrade?.ts??options.windowEnd;if(observedAt==null)return null;return migrationToParticle({v:FIELD_V0_VERSION,chain:"solana",ts:observedAt,source:"derived",mint:token.mint,sig:null,type:"token.migrated",from:token.wormhole.from,to:token.wormhole.to,pool:token.wormhole.pool},options); }

export function holderExitToParticle(exit: FieldV0HolderExitEvent & { incomplete?: boolean }, options: FieldV0AdaptOptions = {}): FieldParticle | null {
  if(exit.incomplete===true)return null;const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId),id=`exit:${exit.wallet}:${exit.mint}:${exit.ts}`;
  return { id,eventId:exit.sig??undefined,kind:"holder-exit",cosmicKind:"star",originGalaxyId,verificationState:"observed",observedAt:exit.ts,category:"transfer",magnitudeBand:clamp01(1-exit.remainingPct),position:positionForId(exit.wallet,18,55),source:exit.source,metadata:{type:exit.type,wallet:exit.wallet,mint:exit.mint,linkedMints:[exit.mint],soldAmount:exit.soldAmount,solReceived:exit.solReceived,remainingPct:exit.remainingPct,isFullExit:exit.isFullExit,exitTrail:true,fieldContract:"v0"} };
}
export function dyingToParticle(dying: FieldV0DyingEvent, options: FieldV0AdaptOptions = {}): FieldParticle | null { if(dying.incomplete===true)return null;const galaxyId=options.galaxyId??"pump-fun",originGalaxyId=preserveLaunchOrigin(undefined,galaxyId);return {id:canonicalUniverseId("black-hole",dying.mint,originGalaxyId),eventId:dying.sig??undefined,kind:"dying-token",cosmicKind:"black-hole",originGalaxyId,verificationState:"derived",observedAt:dying.ts,category:"failure",magnitudeBand:clamp01(dying.score),position:positionForId(dying.mint),source:dying.source,metadata:{type:dying.type,mint:dying.mint,reason:[...dying.reason],score:dying.score,metrics:dying.metrics??null,evidence:dying.evidence?[...dying.evidence]:null,incomplete:false,fieldContract:"v0"}}; }

export function buildUniverseSnapshotFromFieldV0(input: { readonly stars?: readonly FieldV0StarSnapshot[]; readonly planets?: readonly FieldV0PlanetSnapshot[]; readonly events?: readonly FieldV0Event[]; readonly options?: FieldV0AdaptOptions; }): UniverseSnapshot {
  const options=input.options??{},galaxyId=options.galaxyId??"pump-fun",particles:FieldParticle[]=[];
  for(const token of input.stars??[]){particles.push(starToParticle(token,options));const wormhole=wormholeFromStar(token,options);if(wormhole)particles.push(wormhole);}
  for(const wallet of input.planets??[])particles.push(planetToParticle(wallet,options));
  for(const event of input.events??[]){if(event.type==="token.trade")particles.push(tradeToParticle(event,options));else if(event.type==="token.graduated"||event.type==="token.migrated")particles.push(migrationToParticle(event,options));else if(event.type==="token.dying"){const p=dyingToParticle(event,options);if(p)particles.push(p);}else if(event.type==="holder.exit"){const p=holderExitToParticle(event,options);if(p)particles.push(p);}}
  const unique=new Map<string,FieldParticle>();for(const p of particles)if(!unique.has(p.id))unique.set(p.id,p);const deduped=[...unique.values()],times=deduped.map(p=>p.observedAt),windowStart=options.windowStart??(times.length?Math.min(...times):Date.now()),windowEnd=options.windowEnd??(times.length?Math.max(...times):windowStart);
  return {galaxyId,windowStart,windowEnd,observedEventCount:deduped.length,samplingPolicy:"indexer-field-v0 evidence-only; token planets + wallet stars; incomplete signals omitted or labeled",coverageStatement:deduped.length?"Field v0 adapter · evidence-backed planets/stars/events only":"Field v0 adapter · no evidence yet (honest empty)",sources:["indexer-field-v0"],particles:deduped};
}
