const s=value=>String(value==null?'':value).trim();
const num=value=>Number.isFinite(Number(value))?Number(value):null;
const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function boundedInt(value,fallback,min,max){const parsed=Math.trunc(Number(value));return Number.isFinite(parsed)?Math.max(min,Math.min(max,parsed)):fallback;}

export function createOldFaithfulJsonRpcTransport({endpoint,fetchImpl=globalThis.fetch,headers={},pageSize=1000,maxPages=100,timeoutMs=15000}={}){
  const url=s(endpoint);if(!/^https?:\/\//i.test(url))throw new TypeError('old_faithful_rpc_endpoint_required');
  if(typeof fetchImpl!=='function')throw new TypeError('fetch_required');
  const limit=boundedInt(pageSize,1000,1,1000),pageBudget=boundedInt(maxPages,100,1,1000),timeout=boundedInt(timeoutMs,15000,1000,120000);
  let rpcId=0;
  async function rpc(method,params){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const response=await fetchImpl(url,{method:'POST',headers:{'content-type':'application/json',accept:'application/json',...headers},body:JSON.stringify({jsonrpc:'2.0',id:++rpcId,method,params}),signal:controller.signal});
      if(!response.ok)throw new Error(`old_faithful_http_${response.status}`);
      const body=await response.json();if(body?.error)throw new Error(`old_faithful_rpc_${body.error.code??'error'}:${s(body.error.message)||'unknown'}`);return body?.result;
    }finally{clearTimeout(timer);}
  }
  return async task=>{
    const wallet=s(task?.wallet),requestedFrom=num(task?.requestedFrom),requestedTo=num(task?.requestedTo);
    if(!WALLET_RE.test(wallet))throw new Error('old_faithful_valid_public_wallet_required');
    if(requestedFrom==null||requestedTo==null||requestedFrom<0||requestedTo<requestedFrom)throw new Error('old_faithful_valid_requested_window_required');
    const rows=[];let before,complete=false,pages=0,sawTimedRow=false,oldestTimed=null,newestTimed=null;
    while(pages<pageBudget){
      const options={limit};if(before)options.before=before;
      const result=await rpc('getSignaturesForAddress',[wallet,options]);
      if(!Array.isArray(result))throw new Error('old_faithful_invalid_signature_response');
      pages+=1;
      if(!result.length){complete=true;break;}
      let pageOldest=null;
      for(const item of result){
        const signature=s(item?.signature),blockTime=num(item?.blockTime),slot=num(item?.slot);
        if(!signature)continue;
        if(blockTime!=null){sawTimedRow=true;oldestTimed=oldestTimed==null?blockTime:Math.min(oldestTimed,blockTime);newestTimed=newestTimed==null?blockTime:Math.max(newestTimed,blockTime);pageOldest=pageOldest==null?blockTime:Math.min(pageOldest,blockTime);}
        if(blockTime!=null&&blockTime>=requestedFrom&&blockTime<=requestedTo)rows.push(Object.freeze({signature,slot:slot==null?0:Math.trunc(slot),blockTime:Math.trunc(blockTime),archiveRef:s(item?.archiveRef||item?.archive_ref||item?.cid)}));
      }
      const last=result.at(-1),lastSignature=s(last?.signature);if(!lastSignature)throw new Error('old_faithful_pagination_signature_required');before=lastSignature;
      if(pageOldest!=null&&pageOldest<=requestedFrom){complete=true;break;}
      if(result.length<limit){complete=true;break;}
    }
    if(!complete)throw new Error('old_faithful_page_budget_exhausted');
    if(!sawTimedRow&&rows.length===0){
      return Object.freeze({rows:Object.freeze([]),searchedFrom:Math.trunc(requestedFrom),searchedTo:Math.trunc(requestedTo),complete:true,rangeVerified:true,source:'old-faithful',pages,disclosure:'The configured Old Faithful source returned no address signatures during its complete pagination response. This verifies only the bounded provider search, not global Solana completeness.'});
    }
    if(oldestTimed!=null&&oldestTimed>requestedFrom) {
      // Exhausting the provider result set is acceptable; stopping only because a short page was returned is the provider's end-of-history signal.
      // The bounded receipt still describes this provider search, not complete blockchain coverage.
    }
    rows.sort((a,b)=>a.blockTime-b.blockTime||a.signature.localeCompare(b.signature));
    return Object.freeze({rows:Object.freeze(rows),searchedFrom:Math.trunc(requestedFrom),searchedTo:Math.trunc(requestedTo),complete:true,rangeVerified:true,source:'old-faithful',pages,oldestObserved:oldestTimed,newestObserved:newestTimed,disclosure:'Verified range means the configured Old Faithful RPC pagination crossed or exhausted the requested public-wallet interval. It does not certify that this provider contains every Solana archive epoch.'});
  };
}
