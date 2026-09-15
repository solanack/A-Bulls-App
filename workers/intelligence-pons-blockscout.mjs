/* A Bulls App — Robinhood Chain Blockscout routing for PonsFamily.
 *
 * Per-instance Blockscout REST is retained as an unauthenticated fallback, but
 * production can use the universal Blockscout PRO REST API when a secret is
 * configured. Public reads remain D1-only; these helpers are for bounded
 * scheduled/protected indexing and enrichment.
 */
import { providerFetch } from './intelligence-fetch.mjs';

export const PONS_BLOCKSCOUT_CHAIN_ID=4663;
const INSTANCE_REST='https://robinhoodchain.blockscout.com/api/v2';
const PRO_REST=`https://api.blockscout.com/${PONS_BLOCKSCOUT_CHAIN_ID}/api/v2`;
const s=value=>String(value??'').trim();

export function ponsBlockscoutApiKey(env={}){
  return s(env.PONS_BLOCKSCOUT_API_KEY||env.BLOCKSCOUT_API_KEY);
}

export function ponsBlockscoutSource(env={}){
  return ponsBlockscoutApiKey(env)?'blockscout-pro-rest-v2':'blockscout-instance-v2';
}

function restUrl(env,path){
  const key=ponsBlockscoutApiKey(env);
  const url=new URL(`${key?PRO_REST:INSTANCE_REST}${path}`);
  if(key)url.searchParams.set('apikey',key);
  return url;
}

function applyCursor(url,cursor){
  if(!cursor||typeof cursor!=='object'||Array.isArray(cursor))return url;
  for(const [key,value] of Object.entries(cursor))if(value!=null&&value!=='')url.searchParams.set(key,String(value));
  return url;
}

export function buildPonsBlockscoutAddressLogsUrl(env={},factory,cursor=null){
  const address=s(factory?.address??factory).toLowerCase();
  const url=restUrl(env,`/addresses/${encodeURIComponent(address)}/logs`);
  return applyCursor(url,cursor).toString();
}

export function buildPonsBlockscoutTokenCountersUrl(env={},token){
  const address=s(token).toLowerCase();
  return restUrl(env,`/tokens/${encodeURIComponent(address)}/counters`).toString();
}

export async function fetchPonsBlockscoutJson(env={},url,fetchImpl=providerFetch){
  const response=await fetchImpl(url,{
    headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)'},
    signal:AbortSignal.timeout(10_000)
  });
  if(!response.ok)throw new Error(`pons_${ponsBlockscoutSource(env)}_http_${response.status}`);
  return response.json();
}

export const __ponsBlockscoutContract=Object.freeze({
  chainId:PONS_BLOCKSCOUT_CHAIN_ID,
  readOnly:true,
  proPreferredWhenConfigured:true,
  instanceFallback:true,
  publicReadsD1Only:true
});
