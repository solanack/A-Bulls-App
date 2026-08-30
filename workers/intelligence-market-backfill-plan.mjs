const finite=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
const text=value=>String(value==null?'':value).trim();

export function buildMarketBackfillPlan(rows=[], {requestFrom=null,requestTo=null,maxCandidates=100}={}){
  const from=finite(requestFrom),to=finite(requestTo);
  if(from==null||to==null||to<from)throw new TypeError('valid requested coverage window is required');
  const candidates=[];
  for(const row of Array.isArray(rows)?rows:[]){
    const wallet=text(row?.wallet),oldest=finite(row?.oldest_block_time),complete=Number(row?.complete_to_genesis||0)>0;
    if(!wallet||complete||oldest==null||oldest<=from)continue;
    candidates.push(Object.freeze({wallet,requestFrom:Math.trunc(from),indexedOldestBlockTime:Math.trunc(oldest),missingOlderSeconds:Math.max(0,Math.trunc(oldest-from)),reason:'oldest-indexed-point-is-newer-than-request-start'}));
  }
  candidates.sort((a,b)=>b.missingOlderSeconds-a.missingOlderSeconds||a.wallet.localeCompare(b.wallet));
  const limited=Object.freeze(candidates.slice(0,Math.max(1,Math.min(500,Math.trunc(Number(maxCandidates)||100)))));
  return Object.freeze({
    requestFrom:Math.trunc(from),requestTo:Math.trunc(to),
    candidateCount:candidates.length,returnedCandidates:limited.length,truncated:candidates.length>limited.length,
    candidates:limited,
    disclosure:'Backfill candidates identify only observed wallets whose current oldest indexed point is newer than the requested start and whose history is not marked complete to genesis. This does not prove transactions exist in the missing interval, does not treat a quiet period as a data gap, and does not establish complete token-market coverage.'
  });
}

