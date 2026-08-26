import { intelligenceDb } from './intelligence-indexer.mjs';
import { backfillHistoryPass } from './intelligence-history-engine.mjs';
import { buildRetrievalPlan, loadObservedSourceHealth } from './intelligence-source-selection.mjs';
import { externalRetrievalEnabled, queueExternalRetrievalTask } from './intelligence-retrieval-tasks.mjs';

const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const enabled=v=>s(v).toLowerCase()==='true';
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

export function configuredExternalHistorySources(env={},observed=[]){
  const health=new Map((Array.isArray(observed)?observed:[]).map(row=>[s(row.name),row]));
  const configured=[];
  if(enabled(env.INTELLIGENCE_SUBSTREAMS_HISTORY_ENABLED))configured.push({name:s(env.INTELLIGENCE_SUBSTREAMS_SOURCE_NAME)||'substreams-svm',kind:'substreams'});
  if(enabled(env.INTELLIGENCE_OLD_FAITHFUL_HISTORY_ENABLED))configured.push({name:s(env.INTELLIGENCE_OLD_FAITHFUL_SOURCE_NAME)||'old-faithful',kind:'old-faithful'});
  return Object.freeze(configured.map(source=>Object.freeze({...source,...(health.get(source.name)||{}),name:source.name,kind:source.kind,url:null,execution:'external-bridge',state:s(health.get(source.name)?.state||'unknown')||'unknown'})));
}

export function mergeSourceHealth(configured=[],observed=[]){
  const health=new Map((Array.isArray(observed)?observed:[]).map(row=>[s(row.name),row]));
  return Object.freeze((Array.isArray(configured)?configured:[]).map(source=>Object.freeze({...source,...(health.get(source.name)||{}),name:source.name,kind:source.kind,url:source.url,state:s(health.get(source.name)?.state||'unknown')||'unknown'})));
}

export function externalHistorySource(source={}){
  const kind=s(source.kind||source.sourceKind).toLowerCase();
  return kind==='substreams'||kind==='old-faithful'||kind.includes('faithful');
}

async function existingExternalTask(db,{indexJobId,source,from,to}){
  if(indexJobId==null||from==null||to==null)return null;
  return db.prepare(`SELECT id,state,lease_until,range_verified,searched_from,searched_to FROM intelligence_retrieval_tasks WHERE index_job_id=? AND source_kind=? AND requested_from=? AND requested_to=? ORDER BY updated_at DESC LIMIT 1`).bind(indexJobId,s(source.kind),Math.trunc(from),Math.trunc(to)).first();
}

export async function runSourceAwareHistoryPass(env={},wallet='',options={}){
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');
  const configured=configuredRpcSources(env),observed=await loadObservedSourceHealth(db),rpcSources=mergeSourceHealth(configured,observed),externalSources=configuredExternalHistorySources(env,observed),from=finite(options.from),to=finite(options.to),indexJobId=finite(options.indexJobId);
  const request={from,to,nowSeconds:options.nowSeconds};

  if(externalRetrievalEnabled(env)&&indexJobId!=null&&from!=null&&to!=null&&externalSources.length){
    const combined=Object.freeze([...rpcSources,...externalSources]),combinedPlan=buildRetrievalPlan(combined,request),preferred=combinedPlan.primary;
    if(preferred&&externalHistorySource(preferred)){
      const existing=await existingExternalTask(db,{indexJobId,source:preferred,from,to});
      if(existing?.state==='queued'||existing?.state==='leased')return Object.freeze({ok:true,deferred:true,state:'waiting-external',source:s(preferred.name),externalTaskId:Number(existing.id),retrieval:Object.freeze({depthClass:combinedPlan.depthClass,selected:s(preferred.name),coverageClaim:'unknown-until-measured',disclosure:combinedPlan.disclosure})});
      if(!existing){
        const queued=await queueExternalRetrievalTask(env,{indexJobId,wallet,source:s(preferred.name),sourceKind:s(preferred.kind),requestedFrom:from,requestedTo:to});
        return Object.freeze({ok:true,deferred:true,state:'waiting-external',source:s(preferred.name),externalTaskId:Number(queued?.task?.taskId)||null,retrieval:Object.freeze({depthClass:combinedPlan.depthClass,selected:s(preferred.name),coverageClaim:'unknown-until-measured',disclosure:combinedPlan.disclosure})});
      }
      // completed or terminally failed external work is never recreated for the same bounded request.
      // The progressive RPC path below remains available for repair/continuation.
    }
  }

  const plan=buildRetrievalPlan(rpcSources,request),attempts=[];
  for(const source of plan.attemptOrder.filter(item=>s(item.kind)==='rpc'&&s(item.url))){
    try{
      const result=await backfillHistoryPass(env,wallet,{...options,source});
      return Object.freeze({...result,retrieval:Object.freeze({depthClass:plan.depthClass,selected:source.name,attempts:Object.freeze([...attempts,{source:source.name,ok:true}]),coverageClaim:plan.coverageClaim,disclosure:plan.disclosure})});
    }catch(error){attempts.push(Object.freeze({source:source.name,ok:false,error:s(error?.message||error)}));}
  }
  const failure=new Error('history_sources_exhausted');
  failure.attempts=attempts;
  throw failure;
}
