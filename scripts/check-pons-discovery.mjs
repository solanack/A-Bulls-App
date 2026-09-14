import { spawnSync } from 'node:child_process';

const CONFIG='workers/wrangler.production.toml';
const DB='a-bulls-app-intelligence';
const ORIGIN=process.env.A_BULLS_ORIGIN||'https://abullsapp.com';

function runWrangler(args){
  const result=spawnSync('npx',['wrangler',...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']});
  if(result.status!==0)throw new Error((result.stderr||result.stdout||'wrangler failed').trim());
  return result.stdout;
}

function parseJson(text){
  const input=String(text||'').trim();
  for(let i=0;i<input.length;i+=1){
    if(input[i]!=='['&&input[i]!=='{')continue;
    try{return JSON.parse(input.slice(i));}catch{}
  }
  throw new Error('Could not parse Wrangler JSON output.');
}

function query(sql){
  const parsed=parseJson(runWrangler(['d1','execute',DB,'--remote','--config',CONFIG,'--command',sql,'--json']));
  const statements=Array.isArray(parsed)?parsed:[parsed];
  return statements.flatMap(item=>Array.isArray(item?.results)?item.results:[]);
}

console.log('A BULLS APP — PONS DISCOVERY CHECK');

const discovery=query(`SELECT factory,factory_version,start_block,next_to_block,complete,discovered_launches,last_success_at,last_error,updated_at FROM pons_discovery_state ORDER BY factory_version;`);
const counts=query(`SELECT (SELECT COUNT(*) FROM pons_launches) launch_count,(SELECT COUNT(*) FROM pons_rank_candidates) candidate_count,(SELECT COUNT(*) FROM pons_rank_candidates WHERE active=1) active_count,(SELECT COUNT(*) FROM pons_rank_candidates WHERE current_rank IS NOT NULL) ranked_count;`)[0]||{};
const latest=query(`SELECT token,factory_version,block_number,block_time,finality,updated_at FROM pons_launches ORDER BY block_number DESC,log_index DESC LIMIT 8;`);
const candidates=query(`SELECT token,symbol,market_cap_usd,volume_h24_usd,holder_count,active,current_rank,market_source,market_observed_at,holder_observed_at,updated_at FROM pons_rank_candidates ORDER BY active DESC,current_rank IS NULL,current_rank,volume_h24_usd DESC LIMIT 8;`);

console.log('\n=== DISCOVERY STATE ===');
console.log(JSON.stringify(discovery,null,2));
console.log('\n=== COUNTS ===');
console.log(JSON.stringify(counts,null,2));
console.log('\n=== LATEST VERIFIED LAUNCHES ===');
console.log(JSON.stringify(latest,null,2));
console.log('\n=== TOP CANDIDATES ===');
console.log(JSON.stringify(candidates,null,2));

try{
  const response=await fetch(`${ORIGIN}/api/intelligence/pons/galaxy?limit=50`,{headers:{accept:'application/json','cache-control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(20_000)});
  const body=await response.json();
  console.log('\n=== PUBLIC PONSFAMILY ROUTE ===');
  console.log(JSON.stringify({http:response.status,ok:body?.ok,launches:Array.isArray(body?.data?.launches)?body.data.launches.length:0,coverage:body?.data?.coverage??null,error:body?.error??null},null,2));
}catch(error){
  console.log('\n=== PUBLIC PONSFAMILY ROUTE ===');
  console.log(JSON.stringify({ok:false,error:String(error?.message||error)},null,2));
}

if(!discovery.length){
  console.log('\nRESULT: pons_discovery_state is empty. Apply migration 0028 and deploy the Intelligence Worker before expecting historical discovery.');
}else if(discovery.some(row=>row.last_error)){
  console.log('\nRESULT: historical discovery is running but at least one factory has an error. Inspect last_error above before changing ranking or rendering.');
}else if(Number(counts.launch_count||0)===0){
  console.log('\nRESULT: discovery state exists but no verified launch has been retained yet. Let the scheduled backfill continue, then rerun this check.');
}else if(Number(counts.candidate_count||0)===0){
  console.log('\nRESULT: verified launches now exist; the next failure point is market/holder enrichment into pons_rank_candidates.');
}else if(Number(counts.active_count||0)===0){
  console.log('\nRESULT: candidates exist but none currently satisfy/retain the PonsFamily qualification rules. Inspect the candidate evidence above.');
}else{
  console.log('\nRESULT: PonsFamily data pipeline is populated. If the galaxy is still visually empty, the remaining failure is frontend composition/rendering.');
}
