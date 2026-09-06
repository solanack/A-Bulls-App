import { intelligenceDb } from './intelligence-indexer.mjs';
import { resolvePublicChainEntity } from './intelligence-entity-resolver.mjs';
import { isRobinhoodContractAddress } from './intelligence-pons-token-resolver.mjs';
import { resolveHistoryRpc } from './intelligence-history-engine.mjs';
import { ecosystemUniverseSnapshot } from './intelligence-ecosystem-universe-snapshot.mjs';
import { listUniverses } from './intelligence-ecosystem-universes.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';

const GALAXY_TO_UNIVERSE=Object.freeze({'galaxy-zero':'solana','pump-fun':'pump-fun'});
const UNIVERSE_TO_GALAXY=Object.freeze({solana:'galaxy-zero','pump-fun':'pump-fun'});
const CATEGORIES=new Set(['swap','transfer','nft','staking','program','failure','unknown']);
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>String(value??'').toLowerCase()==='true';
const clamp=value=>Math.max(0,Math.min(1,n(value)));
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const parse=value=>{try{return typeof value==='object'&&value?value:JSON.parse(String(value||'null'));}catch{return null;}};

function enabled(env={}){
  if(env.FIELD_COMPAT_ENABLED!=null)return bool(env.FIELD_COMPAT_ENABLED);
  return bool(env.UNIVERSE_ENABLED);
}

function category(value){
  const normalized=s(value).toLowerCase();
  if(CATEGORIES.has(normalized))return normalized;
  if(normalized.includes('swap')||normalized.includes('trade')||normalized.includes('buy')||normalized.includes('sell'))return'swap';
  if(normalized.includes('nft'))return'nft';
  if(normalized.includes('stake'))return'staking';
  if(normalized.includes('program'))return'program';
  if(normalized.includes('fail')||normalized.includes('error'))return'failure';
  if(normalized.includes('transfer'))return'transfer';
  return'unknown';
}

function cosmicKind(kind,metadata={}){
  const lifecycle=s(metadata.lifecycle||metadata.state||metadata.eventType).toLowerCase();
  if(/migrat|graduat|bridge/.test(lifecycle))return'wormhole';
  if(/birth|launch|ignite/.test(lifecycle))return'supernova';
  if(/dead|closed|terminal|rug/.test(lifecycle))return'black-hole';
  if(/inactive|dormant|ghost/.test(lifecycle))return'ghost';
  switch(s(kind).toLowerCase()){
    case'token':case'mint':return'star';
    case'wallet':case'account':return'planet';
    case'nft':return'moon';
    case'transaction':return'comet';
    case'cluster':return'asteroid-belt';
    case'program':return'galaxy';
    case'migration':case'bridge':return'wormhole';
    default:return'ghost';
  }
}

function position(value){
  const list=Array.isArray(value)?value:[];
  return [n(list[0]),n(list[1]),n(list[2])];
}

export function toFieldSnapshot(galaxyId,input={}){
  const id=GALAXY_TO_UNIVERSE[galaxyId]?galaxyId:'galaxy-zero';
  const particles=(Array.isArray(input.particles)?input.particles:[]).map((item,index)=>({
    id:s(item.id)||`${id}:unknown:${index}`,
    eventId:s(item.observationId||item.eventId||item.id)||`${id}:event:${index}`,
    kind:s(item.kind)||'unknown',
    cosmicKind:cosmicKind(item.kind,item.metadata),
    originGalaxyId:id,
    verificationState:s(item.verificationState)||'observed',
    observedAt:n(item.observedAt),
    category:category(item.category),
    source:s(item.source)||null,
    slot:n(item.slot)||null,
    metadata:item.metadata&&typeof item.metadata==='object'?item.metadata:{},
    magnitudeBand:clamp(item.magnitudeBand),
    position:position(item.position)
  }));
  return Object.freeze({
    galaxyId:id,
    windowStart:n(input.windowStart),
    windowEnd:n(input.windowEnd),
    observedEventCount:Math.max(0,Math.trunc(n(input.observedEventCount))),
    samplingPolicy:s(input.samplingPolicy)||'bounded indexed universe snapshot',
    coverageStatement:s(input.coverageStatement)||'No indexed observations are available.',
    sources:Object.freeze((Array.isArray(input.sources)?input.sources:[]).map(s).filter(Boolean)),
    particles:Object.freeze(particles)
  });
}

function monthKey(now=Math.floor(Date.now()/1000)){
  return new Date(now*1000).toISOString().slice(0,7);
}

function budgetPolicy(env={}){
  const monthlyLimit=Math.max(1,Math.trunc(n(env.HELIUS_MONTHLY_CREDITS||env.PUMP_MONTHLY_CREDIT_BUDGET)||1_000_000));
  const configuredRatio=n(env.HELIUS_BREAKER_RATIO)||(n(env.PUMP_BUDGET_HARD_STOP_PERCENT)/100)||.8;
  return{provider:'helius',monthlyLimit,circuitBreakerRatio:Math.max(.01,Math.min(1,configuredRatio))};
}

export async function readFieldProviderBudget(env={},now=Math.floor(Date.now()/1000)){
  const db=intelligenceDb(env),policy=budgetPolicy(env),key=monthKey(now);
  if(!db)return null;
  const row=await db.prepare('SELECT call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at FROM intelligence_provider_budget_monthly WHERE provider=? AND month_key=?').bind(policy.provider,key).first();
  const units=n(row?.credits_reserved),limit=n(row?.monthly_limit)||policy.monthlyLimit,ratio=n(row?.breaker_ratio)||policy.circuitBreakerRatio;
  return{provider:policy.provider,monthKey:key,requests:Math.trunc(n(row?.call_count)),unitsSpent:Math.trunc(units),monthlyLimit:Math.trunc(limit),circuitBreakerRatio:ratio,coverage:units>=Math.floor(limit*ratio)?'stale':'fresh',blocked:units>=Math.floor(limit*ratio),updatedAt:n(row?.updated_at)*1000};
}

async function reserveFieldProviderCredit(env={},units=1,now=Math.floor(Date.now()/1000)){
  const db=intelligenceDb(env);if(!db)return{blocked:false,budget:null};
  const result=await reserveProviderCredits(env,units,'helius',now*1000);
  const budget=await readFieldProviderBudget(env,now);
  return{blocked:result.blocked,budget};
}

async function readCache(db,key,{allowExpired=false,now=Math.floor(Date.now()/1000)}={}){
  if(!db)return null;
  const row=await db.prepare('SELECT payload_json,source,coverage,generated_at,expires_at FROM bull_intelligence_cache WHERE cache_key=?').bind(key).first();
  const value=parse(row?.payload_json);if(!row||!value)return null;
  const stale=n(row.expires_at)<=now;if(stale&&!allowExpired)return null;
  return{value,source:s(row.source),coverage:stale?'stale':s(row.coverage)||'fresh',generatedAt:n(row.generated_at),expiresAt:n(row.expires_at),stale};
}

async function writeCache(db,key,value,source,ttlSeconds,now=Math.floor(Date.now()/1000)){
  if(!db)return;
  await db.prepare('INSERT INTO bull_intelligence_cache(cache_key,payload_json,source,coverage,generated_at,expires_at) VALUES(?,?,?,\'fresh\',?,?) ON CONFLICT(cache_key) DO UPDATE SET payload_json=excluded.payload_json,source=excluded.source,coverage=excluded.coverage,generated_at=excluded.generated_at,expires_at=excluded.expires_at').bind(key,JSON.stringify(value),source,now,now+ttlSeconds).run();
}

async function resolveFieldQuery(query,env={}){
  const db=intelligenceDb(env),key=`field:resolve:${s(query).toLowerCase()}`,ttl=Math.max(10,Math.min(3600,Math.trunc(n(env.FIELD_QUERY_CACHE_TTL_SECONDS)||60)));
  let cached=await readCache(db,key);if(cached)return{...cached.value,coverage:cached.coverage,cache:'fresh'};
  const source=isRobinhoodContractAddress(query)?{name:'robinhood-chain'}:resolveHistoryRpc(env);
  let budget=null;
  if(source.name==='helius-standard-rpc'){
    const reservation=await reserveFieldProviderCredit(env,1);budget=reservation.budget;
    if(reservation.blocked){
      cached=await readCache(db,key,{allowExpired:true});
      if(cached)return{...cached.value,coverage:'stale',cache:'stale',budget,disclosure:[cached.value.disclosure,'Helius circuit breaker active; served from stale cache.'].filter(Boolean).join(' · ')};
      return{ok:false,state:'not-found',error:'provider_budget_blocked',coverage:'stale',cache:'miss',budget,readOnly:true,disclosure:'Helius circuit breaker active. No live request was issued and no cached record exists.'};
    }
  }
  try{
    const value=await resolvePublicChainEntity(query,{env});
    if(value?.ok)await writeCache(db,key,value,s(value.source)||source.name,ttl);
    return{...value,coverage:value?.coverage||(value?.ok?'fresh':'empty'),cache:'miss',budget};
  }catch(error){
    cached=await readCache(db,key,{allowExpired:true});
    if(cached)return{...cached.value,coverage:'stale',cache:'stale',budget,disclosure:[cached.value.disclosure,'Resolver unavailable; served from stale cache.'].filter(Boolean).join(' · ')};
    return{ok:false,state:'not-found',error:'resolver_unavailable',message:s(error?.message||error),coverage:'degraded',cache:'miss',budget,readOnly:true};
  }
}

function deliveryStatus(snapshot,db,budget){
  const latest=Math.max(0,...snapshot.particles.map(item=>n(item.observedAt)));
  const age=latest?Math.max(0,Math.floor(Date.now()/1000)-latest):Infinity;
  const coverage=!db?'degraded':!snapshot.particles.length?'empty':age>300?'stale':'fresh';
  return{store:db?'d1':'memory-fallback',coverage,circuitBreaker:budget,disclosure:!db?'The production Intelligence D1 binding is unavailable. No live fallback was attempted.':snapshot.particles.length?`Indexed Intelligence Worker snapshot · ${snapshot.sources.join(', ')||'stored evidence'} · no provider request made by this view.`:'The Intelligence D1 database is attached, but this galaxy has no indexed observations in the selected window. No live fallback was attempted.'};
}

export async function handleFieldCompatibilityRequest(request,env={}){
  const url=new URL(request.url),path=url.pathname;
  if(!path.startsWith('/api/intelligence/field/'))return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);
  if(!enabled(env))return json({ok:false,error:'feature_disabled'},404);
  if(path==='/api/intelligence/field/resolve'){
    const query=s(url.searchParams.get('query'));if(!query)return json({ok:false,error:'query_required'},400);
    const result=await resolveFieldQuery(query,env);
    return json(result,result.error==='provider_budget_blocked'?429:result.error==='resolver_unavailable'?503:result.ok===false?422:200);
  }
  if(path==='/api/intelligence/field/status'){
    const [universes,budget]=await Promise.all([listUniverses(env),readFieldProviderBudget(env)]);
    return json({ok:true,readOnly:true,compatVersion:'field-v1',galaxies:universes.map(item=>({...item,galaxyId:UNIVERSE_TO_GALAXY[item.universeId]||null})),budget},200,'public, max-age=15, stale-while-revalidate=60');
  }
  if(path!=='/api/intelligence/field/snapshot')return json({ok:false,error:'not_found'},404);
  const galaxyId=s(url.searchParams.get('galaxy'))||'galaxy-zero',universeId=GALAXY_TO_UNIVERSE[galaxyId];
  if(!universeId)return json({ok:false,error:'unknown_galaxy'},400);
  const windowSeconds=Math.max(10,Math.min(86400,Math.trunc(n(url.searchParams.get('window')))||60)),limit=Math.max(1,Math.min(5000,Math.trunc(n(url.searchParams.get('limit')))||2500));
  const backend=await ecosystemUniverseSnapshot(env,universeId,{windowSeconds,limit}),snapshot=toFieldSnapshot(galaxyId,backend),budget=await readFieldProviderBudget(env);
  return json({ok:true,readOnly:true,compatVersion:'field-v1',snapshot,status:deliveryStatus(snapshot,intelligenceDb(env),budget)},200,'public, max-age=2, stale-while-revalidate=10');
}

export const __fieldCompatibilityContract=Object.freeze({version:'field-v1',galaxyMap:GALAXY_TO_UNIVERSE,usesExistingIntelligenceDb:true,passiveSnapshotsUseIndexedDataOnly:true,queryCacheTable:'bull_intelligence_cache',providerBudgetTable:'intelligence_provider_budget_monthly'});
