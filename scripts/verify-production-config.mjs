import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const requiredTrue=['UNIVERSE_ENABLED','TRICKSTER_STUDIO_ENABLED','PLAYABLE_DATA_ENABLED','INTELLIGENCE_MESH_ENABLED'];
const requiredFalse=['INTELLIGENCE_EXTERNAL_RETRIEVAL_ENABLED','INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED','INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED'];
const has=(text,pattern)=>pattern.test(String(text||''));

export function productionConfigFailures(source=''){
  const text=String(source||''),failures=[];
  if(/<[^>]+>|YOUR_|REPLACE_ME|example/i.test(text))failures.push('placeholder_values_present');
  if(!has(text,/main\s*=\s*["']worker-vnext-entry\.mjs["']/))failures.push('wrong_worker_entry');
  if(!has(text,/https:\/\/abullsapp\.com/)||!has(text,/https:\/\/www\.abullsapp\.com/))failures.push('production_origins_missing');
  if(!has(text,/\[\[d1_databases\]\][\s\S]*binding\s*=\s*["']LEADERBOARD_DB["'][\s\S]*database_id\s*=\s*["'][0-9a-f-]{16,}["']/i))failures.push('production_d1_binding_missing');
  if(!has(text,/\[\[ratelimits\]\][\s\S]*name\s*=\s*["']RATE_LIMITER["'][\s\S]*namespace_id\s*=\s*["']\d+["']/i))failures.push('production_rate_limit_binding_missing');
  if(!has(text,/\[observability\][\s\S]*enabled\s*=\s*true/i))failures.push('observability_missing');
  for(const key of requiredTrue)if(!has(text,new RegExp(`${key}\\s*=\\s*["']true["']`)))failures.push(`${key.toLowerCase()}_not_enabled`);
  for(const key of requiredFalse)if(!has(text,new RegExp(`${key}\\s*=\\s*["']false["']`)))failures.push(`${key.toLowerCase()}_not_fail_closed`);
  return Object.freeze(failures);
}

export async function verifyProductionConfig(path){const source=await readFile(path,'utf8'),failures=productionConfigFailures(source);return Object.freeze({ok:failures.length===0,path,failures});}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const path=process.argv[2];if(!path){console.error('Usage: node scripts/verify-production-config.mjs <production-wrangler.toml>');process.exit(2);}
  const result=await verifyProductionConfig(path);if(!result.ok){for(const failure of result.failures)console.error(`FAIL · ${failure}`);process.exit(1);}console.log(`PASS · production configuration ${result.path}`);
}
