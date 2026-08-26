import { intelligenceDb } from './intelligence-indexer.mjs';
import { backfillHistoryPass } from './intelligence-history-engine.mjs';
import { buildRetrievalPlan, loadObservedSourceHealth } from './intelligence-source-selection.mjs';

const s=v=>String(v==null?'':v).trim();
const uniqByUrl=sources=>{const seen=new Set(),out=[];for(const source of sources){const url=s(source?.url);if(!url||seen.has(url))continue;seen.add(url);out.push(source);}return out;};

export function configuredRpcSources(env={}){
  const sources=[];
  const primary=s(env.INTELLIGENCE_RPC_URL||env.SOLANA_RPC_URL);
  if(primary)sources.push({name:'configured-rpc',kind:'rpc',url:primary});
  const fallbacks=s(env.INTELLIGENCE_RPC_FALLBACK_URLS).split(',').map(x=>x.trim()).filter(Boolean);
  fallbacks.forEach((url,index)=>sources.push({name:`configured-rpc-fallback-${index+1}`,kind:'rpc',url}));
  const key=s(env.HELIUS_API_KEY);
  if(key)sources.push({name:'helius-standard-rpc',kind:'rpc',url:`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`});
  sources.push({name:'solana-public-rpc',kind:'rpc',url:'https://api.mainnet-beta.solana.com'});
  return Object.freeze(uniqByUrl(sources).map(source=>Object.freeze(source)));
}

export function mergeSourceHealth(configured=[],observed=[]){
  const health=new Map((Array.isArray(observed)?observed:[]).map(row=>[s(row.name),row]));
  return Object.freeze((Array.isArray(configured)?configured:[]).map(source=>Object.freeze({...source,...(health.get(source.name)||{}),name:source.name,kind:source.kind,url:source.url,state:s(health.get(source.name)?.state||'unknown')||'unknown'})));
}

export async function runSourceAwareHistoryPass(env={},wallet='',options={}){
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');
  const configured=configuredRpcSources(env),observed=await loadObservedSourceHealth(db),sources=mergeSourceHealth(configured,observed),plan=buildRetrievalPlan(sources,{from:options.from,to:options.to,nowSeconds:options.nowSeconds});
  const attempts=[];
  for(const source of plan.attemptOrder){
    try{
      const result=await backfillHistoryPass(env,wallet,{...options,source});
      return Object.freeze({...result,retrieval:Object.freeze({depthClass:plan.depthClass,selected:source.name,attempts:Object.freeze([...attempts,{source:source.name,ok:true}]),coverageClaim:plan.coverageClaim,disclosure:plan.disclosure})});
    }catch(error){attempts.push(Object.freeze({source:source.name,ok:false,error:s(error?.message||error)}));}
  }
  const failure=new Error('history_sources_exhausted');
  failure.attempts=attempts;
  throw failure;
}
