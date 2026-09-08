import type { FieldParticle, GalaxyId, JsonValue, UniverseSnapshot } from "./types.ts";
import { mintKey } from "./watchlist.ts";

export const SKY_CAP=120, LIQ_FLOOR_USD=10_000, LIQ_FLOOR_SOL=70, MAX_M5_VOL_TO_LIQ=8, MIN_UNIQUE_TRADERS=10, MIN_PAIR_AGE_MS=3*60*1000, WINDOW_5M_MAX_MS=400_000, HELIUS_MEMBERSHIP_LIMIT=10, OBSERVED_CAP=80;
export type HeatUnit="usd"|"sol";
export type FiveMinuteHeat={value:number;unit:HeatUnit};
export type SkyRole="live"|"watch"|"teaching"|"observed"|"context"|"wallpaper";
export type WatchPin={mint?:string;subjectKind?:"token"|"wallet";subjectId?:string;galaxyId?:GalaxyId};

function isRecord(value:JsonValue|undefined):value is {[key:string]:JsonValue}{return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);}
function numeric(value:JsonValue|undefined):number|null{if(typeof value==="number"&&Number.isFinite(value))return value;if(typeof value==="string"&&value.trim()&&Number.isFinite(Number(value)))return Number(value);return null;}
function nested(meta:Record<string,JsonValue>|undefined,path:string[]):JsonValue|undefined{let current:JsonValue|undefined=meta;for(const key of path){if(!isRecord(current))return undefined;current=current[key];}return current;}
function lookalikeMint(id:string):string|null{const text=id.trim();if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text)||/^0x[a-fA-F0-9]{40}$/.test(text))return text;return null;}

export function particleMint(particle:{id?:string;kind?:string;cosmicKind?:string;metadata?:Record<string,JsonValue>}|null|undefined):string|null{
  const mint=particle?.metadata?.mint;if(typeof mint==="string"&&mint.trim())return mint.trim();
  if(particle&&(particle.kind==="token"||particle.cosmicKind==="planet"||particle.cosmicKind==="black-hole"||particle.cosmicKind==="supernova")){const fromId=lookalikeMint(String(particle.id??""));if(fromId)return fromId;}
  return null;
}

/** Accept legacy producer labels while exposing only the approved cosmology. */
export function normalizeParticleCosmology(particle:FieldParticle):FieldParticle{
  if(particle.kind==="token"&&particle.cosmicKind==="star")return {...particle,cosmicKind:"planet"};
  if((particle.kind==="wallet"||particle.kind==="holder-exit")&&particle.cosmicKind==="planet")return {...particle,cosmicKind:"star"};
  return particle;
}

export function flattenMarketMetadata(input:FieldParticle):FieldParticle{
  const particle=normalizeParticleCosmology(input),meta={...(particle.metadata??{})},drivers=isRecord(meta.visualDrivers)?meta.visualDrivers:null;
  const copy=(key:string,source:JsonValue|undefined)=>{if(numeric(meta[key])==null&&numeric(source)!=null)meta[key]=numeric(source) as number;};
  if(drivers){copy("volumeSol24h",drivers.volumeSol24h);copy("uniqueTraders24h",drivers.uniqueTraders24h);copy("liqSol",drivers.liqSol);}
  const mint=particleMint({...particle,metadata:meta});if(mint&&typeof meta.mint!=="string")meta.mint=mint;return {...particle,metadata:meta};
}
export function volumeM5Usd(p:FieldParticle){const m=p.metadata;return numeric(m?.volumeUsdM5)??numeric(m?.volumeM5)??numeric(nested(m,["volumeUsd","m5"]))??numeric(nested(m,["market","volumeUsd","m5"]));}
export function volumeSolWindow(p:FieldParticle){return numeric(p.metadata?.volumeSol24h)??numeric(nested(p.metadata,["visualDrivers","volumeSol24h"]))??numeric(p.metadata?.volumeSol);}
export function liquidityUsd(p:FieldParticle){return numeric(p.metadata?.liquidityUsd)??numeric(p.metadata?.liqUsd)??numeric(nested(p.metadata,["market","liquidityUsd"]));}
export function liquiditySol(p:FieldParticle){return numeric(p.metadata?.liqSol)??numeric(nested(p.metadata,["visualDrivers","liqSol"]));}
export function uniqueTraders(p:FieldParticle){return numeric(p.metadata?.uniqueTraders24h)??numeric(p.metadata?.uniqueTraders)??numeric(nested(p.metadata,["visualDrivers","uniqueTraders24h"]));}
export function tapeM5(p:FieldParticle){const m=p.metadata;return {buys:numeric(m?.buysM5)??numeric(nested(m,["transactions","m5","buys"]))??numeric(nested(m,["market","transactions","m5","buys"]))??numeric(nested(m,["activity","pressure","m5","buys"])),sells:numeric(m?.sellsM5)??numeric(nested(m,["transactions","m5","sells"]))??numeric(nested(m,["market","transactions","m5","sells"]))??numeric(nested(m,["activity","pressure","m5","sells"]))};}
export function pairCreatedAt(p:FieldParticle){return numeric(p.metadata?.pairCreatedAt)??numeric(nested(p.metadata,["market","pairCreatedAt"]));}
export function fiveMinuteHeat(p:FieldParticle,snapshot:Pick<UniverseSnapshot,"windowStart"|"windowEnd">):FiveMinuteHeat|null{const usd=volumeM5Usd(p);if(usd!=null&&usd>0)return{value:usd,unit:"usd"};if(snapshot.windowEnd-snapshot.windowStart>0&&snapshot.windowEnd-snapshot.windowStart<=WINDOW_5M_MAX_MS){const sol=volumeSolWindow(p);if(sol!=null&&sol>0)return{value:sol,unit:"sol"};}return null;}
export function formatHeat(heat:FiveMinuteHeat|null|undefined){if(!heat)return null;return heat.unit==="usd"?`5m ${heat.value.toLocaleString(undefined,{style:"currency",currency:"USD",maximumFractionDigits:heat.value<1?2:0})}`:`5m ${heat.value.toLocaleString(undefined,{maximumFractionDigits:2})} SOL`;}
export function isTeachingBody(p:FieldParticle){return p.metadata?.teaching===true||p.metadata?.skyRole==="teaching";}
function watchTokenId(pin:WatchPin){if(pin.subjectKind&&pin.subjectKind!=="token")return null;return pin.subjectId??pin.mint??null;}
function watchedToken(p:FieldParticle,watchlist:readonly WatchPin[]){const mint=particleMint(p);if(!mint)return false;const key=mintKey(mint);return watchlist.some(item=>{const id=watchTokenId(item);return Boolean(id&&mintKey(id)===key&&(!item.galaxyId||item.galaxyId===p.originGalaxyId));});}
function clamp01(v:number){return Math.min(1,Math.max(0,Number.isFinite(v)?v:0));}

export function admitPlanet(p:FieldParticle,snapshot:Pick<UniverseSnapshot,"windowStart"|"windowEnd">,now=Date.now()){
  const flags:string[]=[],heat=fiveMinuteHeat(p,snapshot);if(!heat)flags.push("missing-5m-heat");const usd=liquidityUsd(p),sol=liquiditySol(p);if(usd==null&&sol==null)flags.push("missing-liquidity");else if((usd==null||usd<LIQ_FLOOR_USD)&&(sol==null||sol<LIQ_FLOOR_SOL))flags.push("thin-liquidity");
  const traders=uniqueTraders(p),{buys,sells}=tapeM5(p);if(traders!=null&&traders<MIN_UNIQUE_TRADERS)flags.push("thin-traders");if(traders==null){if(buys==null||sells==null)flags.push("missing-traders");else if(buys<=0||sells<=0)flags.push("one-sided-tape");}else if(buys!=null&&sells!=null&&(buys<=0||sells<=0))flags.push("one-sided-tape");
  if(heat&&(usd!=null||sol!=null)){const liq=heat.unit==="usd"?usd:sol;if(liq!=null&&liq>0&&heat.value/liq>MAX_M5_VOL_TO_LIQ)flags.push("wash-like-velocity");}
  const created=pairCreatedAt(p);if(created!=null&&now-created<MIN_PAIR_AGE_MS)flags.push("young-pair");if(isTeachingBody(p))flags.push("teaching-body");const blocking=flags.some(flag=>["missing-5m-heat","missing-liquidity","thin-liquidity","thin-traders","missing-traders","one-sided-tape","wash-like-velocity","young-pair"].includes(flag));return{admitted:!blocking&&!isTeachingBody(p),flags};
}
export const admitStar=admitPlanet;
function withSkyMeta(p:FieldParticle,extra:Record<string,JsonValue>):FieldParticle{return{...p,metadata:{...(p.metadata??{}),...extra}};}

export function liquidityBeltForPlanet(planet:FieldParticle):FieldParticle|null{
  const usd=liquidityUsd(planet),sol=liquiditySol(planet);if((usd==null||usd<=0)&&(sol==null||sol<=0))return null;const mint=particleMint(planet),raw=usd!=null&&usd>0?Math.log10(1+usd)/8:Math.log10(1+(sol??0))/5;
  return{id:`liquidity:${planet.id}`,kind:"liquidity-pool",cosmicKind:"asteroid-belt",originGalaxyId:planet.originGalaxyId,verificationState:planet.verificationState,observedAt:planet.observedAt,category:"program",magnitudeBand:clamp01(raw),position:[...planet.position],source:planet.source,slot:planet.slot,metadata:{skyRole:"context",interactive:false,visualCompanion:true,visualEvidence:"indexed-liquidity",parentMint:mint,mint,liquidityUsd:usd,liqSol:sol}};
}
export const liquidityBeltForStar=liquidityBeltForPlanet;
function heatScore(heat:FiveMinuteHeat|null){return !heat?0:heat.unit==="usd"?heat.value+1e12:heat.value;}
export function isLiveSkyParticle(p:FieldParticle){const role=p.metadata?.skyRole;if(role==="wallpaper")return false;if(["live","watch","teaching","observed","context"].includes(String(role)))return true;return Boolean((particleMint(p)||typeof p.metadata?.wallet==="string")&&p.source&&p.source!=="synthetic-prototype");}
export function countLivePlanets(snapshot:UniverseSnapshot){return snapshot.particles.filter(p=>(p.cosmicKind==="planet"||p.cosmicKind==="black-hole"||p.cosmicKind==="supernova")&&p.metadata?.skyRole==="live").length;}
export const countLiveStars=countLivePlanets;

export function composeVolumeSky(input:{prototype:UniverseSnapshot;live:UniverseSnapshot|null;watchlist?:readonly WatchPin[];wallpaperLimit?:number;now?:number}):UniverseSnapshot{
  const now=input.now??Date.now(),watchlist=input.watchlist??[],live=input.live,prototype=input.prototype,galaxyId=live?.galaxyId??prototype.galaxyId,snapshotWindow=live??prototype,flattened=(live?.particles??[]).map(flattenMarketMetadata);
  const tokenPlanets=flattened.filter(p=>p.cosmicKind==="planet"),walletStars=flattened.filter(p=>p.cosmicKind==="star"),comets=flattened.filter(p=>p.cosmicKind==="comet"),other=flattened.filter(p=>p.cosmicKind!=="planet"&&p.cosmicKind!=="star"&&p.cosmicKind!=="comet");
  type Ranked={particle:FieldParticle;heat:FiveMinuteHeat|null;pin:boolean;flags:string[];admitted:boolean};const ranked:Ranked[]=[];
  for(const planet of tokenPlanets){const teaching=isTeachingBody(planet),watched=watchedToken(planet,watchlist),rank=numeric(planet.metadata?.rank),at=numeric(planet.metadata?.marketObservedAt),cap=numeric(planet.metadata?.marketCapUsd),verified=galaxyId==="pons"&&planet.metadata?.originVerified===true&&rank!=null&&rank>=1&&rank<=25&&cap!=null&&cap>=500_000,verdict=verified?{admitted:at!=null&&now-at<=900_000&&at<=now+120_000,flags:at==null||now-at>900_000?["stale-market"]:[]}:admitPlanet(planet,snapshotWindow,now),flags=[...verdict.flags];if(watched)flags.push("watch-pin");if(teaching&&!flags.includes("teaching-body"))flags.push("teaching-body");ranked.push({particle:planet,heat:fiveMinuteHeat(planet,snapshotWindow),pin:watched||teaching,flags,admitted:verdict.admitted});}
  ranked.sort((a,b)=>Number(b.pin)-Number(a.pin)||(galaxyId==="pons"?(numeric(a.particle.metadata?.rank)??26)-(numeric(b.particle.metadata?.rank)??26):heatScore(b.heat)-heatScore(a.heat)));const pinCount=ranked.filter(r=>r.pin).length,room=Math.max(SKY_CAP,pinCount),board=ranked.filter(r=>r.admitted||r.pin),chosen=board.filter((r,i)=>r.pin||i<room).slice(0,room),chosenIds=new Set(chosen.map(r=>r.particle.id));
  const skyPlanets=chosen.map(row=>{const role:SkyRole=isTeachingBody(row.particle)?"teaching":row.flags.includes("watch-pin")&&!row.admitted?"watch":"live",magnitude=row.heat?clamp01(.55+Math.log10(1+row.heat.value)/8):role==="teaching"?.82:.62;return withSkyMeta({...row.particle,magnitudeBand:Math.max(row.particle.magnitudeBand,magnitude)},{skyRole:role,skyFlags:row.flags,skyHeat:row.heat?.value??null,skyHeatUnit:row.heat?.unit??null,skyAdmitted:row.admitted});});
  const belts=skyPlanets.map(liquidityBeltForPlanet).filter((p):p is FieldParticle=>Boolean(p));const observed=ranked.filter(r=>!chosenIds.has(r.particle.id)).slice(0,OBSERVED_CAP).map(r=>withSkyMeta(r.particle,{skyRole:"observed",skyFlags:r.flags,skyHeat:r.heat?.value??null,skyHeatUnit:r.heat?.unit??null,skyAdmitted:false}));const liveComets=comets.sort((a,b)=>b.observedAt-a.observedAt).slice(0,40).map(p=>withSkyMeta(p,{skyRole:"live"}));const liveWalletStars=walletStars.slice(0,80).map(p=>withSkyMeta(p,{skyRole:"live"}));const liveOther=other.slice(0,30).map(p=>withSkyMeta(p,{skyRole:"live"}));
  const liveParticles=[...skyPlanets,...belts,...observed,...liveComets,...liveWalletStars,...liveOther],liveIds=new Set(liveParticles.map(p=>p.id)),budget=Math.max(1,input.wallpaperLimit??2800),wallpaper=prototype.particles.filter(p=>!liveIds.has(p.id)).slice(0,Math.max(0,budget-liveParticles.length)).map(p=>withSkyMeta(p,{skyRole:"wallpaper"})),particles=[...liveParticles,...wallpaper].slice(0,budget),times=particles.map(p=>p.observedAt),windowStart=live?.windowStart??(times.length?Math.min(...times):now),windowEnd=live?.windowEnd??(times.length?Math.max(...times):now),liveCount=countLivePlanets({...prototype,particles:liveParticles});
  return{galaxyId,windowStart,windowEnd,observedEventCount:live?.observedEventCount??0,samplingPolicy:galaxyId==="pons"?"PONS verified market-cap top 25; $500,000 floor; stale observations flagged; token watch pins":`volume-sky-5m-only cap ${SKY_CAP}; wash gates; token watch pins; Helius membership stays ${HELIUS_MEMBERSHIP_LIMIT}`,coverageStatement:galaxyId==="galaxy-zero"?prototype.coverageStatement:`${live?.coverageStatement??prototype.coverageStatement} ${galaxyId==="pons"?"Market-cap ranking":"5m market activity"} · ${liveCount} current token planets. Wallet stars are observed relationships, not identity claims.`,sources:[...new Set([...(live?.sources??[]),...prototype.sources,"volume-sky-5m"])],particles};
}
