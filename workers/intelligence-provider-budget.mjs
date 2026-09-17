import { intelligenceDb } from './intelligence-indexer.mjs';

const n=value=>Number.isFinite(Number(value))?Number(value):0;
const s=value=>String(value==null?'':value).trim();
const monthKey=(timestamp=Date.now())=>new Date(timestamp).toISOString().slice(0,7);
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const bool=value=>s(value).toLowerCase()==='true';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});

const PROVIDER_DEFAULTS=Object.freeze({
  fomoapi:Object.freeze({monthlyLimit:250_000,breakerRatio:.80,quotaSource:'fomoapi-free-floor'}),
  helius:Object.freeze({monthlyLimit:1_000_000,breakerRatio:.75,quotaSource:'operator-config-unverified'})
});

export function providerBudgetPolicy(env={},provider='helius'){
  const name=s(provider)||'helius',defaults=PROVIDER_DEFAULTS[name]||PROVIDER_DEFAULTS.helius;
  const fomo=name==='fomoapi';
  const configuredLimit=Math.trunc(n(fomo?env.FOMOAPI_MONTHLY_CREDITS:env.HELIUS_MONTHLY_CREDITS));
  const monthlyLimit=Math.max(1,configuredLimit||defaults.monthlyLimit);
  const configuredRatio=n(fomo?env.FOMOAPI_BREAKER_RATIO:env.HELIUS_BREAKER_RATIO);
  const breakerRatio=clamp(configuredRatio||defaults.breakerRatio,.5,.95);
  const quotaSource=s(fomo?env.FOMOAPI_QUOTA_SOURCE:env.HELIUS_QUOTA_SOURCE)||defaults.quotaSource;
  return Object.freeze({provider:name,monthlyLimit,breakerRatio,hardLimit:Math.floor(monthlyLimit*breakerRatio),quotaSource,quotaVerified:/provider|verified/i.test(quotaSource)});
}

async function ensureMonthlyRow(db,policy,month){
  await db.prepare(`INSERT INTO intelligence_provider_budget_monthly(provider,month_key,call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at) VALUES(?,?,0,0,?,?,unixepoch()) ON CONFLICT(provider,month_key) DO NOTHING`).bind(policy.provider,month,policy.monthlyLimit,policy.breakerRatio).run();
  return db.prepare(`SELECT call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at FROM intelligence_provider_budget_monthly WHERE provider=? AND month_key=? LIMIT 1`).bind(policy.provider,month).first();
}

async function writeBlockedAlert(db,{provider,month,requestedCredits,creditsReserved,hardLimit,timestamp}){
  const hour=Math.floor(timestamp/3_600_000),alertId=`${provider}:${month}:budget-exhausted:${hour}`;
  console.warn('[provider-budget-blocked]',JSON.stringify({provider,monthKey:month,requestedCredits,creditsReserved,hardLimit}));
  await db.prepare(`INSERT INTO intelligence_provider_budget_alerts(alert_id,provider,month_key,reason,requested_credits,credits_reserved,hard_limit,created_at) VALUES(?,?,?,'budget_exhausted',?,?,?,?) ON CONFLICT(alert_id) DO UPDATE SET requested_credits=excluded.requested_credits,credits_reserved=excluded.credits_reserved,hard_limit=excluded.hard_limit,created_at=excluded.created_at`).bind(alertId,provider,month,requestedCredits,creditsReserved,hardLimit,Math.floor(timestamp/1000)).run().catch(()=>null);
}

export async function reserveProviderCredits(env={},requestedCredits=1,provider='helius',timestamp=Date.now()){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const policy=providerBudgetPolicy(env,provider),credits=Math.max(0,Math.trunc(n(requestedCredits))),month=monthKey(timestamp);
  const before=await ensureMonthlyRow(db,policy,month),effectiveLimit=Math.max(policy.monthlyLimit,Math.trunc(n(before?.monthly_limit))||0),effectiveRatio=clamp(n(before?.breaker_ratio)||policy.breakerRatio,.5,.95),hardLimit=Math.floor(effectiveLimit*effectiveRatio);
  const result=await db.prepare(`UPDATE intelligence_provider_budget_monthly SET call_count=call_count+1,credits_reserved=credits_reserved+?,monthly_limit=MAX(monthly_limit,?),breaker_ratio=?,updated_at=unixepoch() WHERE provider=? AND month_key=? AND credits_reserved+?<=?`).bind(credits,policy.monthlyLimit,policy.breakerRatio,policy.provider,month,credits,hardLimit).run();
  const row=await db.prepare(`SELECT call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at FROM intelligence_provider_budget_monthly WHERE provider=? AND month_key=? LIMIT 1`).bind(policy.provider,month).first();
  const blocked=!n(result?.meta?.changes),monthlyLimit=Math.max(policy.monthlyLimit,Math.trunc(n(row?.monthly_limit))||0),breakerRatio=clamp(n(row?.breaker_ratio)||policy.breakerRatio,.5,.95),currentHardLimit=Math.floor(monthlyLimit*breakerRatio),creditsReserved=Math.max(0,Math.trunc(n(row?.credits_reserved)));
  if(blocked)await writeBlockedAlert(db,{provider:policy.provider,month,requestedCredits:credits,creditsReserved,hardLimit:currentHardLimit,timestamp});
  return Object.freeze({provider:policy.provider,monthKey:month,requestedCredits:credits,callCount:Math.max(0,Math.trunc(n(row?.call_count))),creditsReserved,monthlyLimit,breakerRatio,hardLimit:currentHardLimit,blocked,quotaSource:policy.quotaSource,quotaVerified:policy.quotaVerified});
}

export async function recordProviderUsageObservation(env={},observation={}){
  const provider=s(observation.provider)||'helius',db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const timestamp=Number.isFinite(Number(observation.observedAt))?Number(observation.observedAt):Date.now(),month=monthKey(timestamp),policy=providerBudgetPolicy(env,provider),row=await ensureMonthlyRow(db,policy,month);
  const remaining=Number.isFinite(Number(observation.providerRemaining))?Math.max(0,Math.trunc(Number(observation.providerRemaining))):null,cost=Number.isFinite(Number(observation.providerCost))?Math.max(0,Math.trunc(Number(observation.providerCost))):null,reportedLimit=Number.isFinite(Number(observation.providerLimit))?Math.max(1,Math.trunc(Number(observation.providerLimit))):null;
  const locallyReserved=Math.max(0,Math.trunc(n(row?.credits_reserved))),inferredFloor=remaining==null?null:remaining+locallyReserved,effectiveObservedLimit=Math.max(0,reportedLimit||0,inferredFloor||0);
  if(effectiveObservedLimit>0)await db.prepare(`UPDATE intelligence_provider_budget_monthly SET monthly_limit=MAX(monthly_limit,?),updated_at=unixepoch() WHERE provider=? AND month_key=?`).bind(effectiveObservedLimit,provider,month).run();
  const observedSec=Math.floor(timestamp/1000),snapshotId=`${provider}:${observedSec}:${cost??'na'}:${remaining??'na'}`,quotaSource=s(observation.quotaSource)||(reportedLimit!=null?'provider-reported-limit':remaining!=null?'provider-reported-remaining':'operator-config'),plan=s(observation.providerPlan)||null,statusCode=Number.isFinite(Number(observation.statusCode))?Math.trunc(Number(observation.statusCode)):null;
  await db.prepare(`INSERT INTO intelligence_provider_budget_snapshots(snapshot_id,provider,month_key,observed_at,provider_remaining,provider_cost,provider_limit,provider_plan,quota_source,status_code,payload_json) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(snapshot_id) DO NOTHING`).bind(snapshotId,provider,month,observedSec,remaining,cost,reportedLimit,plan,quotaSource,statusCode,JSON.stringify({usage:observation.usage&&typeof observation.usage==='object'?observation.usage:null})).run().catch(()=>null);
  return Object.freeze({provider,monthKey:month,providerRemaining:remaining,providerCost:cost,providerLimit:reportedLimit,providerPlan:plan,quotaSource,effectiveObservedLimit:effectiveObservedLimit||null});
}

export async function providerBudgetDiagnostics(env={},timestamp=Date.now()){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');const month=monthKey(timestamp),providers=['fomoapi','helius'],rows=[];
  for(const provider of providers){
    const policy=providerBudgetPolicy(env,provider),monthly=await ensureMonthlyRow(db,policy,month),snapshot=await db.prepare(`SELECT observed_at,provider_remaining,provider_cost,provider_limit,provider_plan,quota_source,status_code FROM intelligence_provider_budget_snapshots WHERE provider=? ORDER BY observed_at DESC LIMIT 1`).bind(provider).first().catch(()=>null),alert=await db.prepare(`SELECT reason,requested_credits,credits_reserved,hard_limit,created_at FROM intelligence_provider_budget_alerts WHERE provider=? ORDER BY created_at DESC LIMIT 1`).bind(provider).first().catch(()=>null);
    const monthlyLimit=Math.max(policy.monthlyLimit,Math.trunc(n(monthly?.monthly_limit))||0),breakerRatio=clamp(n(monthly?.breaker_ratio)||policy.breakerRatio,.5,.95),hardLimit=Math.floor(monthlyLimit*breakerRatio),creditsReserved=Math.max(0,Math.trunc(n(monthly?.credits_reserved)));
    rows.push(Object.freeze({provider,monthKey:month,callCount:Math.max(0,Math.trunc(n(monthly?.call_count))),creditsReserved,monthlyLimit,breakerRatio,hardLimit,headroom:Math.max(0,hardLimit-creditsReserved),quotaSource:s(snapshot?.quota_source)||policy.quotaSource,quotaVerified:Boolean(snapshot?.provider_limit!=null)||policy.quotaVerified,providerRemaining:snapshot?.provider_remaining==null?null:Math.max(0,Math.trunc(n(snapshot.provider_remaining))),providerLimit:snapshot?.provider_limit==null?null:Math.max(1,Math.trunc(n(snapshot.provider_limit))),providerPlan:s(snapshot?.provider_plan)||null,lastProviderObservedAt:snapshot?.observed_at==null?null:Math.trunc(n(snapshot.observed_at)),lastAlert:alert?Object.freeze({reason:s(alert.reason),requestedCredits:Math.trunc(n(alert.requested_credits)),creditsReserved:Math.trunc(n(alert.credits_reserved)),hardLimit:Math.trunc(n(alert.hard_limit)),createdAt:Math.trunc(n(alert.created_at))}):null}));
  }
  return Object.freeze({monthKey:month,providers:Object.freeze(rows)});
}

function bearer(request){const header=s(request.headers.get('authorization'));return /^Bearer\s+/i.test(header)?header.replace(/^Bearer\s+/i,'').trim():'';}
function same(a,b){a=s(a);b=s(b);if(!a||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function authorized(request,env={}){const supplied=bearer(request);return [env.INTELLIGENCE_MESH_INGEST_TOKEN,env.HELIUS_WEBHOOK_AUTH_SECRET,env.PUMP_INGEST_SECRET,env.PONS_INDEX_SECRET].some(value=>same(value,supplied));}

export async function handleProviderBudgetDiagnosticsRequest(request,env={}){
  const url=new URL(request.url);if(url.pathname!=='/api/internal/intelligence/provider-budgets')return null;
  if(request.method!=='GET')return json({ok:false,error:'method_not_allowed'},405);if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
  return json({ok:true,...await providerBudgetDiagnostics(env),internalOnly:true});
}

export async function refreshHeliusUsageSnapshot(env={}){
  const projectId=s(env.HELIUS_PROJECT_ID),key=s(env.HELIUS_API_KEY);if(!projectId||!key)return Object.freeze({available:false,reason:!projectId?'helius_project_id_unconfigured':'helius_api_key_unconfigured'});
  const response=await fetch(`https://admin-api.helius.xyz/v0/admin/projects/${encodeURIComponent(projectId)}/usage?api-key=${encodeURIComponent(key)}`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(6000)});
  if(!response.ok)return Object.freeze({available:false,reason:`helius_usage_http_${response.status}`});
  const body=await response.json(),details=body?.subscriptionDetails&&typeof body.subscriptionDetails==='object'?body.subscriptionDetails:{};
  const observation=await recordProviderUsageObservation(env,{provider:'helius',providerRemaining:body?.creditsRemaining,providerLimit:details?.creditsLimit,providerPlan:details?.plan,quotaSource:'provider-verified-helius-usage',statusCode:response.status,usage:body?.usage});
  return Object.freeze({available:true,...observation});
}

export const __providerBudgetContract=Object.freeze({fomoNormalCallCredits:250,fomoConservativeMonthlyFloor:250000,blockedAlertPersisted:true,diagnosticsPath:'/api/internal/intelligence/provider-budgets',heliusUsageSupportsProviderVerification:true});
