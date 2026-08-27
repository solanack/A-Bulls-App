import { intelligenceDb } from './intelligence-indexer.mjs';
import { universeMembers, syncUniverseMembership } from './intelligence-ecosystem-universes.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EXCLUDED=new Set(['So11111111111111111111111111111111111111111','So11111111111111111111111111111111111111112','EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX']);
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const parse=v=>{try{return typeof v==='object'&&v?v:JSON.parse(String(v||'{}'));}catch{return{};}};

function config(env={}){
  return Object.freeze({
    enabled:String(env.Z500_UNIVERSE_ENABLED??env.ECOSYSTEM_UNIVERSES_ENABLED??'false').toLowerCase()==='true',
    universeId:s(env.Z500_UNIVERSE_ID)||'z500-top10',
    category:s(env.Z500_COINGECKO_CATEGORY)||'ansem-io-ecosystem',
    topLimit:Math.max(1,Math.min(25,Math.trunc(n(env.Z500_TOP_LIMIT)||10))),
    refreshSeconds:Math.max(300,Math.min(3600,Math.trunc(n(env.Z500_REFRESH_SECONDS)||900))),
    confirmationCycles:Math.max(1,Math.min(4,Math.trunc(n(env.Z500_CONFIRMATION_CYCLES)||2))),
    sourceUrl:s(env.Z500_SOURCE_URL),
    timeoutMs:Math.max(1500,Math.min(15000,Math.trunc(n(env.Z500_SOURCE_TIMEOUT_MS)||7000))),
    identityTtlSeconds:Math.max(3600,Math.min(30*86400,Math.trunc(n(env.Z500_IDENTITY_TTL_SECONDS)||604800)))
  });
}

async function acquireLease(db,key,now,ttl){
  await db.prepare("INSERT OR IGNORE INTO intelligence_scheduler_leases(lease_key,lease_until,last_state,updated_at) VALUES(?,0,'idle',unixepoch())").bind(key).run();
  const result=await db.prepare("UPDATE intelligence_scheduler_leases SET lease_until=?,last_started_at=?,last_state='running',last_error=NULL,run_count=run_count+1,updated_at=unixepoch() WHERE lease_key=? AND lease_until<=?").bind(now+ttl,now,key,now).run();
  return n(result?.meta?.changes)>0;
}
async function finishLease(db,key,now,state,error=''){
  await db.prepare('UPDATE intelligence_scheduler_leases SET lease_until=?,last_completed_at=?,last_state=?,last_error=?,updated_at=unixepoch() WHERE lease_key=?').bind(now,now,state,error?s(error).slice(0,500):null,key).run();
}
async function fetchJson(url,{timeoutMs,headers={}}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{const response=await fetch(url,{headers:{accept:'application/json',...headers},signal:controller.signal});if(!response.ok)throw new Error(`upstream_http_${response.status}`);return{json:await response.json(),etag:s(response.headers.get('etag'))||null};}finally{clearTimeout(timer);}
}
function cgHeaders(env){const key=s(env.COINGECKO_API_KEY);return key?{'x-cg-demo-api-key':key}:{};}

async function rankedRows(env,c){
  if(c.sourceUrl){const {json,etag}=await fetchJson(c.sourceUrl,{timeoutMs:c.timeoutMs});const rows=Array.isArray(json)?json:Array.isArray(json?.tokens)?json.tokens:Array.isArray(json?.data)?json.data:[];if(!rows.length)throw new Error('z500_source_empty');return{rows,etag,source:c.sourceUrl};}
  const url=new URL('https://api.coingecko.com/api/v3/coins/markets');
  url.search=new URLSearchParams({vs_currency:'usd',category:c.category,order:'market_cap_desc',per_page:String(Math.max(25,c.topLimit*3)),page:'1',sparkline:'false',price_change_percentage:'1h,24h,7d'}).toString();
  const {json,etag}=await fetchJson(url,{timeoutMs:c.timeoutMs,headers:cgHeaders(env)});if(!Array.isArray(json))throw new Error('z500_source_invalid');return{rows:json,etag,source:'coingecko'};
}
function directMint(row){for(const value of[row?.mint,row?.address,row?.token_address,row?.contract_address,row?.solanaAddress,row?.solana_address,row?.platforms?.solana]){const mint=s(value);if(BASE58_RE.test(mint)&&!EXCLUDED.has(mint))return mint;}return'';}
async function resolveIdentity(env,db,row,now,c){
  const direct=directMint(row);if(direct)return{address:direct,symbol:s(row.symbol),name:s(row.name)};
  const id=s(row.id);if(!id)return null;
  const cached=await db.prepare("SELECT address,symbol,name,expires_at FROM intelligence_token_identity_cache WHERE source='coingecko' AND source_id=? AND chain='solana'").bind(id).first();
  if(cached&&n(cached.expires_at)>now&&BASE58_RE.test(s(cached.address))&&!EXCLUDED.has(s(cached.address)))return{address:s(cached.address),symbol:s(cached.symbol),name:s(cached.name)};
  const url=new URL(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`);url.search=new URLSearchParams({localization:'false',tickers:'false',market_data:'false',community_data:'false',developer_data:'false',sparkline:'false'}).toString();
  let data=null;try{({json:data}=await fetchJson(url,{timeoutMs:c.timeoutMs,headers:cgHeaders(env)}));}catch{return null;}
  const address=s(data?.platforms?.solana),valid=BASE58_RE.test(address)&&!EXCLUDED.has(address),symbol=s(data?.symbol||row.symbol),name=s(data?.name||row.name);
  await db.prepare("INSERT INTO intelligence_token_identity_cache(source,source_id,chain,address,symbol,name,metadata_json,resolved_at,expires_at) VALUES('coingecko',?,'solana',?,?,?,?,?,?) ON CONFLICT(source,source_id,chain) DO UPDATE SET address=excluded.address,symbol=excluded.symbol,name=excluded.name,metadata_json=excluded.metadata_json,resolved_at=excluded.resolved_at,expires_at=excluded.expires_at").bind(id,valid?address:null,symbol,name,JSON.stringify({coingeckoId:id}),now,now+c.identityTtlSeconds).run();
  return valid?{address,symbol,name}:null;
}
function metadata(row,identity){return{sourceId:s(row.id)||null,symbol:s(identity?.symbol||row.symbol)||null,name:s(identity?.name||row.name)||null,imageUrl:s(row.image)||null,priceUsd:n(row.current_price)||null,marketCapUsd:n(row.market_cap)||null,volume24hUsd:n(row.total_volume)||null,change1h:n(row.price_change_percentage_1h_in_currency)||null,change24h:n(row.price_change_percentage_24h_in_currency)||null,change7d:n(row.price_change_percentage_7d_in_currency)||null};}
async function candidates(env,db,rows,now,c){const out=[],seen=new Set();for(const row of rows.slice(0,Math.max(25,c.topLimit*3))){const identity=await resolveIdentity(env,db,row,now,c),mint=s(identity?.address);if(!mint||seen.has(mint))continue;seen.add(mint);out.push({entityKind:'token',entityId:mint,rank:out.length+1,metadata:metadata(row,identity)});if(out.length>=c.topLimit)break;}return out;}
async function snapshot(db,c,now,rawCount,items,state,error='',etag=null){const id=`${c.universeId}:${now}:${crypto.randomUUID().slice(0,8)}`;await db.prepare('INSERT INTO intelligence_universe_source_snapshots(snapshot_id,universe_id,source,selector_version,observed_at,candidate_count,accepted_count,state,source_etag,payload_json,error_code) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,c.universeId,'ansem-z500','z500-v2',now,rawCount,items.length,state,etag,JSON.stringify({items}),error||null).run();return id;}
async function trackCandidates(db,c,items,snapshotId,cycle){
  for(const item of items)await db.prepare('INSERT INTO intelligence_universe_selector_candidates(universe_id,entity_kind,entity_id,source_rank,consecutive_cycles,last_cycle,last_snapshot_id,metadata_json,updated_at) VALUES(?,?,?,?,1,?,?,?,unixepoch()) ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET source_rank=excluded.source_rank,consecutive_cycles=CASE WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles+1 ELSE 1 END,last_cycle=excluded.last_cycle,last_snapshot_id=excluded.last_snapshot_id,metadata_json=excluded.metadata_json,updated_at=unixepoch()').bind(c.universeId,'token',item.entityId,item.rank,cycle,snapshotId,JSON.stringify(item.metadata||{}),cycle,cycle-1).run();
  await db.prepare('UPDATE intelligence_universe_selector_candidates SET consecutive_cycles=0,updated_at=unixepoch() WHERE universe_id=? AND last_cycle<?').bind(c.universeId,cycle).run();
}
async function chooseStableTarget(env,db,c,raw,bootstrap){
  if(bootstrap)return raw.slice(0,c.topLimit).map(x=>({...x,qualifyingCycles:c.confirmationCycles}));
  const active=await universeMembers(env,c.universeId,{activeOnly:true,limit:100}),rawMap=new Map(raw.map(x=>[x.entityId,x]));
  const q=await db.prepare('SELECT entity_id,source_rank,consecutive_cycles,metadata_json FROM intelligence_universe_selector_candidates WHERE universe_id=? AND last_cycle=(SELECT MAX(last_cycle) FROM intelligence_universe_selector_candidates WHERE universe_id=?) ORDER BY source_rank LIMIT ?').bind(c.universeId,c.universeId,c.topLimit*3).all();
  const chosen=[],seen=new Set();for(const row of(q?.results||[])){if(n(row.consecutive_cycles)<c.confirmationCycles||chosen.length>=c.topLimit)continue;const id=s(row.entity_id);chosen.push({entityKind:'token',entityId:id,rank:n(row.source_rank),qualifyingCycles:n(row.consecutive_cycles),metadata:parse(row.metadata_json)});seen.add(id);}
  for(const old of active){if(chosen.length>=c.topLimit)break;if(seen.has(old.entityId))continue;const current=rawMap.get(old.entityId);if(current){chosen.push({...current,qualifyingCycles:Math.max(c.confirmationCycles,n(old.qualifyingCycles)||1)});seen.add(old.entityId);}}
  for(const old of active){if(chosen.length>=c.topLimit)break;if(seen.has(old.entityId))continue;chosen.push({entityKind:'token',entityId:old.entityId,rank:old.rank,qualifyingCycles:n(old.qualifyingCycles)||1,metadata:{...(old.metadata||{}),provisionalHold:true}});seen.add(old.entityId);}
  return chosen.slice(0,c.topLimit).map((item,index)=>({...item,rank:index+1}));
}

export async function refreshZ500Universe(env={},options={}){
  const c=config(env),db=intelligenceDb(env),now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));if(!c.enabled)return{enabled:false};if(!db)return{enabled:true,ok:false,error:'database_unavailable'};
  const lease=`selector:${c.universeId}`;if(!(await acquireLease(db,lease,now,c.refreshSeconds)))return{enabled:true,ok:true,skipped:'lease'};
  try{
    const upstream=await rankedRows(env,c),items=await candidates(env,db,upstream.rows,now,c);
    if(items.length<c.topLimit){const snapshotId=await snapshot(db,c,now,upstream.rows.length,items,'degraded','insufficient_valid_solana_candidates',upstream.etag);await finishLease(db,lease,now,'degraded','insufficient_valid_solana_candidates');return{enabled:true,ok:false,failClosed:true,snapshotId,candidateCount:items.length,required:c.topLimit};}
    const snapshotId=await snapshot(db,c,now,upstream.rows.length,items,'ok','',upstream.etag),cycle=Math.floor(now/c.refreshSeconds);await trackCandidates(db,c,items,snapshotId,cycle);
    const active=await universeMembers(env,c.universeId,{activeOnly:true,limit:100}),target=await chooseStableTarget(env,db,c,items,active.length===0),result=await syncUniverseMembership(env,c.universeId,target,{now,snapshotId,reason:'z500-two-cycle-selector'});await finishLease(db,lease,now,'ok');
    return{enabled:true,ok:true,source:upstream.source,snapshotId,rawCandidates:upstream.rows.length,resolvedCandidates:items.length,targetCount:target.length,...result};
  }catch(error){await finishLease(db,lease,now,'error',s(error?.message||error));return{enabled:true,ok:false,failClosed:true,error:s(error?.message||error)};}
}

export const __z500UniverseContract=Object.freeze({universeId:'z500-top10',category:'ansem-io-ecosystem',topLimit:10,refreshSeconds:900,confirmationCycles:2,failClosed:true});
