import { intelligenceDb } from './intelligence-indexer.mjs';
import { universeMembers } from './intelligence-ecosystem-universes.mjs';

const BASE58_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const s=v=>String(v??'').trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const uniq=values=>[...new Set(values.filter(Boolean))];

function config(env={}){
  return Object.freeze({
    enabled:String(env.Z500_HELIUS_ROTATION_ENABLED??'false').toLowerCase()==='true',
    universeId:s(env.Z500_UNIVERSE_ID)||'z500-top10',
    webhookId:s(env.PUMP_HELIUS_WEBHOOK_ID||env.Z500_HELIUS_WEBHOOK_ID),
    apiKey:s(env.HELIUS_API_KEY),
    apiBase:s(env.HELIUS_WEBHOOK_API_BASE)||'https://api-mainnet.helius-rpc.com/v0/webhooks',
    maxUpdatesPerDay:Math.max(2,Math.min(200,Math.trunc(n(env.Z500_MAX_WEBHOOK_UPDATES_PER_DAY)||48)),
    timeoutMs:Math.max(1500,Math.min(15000,Math.trunc(n(env.Z500_HELIUS_TIMEOUT_MS)||7000)))
  });
}
function sortedAddresses(values=[]){return uniq(values.map(s).filter(value=>BASE58_RE.test(value))).sort();}
async function hashAddresses(values=[]){const bytes=new TextEncoder().encode(sortedAddresses(values).join('\n')),digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,24);}
function endpoint(c){return `${c.apiBase.replace(/\/$/,'')}/${encodeURIComponent(c.webhookId)}?api-key=${encodeURIComponent(c.apiKey)}`;}
async function fetchWithTimeout(url,init,timeoutMs){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetch(url,{...init,signal:controller.signal});}finally{clearTimeout(timer);}}
async function getWebhook(c){const response=await fetchWithTimeout(endpoint(c),{headers:{accept:'application/json'}},c.timeoutMs);if(!response.ok)throw new Error(`helius_webhook_get_${response.status}`);return response.json();}
async function patchWebhook(c,accountAddresses){const response=await fetchWithTimeout(endpoint(c),{method:'PATCH',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({accountAddresses:sortedAddresses(accountAddresses),active:true})},c.timeoutMs);if(!response.ok){const text=await response.text().catch(()=>'');throw new Error(`helius_webhook_patch_${response.status}${text?`:${text.slice(0,120)}`:''}`);}return response.json().catch(()=>({ok:true}));}
async function usageToday(db,now){const row=await db.prepare("SELECT call_count FROM intelligence_provider_usage_daily WHERE provider='helius' AND usage_day=? AND operation='webhook-update'").bind(new Date(now*1000).toISOString().slice(0,10)).first();return n(row?.call_count);}
async function recordUsage(db,now,calls){if(!calls)return;const usageDay=new Date(now*1000).toISOString().slice(0,10);await db.prepare("INSERT INTO intelligence_provider_usage_daily(provider,usage_day,operation,call_count,estimated_credits,updated_at) VALUES('helius',?,'webhook-update',?,0,unixepoch()) ON CONFLICT(provider,usage_day,operation) DO UPDATE SET call_count=call_count+excluded.call_count,updated_at=unixepoch()").bind(usageDay,calls).run();}
async function saveState(db,c,desiredHash,appliedHash,state,count,now,error='',payload={}){await db.prepare("INSERT INTO intelligence_webhook_reconcile_state(provider,webhook_id,universe_id,desired_hash,applied_hash,state,account_count,last_attempt_at,last_success_at,last_error,payload_json,updated_at) VALUES('helius',?,?,?,?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(provider,webhook_id,universe_id) DO UPDATE SET desired_hash=excluded.desired_hash,applied_hash=excluded.applied_hash,state=excluded.state,account_count=excluded.account_count,last_attempt_at=excluded.last_attempt_at,last_success_at=CASE WHEN excluded.state='ok' THEN excluded.last_success_at ELSE intelligence_webhook_reconcile_state.last_success_at END,last_error=excluded.last_error,payload_json=excluded.payload_json,updated_at=unixepoch()").bind(c.webhookId,c.universeId,desiredHash,appliedHash,state,count,now,state==='ok'?now:null,error?String(error).slice(0,500):null,JSON.stringify(payload)).run();}

export async function reconcileZ500HeliusWatchlist(env={},options={}){
  const c=config(env),db=intelligenceDb(env),now=Math.max(0,Math.trunc(n(options.now)||Date.now()/1000));
  if(!c.enabled)return{enabled:false};
  if(!db)return{enabled:true,ok:false,error:'database_unavailable'};
  if(!c.webhookId||!c.apiKey)return{enabled:true,ok:false,error:'helius_webhook_configuration_missing'};
  const members=await universeMembers(env,c.universeId,{activeOnly:true,limit:100}),desired=sortedAddresses(members.filter(item=>item.entityKind==='token').map(item=>item.entityId));
  if(!desired.length)return{enabled:true,ok:false,failClosed:true,error:'desired_watchlist_empty'};
  const desiredHash=await hashAddresses(desired),callsBefore=await usageToday(db,now);
  if(callsBefore>=c.maxUpdatesPerDay){await saveState(db,c,desiredHash,null,'budget-stop',desired.length,now,'daily_webhook_update_cap',{callsBefore,max:c.maxUpdatesPerDay});return{enabled:true,ok:false,failClosed:true,error:'daily_webhook_update_cap',calls:callsBefore};}
  try{
    const current=await getWebhook(c),currentAddresses=sortedAddresses(current?.accountAddresses||current?.account_addresses||[]),currentHash=await hashAddresses(currentAddresses);
    if(currentHash===desiredHash){await saveState(db,c,desiredHash,currentHash,'ok',desired.length,now,'',{changed:false});return{enabled:true,ok:true,changed:false,accountCount:desired.length};}
    const union=sortedAddresses([...currentAddresses,...desired]);let calls=0;
    if((await hashAddresses(union))!==currentHash){if(callsBefore+calls+1>c.maxUpdatesPerDay)throw new Error('daily_webhook_update_cap');await patchWebhook(c,union);calls+=1;}
    if((await hashAddresses(union))!==desiredHash){if(callsBefore+calls+1>c.maxUpdatesPerDay)throw new Error('daily_webhook_update_cap');await patchWebhook(c,desired);calls+=1;}
    await recordUsage(db,now,calls);await saveState(db,c,desiredHash,desiredHash,'ok',desired.length,now,'',{changed:true,previousCount:currentAddresses.length,unionCount:union.length,calls});
    return{enabled:true,ok:true,changed:true,accountCount:desired.length,previousCount:currentAddresses.length,calls};
  }catch(error){await saveState(db,c,desiredHash,null,'error',desired.length,now,s(error?.message||error),{});return{enabled:true,ok:false,failClosed:true,error:s(error?.message||error)};}
}

export async function z500WebhookHealth(env={}){const c=config(env),db=intelligenceDb(env);if(!db||!c.webhookId)return null;const row=await db.prepare("SELECT desired_hash,applied_hash,state,account_count,last_attempt_at,last_success_at,last_error,payload_json,updated_at FROM intelligence_webhook_reconcile_state WHERE provider='helius' AND webhook_id=? AND universe_id=?").bind(c.webhookId,c.universeId).first();return row||null;}

export const __heliusUniverseWatchlistContract=Object.freeze({provider:'helius',unionBeforeRetire:true,failClosed:true,defaultDailyUpdateCap:48});
