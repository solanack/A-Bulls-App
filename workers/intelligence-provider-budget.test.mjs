import assert from 'node:assert/strict';
import test from 'node:test';
import { providerBudgetPolicy, reserveProviderCredits, providerBudgetDiagnostics, handleProviderBudgetDiagnosticsRequest, __providerBudgetContract } from './intelligence-provider-budget.mjs';

function fakeDb(){
  const monthly=new Map(),alerts=new Map(),snapshots=[];
  const key=(provider,month)=>`${provider}:${month}`;
  return {
    state:{monthly,alerts,snapshots},
    prepare(sql){
      let args=[];
      const stmt={
        bind(...values){args=values;return stmt;},
        async run(){
          if(sql.startsWith('INSERT INTO intelligence_provider_budget_monthly')){
            const [provider,month,limit,ratio]=args,k=key(provider,month);if(!monthly.has(k))monthly.set(k,{provider,month_key:month,call_count:0,credits_reserved:0,monthly_limit:limit,breaker_ratio:ratio,updated_at:0});return{meta:{changes:monthly.has(k)?1:0}};
          }
          if(sql.startsWith('UPDATE intelligence_provider_budget_monthly SET call_count=')){
            const [credits,limit,ratio,provider,month,again,hardLimit]=args,k=key(provider,month),row=monthly.get(k);if(!row||row.credits_reserved+again>hardLimit)return{meta:{changes:0}};row.call_count+=1;row.credits_reserved+=credits;row.monthly_limit=Math.max(row.monthly_limit,limit);row.breaker_ratio=ratio;return{meta:{changes:1}};
          }
          if(sql.startsWith('UPDATE intelligence_provider_budget_monthly SET monthly_limit=')){
            const [limit,provider,month]=args,row=monthly.get(key(provider,month));if(row)row.monthly_limit=Math.max(row.monthly_limit,limit);return{meta:{changes:row?1:0}};
          }
          if(sql.startsWith('INSERT INTO intelligence_provider_budget_alerts')){
            const [alert_id,provider,month_key,requested_credits,credits_reserved,hard_limit,created_at]=args;alerts.set(alert_id,{alert_id,provider,month_key,reason:'budget_exhausted',requested_credits,credits_reserved,hard_limit,created_at});return{meta:{changes:1}};
          }
          if(sql.startsWith('INSERT INTO intelligence_provider_budget_snapshots')){
            snapshots.push({snapshot_id:args[0],provider:args[1],month_key:args[2],observed_at:args[3],provider_remaining:args[4],provider_cost:args[5],provider_limit:args[6],provider_plan:args[7],quota_source:args[8],status_code:args[9]});return{meta:{changes:1}};
          }
          return{meta:{changes:0}};
        },
        async first(){
          if(sql.includes('FROM intelligence_provider_budget_monthly'))return monthly.get(key(args[0],args[1]))||null;
          if(sql.includes('FROM intelligence_provider_budget_snapshots'))return snapshots.filter(row=>row.provider===args[0]).sort((a,b)=>b.observed_at-a.observed_at)[0]||null;
          if(sql.includes('FROM intelligence_provider_budget_alerts'))return [...alerts.values()].filter(row=>row.provider===args[0]).sort((a,b)=>b.created_at-a.created_at)[0]||null;
          return null;
        }
      };
      return stmt;
    }
  };
}

test('Fomo policy uses provider raw-credit units and published free floor',()=>{
  const policy=providerBudgetPolicy({},'fomoapi');
  assert.equal(policy.monthlyLimit,250000);
  assert.equal(policy.creditUnit,250);
  assert.equal(policy.hardLimit,200000);
  assert.equal(policy.quotaVerified,false);
  assert.equal(__providerBudgetContract.fomoNormalCallCredits,250);
});

test('one normal Fomo reservation accounts for 250 provider credits',async()=>{
  const db=fakeDb(),env={INTELLIGENCE_DB:db,FOMOAPI_MONTHLY_CREDITS:'250000',FOMOAPI_BREAKER_RATIO:'0.80'};
  const result=await reserveProviderCredits(env,1,'fomoapi',Date.parse('2026-09-17T12:00:00Z'));
  assert.equal(result.requestedUnits,1);
  assert.equal(result.requestedCredits,250);
  assert.equal(result.creditsReserved,250);
  assert.equal(result.blocked,false);
});

test('blocked reservations persist a deduped alert and diagnostics expose headroom',async()=>{
  const db=fakeDb(),env={INTELLIGENCE_DB:db,FOMOAPI_MONTHLY_CREDITS:'250000',FOMOAPI_BREAKER_RATIO:'0.80',HELIUS_MONTHLY_CREDITS:'1000000',HELIUS_BREAKER_RATIO:'0.75',PUMP_INGEST_SECRET:'internal-token'};
  const month='2026-09',row={provider:'fomoapi',month_key:month,call_count:800,credits_reserved:200000,monthly_limit:250000,breaker_ratio:.8,updated_at:0};db.state.monthly.set(`fomoapi:${month}`,row);
  const result=await reserveProviderCredits(env,1,'fomoapi',Date.parse('2026-09-17T12:00:00Z'));
  assert.equal(result.blocked,true);
  assert.equal(db.state.alerts.size,1);
  const diagnostics=await providerBudgetDiagnostics(env,Date.parse('2026-09-17T12:00:00Z'));
  const fomo=diagnostics.providers.find(item=>item.provider==='fomoapi');
  assert.equal(fomo.headroom,0);
  assert.equal(fomo.lastAlert.reason,'budget_exhausted');
  const unauthorized=await handleProviderBudgetDiagnosticsRequest(new Request('https://example.test/api/internal/intelligence/provider-budgets'),env);
  assert.equal(unauthorized.status,401);
  const authorized=await handleProviderBudgetDiagnosticsRequest(new Request('https://example.test/api/internal/intelligence/provider-budgets',{headers:{authorization:'Bearer internal-token'}}),env);
  assert.equal(authorized.status,200);
  const body=await authorized.json();
  assert.equal(body.internalOnly,true);
  assert.ok(body.providers.some(item=>item.provider==='helius'));
});
