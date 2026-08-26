import { createHistoricalExecutor } from './executor-contract.mjs';

const s=v=>String(v==null?'':v).trim();
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;

export function normalizeSubstreamsTransportResult(result={},task={}){
  const rows=Array.isArray(result.rows)?result.rows:Array.isArray(result.events)?result.events:[];
  const searchedFrom=finite(result.searchedFrom??result.from),searchedTo=finite(result.searchedTo??result.to);
  const complete=result.complete===true||result.rangeVerified===true;
  if(!complete)throw new Error('substreams_complete_range_required');
  if(searchedFrom==null||searchedTo==null)throw new Error('substreams_searched_range_required');
  return Object.freeze({
    rows:Object.freeze(rows),
    nftRows:Object.freeze(Array.isArray(result.nftRows)?result.nftRows:[]),
    searchedFrom:Math.trunc(searchedFrom),
    searchedTo:Math.trunc(searchedTo),
    rangeVerified:true,
    source:s(result.source||task.source||'substreams'),
    mint:s(result.mint),
    quoteMint:s(result.quoteMint),
    bucketSeconds:finite(result.bucketSeconds)
  });
}

export function createSubstreamsExecutor({transport}={}){
  if(typeof transport!=='function')throw new TypeError('substreams_transport_required');
  return createHistoricalExecutor({kind:'substreams',retrieve:async task=>normalizeSubstreamsTransportResult(await transport(task),task)});
}
