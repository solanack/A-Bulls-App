/* A Bulls App — external Intelligence Mesh bridge runner.
 * Runs outside Cloudflare. Provider transports are injected explicitly; this file does not guess vendor APIs.
 */
const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function base(value){return s(value).replace(/\/+$/,'');}
function headers(token){return {'content-type':'application/json','authorization':`Bearer ${token}`};}
async function postJson(fetchImpl,url,token,body){
  const response=await fetchImpl(url,{method:'POST',headers:headers(token),body:JSON.stringify(body)});
  let payload={};try{payload=await response.json();}catch{}
  if(!response.ok||payload?.ok===false)throw new Error(s(payload?.error)||`http_${response.status}`);
  return payload;
}

export function normalizeBridgeConfig(config={}){
  const apiBase=base(config.apiBase||config.INTELLIGENCE_API_BASE),token=s(config.token||config.INTELLIGENCE_MESH_INGEST_TOKEN),sourceKinds=(Array.isArray(config.sourceKinds)?config.sourceKinds:s(config.INTELLIGENCE_BRIDGE_SOURCE_KINDS).split(',')).map(x=>s(x).toLowerCase()).filter(Boolean),limit=Math.max(1,Math.min(5,Math.trunc(Number(config.limit||1)))),leaseSeconds=Math.max(30,Math.min(300,Math.trunc(Number(config.leaseSeconds||120))));
  if(!apiBase)throw new Error('intelligence_api_base_required');
  if(!token)throw new Error('intelligence_mesh_ingest_token_required');
  if(!sourceKinds.length)throw new Error('bridge_source_kinds_required');
  return Object.freeze({apiBase,token,sourceKinds:Object.freeze([...new Set(sourceKinds)]),limit,leaseSeconds});
}

export function normalizeExecutorResult(result={},task={}){
  const rows=Array.isArray(result.rows)?result.rows:[],nftRows=Array.isArray(result.nftRows)?result.nftRows:[],searchedFrom=finite(result.searchedFrom),searchedTo=finite(result.searchedTo),rangeVerified=result.rangeVerified===true;
  const validRange=searchedFrom!=null&&searchedTo!=null&&searchedTo>=searchedFrom;
  return Object.freeze({rows:Object.freeze(rows),nftRows:Object.freeze(nftRows),mint:s(result.mint),quoteMint:s(result.quoteMint),bucketSeconds:finite(result.bucketSeconds),searchedFrom:validRange?Math.trunc(searchedFrom):null,searchedTo:validRange?Math.trunc(searchedTo):null,rangeVerified:Boolean(rangeVerified&&validRange),observedRows:Math.max(0,Math.trunc(finite(result.observedRows)??rows.length+nftRows.length)),source:s(result.source||task.source||task.sourceKind)});
}

async function finish(fetchImpl,config,task,state,error='',receipt={}){
  return postJson(fetchImpl,`${config.apiBase}/api/internal/intelligence/retrieval-tasks/finish`,config.token,{taskId:task.taskId,state,error,wallet:task.wallet,sourceKind:task.sourceKind,...receipt});
}

export async function processRetrievalTask(task={}, {config,executors,fetchImpl=fetch}={}){
  const executor=executors?.[task.sourceKind]||executors?.[task.source];
  if(typeof executor!=='function'){
    await finish(fetchImpl,config,task,'retry','bridge_executor_unavailable');
    return Object.freeze({ok:false,taskId:task.taskId,state:'retry',error:'bridge_executor_unavailable'});
  }
  try{
    const result=normalizeExecutorResult(await executor(Object.freeze({...task})),task);
    if(!result.rows.length&&!result.nftRows.length){
      const completion=await finish(fetchImpl,config,task,'complete','',{searchedFrom:result.searchedFrom,searchedTo:result.searchedTo,rangeVerified:result.rangeVerified,observedRows:0});
      return Object.freeze({ok:true,taskId:task.taskId,state:'complete-empty',receipt:completion?.receipt||null});
    }
    const adapterKind=task.sourceKind;
    const payload={taskId:task.taskId,wallet:task.wallet,source:result.source,rows:result.rows,nftRows:result.nftRows,searchedFrom:result.searchedFrom,searchedTo:result.searchedTo,rangeVerified:result.rangeVerified,observedRows:result.observedRows};
    if(result.mint)payload.mint=result.mint;
    if(result.quoteMint)payload.quoteMint=result.quoteMint;
    if(result.bucketSeconds!=null)payload.bucketSeconds=result.bucketSeconds;
    const ingest=await postJson(fetchImpl,`${config.apiBase}/api/internal/intelligence/adapters/${adapterKind}`,config.token,payload);
    if(ingest.taskCompletion?.ok===false)throw new Error(`task_completion:${s(ingest.taskCompletion.error)||'unknown'}`);
    return Object.freeze({ok:true,taskId:task.taskId,state:'ingested',accepted:Number(ingest.accepted)||0,nftAccepted:Number(ingest.nftAccepted)||0,taskCompletion:ingest.taskCompletion||null});
  }catch(error){
    const message=s(error?.message||error)||'external_retrieval_failed';
    await finish(fetchImpl,config,task,'retry',message).catch(()=>null);
    return Object.freeze({ok:false,taskId:task.taskId,state:'retry',error:message});
  }
}

export async function runBridgeOnce(options={}){
  const config=normalizeBridgeConfig(options.config||options.env||process.env),fetchImpl=options.fetchImpl||fetch,executors=options.executors||{};
  const claim=await postJson(fetchImpl,`${config.apiBase}/api/internal/intelligence/retrieval-tasks/claim`,config.token,{sourceKinds:config.sourceKinds,limit:config.limit,leaseSeconds:config.leaseSeconds});
  const tasks=Array.isArray(claim.tasks)?claim.tasks:[],results=[];
  for(const task of tasks)results.push(await processRetrievalTask(task,{config,executors,fetchImpl}));
  return Object.freeze({ok:true,claimed:tasks.length,results:Object.freeze(results)});
}

export async function runBridgeLoop(options={}){
  const intervalMs=Math.max(1000,Math.trunc(Number(options.intervalMs||5000)));
  while(!options.signal?.aborted){
    await runBridgeOnce(options).catch(()=>null);
    if(options.signal?.aborted)break;
    await sleep(intervalMs);
  }
}
