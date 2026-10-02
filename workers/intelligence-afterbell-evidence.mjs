import { intelligenceDb, ingestDecodedObservations } from './intelligence-indexer.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';
import { afterbellWindow } from './intelligence-afterbell-traders.mjs';

const SYMBOLS=Object.freeze(['AAPLx','NVDAx','TSLAx','MSFTx','AMZNx','SPYx','QQQx','CRCLx']);
const USD_STABLE_MINTS=new Set(['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v','Es9vMFrzaCERmJfrF4H2FYDqfCMx1j8dYKVKJQmuayNX']);
const WSOL_MINT='So11111111111111111111111111111111111111112';
const ZONE='America/New_York';
const s=v=>String(v??'').trim(),n=v=>Number.isFinite(Number(v))?Number(v):0;
const valid=v=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s(v));

async function resolveMarket(symbol,fetchImpl=fetch){
  const r=await fetchImpl(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,{headers:{accept:'application/json'}});
  if(!r.ok)return null;
  const body=await r.json(),pairs=Array.isArray(body?.pairs)?body.pairs:[];
  const rows=pairs.filter(p=>
    s(p?.chainId).toLowerCase()==='solana'&&
    s(p?.baseToken?.symbol).toLowerCase()===symbol.toLowerCase()&&
    valid(p?.baseToken?.address)&&
    valid(p?.pairAddress)
  ).sort((a,b)=>n(b?.liquidity?.usd)-n(a?.liquidity?.usd)||n(b?.volume?.h24)-n(a?.volume?.h24));
  const pair=rows[0];
  return pair?{symbol,mint:s(pair.baseToken.address),pairAddress:s(pair.pairAddress),dexId:s(pair.dexId)||null}:null;
}

function signerOwners(tx){
  const message=tx?.transaction?.message||{};
  const keys=Array.isArray(message?.accountKeys)?message.accountKeys:Array.isArray(message?.staticAccountKeys)?message.staticAccountKeys:[];
  const direct=keys.filter(row=>row&&typeof row==='object'&&row.signer===true).map(row=>s(row.pubkey)).filter(valid);
  if(direct.length)return new Set(direct);
  const required=Math.max(0,Math.trunc(n(message?.header?.numRequiredSignatures)));
  if(!required)return new Set();
  return new Set(keys.slice(0,required).map(row=>s(typeof row==='string'?row:row?.pubkey)).filter(valid));
}

export function afterbellOwnerDeltas(tx,mint){
  const signers=signerOwners(tx);
  if(!signers.size)return[];
  const pre=Array.isArray(tx?.meta?.preTokenBalances)?tx.meta.preTokenBalances:[],post=Array.isArray(tx?.meta?.postTokenBalances)?tx.meta.postTokenBalances:[],map=new Map();
  for(const row of pre){
    const owner=s(row.owner),m=s(row.mint);
    if(!signers.has(owner)||!valid(m))continue;
    const key=owner+'|'+m,cur=map.get(key)||{owner,mint:m,pre:0,post:0};
    cur.pre=n(row?.uiTokenAmount?.uiAmountString??row?.uiTokenAmount?.uiAmount);map.set(key,cur);
  }
  for(const row of post){
    const owner=s(row.owner),m=s(row.mint);
    if(!signers.has(owner)||!valid(m))continue;
    const key=owner+'|'+m,cur=map.get(key)||{owner,mint:m,pre:0,post:0};
    cur.post=n(row?.uiTokenAmount?.uiAmountString??row?.uiTokenAmount?.uiAmount);map.set(key,cur);
  }
  const all=[...map.values()].map(x=>({...x,delta:x.post-x.pre})).filter(x=>Math.abs(x.delta)>1e-12),byOwner=new Map();
  for(const row of all){if(!byOwner.has(row.owner))byOwner.set(row.owner,[]);byOwner.get(row.owner).push(row);}
  const out=[];
  for(const [owner,rows] of byOwner){
    const stock=rows.find(row=>row.mint===mint);
    if(!stock)continue;
    const oppositeRows=rows.filter(row=>row.mint!==mint&&Math.sign(row.delta)===-Math.sign(stock.delta));
    if(!oppositeRows.length)continue;
    const counter=oppositeRows.slice().sort((a,b)=>{
      const rank=value=>USD_STABLE_MINTS.has(value)?0:value===WSOL_MINT?1:2;
      return rank(a.mint)-rank(b.mint)||Math.abs(b.delta)-Math.abs(a.delta);
    })[0];
    out.push({owner,delta:stock.delta,quoteMint:counter.mint,quoteDelta:counter.delta});
  }
  return out;
}

function afterbellRefreshClock(nowMs=Date.now()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:ZONE,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(nowMs));
  const out={};for(const part of parts)if(part.type!=='literal')out[part.type]=part.value;
  const day=s(out.weekday),minutes=n(out.hour)*60+n(out.minute),weekday=!['Sat','Sun'].includes(day);
  return Object.freeze({weekday,minutes,active:weekday&&(minutes>=16*60||minutes<9*60+30)});
}
export function shouldRefreshAfterbell(nowMs=Date.now()){return afterbellRefreshClock(nowMs).active;}

async function fetchMarketWindow(env,market,window,fetchImpl=fetch){
  const key=s(env.HELIUS_API_KEY);if(!key)return{...market,error:'helius_unconfigured',events:[]};
  const budget=await reserveProviderCredits(env,100,'helius');if(budget.blocked)return{...market,error:'provider_budget_blocked',events:[]};
  const r=await fetchImpl(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransactionsForAddress',params:[market.pairAddress,{
      transactionDetails:'full',
      encoding:'jsonParsed',
      maxSupportedTransactionVersion:1,
      sortOrder:'desc',
      commitment:'confirmed',
      limit:100,
      filters:{blockTime:{gte:window.from,lte:window.to},status:'succeeded'}
    }]})
  });
  if(!r.ok)return{...market,error:`helius_http_${r.status}`,events:[]};
  const body=await r.json();
  if(body?.error)return{...market,error:`helius_rpc_${s(body.error?.code)||'error'}`,events:[]};
  const data=Array.isArray(body?.result?.data)?body.result.data:[],events=[];
  for(const tx of data){
    const signature=s(tx?.transaction?.signatures?.[0]),blockTime=Math.trunc(n(tx?.blockTime)),slot=Math.trunc(n(tx?.slot));
    if(!signature||!blockTime)continue;
    for(const item of afterbellOwnerDeltas(tx,market.mint)){
      const buy=item.delta>0,baseAmount=Math.abs(item.delta),quoteAmount=Math.abs(item.quoteDelta);
      events.push({
        signature,slot,blockTime,wallet:item.owner,mint:market.mint,eventClass:'swap-like',solDelta:0,tokenDelta:item.delta,feeLamports:0,
        source:'helius-afterbell-pool-window',confidence:.92,decoderVersion:'afterbell-pool-window-v3',dexId:market.dexId||null,pool:market.pairAddress||null,
        execution:quoteAmount>0&&item.quoteMint?{side:buy?'buy':'sell',inputMint:buy?item.quoteMint:market.mint,outputMint:buy?market.mint:item.quoteMint,inputAmount:buy?quoteAmount:baseAmount,outputAmount:buy?baseAmount:quoteAmount,quoteMint:item.quoteMint,quoteAmount,baseAmount}:null
      });
    }
  }
  return{...market,error:null,transactions:data.length,events};
}

async function persistAfterbellRoutes(db,events=[]){
  const statements=[];
  for(const event of events){
    const route=event?.execution;if(!route||!event?.signature||!event?.wallet||!(n(route.inputAmount)>0)||!(n(route.outputAmount)>0))continue;
    statements.push(db.prepare(`INSERT INTO intelligence_trade_routes(signature,wallet,hop_index,program_id,venue,pool,input_mint,output_mint,input_amount,output_amount,fee_amount,fee_mint,slot,block_time,source,confidence) VALUES(?,?,0,NULL,?,?, ?,?,?,?,NULL,NULL,?,?,?,?) ON CONFLICT(signature,wallet,hop_index) DO NOTHING`).bind(event.signature,event.wallet,s(event.dexId)||null,s(event.pool)||null,s(route.inputMint),s(route.outputMint),Math.abs(n(route.inputAmount)),Math.abs(n(route.outputAmount)),n(event.slot)||null,n(event.blockTime)||null,'helius-afterbell-pool-window-receipt',.97));
  }
  if(!statements.length)return 0;
  if(typeof db.batch==='function')await db.batch(statements);else for(const stmt of statements)await stmt.run();
  return statements.length;
}

export async function refreshAfterbellEvidence(env={},options={}){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};
  const now=Math.trunc(n(options.nowMs)||Date.now()),window=afterbellWindow(now);
  if(options.force!==true&&!shouldRefreshAfterbell(now))return{ok:true,skipped:'regular-market-session',window,totalAccepted:0,results:[]};
  const slot=Math.floor(now/(15*60*1000)),batch=Math.max(1,Math.min(2,Math.trunc(n(options.batch)||1)));
  const resolved=(await Promise.all(SYMBOLS.map(symbol=>resolveMarket(symbol,options.fetchImpl)))).filter(Boolean);
  if(!resolved.length)return{ok:false,error:'xstock_registry_unavailable',window};
  const start=(slot*batch)%resolved.length,selected=Array.from({length:Math.min(batch,resolved.length)},(_,i)=>resolved[(start+i)%resolved.length]),results=[];
  for(const asset of selected){
    const fetched=await fetchMarketWindow(env,asset,window,options.fetchImpl);let accepted=0,routes=0;
    if(fetched.events.length){
      const byWallet=new Map();
      for(const event of fetched.events){if(!byWallet.has(event.wallet))byWallet.set(event.wallet,[]);byWallet.get(event.wallet).push(event);}
      for(const [wallet,events] of byWallet){
        const ingested=await ingestDecodedObservations(env,wallet,events,{windowKey:`afterbell:${window.from}:${window.to}`,bucketSeconds:300});
        accepted+=n(ingested.accepted);routes+=await persistAfterbellRoutes(db,events);
      }
    }
    results.push({symbol:asset.symbol,mint:asset.mint,pairAddress:asset.pairAddress,dexId:asset.dexId,transactions:n(fetched.transactions),decoded:fetched.events.length,accepted,routes,error:fetched.error});
  }
  const total=results.reduce((sum,row)=>sum+row.accepted,0),allFailed=results.length>0&&results.every(row=>row.error),someFailed=results.some(row=>row.error),state=allFailed?'error':someFailed?'partial':'ok';
  await db.prepare(`INSERT INTO intelligence_source_health(source,source_kind,state,last_ok_at,last_error_at,details_json,updated_at) VALUES('afterbell-xstock-history','archive-rpc',?,CASE WHEN ?='ok' THEN unixepoch() ELSE NULL END,CASE WHEN ?='error' THEN unixepoch() ELSE NULL END,?,unixepoch()) ON CONFLICT(source) DO UPDATE SET state=excluded.state,last_ok_at=COALESCE(excluded.last_ok_at,last_ok_at),last_error_at=COALESCE(excluded.last_error_at,last_error_at),details_json=excluded.details_json,updated_at=unixepoch()`).bind(state,state,state,JSON.stringify({window,selected:results,totalAccepted:total})).run();
  return{ok:!allFailed,window,resolved:resolved.length,processed:results.length,totalAccepted:total,results};
}
export const __afterbellEvidenceContract=Object.freeze({readOnly:true,maxAssetsPerRun:2,defaultAssetsPerRun:1,archiveLimitPerAsset:100,heliusCreditsPerAsset:100,queriesPoolAddress:true,signerOnly:true,persistsExactCounterLeg:true,maxSupportedTransactionVersion:1,syntheticTrades:false});
