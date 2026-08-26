/* Provider-neutral contract for external historical executors.
 * Concrete transports must map verified provider responses into this shape.
 */
const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;

export const HISTORICAL_EXECUTOR_KINDS=Object.freeze(['substreams','old-faithful']);

export function normalizeHistoricalTask(task={}){
  const taskId=finite(task.taskId??task.id),wallet=s(task.wallet),source=s(task.source),sourceKind=s(task.sourceKind??task.source_kind).toLowerCase(),requestedFrom=finite(task.requestedFrom??task.requested_from),requestedTo=finite(task.requestedTo??task.requested_to);
  if(!Number.isInteger(taskId)||taskId<=0)throw new TypeError('valid_task_id_required');
  if(!wallet)throw new TypeError('wallet_required');
  if(!HISTORICAL_EXECUTOR_KINDS.includes(sourceKind))throw new TypeError('unsupported_historical_executor_kind');
  if(requestedFrom==null||requestedTo==null||requestedFrom<0||requestedTo<requestedFrom)throw new TypeError('valid_requested_window_required');
  return Object.freeze({taskId,wallet,source,sourceKind,requestedFrom:Math.trunc(requestedFrom),requestedTo:Math.trunc(requestedTo)});
}

export function verifiedExecutorResult(task={},input={}){
  const normalizedTask=normalizeHistoricalTask(task),searchedFrom=finite(input.searchedFrom),searchedTo=finite(input.searchedTo),rows=Array.isArray(input.rows)?input.rows:[],nftRows=Array.isArray(input.nftRows)?input.nftRows:[];
  if(input.rangeVerified!==true)throw new Error('provider_range_verification_required');
  if(searchedFrom==null||searchedTo==null||searchedFrom>normalizedTask.requestedFrom||searchedTo<normalizedTask.requestedTo)throw new Error('provider_range_does_not_cover_task');
  return Object.freeze({rows:Object.freeze(rows),nftRows:Object.freeze(nftRows),searchedFrom:Math.trunc(searchedFrom),searchedTo:Math.trunc(searchedTo),rangeVerified:true,observedRows:rows.length+nftRows.length,source:s(input.source||normalizedTask.source||normalizedTask.sourceKind),mint:s(input.mint),quoteMint:s(input.quoteMint),bucketSeconds:finite(input.bucketSeconds)});
}

export function createHistoricalExecutor({kind,retrieve}={}){
  const sourceKind=s(kind).toLowerCase();
  if(!HISTORICAL_EXECUTOR_KINDS.includes(sourceKind))throw new TypeError('unsupported_historical_executor_kind');
  if(typeof retrieve!=='function')throw new TypeError('retrieve_function_required');
  return async rawTask=>{
    const task=normalizeHistoricalTask(rawTask);
    if(task.sourceKind!==sourceKind)throw new Error('executor_source_kind_mismatch');
    const result=await retrieve(task);
    return verifiedExecutorResult(task,result||{});
  };
}
