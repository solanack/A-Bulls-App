import { intelligenceDb } from './intelligence-indexer.mjs';
import { refreshZ500Universe } from './intelligence-z500-universe.mjs';
import { reconcileZ500HeliusWatchlist } from './intelligence-helius-universe-watchlist.mjs';
import { runPatternLabWindows } from './intelligence-pattern-lab-durable.mjs';

const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;

async function acquireLease(db,key,now,ttl){
  await db.prepare("INSERT OR IGNORE INTO intelligence_scheduler_leases(lease_key,lease_until,last_state,updated_at) VALUES(?,0,'idle',unixepoch())").bind(key).run();
  const result=await db.prepare("UPDATE intelligence_scheduler_leases SET lease_until=?,last_started_at=?,last_state='running',last_error=NULL,run_count=run_count+1,updated_at=unixepoch() WHERE lease_key=? AND lease_until<=?").bind(now+ttl,now,key,now).run();
  return n(result?.meta?.changes)>0;
}
async function finishLease(db,key,now,state,error=''){await db.prepare('UPDATE intelligence_scheduler_leases SET lease_until=?,last_completed_at=?,last_state=?,last_error=?,updated_at=unixepoch() WHERE lease_key=?').bind(now,now,state,error?s(error).slice(0,500):null,key).run();}

async function patternPass(env,now){
  if(String(env.UNIVERSE_PATTERN_LAB_ENABLED||'').toLowerCase()!=='true')return{enabled:false};
  const db=intelligenceDb(env);if(!db)return{enabled:true,ok:false,error:'database_unavailable'};
  const refreshSeconds=Math.max(900,Math.min(6*3600,Math.trunc(n(env.PATTERN_LAB_REFRESH_SECONDS)||3600))),key='pattern-lab:all';
  if(!(await acquireLease(db,key,now,refreshSeconds)))return{enabled:true,ok:true,skipped:'lease'};
  try{const result=await runPatternLabWindows(env,{universeLimit:Math.max(1,Math.min(8,Math.trunc(n(env.PATTERN_LAB_UNIVERSE_LIMIT)||5))),limit:Math.max(500,Math.min(20000,Math.trunc(n(env.PATTERN_LAB_EVENT_LIMIT)||10000)))});await finishLease(db,key,now,'ok');return{ok:true,...result};}
  catch(error){await finishLease(db,key,now,'error',s(error?.message||error));return{enabled:true,ok:false,error:s(error?.message||error)};}
}

export async function runUniverseScheduledMaintenance(env={},options={}){
  const now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));
  if(String(env.ECOSYSTEM_UNIVERSES_ENABLED||'').toLowerCase()!=='true')return{enabled:false};
  const selector=await refreshZ500Universe(env,{now});
  const watchlist=await reconcileZ500HeliusWatchlist(env,{now});
  const patternLab=await patternPass(env,now);
  return{enabled:true,now,selector,watchlist,patternLab};
}

export async function universeSchedulerHealth(env={}){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const leases=await db.prepare("SELECT lease_key,lease_until,last_started_at,last_completed_at,last_state,last_error,run_count,updated_at FROM intelligence_scheduler_leases WHERE lease_key LIKE 'selector:%' OR lease_key LIKE 'pattern-lab:%' ORDER BY lease_key").all();
  const source=await db.prepare("SELECT snapshot_id,universe_id,source,selector_version,observed_at,candidate_count,accepted_count,state,error_code FROM intelligence_universe_source_snapshots WHERE universe_id='z500-top10' ORDER BY observed_at DESC LIMIT 1").first();
  const webhook=await db.prepare("SELECT provider,webhook_id,universe_id,desired_hash,applied_hash,state,account_count,last_attempt_at,last_success_at,last_error,updated_at FROM intelligence_webhook_reconcile_state WHERE universe_id='z500-top10' ORDER BY updated_at DESC LIMIT 1").first();
  return{ok:true,leases:leases?.results||[],z500Source:source||null,z500Webhook:webhook||null};
}

export const __universeSchedulerContract=Object.freeze({z500LeaseSeconds:900,patternDefaultSeconds:3600,watchlistReconcilesAfterSelector:true});
