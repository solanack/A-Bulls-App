const origin=String(process.env.A_BULLS_ORIGIN||'https://abullsapp.com').replace(/\/$/,'');
const SOL='So11111111111111111111111111111111111111112';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const safeText=value=>String(value==null?'':value).trim();

async function getJson(path,init={}){
  const response=await fetch(`${origin}${path}`,{...init,headers:{accept:'application/json','cache-control':'no-cache',...(init.headers||{})},signal:AbortSignal.timeout(30_000)});
  const text=await response.text();
  let body=null;try{body=JSON.parse(text)}catch{body={ok:false,error:'invalid_json_response',preview:text.slice(0,160)}}
  return {http:response.status,body};
}

function snapshot(trade,attempt,response){
  const bundle=response?.body?.bundle||{},indexing=bundle.indexing||{},market=bundle.marketHydration||{};
  return {
    attempt,
    http:response?.http??null,
    ok:response?.body?.ok===true,
    eventCount:Number(bundle.eventCount||0),
    candleCount:Array.isArray(bundle.candles)?bundle.candles.length:0,
    indexingState:safeText(indexing.state)||null,
    indexingRequested:Boolean(indexing.requested),
    windowComplete:Boolean(indexing.windowComplete),
    jobStates:Array.isArray(indexing.jobs)?indexing.jobs.map(job=>safeText(job?.state)).filter(Boolean):[],
    marketState:safeText(market.state)||null,
    marketPending:Boolean(market.pending),
    marketReason:safeText(market.reason)||null,
    sources:Array.isArray(bundle.sources)?bundle.sources.slice(0,12):[],
    error:safeText(response?.body?.error)||null,
    tradeId:safeText(trade?.tradeId||trade?.id)||null
  };
}

async function main(){
  const started=Date.now(),results=await getJson('/api/intelligence/fomo/results?limit=20');
  const trades=[...(results.body?.winners||[]),...(results.body?.losers||[])].filter(row=>row?.wallet&&row?.mint&&row?.fromTs&&row?.toTs);
  const sparse=trades.find(row=>row.observedIndexed===false),trade=sparse||trades[0];
  if(!trade){
    console.log(JSON.stringify({ok:true,status:'no-qualified-fomo-trade',http:results.http,elapsedMs:Date.now()-started}));
    return;
  }
  if(!sparse){
    console.log(JSON.stringify({ok:true,status:'no-sparse-row-currently-available',sample:{tradeId:safeText(trade.tradeId||trade.id),observedIndexed:Boolean(trade.observedIndexed)},elapsedMs:Date.now()-started}));
    return;
  }
  const request={wallet:trade.wallet,mint:trade.mint,quoteMint:SOL,from:Math.floor(Number(trade.fromTs)/1000),to:Math.ceil(Number(trade.toTs)/1000),bucketSeconds:60,limit:500};
  const attempts=[];
  for(let attempt=0;attempt<7;attempt+=1){
    const response=await getJson('/api/intelligence/replay-bundle',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(request)});
    const state=snapshot(trade,attempt,response);attempts.push(state);
    if(state.eventCount>0&&state.candleCount>0)break;
    if(attempt<6)await sleep(attempt===0?3000:5000);
  }
  const final=attempts.at(-1)||{};
  console.log(JSON.stringify({
    ok:true,
    status:final.eventCount>0&&final.candleCount>0?'hydrated':final.eventCount>0?'events-ready-market-pending':final.candleCount>0?'market-ready-history-pending':final.windowComplete?'window-complete-no-matching-token-events':'still-hydrating',
    target:{tradeId:safeText(trade.tradeId||trade.id),handle:safeText(trade.handle)||null,wallet:safeText(trade.wallet),mint:safeText(trade.mint),from:request.from,to:request.to,observedIndexed:Boolean(trade.observedIndexed)},
    attempts,
    elapsedMs:Date.now()-started
  }));
}

try{await main()}catch(error){
  console.log(JSON.stringify({ok:false,status:'diagnostic-error',error:safeText(error?.message||error)}));
}
