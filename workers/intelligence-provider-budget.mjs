import { intelligenceDb } from './intelligence-indexer.mjs';

const n=value=>Number.isFinite(Number(value))?Number(value):0;
const s=value=>String(value==null?'':value).trim();
const monthKey=(timestamp=Date.now())=>new Date(timestamp).toISOString().slice(0,7);

export function providerBudgetPolicy(env={},provider='helius'){
  const name=s(provider)||'helius';
  const fomo=name==='fomoapi';
  const monthlyLimit=Math.max(1,Math.trunc(n(fomo?env.FOMOAPI_MONTHLY_CREDITS:env.HELIUS_MONTHLY_CREDITS)||(fomo?1_000:1_000_000)));
  const breakerRatio=Math.min(.95,Math.max(.5,n(fomo?env.FOMOAPI_BREAKER_RATIO:env.HELIUS_BREAKER_RATIO)||(fomo?.8:.75)));
  return Object.freeze({provider:name,monthlyLimit,breakerRatio,hardLimit:Math.floor(monthlyLimit*breakerRatio)});
}

export async function reserveProviderCredits(env={},requestedCredits=1,provider='helius',timestamp=Date.now()){
  const db=intelligenceDb(env);if(!db)throw new Error('intelligence_db_unavailable');
  const policy=providerBudgetPolicy(env,provider),credits=Math.max(0,Math.trunc(n(requestedCredits))),month=monthKey(timestamp);
  await db.prepare(`INSERT INTO intelligence_provider_budget_monthly(provider,month_key,call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at) VALUES(?,?,0,0,?,?,unixepoch()) ON CONFLICT(provider,month_key) DO NOTHING`).bind(policy.provider,month,policy.monthlyLimit,policy.breakerRatio).run();
  const result=await db.prepare(`UPDATE intelligence_provider_budget_monthly SET call_count=call_count+1,credits_reserved=credits_reserved+?,monthly_limit=?,breaker_ratio=?,updated_at=unixepoch() WHERE provider=? AND month_key=? AND credits_reserved+?<=?`).bind(credits,policy.monthlyLimit,policy.breakerRatio,policy.provider,month,credits,policy.hardLimit).run();
  const row=await db.prepare(`SELECT call_count,credits_reserved,monthly_limit,breaker_ratio,updated_at FROM intelligence_provider_budget_monthly WHERE provider=? AND month_key=? LIMIT 1`).bind(policy.provider,month).first();
  const blocked=!n(result?.meta?.changes);
  return Object.freeze({provider:policy.provider,monthKey:month,requestedCredits:credits,callCount:Math.max(0,Math.trunc(n(row?.call_count))),creditsReserved:Math.max(0,Math.trunc(n(row?.credits_reserved))),monthlyLimit:policy.monthlyLimit,breakerRatio:policy.breakerRatio,hardLimit:policy.hardLimit,blocked});
}
