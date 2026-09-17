import { productionOrigins } from "./deployment-origins.mjs";
import { spawnSync } from 'node:child_process';

const ORIGIN=process.env.A_BULLS_ORIGIN||productionOrigins.public;
const CONFIG='workers/wrangler.production.toml';
const DB='a-bulls-app-intelligence';
const SECRET_NAMES=['PONS_BLOCKSCOUT_API_KEY','BLOCKSCOUT_API_KEY','PONS_RPC_URL','PONS_BITQUERY_TOKEN','BITQUERY_API_TOKEN','PONS_INDEX_SECRET'];

const arr=value=>Array.isArray(value)?value:[];
const n=value=>Number.isFinite(Number(value))?Number(value):0;

function runWrangler(args){
  const result=spawnSync('npx',['wrangler',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  return {ok:result.status===0,status:result.status,stdout:result.stdout||'',stderr:result.stderr||''};
}

function parseWranglerJson(output){
  const text=String(output||'').trim();
  for(let start=0;start<text.length;start+=1){
    if(text[start]!=='['&&text[start]!=='{')continue;
    try{return JSON.parse(text.slice(start));}catch{}
  }
  return null;
}

function queryD1(sql){
  const run=runWrangler(['d1','execute',DB,'--remote','--config',CONFIG,'--command',sql,'--json']);
  if(!run.ok)return {ok:false,error:(run.stderr||run.stdout).trim().slice(0,1200)};
  const parsed=parseWranglerJson(run.stdout);
  if(!parsed)return {ok:false,error:'Could not parse Wrangler D1 JSON',raw:run.stdout.slice(0,1200)};
  const statements=Array.isArray(parsed)?parsed:[parsed];
  return {ok:true,rows:statements.flatMap(item=>arr(item?.results))};
}

function secretPresence(){
  const run=runWrangler(['secret','list','--config',CONFIG]);
  const text=`${run.stdout}\n${run.stderr}`;
  return {
    ok:run.ok,
    presence:Object.fromEntries(SECRET_NAMES.map(name=>[name,new RegExp(`\\b${name}\\b`).test(text)])),
    error:run.ok?null:text.trim().slice(0,1200)
  };
}

async function publicPons(){
  try{
    const response=await fetch(`${ORIGIN}/api/intelligence/pons/galaxy?limit=50`,{
      headers:{accept:'application/json','cache-control':'no-cache'},
      cache:'no-store',
      signal:AbortSignal.timeout(20_000)
    });
    const body=await response.json().catch(()=>null);
    return {http:response.status,ok:response.ok&&body?.ok===true,launches:arr(body?.data?.launches).length,error:body?.error??null,coverage:body?.data?.coverage??null};
  }catch(error){return {http:0,ok:false,launches:0,error:String(error?.message||error)};}
}

console.log('A BULLS APP — PONS PRODUCTION DIAGNOSTIC');
console.log(`origin=${ORIGIN}`);

const secrets=secretPresence();
console.log('\n=== PROVIDER AUTH CONFIGURATION (NAMES ONLY) ===');
console.log(JSON.stringify(secrets,null,2));

const queries={
  counts:`SELECT (SELECT COUNT(*) FROM pons_launches) AS launch_count,(SELECT COUNT(*) FROM pons_rank_candidates) AS candidate_count,(SELECT COUNT(*) FROM pons_rank_candidates WHERE active=1) AS active_count,(SELECT COUNT(*) FROM pons_rank_candidates WHERE current_rank IS NOT NULL) AS ranked_count;`,
  discovery:`SELECT factory,factory_version,start_block,next_to_block,complete,discovered_launches,last_success_at,last_error,updated_at FROM pons_discovery_state ORDER BY factory_version;`,
  cursor:`SELECT factory,cursor_json,source,updated_at FROM pons_discovery_cursor ORDER BY factory;`,
  indexState:`SELECT factory,factory_version,last_scanned_block,last_success_at,last_error,updated_at FROM pons_index_state ORDER BY factory_version;`,
  latest:`SELECT token,factory,factory_version,block_number,block_time,finality,updated_at FROM pons_launches ORDER BY COALESCE(block_time,0) DESC,updated_at DESC LIMIT 5;`
};
const d1={};
console.log('\n=== REMOTE D1 PONS STATE ===');
for(const [name,sql] of Object.entries(queries)){
  d1[name]=queryD1(sql);
  console.log(JSON.stringify({query:name,...d1[name]}));
}

console.log('\n=== PUBLIC PONS ROUTE ===');
const publicState=await publicPons();
console.log(JSON.stringify(publicState));

const authConfigured=Boolean(secrets.presence?.PONS_BLOCKSCOUT_API_KEY||secrets.presence?.BLOCKSCOUT_API_KEY);
const privateRpcConfigured=Boolean(secrets.presence?.PONS_RPC_URL);
const legacyHolderConfigured=Boolean(secrets.presence?.PONS_BITQUERY_TOKEN||secrets.presence?.BITQUERY_API_TOKEN);
const counts=d1.counts?.rows?.[0]||{};
const launchCount=n(counts.launch_count);
const discoveryRows=arr(d1.discovery?.rows);
const cursorRows=arr(d1.cursor?.rows);
const errors=discoveryRows.map(row=>String(row?.last_error||'')).filter(Boolean);
const sources=[...new Set(cursorRows.map(row=>String(row?.source||'')).filter(Boolean))];

console.log('\n=== PONS DIAGNOSIS ===');
if(!authConfigured){
  console.log('- PONS_BLOCKSCOUT_AUTH_MISSING: neither PONS_BLOCKSCOUT_API_KEY nor BLOCKSCOUT_API_KEY is installed as an Intelligence Worker secret. Production therefore cannot use authenticated Blockscout discovery or fresh Blockscout holder counters.');
}else{
  console.log('- PONS_BLOCKSCOUT_AUTH_PRESENT: an authenticated Blockscout secret name is installed on the Intelligence Worker. Secret values were not read or printed.');
}
console.log(`- PONS_PRIVATE_RPC_${privateRpcConfigured?'PRESENT':'MISSING'}: ${privateRpcConfigured?'a private PONS_RPC_URL secret is configured ahead of bounded public fallbacks.':'no private PONS_RPC_URL secret is installed; configured public/archive fallbacks are used for RPC discovery.'}`);
console.log(`- PONS_LEGACY_HOLDER_${legacyHolderConfigured?'PRESENT':'MISSING'}: ${legacyHolderConfigured?'a legacy Bitquery holder credential exists and can be considered only as a bounded fallback if Blockscout holder counters remain unavailable.':'no legacy Bitquery holder credential name is installed.'}`);
if(launchCount>0){
  console.log(`- PONS_DISCOVERY_POPULATED: ${launchCount} verified launches are retained. Continue with enrichment/qualification if the public route is still empty.`);
}else if(errors.length){
  console.log(`- PONS_DISCOVERY_STILL_EMPTY: zero verified launches are retained. discovery_errors=${JSON.stringify(errors)} cursor_sources=${JSON.stringify(sources)}`);
}else{
  console.log(`- PONS_DISCOVERY_STILL_EMPTY: zero verified launches are retained and discovery has no recorded provider error. cursor_sources=${JSON.stringify(sources)}`);
}
if(publicState.launches>0)console.log(`- PONS_PUBLIC_POPULATED: public route currently returns ${publicState.launches} PonsFamily PLANETS.`);
else console.log('- PONS_PUBLIC_EMPTY: public route still returns zero PonsFamily PLANETS.');
console.log('No fake PLANETS, holders, launches, prices, or cost basis were generated.');
