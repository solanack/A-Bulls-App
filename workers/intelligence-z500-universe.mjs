import { intelligenceDb } from './intelligence-indexer.mjs';
import { universeMembers, syncUniverseMembership } from './intelligence-ecosystem-universes.mjs';
import { refreshZ500IdentityEvidence } from './intelligence-z500-evidence-collector.mjs';
import { validZ500Mint } from './intelligence-z500-identity-registry.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const parse=v=>{try{return typeof v==='object'&&v?v:JSON.parse(String(v||'{}'));}catch{return{};}};

function config(env={}){
  return Object.freeze({
    enabled:String(env.Z500_UNIVERSE_ENABLED??env.ECOSYSTEM_UNIVERSES_ENABLED??'false').toLowerCase()==='true',
    universeId:s(env.Z500_UNIVERSE_ID)||'z500-top10',
    category:s(env.Z500_COINGECKO_CATEGORY)||'ansem-io-ecosystem',
    topLimit:Math.max(1,Math.min(25,Math.trunc(n(env.Z500_TOP_LIMIT)||10)),),
    refreshSeconds:Math.max(300,Math.min(3600,Math.trunc(n(env.Z500_REFRESH_SECONDS)||900))),
    confirmationCycles:Math.max(1,Math.min(4,Math.trunc(n(env.Z500_CONFIRMATION_CYCLES)||2)))
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

async function verifiedRegistryRows(db,c){
  const result=await db.prepare(`
    SELECT canonical_id,ansem_name,ansem_ticker,ansem_tier,ansem_rank,
           verified_mint,verification_method,verification_confidence,
           coingecko_id,evidence_json,last_verified_at,updated_at
    FROM intelligence_z500_token_registry
    WHERE verification_state='verified' AND verified_mint IS NOT NULL
    ORDER BY ansem_rank ASC,canonical_id ASC
    LIMIT ?
  `).bind(c.topLimit).all();
  return (result?.results||[]).filter(row=>validZ500Mint(row.verified_mint));
}

function registryItems(rows){
  return rows.map((row,index)=>({
    entityKind:'token',
    entityId:s(row.verified_mint),
    rank:index+1,
    metadata:{
      canonicalId:s(row.canonical_id),
      symbol:s(row.ansem_ticker)||null,
      name:s(row.ansem_name)||null,
      tier:s(row.ansem_tier)||null,
      z500Rank:n(row.ansem_rank)||index+1,
      verificationMethod:s(row.verification_method)||null,
      verificationConfidence:n(row.verification_confidence),
      coingeckoId:s(row.coingecko_id)||null,
      evidenceSummary:parse(row.evidence_json),
      lastVerifiedAt:n(row.last_verified_at)||null,
      identityState:'verified'
    }
  }));
}

async function snapshot(db,c,now,rawCount,items,state,error='',source='z500-verified-registry'){
  const id=`${c.universeId}:${now}:${crypto.randomUUID().slice(0,8)}`;
  await db.prepare(`
    INSERT INTO intelligence_universe_source_snapshots(
      snapshot_id,universe_id,source,selector_version,observed_at,
      candidate_count,accepted_count,state,source_etag,payload_json,error_code
    ) VALUES(?,?,?,?,?,?,?,?,NULL,?,?)
  `).bind(id,c.universeId,source,'z500-v3-verified-mint',now,rawCount,items.length,state,JSON.stringify({items}),error||null).run();
  return id;
}

async function trackCandidates(db,c,items,snapshotId,cycle){
  for(const item of items){
    await db.prepare(`
      INSERT INTO intelligence_universe_selector_candidates(
        universe_id,entity_kind,entity_id,source_rank,consecutive_cycles,
        last_cycle,last_snapshot_id,metadata_json,updated_at
      ) VALUES(?,?,?,?,1,?,?,?,unixepoch())
      ON CONFLICT(universe_id,entity_kind,entity_id) DO UPDATE SET
        source_rank=excluded.source_rank,
        consecutive_cycles=CASE
          WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles
          WHEN intelligence_universe_selector_candidates.last_cycle=? THEN intelligence_universe_selector_candidates.consecutive_cycles+1
          ELSE 1 END,
        last_cycle=excluded.last_cycle,
        last_snapshot_id=excluded.last_snapshot_id,
        metadata_json=excluded.metadata_json,
        updated_at=unixepoch()
    `).bind(c.universeId,'token',item.entityId,item.rank,cycle,snapshotId,JSON.stringify(item.metadata||{}),cycle,cycle-1).run();
  }
  await db.prepare('UPDATE intelligence_universe_selector_candidates SET consecutive_cycles=0,updated_at=unixepoch() WHERE universe_id=? AND last_cycle<?').bind(c.universeId,cycle).run();
}

async function chooseStableTarget(env,db,c,raw,bootstrap){
  if(bootstrap)return raw.slice(0,c.topLimit).map(x=>({...x,qualifyingCycles:c.confirmationCycles}));
  const active=await universeMembers(env,c.universeId,{activeOnly:true,limit:100});
  const rawMap=new Map(raw.map(x=>[x.entityId,x]));
  const q=await db.prepare(`
    SELECT entity_id,source_rank,consecutive_cycles,metadata_json
    FROM intelligence_universe_selector_candidates
    WHERE universe_id=? AND last_cycle=(SELECT MAX(last_cycle) FROM intelligence_universe_selector_candidates WHERE universe_id=?)
    ORDER BY source_rank LIMIT ?
  `).bind(c.universeId,c.universeId,c.topLimit*3).all();
  const chosen=[],seen=new Set();
  for(const row of(q?.results||[])){
    if(n(row.consecutive_cycles)<c.confirmationCycles||chosen.length>=c.topLimit)continue;
    const id=s(row.entity_id);if(!validZ500Mint(id))continue;
    chosen.push({entityKind:'token',entityId:id,rank:n(row.source_rank),qualifyingCycles:n(row.consecutive_cycles),metadata:parse(row.metadata_json)});seen.add(id);
  }
  for(const old of active){
    if(chosen.length>=c.topLimit)break;
    if(seen.has(old.entityId))continue;
    const current=rawMap.get(old.entityId);
    if(current){chosen.push({...current,qualifyingCycles:Math.max(c.confirmationCycles,n(old.qualifyingCycles)||1)});seen.add(old.entityId);}
  }
  return chosen.slice(0,c.topLimit).map((item,index)=>({...item,rank:index+1}));
}

export async function refreshZ500Universe(env={},options={}){
  const c=config(env),db=intelligenceDb(env),now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));
  if(!c.enabled)return{enabled:false};
  if(!db)return{enabled:true,ok:false,error:'database_unavailable'};
  const lease=`selector:${c.universeId}`;
  if(!(await acquireLease(db,lease,now,c.refreshSeconds)))return{enabled:true,ok:true,skipped:'lease'};

  try{
    const identity=await refreshZ500IdentityEvidence(env);
    const rows=await verifiedRegistryRows(db,c),items=registryItems(rows);
    if(!identity?.live){
      const snapshotId=await snapshot(db,c,now,identity?.total||0,items,'degraded','live_z500_source_required',identity?.source||'z500-source');
      await finishLease(db,lease,now,'degraded','live_z500_source_required');
      return{enabled:true,ok:false,failClosed:true,snapshotId,verified:items.length,required:c.topLimit,identity};
    }
    if(items.length<c.topLimit){
      const snapshotId=await snapshot(db,c,now,identity?.total||0,items,'degraded','insufficient_verified_z500_mints',identity?.source||'z500-source');
      await finishLease(db,lease,now,'degraded','insufficient_verified_z500_mints');
      return{enabled:true,ok:false,failClosed:true,snapshotId,verified:items.length,required:c.topLimit,identity};
    }

    const snapshotId=await snapshot(db,c,now,identity.total,items,'ok','',identity.source);
    const cycle=Math.floor(now/c.refreshSeconds);
    await trackCandidates(db,c,items,snapshotId,cycle);
    const active=await universeMembers(env,c.universeId,{activeOnly:true,limit:100});
    const target=await chooseStableTarget(env,db,c,items,active.length===0);
    if(target.length<c.topLimit){
      await finishLease(db,lease,now,'degraded','confirmation_cycle_incomplete');
      return{enabled:true,ok:false,failClosed:true,snapshotId,verified:items.length,targetCount:target.length,required:c.topLimit,identity};
    }
    const result=await syncUniverseMembership(env,c.universeId,target,{now,snapshotId,reason:'z500-verified-mint-selector-v3'});
    await finishLease(db,lease,now,'ok');
    return{enabled:true,ok:true,source:identity.source,snapshotId,verified:items.length,targetCount:target.length,identity:{live:identity.live,total:identity.total,verified:identity.verified},...result};
  }catch(error){
    await finishLease(db,lease,now,'error',s(error?.message||error));
    return{enabled:true,ok:false,failClosed:true,error:s(error?.message||error)};
  }
}

export const __z500UniverseContract=Object.freeze({
  universeId:'z500-top10',category:'ansem-io-ecosystem',topLimit:10,
  refreshSeconds:900,confirmationCycles:2,failClosed:true,
  membershipSource:'verified-canonical-mint-registry',liveZ500SourceRequired:true
});
