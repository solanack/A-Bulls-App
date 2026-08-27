import { intelligenceDb } from './intelligence-indexer.mjs';
import { universeMembers, syncUniverseMembership } from './intelligence-ecosystem-universes.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const day=timestamp=>new Date(timestamp*1000).toISOString().slice(0,10);
const EXCLUDED=new Set([
  'So11111111111111111111111111111111111111111',
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX'
]);

function cfg(env={}){
  return Object.freeze({
    enabled:String(env.Z500_UNIVERSE_ENABLED??env.ECOSYSTEM_UNIVERSES_ENABLED??'false').toLowerCase()==='true',
    universeId:s(env.Z500_UNIVERSE_ID)||'z500-top10',
    category:s(env.Z500_COINGECKO_CATEGORY)||'ansem-io-ecosystem',
    topLimit:Math.max(1,Math.min(25,Math.trunc(n(env.Z500_TOP_LIMIT)||10))),
    refreshSeconds:Math.max(300,Math.min(3600,Math.trunc(n(env.Z500_REFRESH_SECONDS)||900))),
    confirmationCycles:Math.max(1,Math.min(4,Math.trunc(n(env.Z500_CONFIRMATION_CYCLES)||2)),
    sourceUrl:s(env.Z500_SOURCE_URL),
    sourceKind:s(env.Z500_SOURCE_KIND)||'coingecko-ansem-ecosystem',
    timeoutMs:Math.max(1500,Math.min(15000,Math.trunc(n(env.Z500_SOURCE_TIMEOUT_MS)||7000))),
    identityTtlSeconds:Math.max(3600,Math.min(30*86400,Math.trunc(n(env.Z500_IDENTITY_TTL_SECONDS)||7*86400)))
  });
}

async function acquireLease(db,key,now,ttl){
  await db.prepare(`INSERT OR IGNORE INTO intelligence_scheduler_leases(lease_key,lease_until,last_state,updated_at) VALUES(?,0,'idle',unixepoch())`).bind(key).run();
  const result=await db.prepare(`UPDATE intelligence_scheduler_leases SET lease_until=?,last_started_at=?,last_state='running',last_error=NULL,run_count=run_count+1,updated_at=unixepoch() WHERE lease_key=? AND lease_until<=?`).bind(now+ttl,now,key,now).run();
  return n(result?.meta?.changes)>0;
}
async function finishLease(db,key,now,state='ok',error=''){
  await db.prepare(`UPDATE intelligence_scheduler_leases SET lease_until=?,last_completed_at=?,last_state=?,last_error=?,updated_at=unixepoch() WHERE lease_key=?`).bind(now,now,state,error?String(error).slice(0,500):null,key).run();
}

async function fetchJson(url,{timeoutMs=7000,headers={}}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{headers:{accept:'application/json',...headers},signal:controller.signal});
    if(!response.ok)throw new Error(`upstream_http_${response.status}`);
    return {json:await response.json(),etag:s(response.headers.get('etag'))||null};
  }finally{clearTimeout(timer);}
}

function cgHeaders(env={}){
  const key=s(env.COINGECKO_API_KEY);return key?{'x-cg-demo-api-key':key}:{};
}

async function fetchRankedMarkets(env,c){
  if(c.sourceUrl){
    const {json,etag}=await fetchJson(c.sourceUrl,{timeoutMs:c.timeoutMs});
    const rows=Array.isArray(json)?json:Array.isArray(json?.tokens)?json.tokens:Array.isArray(json?.data)?json.data:[];
    return {rows,etag,source:c.sourceUrl};
  }
  const url=new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.search=new URLSearchParams({vs_currency:'usd',category:c.category,order:'market_cap_desc',per_page:String(Math.max(25,c.topLimit*3)),page:'1',sparkline:'false',price_change_percentage:'1h,24h,7d'}).toString();
  const {json,etag}=await fetchJson(url,{timeoutMs:c.timeoutMs,headers:cgHeaders(env)});
  if(!Array.isArray(json))throw new Error('z500_source_invalid');
  return {rows:json,etag,source:url.origin+url.pathname};
}

function directMint(row={}){
  for(const value of [row.mint,row.address,row.token_address,row.contract_address,row.solanaAddress,row.solana_address,row?.platforms?.solana]){
    const candidate=s(value);if(BASE58_RE.test(candidate)&&!EXCLUDED.has(candidate))return candidate;
  }
  return '';
}

async function cachedIdentity(db,sourceId,now){
  if(!sourceId)return null;
  const row=await db.prepare(`SELECT address,symbol,name,metadata_json,expires_at FROM intelligence_token_identity_cache WHERE source='coingecko' AND source_id=? AND chain='solana'`).bind(sourceId).first();
  if(!row||n(row.expires_at)<=now||!BASE58_RE.test(s(row.address)))return null;
  return {address:s(row.address),symbol:s(row.symbol),name:s(row.name)};
}

async function resolveCoinGeckoIdentity(env,db,row,now,c){
  const direct=directMint(row);if(direct)return {address:direct,symbol:s(row.symbol),name:s(row.name)};
  const id=s(row.id);if(!id)return null;
  const cached=await cachedIdentity(db,id,now);if(cached)return cached;
  const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`);
  url.search=new URLSearchParams({localization:'false',tickers:'false',market_data:'false',community_data:'false',developer_data:'false',sparkline:'false'}).toString();
  let data;
  try{({json:data}=await fetchJson(url,{timeoutMs:c.timeoutMs,headers:cgHeaders(env)}));}catch{return null;}
  const address=s(data?.platforms?.solana);const valid=BASE58_RE.test(address)&&!EXCLUDED.has(address);
  await db.prepare(`INSERT INTO intelligence_token_identity_cache(source,source_id,chain,address,symbol,name,metadata_json,resolved_at,expires_at) VALUES('coingecko',?,'solana',?,?,?,?,?,?,?) ON CONFLICT(source,source_id,chain) DO UPDATE SET address=excluded.address,symbol=excluded.symbol,name=excluded.name,metadata_json=excluded.metadata_json,resolved_at=excluded.resolved_at,expires_at=excluded.expires_at`).bind(id,valid?address:null,s(data?.symbol||row.symbol),s(data?.name||row.name),JSON.stringify({coingeckoId:id}),now,now+c.identityTtlSeconds).run();
  return valid?{address,symbol:s(data?.symbol||row.symbol),name:s(data?.name||row.name)}:null;
}

function marketMetadata(row,identity){
  return {sourceId:s(row.id)||null,symbol:s(identity?.symbol||row.symbol)||null,name:s(identity?.name||row.name)||null,imageUrl:s(row.image)||null,priceUsd:n(row.current_price)||null,marketCapUsd:n(row.market_cap)||null,volume24hUsd:n(row.total_volume)||null,change1h:n(row.price_change_percentage_1h_in_currency)||null,change24h:n(row.price_change_percentage_24h_in_currency)||null,change7d:n(row.price_change_percentage_7d_in_currency)||null,sourceRank:n(row.market_cap_rank)||null};
}

async function resolvedCandidates(env,db,rows,now,c){
  const output=[];const seen=new Set();
  for(const row of rows.slice(0,Math.max(25,c.topLimit*3))){
    const identity=await resolveCoinGeckoIdentity(env,db,row,now,c);const mint=s(identity?.address);if(!mint||seen.has(mint))continue;
    seen.add(mint);output.push({entityKind:'token',entityId:mint,rank:output.length+1,metadata:marketMetadata(row,identity)});
    if(output.length>=c.topLimit)break;
  }
  return output;
}

async function recordSnapshot(db,c,now,rawCount,candidates,state='ok',error='',etag=null){
  const snapshotId=`${c.universeId}:${now}:${crypto.randomUUID().slice(0,8)}`;
  await db.prepare(`INSERT INTO intelligence_universe_source_snapshots(snapshot_id,universe_id,source,selector_version,observed_at,candidate_count,accepted_count,state,source_etag,payload_json,error_code) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).bind(snapshotId,c.universeId,c.sourceKind,'z500-v2',now,rawCount,candidates.length,state,etag,JSON.stringify({candidates}),error||null).run();
  return snapshotId;
}

async function updateCandidateStreaks(db,c,candidates,snapshotId,cycle){
  for(const item of candidates){
    await db.prepare(`INSERT INTO intelligence_universe_selector_candidates(universe_id,entity_kind,entity_id,source_rank,consecutive_cycles,last_cycle,last_snapshot_id,metadata_json,updated_at) VALUES(?,?,?,?,1,?,?,?,unixepoch()) ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET source_rank=excluded.source_rank,consecutive_cycles=CASE WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles+1 ELSE 1 END,last_cycle=excluded.last_cycle,last_snapshot_id=excluded.last_snapshot_id,metadata_json=excluded.metadata_json,updated_at=unixepoch()`).bind(c.universeId,'token',item.entityId,item.rank,cycle,snapshotId,JSON.stringify(item.metadata||{}),cycle,cycle-1).run();
  }
  await db.prepare(`UPDATE intelligence_universe_selector_candidates SET consecutive_cycles=0,updated_at=unixepoch() WHERE universe_id=? AND last_cycle<?`).bind(c.universeId,cycle).run();
}

async function stableTarget(db,c,candidates,bootstrap=false){
  if(bootstrap)return candidates.slice(0,c.topLimit).map(x=>({...x,qualifyingCycles:c.confirmationCycles}));
  const active=await universeMembers({BULL_INTELLIGENCE_DB:db},c.universeId,{activeOnly:true,limit:100});
  const rawMap=new Map(candidates.map(x=>[x.entityId,x]));
  const rows=await db.prepare(`SELECT entity_id,source_rank,consecutive_cycles,metadata_json FROM intelligence_universe_selector_candidates WHERE universe_id=? AND last_cycle=(SELECT MAX(last_cycle) FROM intelligence_universe_selector_candidates WHERE universe_id=?) ORDER BY source_rank LIMIT ?`).bind(c.universeId,c.universeId,c.topLimit*3).all();
  const qualified=(rows?.results||[]).filter(row=>n(row.consecutive_cycles)>=c.confirmationCycles).map(row=>({entityKind:'token',entityId:s(row.entity_id),rank:n(row.source_rank),qualifyingCycles:n(row.consecutive_cycles),metadata:JSON.parse(String(row.metadata_json||'{}'))}));
  const chosen=[];const seen=new Set();
  for(const item of qualified){if(chosen.length>=c.topLimit)break;chosen.push(item);seen.add(item.entityId);}
  for(const old of active){if(chosen.length>=c.topLimit)break;if(seen.has(old.entityId))continue;const current=rawMap.get(old.entityId);if(current){chosen.push({...current,qualifyingCycles:Math.max(c.confirmationCycles,old.qualifyingCycles||1)});seen.add(old.entityId);}}
  for(const old of active){if(chosen.length>=c.topLimit)break;if(seen.has(old.entityId))continue;chosen.push({entityKind:'token',entityId:old.entityId,rank:old.rank,qualifyingCycles:old.qualifyingCycles||1,metadata:{...(old.metadata||{}),provisionalHold:true}});seen.add(old.entityId);}
  return chosen.slice(0,c.topLimit).map((item,index)=>({...item,rank:index+1}));
}

export async function refreshZ500Universe(env={},options={}){
  const c=cfg(env),db=intelligenceDb(env),now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));
  if(!c.enabled)return {enabled:false};if(!db)return {enabled:true,ok:false,error:'database_unavailable'};
  const leaseKey=`selector:${c.universeId}`;if(!(await acquireLease(db,leaseKey,now,c.refreshSeconds)))return {enabled:true,ok:true,skipped:'lease'};
  try{
    const upstream=await fetchRankedMarkets(env,c);const candidates=await resolvedCandidates(env,db,upstream.rows,now,c);
    if(candidates.length<c.topLimit){const snapshotId=await recordSnapshot(db,c,now,upstream.rows.length,candidates,'degraded','insufficient_valid_solana_candidates',upstream.etag);await finishLease(db,leaseKey,now,'degraded','insufficient_valid_solana_candidates');return {enabled:true,ok:false,failClosed:true,snapshotId,candidateCount:candidates.length,required:c.topLimit};}
    const snapshotId=await recordSnapshot(db,c,now,upstream.rows.length,candidates,'ok','',upstream.etag),cycle=Math.floor(now/c.refreshSeconds);
    await updateCandidateStreaks(db,c,candidates,snapshotId,cycle);
    const active=await universeMembers(env,c.universeId,{activeOnly:true,limit:100}),target=await stableTarget(db,c,candidates,active.length===0);
    const result=await syncUniverseMembership(env,c.universeId,target,{now,snapshotId,reason:'z500-source-refresh'});
    await finishLease(db,leaseKey,now,'ok');
    return {enabled:true,ok:true,source:c.sourceKind,snapshotId,rawCandidates:upstream.rows.length,resolvedCandidates:candidates.length,targetCount:target.length,...result};
  }catch(error){await finishLease(db,leaseKey,now,'error',s(error?.message||error));return {enabled:true,ok:false,failClosed:true,error:s(error?.message||error)};}
}

export const __z500SelectorContract=Object.freeze({universeId:'z500-top10',defaultCategory:'ansem-io-ecosystem',defaultTopLimit:10,defaultRefreshSeconds:900,defaultConfirmationCycles:2});
