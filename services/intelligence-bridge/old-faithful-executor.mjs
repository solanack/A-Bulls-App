import { createHistoricalExecutor } from './executor-contract.mjs';

const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;

export function normalizeOldFaithfulTransportResult(result={},task={}){
  const rows=Array.isArray(result.rows)?result.rows:Array.isArray(result.transactions)?result.transactions:[];
  const searchedFrom=finite(result.searchedFrom??result.from),searchedTo=finite(result.searchedTo??result.to);
  const complete=result.complete===true||result.rangeVerified===true;
  if(!complete)throw new Error('old_faithful_complete_range_required');
  if(searchedFrom==null||searchedTo==null)throw new Error('old_faithful_searched_range_required');
  const source=s(result.source||task.source||'old-faithful');
  const normalizedRows=rows.map(row=>Object.freeze({...row,archiveRef:s(row?.archiveRef||row?.archive_ref||row?.cid)}));
  return Object.freeze({
    rows:Object.freeze(normalizedRows),
    nftRows:Object.freeze(Array.isArray(result.nftRows)?result.nftRows:[]),
    searchedFrom:Math.trunc(searchedFrom),
    searchedTo:Math.trunc(searchedTo),
    rangeVerified:true,
    source,
    mint:s(result.mint),
    quoteMint:s(result.quoteMint),
    bucketSeconds:finite(result.bucketSeconds)
  });
}

export function createOldFaithfulExecutor({transport}={}){
  if(typeof transport!=='function')throw new TypeError('old_faithful_transport_required');
  return createHistoricalExecutor({kind:'old-faithful',retrieve:async task=>normalizeOldFaithfulTransportResult(await transport(task),task)});
}
