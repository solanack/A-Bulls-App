// Bound provider waits so optional enrichment cannot hold a query indefinitely.
// Every direct providerFetch call receives at least one bounded retry for 429/5xx
// and transient network/timeout failures. Production fetch policy is configured
// once per Worker invocation from numeric env values only; no secrets are retained.

const s=value=>String(value??'').trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export const PROVIDER_REASON=Object.freeze({
  NO_EVIDENCE:'NO_EVIDENCE',
  PROVIDER_FAILURE:'PROVIDER_FAILURE',
  PROVIDER_TIMEOUT:'PROVIDER_TIMEOUT',
  PROVIDER_BUDGET_EXHAUSTED:'PROVIDER_BUDGET_EXHAUSTED'
});

const CONFIG_KEYS=Object.freeze([
  'PROVIDER_FETCH_TIMEOUT_MS','PROVIDER_FETCH_RETRIES','PROVIDER_FETCH_BACKOFF_MS',
  'FOMOAPI_FETCH_TIMEOUT_MS','FOMOAPI_FETCH_RETRIES','FOMOAPI_FETCH_BACKOFF_MS',
  'HELIUS_FETCH_TIMEOUT_MS','HELIUS_FETCH_RETRIES','HELIUS_FETCH_BACKOFF_MS',
  'COINGECKO_FETCH_TIMEOUT_MS','COINGECKO_FETCH_RETRIES','COINGECKO_FETCH_BACKOFF_MS',
  'BITQUERY_FETCH_TIMEOUT_MS','BITQUERY_FETCH_RETRIES','BITQUERY_FETCH_BACKOFF_MS',
  'BLOCKSCOUT_FETCH_TIMEOUT_MS','BLOCKSCOUT_FETCH_RETRIES','BLOCKSCOUT_FETCH_BACKOFF_MS',
  'DEXSCREENER_FETCH_TIMEOUT_MS','DEXSCREENER_FETCH_RETRIES','DEXSCREENER_FETCH_BACKOFF_MS'
]);
let configuredFetchEnv=Object.freeze({});

export function configureProviderFetch(env={}){
  const clean={};
  for(const key of CONFIG_KEYS){
    const value=env?.[key];
    if(value!=null&&value!=='')clean[key]=value;
  }
  configuredFetchEnv=Object.freeze(clean);
  return configuredFetchEnv;
}

export function providerNameFor(input,explicit=''){
  if(s(explicit))return s(explicit).toLowerCase();
  let host='';try{host=new URL(typeof input==='string'?input:input?.url).hostname.toLowerCase();}catch{}
  if(host.includes('fomoapi.io'))return'fomoapi';
  if(host.includes('helius'))return'helius';
  if(host.includes('coingecko'))return'coingecko';
  if(host.includes('bitquery'))return'bitquery';
  if(host.includes('blockscout'))return'blockscout';
  if(host.includes('dexscreener'))return'dexscreener';
  return'provider';
}

function envPrefix(provider){return s(provider).replace(/[^a-z0-9]+/gi,'_').toUpperCase();}
export function providerFetchPolicy(env={},provider='provider',overrides={}){
  const prefix=envPrefix(provider),timeoutRaw=n(overrides.timeoutMs??env[`${prefix}_FETCH_TIMEOUT_MS`]??env.PROVIDER_FETCH_TIMEOUT_MS),retryRaw=n(overrides.retries??env[`${prefix}_FETCH_RETRIES`]??env.PROVIDER_FETCH_RETRIES),backoffRaw=n(overrides.backoffMs??env[`${prefix}_FETCH_BACKOFF_MS`]??env.PROVIDER_FETCH_BACKOFF_MS);
  return Object.freeze({provider,timeoutMs:clamp(Math.trunc(timeoutRaw||6000),1000,30000),retries:clamp(Math.trunc(retryRaw||1),1,3),backoffMs:clamp(Math.trunc(backoffRaw||250),50,5000)});
}

function retryableStatus(status){return status===429||(status>=500&&status<=599);}
function timeoutLike(error){const name=s(error?.name).toLowerCase(),message=s(error?.message).toLowerCase();return name==='timeouterror'||name==='aborterror'||/timeout|timed out|aborted/.test(message);}
export function providerFailureReason(value){
  const message=s(value?.message??value).toLowerCase();
  if(value?.reasonCode&&Object.values(PROVIDER_REASON).includes(value.reasonCode))return value.reasonCode;
  if(/budget.*(blocked|exhaust)|credits.*exhaust|http_402|status.?402/.test(message))return PROVIDER_REASON.PROVIDER_BUDGET_EXHAUSTED;
  if(timeoutLike(value))return PROVIDER_REASON.PROVIDER_TIMEOUT;
  if(message)return PROVIDER_REASON.PROVIDER_FAILURE;
  return PROVIDER_REASON.NO_EVIDENCE;
}
export function honestEmpty(reason=PROVIDER_REASON.NO_EVIDENCE,detail=''){
  const code=Object.values(PROVIDER_REASON).includes(reason)?reason:providerFailureReason(reason);
  const disclosure=code===PROVIDER_REASON.NO_EVIDENCE?'No observed evidence is available for this request.':code===PROVIDER_REASON.PROVIDER_BUDGET_EXHAUSTED?'This source is temporarily unavailable while its data allowance resets or is replenished.':'This source could not be reached right now; retained evidence remains available where present.';
  return Object.freeze({available:false,reason:code,disclosure,detail:s(detail)||null});
}

function retryAfterMs(response,attempt,base){
  const raw=s(response?.headers?.get?.('retry-after'));
  const seconds=Number(raw);if(Number.isFinite(seconds)&&seconds>=0)return clamp(seconds*1000,50,5000);
  const when=Date.parse(raw);if(Number.isFinite(when))return clamp(when-Date.now(),50,5000);
  return clamp(base*(2**attempt),50,5000);
}

export async function providerFetch(input,init={},options={}){
  const env=options?.env&&typeof options.env==='object'?options.env:configuredFetchEnv,provider=providerNameFor(input,options?.provider),policy=providerFetchPolicy(env,provider,options),attempts=policy.retries+1;
  let lastError=null;
  for(let attempt=0;attempt<attempts;attempt++){
    const timeout=AbortSignal.timeout(policy.timeoutMs),signal=init.signal?AbortSignal.any([init.signal,timeout]):timeout;
    try{
      const response=await fetch(input,{...init,signal});
      if(retryableStatus(response.status)&&attempt<attempts-1){await sleep(retryAfterMs(response,attempt,policy.backoffMs));continue;}
      return response;
    }catch(error){
      lastError=error;
      if(attempt>=attempts-1)break;
      await sleep(clamp(policy.backoffMs*(2**attempt),50,5000));
    }
  }
  const timedOut=timeoutLike(lastError),error=new Error(timedOut?`${provider}_provider_timeout`:`${provider}_provider_failure`,{cause:lastError});
  error.reasonCode=timedOut?PROVIDER_REASON.PROVIDER_TIMEOUT:PROVIDER_REASON.PROVIDER_FAILURE;
  error.provider=provider;
  throw error;
}

export const __providerFetchContract=Object.freeze({minimumRetries:1,retryStatuses:Object.freeze([429,'5xx']),defaultTimeoutMs:6000,reasonCodes:Object.freeze(Object.values(PROVIDER_REASON)),configuredKeys:CONFIG_KEYS});
