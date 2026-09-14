import { spawnSync } from 'node:child_process';

const ORIGIN=process.env.A_BULLS_ORIGIN||'https://abullsapp.com';
const CONFIG='workers/wrangler.production.toml';
const DB='a-bulls-app-intelligence';
const REQUIRED_SECRET_NAMES=['FOMOAPI_API_KEY','PUMP_INGEST_SECRET','HELIUS_WEBHOOK_AUTH_SECRET','HELIUS_API_KEY'];

function timeout(ms=20_000){return AbortSignal.timeout(ms);}
function n(value){const parsed=Number(value);return Number.isFinite(parsed)?parsed:0;}
function arr(value){return Array.isArray(value)?value:[];}

async function request(path){
  try{
    const response=await fetch(`${ORIGIN}${path}`,{headers:{accept:'application/json','cache-control':'no-cache'},cache:'no-store',signal:timeout()});
    const text=await response.text();let body=null;try{body=JSON.parse(text);}catch{}
    return {path,status:response.status,ok:response.ok,body,text:body?null:text.slice(0,300)};
  }catch(error){return {path,status:0,ok:false,body:null,error:String(error?.message||error)};}
}

function runWrangler(args){
  const result=spawnSync('npx',['wrangler',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {ok:result.status===0,status:result.status,stdout:result.stdout||'',stderr:result.stderr||''};
}

function parseWranglerJson(output){
  const text=String(output||'').trim();
  for(let start=0;start<text.length;start++){
    if(text[start]!=='['&&text[start]!=='{')continue;
    try{return JSON.parse(text.slice(start));}catch{}
  }
  return null;
}

function queryD1(sql){
  const run=runWrangler(['d1','execute',DB,'--remote','--config',CONFIG,'--command',sql,'--json']);
  if(!run.ok)return {ok:false,error:(run.stderr||run.stdout).trim().slice(0,1000)};
  const parsed=parseWranglerJson(run.stdout);
  if(!parsed)return {ok:false,error:'Could not parse Wrangler D1 JSON',raw:run.stdout.slice(0,1000)};
  const statements=Array.isArray(parsed)?parsed:[parsed];
  const rows=statements.flatMap(item=>arr(item?.results));
  return {ok:true,rows};
}

function secretPresence(){
  const run=runWrangler(['secret','list','--config',CONFIG]);
  const text=`${run.stdout}\n${run.stderr}`;
  return {ok:run.ok,presence:Object.fromEntries(REQUIRED_SECRET_NAMES.map(name=>[name,new RegExp(`\\b${name}\\b`).test(text)])),error:run.ok?null:text.trim().slice(0,1000)};
}

function publicSummary(result){
  const b=result.body||{};
  if(result.path.includes('/fomo/galaxy'))return {http:result.status,ok:b.ok,coverage:b.coverage,items:arr(b.items).length,error:b.error??null,configuration:b.configuration??null,disclosure:b.disclosure??null};
  if(result.path.includes('/pump/status'))return {http:result.status,ok:b.ok,enabled:b.data?.enabled,streamEnabled:b.data?.streamEnabled,activeTokenCount:b.data?.activeTokenCount,health:b.data?.health??null,budget:b.data?.budget??null};
  if(result.path.includes('/pump/top'))return {http:result.status,ok:b.ok,tokens:arr(b.data?.tokens).length,health:b.data?.health??null};
  if(result.path.includes('/field/v0/tokens'))return {http:result.status,ok:b.ok,tokenSnapshots:arr(b.stars).length,coverage:b.coverage??null,disclosure:b.disclosure??null};
  if(result.path.includes('/field/v0/events'))return {http:result.status,ok:b.ok,events:arr(b.events).length,coverage:b.coverage??null};
  if(result.path.includes('/field/snapshot'))return {http:result.status,ok:b.ok,particles:arr(b.snapshot?.particles).length,activeMembers:b.snapshot?.activeMemberCount??null,status:b.status??null};
  if(result.path.includes('/pons/galaxy'))return {http:result.status,ok:b.ok,launches:arr(b.data?.launches).length,error:b.error??null};
  return {http:result.status,ok:result.ok};
}

const paths=[
  '/api/health',
  '/api/intelligence/fomo/galaxy',
  '/api/intelligence/pump/status',
  '/api/intelligence/pump/top',
  '/api/intelligence/field/v0/tokens?limit=50',
  '/api/intelligence/field/v0/events?types=token.trade%2Cholder.exit&limit=50',
  '/api/intelligence/field/snapshot?galaxy=pump-fun&window=300&limit=100',
  '/api/intelligence/pons/galaxy',
];

console.log('A BULLS APP — LIVE GALAXY DIAGNOSTIC');
console.log(`origin=${ORIGIN}`);
console.log('\n=== PUBLIC ROUTES ===');
const publicResults=await Promise.all(paths.map(request));
for(const result of publicResults)console.log(JSON.stringify({path:result.path,...publicSummary(result)}));

console.log('\n=== WORKER SECRET PRESENCE (NAMES ONLY; VALUES ARE NEVER READ) ===');
const secrets=secretPresence();
console.log(JSON.stringify(secrets.presence,null,2));
if(!secrets.ok)console.log(`secret-list-error=${secrets.error}`);

console.log('\n=== REMOTE D1 POPULATION ===');
const queries={
  fomo:`SELECT COUNT(*) AS trader_count FROM fomo_traders;`,
  fomoState:`SELECT last_fetch_at,last_success_at,last_error,updated_at FROM fomo_sync_state WHERE id=1;`,
  pump:`SELECT (SELECT COUNT(*) FROM pump_tokens) AS token_count,(SELECT COUNT(*) FROM pump_trades) AS trade_count,(SELECT COUNT(*) FROM pump_active_tokens) AS active_count,(SELECT COUNT(*) FROM pump_volume_buckets) AS volume_bucket_count;`,
  pumpHealth:`SELECT state,last_message_at,last_success_at,received_events,accepted_events,duplicate_events,rejected_events,updated_at FROM pump_ingest_health WHERE id=1;`,
  pumpUniverse:`SELECT COUNT(*) AS active_members FROM intelligence_universe_membership WHERE universe_id='pump-fun' AND active=1;`,
};
const d1={};
for(const [key,sql] of Object.entries(queries)){d1[key]=queryD1(sql);console.log(JSON.stringify({query:key,...d1[key]}));}

const pub=Object.fromEntries(publicResults.map(r=>[r.path,r]));
const fomoBody=pub['/api/intelligence/fomo/galaxy']?.body||{};
const pumpStatus=pub['/api/intelligence/pump/status']?.body?.data||{};
const pumpTokens=pub['/api/intelligence/field/v0/tokens?limit=50']?.body?.stars||[];
const pumpSnapshot=pub['/api/intelligence/field/snapshot?galaxy=pump-fun&window=300&limit=100']?.body?.snapshot?.particles||[];
const fomoCount=n(d1.fomo?.rows?.[0]?.trader_count);
const pumpDb=d1.pump?.rows?.[0]||{};
const pumpHealth=d1.pumpHealth?.rows?.[0]||{};
const pumpMembers=n(d1.pumpUniverse?.rows?.[0]?.active_members);

console.log('\n=== DIAGNOSIS ===');
const findings=[];
if(!secrets.presence?.FOMOAPI_API_KEY)findings.push('FOMO_ROOT_CAUSE: FOMOAPI_API_KEY is not present on the Intelligence Worker, so scheduled Fomo population cannot fetch the leaderboard.');
else if(fomoCount===0&&d1.fomoState?.rows?.[0]?.last_error)findings.push(`FOMO_ROOT_CAUSE: scheduled Fomo refresh is failing: ${d1.fomoState.rows[0].last_error}`);
else if(fomoCount===0)findings.push('FOMO_ROOT_CAUSE: Fomo D1 contains zero traders even though the provider secret appears present; inspect fomo_sync_state and scheduled Worker logs.');
else if(arr(fomoBody.items).length===0)findings.push('FOMO_ROUTING_BUG: D1 contains Fomo traders but the public /fomo/galaxy route returns zero items.');
else findings.push(`FOMO_DATA_OK: public route has ${arr(fomoBody.items).length} trader stars backed by ${fomoCount} cached D1 traders. If the Field is empty, debug frontend hydration/rendering next.`);

if(!secrets.presence?.PUMP_INGEST_SECRET&&!secrets.presence?.HELIUS_WEBHOOK_AUTH_SECRET)findings.push('PUMP_AUTH_RISK: neither PUMP_INGEST_SECRET nor HELIUS_WEBHOOK_AUTH_SECRET is present. Authenticated Helius ingest cannot succeed.');
if(n(pumpDb.token_count)===0){
  if(!n(pumpHealth.last_message_at))findings.push('PUMP_ROOT_CAUSE: pump_tokens is empty and pump_ingest_health has no successful message. The Helius/webhook ingest path is not delivering accepted events to D1.');
  else findings.push(`PUMP_ROOT_CAUSE: pump_tokens is empty although ingest health has messages; accepted=${n(pumpHealth.accepted_events)} rejected=${n(pumpHealth.rejected_events)}. Inspect payload normalization/auth.`);
}else if(pumpTokens.length===0)findings.push(`PUMP_PRODUCER_BUG: D1 has ${n(pumpDb.token_count)} pump tokens but Field v0 /tokens returns zero snapshots.`);
else findings.push(`PUMP_FIELD_V0_OK: Field v0 returns ${pumpTokens.length} token snapshots. If the galaxy is visually empty, frontend composition/admission is the next failure point.`);

if(pumpMembers===0)findings.push('PUMP_FALLBACK_EMPTY: legacy pump-fun universe has zero active membership anchors. This matches the current config, where PUMPFUN_UNIVERSE_ENABLED/SOURCE_URL are not configured; do not enable it without a real source.');
if(pumpTokens.length===0&&pumpSnapshot.length===0)findings.push('PUMP_BOTH_DATA_PATHS_EMPTY: both the primary Field v0 path and legacy indexed snapshot path are empty, so the renderer has no real pump PLANETS to show.');
if(pumpStatus?.health?.state&&pumpStatus.health.state!=='receiving')findings.push(`PUMP_HEALTH: public pump health state is ${pumpStatus.health.state}.`);

for(const finding of findings)console.log(`- ${finding}`);
console.log('\nNo fake PLANETS or STARS were generated by this diagnostic.');
