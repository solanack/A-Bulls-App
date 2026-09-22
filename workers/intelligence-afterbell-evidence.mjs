import { intelligenceDb, ingestDecodedObservations } from './intelligence-indexer.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';
import { afterbellWindow } from './intelligence-afterbell-traders.mjs';

const SYMBOLS=Object.freeze(['AAPLx','NVDAx','TSLAx','MSFTx','AMZNx','SPYx','QQQx','CRCLx']);
const s=v=>String(v??'').trim(),n=v=>Number.isFinite(Number(v))?Number(v):0;
const valid=v=>/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s(v));
async function resolveMint(symbol,fetchImpl=fetch){
  const r=await fetchImpl(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(symbol)}`,{headers:{accept:'application/json'}});
  if(!r.ok)return null;const body=await r.json(),pairs=Array.isArray(body?.pairs)?body.pairs:[];
  const rows=pairs.filter(p=>s(p?.chainId).toLowerCase()==='solana'&&s(p?.baseToken?.symbol).toLowerCase()===symbol.toLowerCase()&&valid(p?.baseToken?.address))
    .sort((a,b)=>n(b?.liquidity?.usd)-n(a?.liquidity?.usd)||n(b?.volume?.h24)-n(a?.volume?.h24));
  return rows[0]?{symbol,mint:s(rows[0].baseToken.address)}:null;
}
export function afterbellOwnerDeltas(tx,mint){
  const pre=Array.isArray(tx?.meta?.preTokenBalances)?tx.meta.preTokenBalances:[],post=Array.isArray(tx?.meta?.postTokenBalances)?tx.meta.postTokenBalances:[],map=new Map();
  for(const row of pre){const owner=s(row.owner),m=s(row.mint);if(!valid(owner)||!valid(m))continue;const key=owner+'|'+m,cur=map.get(key)||{owner,mint:m,pre:0,post:0};cur.pre=n(row?.uiTokenAmount?.uiAmountString??row?.uiTokenAmount?.uiAmount);map.set(key,cur);}
  for(const row of post){const owner=s(row.owner),m=s(row.mint);if(!valid(owner)||!valid(m))continue;const key=owner+'|'+m,cur=map.get(key)||{owner,mint:m,pre:0,post:0};cur.post=n(row?.uiTokenAmount?.uiAmountString??row?.uiTokenAmount?.uiAmount);map.set(key,cur);}
  const all=[...map.values()].map(x=>({...x,delta:x.post-x.pre})).filter(x=>Math.abs(x.delta)>1e-12),byOwner=new Map();
  for(const row of all){if(!byOwner.has(row.owner))byOwner.set(row.owner,[]);byOwner.get(row.owner).push(row);}
  const out=[];for(const [owner,rows] of byOwner){const stock=rows.find(row=>row.mint===mint);if(!stock)continue;const opposite=rows.some(row=>row.mint!==mint&&Math.sign(row.delta)===-Math.sign(stock.delta));if(!opposite)continue;out.push({owner,delta:stock.delta});}return out;
}
async function fetchMintWindow(env,mint,window,fetchImpl=fetch){
  const key=s(env.HELIUS_API_KEY);if(!key)return{mint,error:'helius_unconfigured',events:[]};
  const budget=await reserveProviderCredits(env,100,'helius');if(budget.blocked)return{mint,error:'provider_budget_blocked',events:[]};
  const r=await fetchImpl(`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'getTransactionsForAddress',params:[mint,{transactionDetails:'full',encoding:'jsonParsed',maxSupportedTransactionVersion:0,sortOrder:'desc',commitment:'confirmed',limit:100,filters:{blockTime:{gte:window.from,lte:window.to},status:'succeeded',tokenAccounts:'balanceChanged'}}]})});
  if(!r.ok)return{mint,error:`helius_http_${r.status}`,events:[]};const body=await r.json(),data=Array.isArray(body?.result?.data)?body.result.data:[],events=[];
  for(const tx of data){const signature=s(tx?.transaction?.signatures?.[0]),blockTime=Math.trunc(n(tx?.blockTime)),slot=Math.trunc(n(tx?.slot));if(!signature||!blockTime)continue;for(const item of afterbellOwnerDeltas(tx,mint))events.push({signature,slot,blockTime,wallet:item.owner,mint,eventClass:'swap-like',solDelta:0,tokenDelta:item.delta,feeLamports:0,source:'helius-afterbell-mint-window',confidence:.9,decoderVersion:'afterbell-mint-window-v1'});}
  return{mint,error:null,events};
}
export async function refreshAfterbellEvidence(env={},options={}){
  const db=intelligenceDb(env);if(!db)return{ok:false,error:'database_unavailable'};const now=Math.trunc(n(options.nowMs)||Date.now()),slot=Math.floor(now/(15*60*1000)),batch=Math.max(1,Math.min(4,Math.trunc(n(options.batch)||3))),window=afterbellWindow(now),resolved=(await Promise.all(SYMBOLS.map(symbol=>resolveMint(symbol,options.fetchImpl)))).filter(Boolean);
  if(!resolved.length)return{ok:false,error:'xstock_registry_unavailable',window};
  const start=(slot*batch)%resolved.length,selected=Array.from({length:Math.min(batch,resolved.length)},(_,i)=>resolved[(start+i)%resolved.length]),results=[];
  for(const asset of selected){const fetched=await fetchMintWindow(env,asset.mint,window,options.fetchImpl);let accepted=0;if(fetched.events.length){const byWallet=new Map();for(const event of fetched.events){if(!byWallet.has(event.wallet))byWallet.set(event.wallet,[]);byWallet.get(event.wallet).push(event);}for(const [wallet,events] of byWallet){const ingested=await ingestDecodedObservations(env,wallet,events,{windowKey:`afterbell:${window.from}:${window.to}`,bucketSeconds:300});accepted+=n(ingested.accepted);}}results.push({symbol:asset.symbol,mint:asset.mint,decoded:fetched.events.length,accepted,error:fetched.error});}
  const total=results.reduce((sum,row)=>sum+row.accepted,0);await db.prepare(`INSERT INTO intelligence_source_health(source,source_kind,state,last_ok_at,last_error_at,details_json,updated_at) VALUES('afterbell-xstock-history','archive-rpc',?,CASE WHEN ?='ok' THEN unixepoch() ELSE NULL END,CASE WHEN ?='error' THEN unixepoch() ELSE NULL END,?,unixepoch()) ON CONFLICT(source) DO UPDATE SET state=excluded.state,last_ok_at=COALESCE(excluded.last_ok_at,last_ok_at),last_error_at=COALESCE(excluded.last_error_at,last_error_at),details_json=excluded.details_json,updated_at=unixepoch()`).bind(results.some(row=>row.error)?'partial':'ok',results.some(row=>row.error)?'partial':'ok',results.every(row=>row.error)?'error':'ok',JSON.stringify({window,selected:results,totalAccepted:total})).run();
  return{ok:true,window,resolved:resolved.length,processed:results.length,totalAccepted:total,results};
}
export const __afterbellEvidenceContract=Object.freeze({readOnly:true,maxAssetsPerRun:4,defaultAssetsPerRun:3,archiveLimitPerAsset:100,syntheticTrades:false});
