/* PonsFamily trending membership.
 * Verified PONS launch origin is mandatory. Scheduled enrichment supplies fresh
 * market cap, 24h volume, and holder count; public galaxy reads are D1-only.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';

const PATH='/api/intelligence/pons/galaxy';
const INTERNAL='/api/intelligence/pons/rank';
const DEX_ROOT='https://api.dexscreener.com/token-pairs/v1/robinhood';
const BITQUERY_ENDPOINT='https://streaming.bitquery.io/graphql';
const ADDRESS_RE=/^0x[0-9a-f]{40}$/;
const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200,cache='no-store')=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,'x-content-type-options':'nosniff'}});
const bounded=(value,fallback,min,max)=>Math.max(min,Math.min(max,Math.trunc(n(value)||fallback)));
const all=async stmt=>{try{return(await stmt.all())?.results||[];}catch{return[];}};

export const PONS_FAMILY_CONTRACT=Object.freeze({chainId:4663,maximumMembers:50,marketCapFloorUsd:75000,minimumHolders:750,entryCycles:2,exitCycles:2,minimumCycleSeconds:900,rankMetric:'volume-h24-usd-desc',fdvFallback:false,readOnly:true,internalPath:INTERNAL});

export function buildPonsHolderCountQuery(token){
  const address=s(token).toLowerCase();if(!ADDRESS_RE.test(address))throw new Error('invalid_pons_token');
  return `query PonsFamilyHolders {\n  EVM(dataset: archive, network: robinhood) {\n    Stats: Holders(where: {Currency: {SmartContract: {is: \"${address}\"}}, Balance: {Amount: {gt: \"0\"}}}) { holders: count }\n  }\n}`;
}
async function bitquery(env,query){
  const key=s(env.PONS_BITQUERY_TOKEN||env.BITQUERY_API_TOKEN);if(!key)throw new Error('pons_bitquery_unconfigured');
  const response=await providerFetch(BITQUERY_ENDPOINT,{method:'POST',headers:{accept:'application/json','content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({query})});
  if(!response.ok)throw new Error(`pons_bitquery_http_${response.status}`);const body=await response.json();if(body?.errors?.length)throw new Error(`pons_bitquery_graphql_${s(body.errors[0]?.message)||'error'}`);return body?.data||{};
}
export function normalizePonsFamilyMarket(token,pairs=[],holderData=null,observedAt=Math.floor(Date.now()/1000)){
  const target=s(token).toLowerCase();if(!ADDRESS_RE.test(target))return null;
  const candidates=(Array.isArray(pairs)?pairs:[]).filter(pair=>s(pair?.chainId).toLowerCase()==='robinhood'&&s(pair?.baseToken?.address).toLowerCase()===target).sort((a,b)=>n(b?.liquidity?.usd)-n(a?.liquidity?.usd));
  const pair=candidates[0];if(!pair)return null;
  const holderRow=Array.isArray(holderData?.EVM?.Stats)?holderData.EVM.Stats[0]:null;
  const marketCap=Number(pair?.marketCap),volume=Number(pair?.volume?.h24),holders=Number(holderRow?.holders);
  if(!Number.isFinite(marketCap)||!Number.isFinite(volume)||!Number.isFinite(holders))return null;
  const finite=value=>value==null||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  return {token:target,symbol:s(pair?.baseToken?.symbol).slice(0,32)||null,name:s(pair?.baseToken?.name).slice(0,120)||null,marketCapUsd:marketCap,fdvUsd:finite(pair?.fdv),priceUsd:finite(pair?.priceUsd),volumeH24Usd:Math.max(0,volume),holderCount:Math.max(0,Math.trunc(holders)),liquidityUsd:finite(pair?.liquidity?.usd),pairAddress:s(pair?.pairAddress).toLowerCase()||null,dexId:s(pair?.dexId)||null,observedAt,source:'dexscreener+bitquery-holders',confidence:'provider-reported'};
}
function qualifies(item,{floor=PONS_FAMILY_CONTRACT.marketCapFloorUsd,minHolders=PONS_FAMILY_CONTRACT.minimumHolders,maxAgeSeconds=3600,now=Math.floor(Date.now()/1000)}={}){
  return Boolean(item&&item.marketCapUsd>floor&&item.holderCount>minHolders&&item.volumeH24Usd>0&&item.observedAt>=now-maxAgeSeconds&&item.observedAt<=now+120);
}
export function selectStablePonsFamily(markets=[],previous=[],options={}){
  const maximum=bounded(options.maximumMembers,50,1,50),floor=Math.max(PONS_FAMILY_CONTRACT.marketCapFloorUsd,n(options.floor)),minHolders=Math.max(PONS_FAMILY_CONTRACT.minimumHolders,n(options.minHolders)),entryCycles=bounded(options.entryCycles,2,1,10),exitCycles=bounded(options.exitCycles,2,1,10),now=bounded(options.now,Math.floor(Date.now()/1000),1,Number.MAX_SAFE_INTEGER),maxAgeSeconds=bounded(options.maxAgeSeconds,3600,900,86400);
  const fresh=(Array.isArray(markets)?markets:[]).filter(item=>qualifies(item,{floor,minHolders,maxAgeSeconds,now}));
  const marketByToken=new Map(fresh.map(item=>[item.token,item]));const priorByToken=new Map((Array.isArray(previous)?previous:[]).map(item=>[s(item.token).toLowerCase(),item]));const tokens=new Set([...priorByToken.keys(),...marketByToken.keys()]);const candidates=[];
  for(const token of tokens){const prior=priorByToken.get(token)||{},market=marketByToken.get(token),refreshed=Boolean(market)||markets.some?.(item=>item?.token===token),canAdvance=refreshed&&(!n(prior.updated_at)||now-n(prior.updated_at)>=PONS_FAMILY_CONTRACT.minimumCycleSeconds),isQualified=Boolean(market),qualifyingCycles=isQualified?(canAdvance?Math.max(0,n(prior.qualifying_cycles))+1:Math.max(0,n(prior.qualifying_cycles))):0,disqualifyingCycles=isQualified?0:(canAdvance?Math.max(0,n(prior.disqualifying_cycles))+1:Math.max(0,n(prior.disqualifying_cycles))),wasActive=n(prior.active)===1,eligible=(wasActive&&disqualifyingCycles<exitCycles)||Boolean(isQualified&&qualifyingCycles>=entryCycles);candidates.push({token,market,prior,qualifyingCycles,disqualifyingCycles,eligible,marketCapUsd:market?.marketCapUsd??n(prior.market_cap_usd),volumeH24Usd:market?.volumeH24Usd??n(prior.volume_h24_usd),holderCount:market?.holderCount??n(prior.holder_count)});}
  const byTrend=(a,b)=>b.volumeH24Usd-a.volumeH24Usd||b.holderCount-a.holderCount||b.marketCapUsd-a.marketCapUsd||a.token.localeCompare(b.token);
  const selected=candidates.filter(item=>item.eligible&&((item.market&&qualifies(item.market,{floor,minHolders,maxAgeSeconds,now}))||n(item.prior.active)===1)).sort(byTrend).slice(0,maximum),active=new Set(selected.map(item=>item.token)),ranked=new Map(selected.map((item,index)=>[item.token,index+1]));return candidates.map(item=>({...item,active:active.has(item.token),rank:ranked.get(item.token)||null}));
}

async function fetchMarket(env,token,now){
  const [dex,holders]=await Promise.all([providerFetch(`${DEX_ROOT}/${encodeURIComponent(token)}`,{headers:{accept:'application/json'}}).then(async r=>r.ok?r.json():[]),bitquery(env,buildPonsHolderCountQuery(token))]);return normalizePonsFamilyMarket(token,dex,holders,now);
}

export async function refreshPonsFamily(env={},now=Math.floor(Date.now()/1000)){
  if(!bool(env.PONS_RANK_ENABLED))return Object.freeze({enabled:false});const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const floor=Math.max(PONS_FAMILY_CONTRACT.marketCapFloorUsd,n(env.PONS_MARKET_CAP_MIN_USD)),minHolders=Math.max(PONS_FAMILY_CONTRACT.minimumHolders,n(env.PONS_MIN_HOLDERS)),maximum=bounded(env.PONS_RANK_MAX_MEMBERS,50,1,50),maxAgeSeconds=bounded(env.PONS_TRENDING_METRIC_MAX_AGE_SECONDS,3600,900,86400),enrichLimit=bounded(env.PONS_TRENDING_ENRICH_LIMIT,12,1,50);
  const launches=await all(db.prepare('SELECT token FROM pons_launches ORDER BY updated_at DESC LIMIT 1000')),prior=await all(db.prepare('SELECT * FROM pons_rank_candidates'));
  const priorBy=new Map(prior.map(row=>[s(row.token).toLowerCase(),row]));
  const queue=launches.map(row=>s(row.token).toLowerCase()).filter(token=>ADDRESS_RE.test(token)).sort((a,b)=>{const x=priorBy.get(a)||{},y=priorBy.get(b)||{};const xp=n(x.qualifying_cycles)===1?0:n(x.active)===1?1:2,yp=n(y.qualifying_cycles)===1?0:n(y.active)===1?1:2;return xp-yp||n(x.updated_at)-n(y.updated_at);}).slice(0,enrichLimit);
  const refreshed=[];for(const token of queue){try{const market=await fetchMarket(env,token,now);if(market)refreshed.push(market);else refreshed.push({token,marketCapUsd:0,volumeH24Usd:0,holderCount:0,observedAt:now,source:'market-unavailable'});}catch(error){console.error('[ponsfamily-enrich]',token,s(error?.message||error));}}
  const decisions=selectStablePonsFamily(refreshed,prior,{maximum,floor,minHolders,now,maxAgeSeconds}),snapshotId=`ponsfamily:${now}`;
  for(const decision of decisions){const market=decision.market,old=decision.prior||{},firstQualified=decision.qualifyingCycles>=2?(n(old.first_qualified_at)||now):null,lastQualified=market?now:(old.last_qualified_at??null),lastExited=n(old.active)===1&&!decision.active?now:(old.last_exited_at??null),marketObserved=market?.observedAt??n(old.market_observed_at),volumeObserved=market?.observedAt??n(old.volume_observed_at),holderObserved=market?.observedAt??n(old.holder_observed_at);
    await db.prepare(`INSERT INTO pons_rank_candidates(token,symbol,name,market_cap_usd,fdv_usd,circulating_supply,total_supply,price_usd,volume_h24_usd,holder_count,market_observed_at,volume_observed_at,holder_observed_at,market_source,market_confidence,qualifying_cycles,disqualifying_cycles,active,current_rank,first_qualified_at,last_qualified_at,last_exited_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET symbol=excluded.symbol,name=excluded.name,market_cap_usd=excluded.market_cap_usd,fdv_usd=excluded.fdv_usd,price_usd=excluded.price_usd,volume_h24_usd=excluded.volume_h24_usd,holder_count=excluded.holder_count,market_observed_at=excluded.market_observed_at,volume_observed_at=excluded.volume_observed_at,holder_observed_at=excluded.holder_observed_at,market_source=excluded.market_source,market_confidence=excluded.market_confidence,qualifying_cycles=excluded.qualifying_cycles,disqualifying_cycles=excluded.disqualifying_cycles,active=excluded.active,current_rank=excluded.current_rank,first_qualified_at=COALESCE(pons_rank_candidates.first_qualified_at,excluded.first_qualified_at),last_qualified_at=excluded.last_qualified_at,last_exited_at=excluded.last_exited_at,updated_at=excluded.updated_at`).bind(decision.token,market?.symbol??old.symbol??null,market?.name??old.name??null,market?.marketCapUsd??n(old.market_cap_usd),market?.fdvUsd??old.fdv_usd??null,old.circulating_supply??null,old.total_supply??null,market?.priceUsd??old.price_usd??null,market?.volumeH24Usd??n(old.volume_h24_usd),market?.holderCount??n(old.holder_count),marketObserved,volumeObserved,holderObserved,market?.source??(s(old.market_source)||'cached'),market?.confidence??(s(old.market_confidence)||'provider-reported'),decision.qualifyingCycles,decision.disqualifyingCycles,decision.active?1:0,decision.rank,firstQualified,lastQualified,lastExited,market?now:n(old.updated_at)||now).run();
    if(decision.active&&market&&qualifies(market,{floor,minHolders,maxAgeSeconds,now}))await db.prepare('INSERT OR REPLACE INTO pons_rank_snapshots(snapshot_id,token,rank,market_cap_usd,volume_h24_usd,holder_count,price_usd,observed_at,source) VALUES(?,?,?,?,?,?,?,?,?)').bind(snapshotId,decision.token,decision.rank,market.marketCapUsd,market.volumeH24Usd,market.holderCount,market.priceUsd,now,market.source).run();
  }
  return Object.freeze({enabled:true,verifiedLaunches:launches.length,enriched:refreshed.length,active:decisions.filter(item=>item.active).length,maximum,floor,minHolders,snapshotId});
}

export async function handlePonsFamilyRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!==PATH&&url.pathname!==INTERNAL)return null;if(!bool(env.PONS_GALAXY_ENABLED)||!bool(env.PONS_RANK_ENABLED))return json({ok:false,error:'feature_disabled'},404);
  const db=intelligenceDb(env);if(!db)return json({ok:false,error:'intelligence_db_unavailable'},503);
  if(url.pathname===PATH){if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);const floor=Math.max(PONS_FAMILY_CONTRACT.marketCapFloorUsd,n(env.PONS_MARKET_CAP_MIN_USD)),minHolders=Math.max(PONS_FAMILY_CONTRACT.minimumHolders,n(env.PONS_MIN_HOLDERS)),maxAge=bounded(env.PONS_TRENDING_METRIC_MAX_AGE_SECONDS,3600,900,86400),cutoff=Math.floor(Date.now()/1000)-maxAge;
    const rows=await all(db.prepare(`SELECT r.*,l.factory,l.factory_version,l.curve,l.deployer,l.dex_factory,l.pair_token,l.pool,l.transaction_hash,l.block_number,l.block_hash,l.block_time,l.finality,l.launch_state,l.updated_at launch_updated_at FROM pons_rank_candidates r JOIN pons_launches l ON l.token=r.token WHERE r.active=1 AND r.market_cap_usd>? AND r.holder_count>? AND r.market_observed_at>=? AND r.holder_observed_at>=? ORDER BY r.volume_h24_usd DESC,r.holder_count DESC,r.market_cap_usd DESC LIMIT 50`).bind(floor,minHolders,cutoff,cutoff));
    return json({ok:true,data:{schemaVersion:'ponsfamily-trending-v1',generatedAt:Date.now(),readOnly:true,chain:{id:4663,name:'Robinhood Chain'},selector:{maximumMembers:50,marketCapFloorUsd:floor,minimumHolders:minHolders,rankMetric:'volume-h24-usd-desc',entryCycles:2,exitCycles:2,fdvFallback:false},coverage:{complete:false,statement:`PonsFamily includes only verified PONS-origin tokens with fresh provider observations, market cap above $${floor.toLocaleString()}, and holder count above ${minHolders}. Qualifying planets are ordered by reported 24-hour volume. Missing holder or market evidence does not qualify.`},launches:rows.map(row=>({rank:n(row.current_rank),token:s(row.token),factory:s(row.factory),factoryVersion:s(row.factory_version),curve:s(row.curve)||null,deployer:s(row.deployer),dexFactory:s(row.dex_factory)||null,pairToken:s(row.pair_token),pool:s(row.pool)||null,transactionHash:s(row.transaction_hash),blockNumber:n(row.block_number),blockHash:s(row.block_hash),blockTime:row.block_time==null?null:n(row.block_time)*1000,finality:s(row.finality),state:s(row.launch_state)||'launched',market:{symbol:s(row.symbol)||null,name:s(row.name)||null,marketCapUsd:n(row.market_cap_usd),fdvUsd:row.fdv_usd==null?null:n(row.fdv_usd),priceUsd:row.price_usd==null?null:n(row.price_usd),volumeH24:n(row.volume_h24_usd),holderCount:n(row.holder_count),observedAt:n(row.market_observed_at)*1000,holderObservedAt:n(row.holder_observed_at)*1000,source:s(row.market_source),confidence:s(row.market_confidence)},updatedAt:n(row.launch_updated_at)*1000}))}},200,'public, max-age=60, stale-while-revalidate=180');}
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);const expected=s(env.PONS_INDEX_SECRET),provided=s(request.headers.get('authorization')).replace(/^Bearer\s+/i,'');if(!expected||provided!==expected)return json({ok:false,error:'unauthorized'},401);try{return json({ok:true,result:await refreshPonsFamily(env)},202);}catch(error){return json({ok:false,error:s(error?.message||error)},503);}
}
