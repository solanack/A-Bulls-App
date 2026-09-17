/* A Bulls App — History Engine
 * Progressive public-wallet backfill over Solana JSON-RPC, with a bounded Helius
 * archival fast path for requested Replay windows when the configured key supports it.
 * All observations remain source-labeled and read-only.
 */

import { ingestDecodedObservations, intelligenceDb } from './intelligence-indexer.mjs';
import { reserveProviderCredits } from './intelligence-provider-budget.mjs';

const WALLET_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PUBLIC_RPC='https://api.mainnet-beta.solana.com';
const MAX_PAGE=50,MAX_TX=25,TX_CONCURRENCY=5;
const HELIUS_WINDOW_CREDITS=100;
const HELIUS_CURSOR_PREFIX='gtfa:';
const DEFAULT_HISTORY_RPC_TIMEOUT_MS=5000;
const MIN_HISTORY_RPC_TIMEOUT_MS=1000;
const MAX_HISTORY_RPC_TIMEOUT_MS=15000;
const s=v=>String(v==null?'':v).trim();
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const finite=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const now=()=>Math.floor(Date.now()/1000);
const BASE58_ALPHABET='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_INDEX=new Map([...BASE58_ALPHABET].map((char,index)=>[char,index]));

export function isValidHistorySolanaPublicKey(address=''){
  const value=s(address);if(!WALLET_RE.test(value))return false;let decoded=0n;
  for(const char of value){const digit=BASE58_INDEX.get(char);if(digit==null)return false;decoded=decoded*58n+BigInt(digit);}
  let significantBytes=0;for(let cursor=decoded;cursor>0n;cursor>>=8n)significantBytes++;let leadingZeroBytes=0;while(leadingZeroBytes<value.length&&value[leadingZeroBytes]==='1')leadingZeroBytes++;
  return leadingZeroBytes+significantBytes===32;
}


export function historyRpcTimeoutMs(env={},options={}){
  const configured=n(options.rpcTimeoutMs??env.INTELLIGENCE_HISTORY_RPC_TIMEOUT_MS??DEFAULT_HISTORY_RPC_TIMEOUT_MS);
  return Math.max(MIN_HISTORY_RPC_TIMEOUT_MS,Math.min(MAX_HISTORY_RPC_TIMEOUT_MS,Math.trunc(configured)||DEFAULT_HISTORY_RPC_TIMEOUT_MS));
}

export function resolveHistoryRpc(env={}){
  const explicit=s(env.INTELLIGENCE_RPC_URL||env.SOLANA_RPC_URL);
  if(explicit)return{name:'configured-rpc',kind:'rpc',url:explicit};
  const key=s(env.HELIUS_API_KEY);
  if(key)return{name:'helius-standard-rpc',kind:'rpc',url:`https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(key)}`};
  const allowPublic=['1','true','yes','on'].includes(s(env.INTELLIGENCE_ALLOW_PUBLIC_RPC_FALLBACK).toLowerCase());
  return allowPublic?{name:'solana-public-rpc',kind:'rpc',url:PUBLIC_RPC}:{name:'history-rpc-unavailable',kind:'unavailable',url:''};
}

export async function historyRpcRequest(source,method,params,{fetchImpl=fetch,timeoutMs=DEFAULT_HISTORY_RPC_TIMEOUT_MS}={}){
  const bounded=Math.max(MIN_HISTORY_RPC_TIMEOUT_MS,Math.min(MAX_HISTORY_RPC_TIMEOUT_MS,Math.trunc(n(timeoutMs))||DEFAULT_HISTORY_RPC_TIMEOUT_MS)),started=Date.now(),controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),bounded);
  try{
    const r=await fetchImpl(source.url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:controller.signal});
    if(!r.ok)throw new Error(`${source.name}:${method}:http_${r.status}`);
    const j=await r.json();if(j?.error)throw new Error(`${source.name}:${method}:${j.error.code||'rpc'}:${s(j.error.message)}`);
    return{result:j?.result,latencyMs:Date.now()-started};
  }catch(error){
    if(controller.signal.aborted||error?.name==='AbortError'||error?.name==='TimeoutError')throw new Error(`${source.name}:${method}:timeout_${bounded}`);
    const message=s(error?.message||error)||'fetch_failed';
    if(message.startsWith(`${source.name}:${method}:`))throw error;
    throw new Error(`${source.name}:${method}:network:${message}`);
  }finally{clearTimeout(timer)}
}

async function mapLimit(items,limit,fn){
  const out=new Array(items.length);let cursor=0;
  async function worker(){while(true){const i=cursor++;if(i>=items.length)return;out[i]=await fn(items[i],i)}}
  await Promise.all(Array.from({length:Math.min(limit,items.length)},()=>worker()));return out;
}
function accountKeys(tx={}){return(tx?.transaction?.message?.accountKeys||[]).map(k=>typeof k==='string'?k:s(k?.pubkey))}
function tokenDeltas(meta={},wallet=''){
  const map=new Map();
  for(const row of meta.preTokenBalances||[]){if(s(row.owner)!==wallet)continue;const key=`${n(row.accountIndex)}|${s(row.mint)}`;map.set(key,{mint:s(row.mint),pre:n(row.uiTokenAmount?.uiAmountString??row.uiTokenAmount?.uiAmount),post:0})}
  for(const row of meta.postTokenBalances||[]){if(s(row.owner)!==wallet)continue;const key=`${n(row.accountIndex)}|${s(row.mint)}`;const cur=map.get(key)||{mint:s(row.mint),pre:0,post:0};cur.post=n(row.uiTokenAmount?.uiAmountString??row.uiTokenAmount?.uiAmount);map.set(key,cur)}
  return[...map.values()].map(x=>({...x,delta:x.post-x.pre})).filter(x=>x.delta!==0);
}
export function decodeRpcWalletTx(sigRow,tx,wallet,source='rpc'){
  if(!tx)return[];const keys=accountKeys(tx),idx=keys.indexOf(wallet),meta=tx.meta||{};
  const feeLamports=n(meta.fee),solDelta=idx>=0?(n(meta.postBalances?.[idx])-n(meta.preBalances?.[idx]))/1e9:0,deltas=tokenDeltas(meta,wallet),signature=s(sigRow?.signature||tx.transaction?.signatures?.[0]),slot=n(tx.slot||sigRow?.slot),blockTime=n(tx.blockTime||sigRow?.blockTime),failed=Boolean(meta.err||sigRow?.err);
  if(!deltas.length)return[{signature,slot,blockTime,wallet,eventClass:'transfer',solDelta,tokenDelta:0,feeLamports,source,confidence:failed?0:0.7,decoderVersion:'intelligence-history-rpc-v3'}];
  const hasIn=deltas.some(x=>x.delta>0),hasOut=deltas.some(x=>x.delta<0),feeAdjustedSol=solDelta+(idx===0?feeLamports/1e9:0),singleTokenNativeSwap=deltas.length===1&&Math.abs(feeAdjustedSol)>1e-7&&((deltas[0].delta>0&&feeAdjustedSol<0)||(deltas[0].delta<0&&feeAdjustedSol>0)),swapLike=(hasIn&&hasOut)||singleTokenNativeSwap;
  return deltas.map(x=>({signature,slot,blockTime,wallet,mint:x.mint,eventClass:swapLike?'swap-like':'transfer',solDelta,tokenDelta:x.delta,feeLamports,source,confidence:failed?0:(swapLike?0.82:0.8),decoderVersion:'intelligence-history-rpc-v3'}));
}
async function sourceHealth(db,source,state,latencyMs=null,error=''){
  await db.prepare(`INSERT INTO intelligence_source_health(source,source_kind,state,last_ok_at,last_error_at,latency_ms,details_json,updated_at) VALUES(?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(source) DO UPDATE SET source_kind=excluded.source_kind,state=excluded.state,last_ok_at=CASE WHEN excluded.state='ok' THEN excluded.last_ok_at ELSE last_ok_at END,last_error_at=CASE WHEN excluded.state='error' THEN excluded.last_error_at ELSE last_error_at END,latency_ms=excluded.latency_ms,details_json=excluded.details_json,updated_at=unixepoch()`)
    .bind(source.name,source.kind,state,state==='ok'?now():null,state==='error'?now():null,latencyMs,JSON.stringify(error?{error}:{})).run();
}
async function upsertCoverage(db,wallet,source,sigs,accepted,complete,{completeToGenesis=complete,status=complete?'complete':'partial'}={}){
  const newest=sigs[0]||{},oldest=sigs[sigs.length-1]||{};
  await db.prepare(`INSERT INTO intelligence_index_coverage(wallet,newest_signature,oldest_signature,newest_slot,oldest_slot,newest_block_time,oldest_block_time,indexed_events,indexed_transactions,complete_to_genesis,status,source_set_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,unixepoch()) ON CONFLICT(wallet) DO UPDATE SET newest_signature=COALESCE(intelligence_index_coverage.newest_signature,excluded.newest_signature),oldest_signature=COALESCE(excluded.oldest_signature,intelligence_index_coverage.oldest_signature),newest_slot=MAX(COALESCE(intelligence_index_coverage.newest_slot,0),COALESCE(excluded.newest_slot,0)),oldest_slot=CASE WHEN intelligence_index_coverage.oldest_slot IS NULL THEN excluded.oldest_slot WHEN excluded.oldest_slot IS NULL THEN intelligence_index_coverage.oldest_slot ELSE MIN(intelligence_index_coverage.oldest_slot,excluded.oldest_slot) END,newest_block_time=MAX(COALESCE(intelligence_index_coverage.newest_block_time,0),COALESCE(excluded.newest_block_time,0)),oldest_block_time=CASE WHEN intelligence_index_coverage.oldest_block_time IS NULL THEN excluded.oldest_block_time WHEN excluded.oldest_block_time IS NULL THEN intelligence_index_coverage.oldest_block_time ELSE MIN(intelligence_index_coverage.oldest_block_time,excluded.oldest_block_time) END,indexed_events=intelligence_index_coverage.indexed_events+excluded.indexed_events,indexed_transactions=intelligence_index_coverage.indexed_transactions+excluded.indexed_transactions,complete_to_genesis=MAX(intelligence_index_coverage.complete_to_genesis,excluded.complete_to_genesis),status=CASE WHEN intelligence_index_coverage.complete_to_genesis=1 THEN 'complete' ELSE excluded.status END,source_set_json=excluded.source_set_json,updated_at=unixepoch()`)
    .bind(wallet,s(newest.signature)||null,s(oldest.signature)||null,n(newest.slot)||null,n(oldest.slot)||null,n(newest.blockTime)||null,n(oldest.blockTime)||null,accepted,sigs.length,completeToGenesis?1:0,status,JSON.stringify([source.name])).run();
}
async function provenance(db,wallet,source,rows){for(const row of rows){if(!row.sig?.signature)continue;await db.prepare(`INSERT INTO intelligence_event_provenance(signature,wallet,source,source_kind,observed_at,slot,commitment,verified) VALUES(?,?,?,?,unixepoch(),?,'confirmed',?) ON CONFLICT(signature,wallet,source) DO UPDATE SET observed_at=unixepoch(),slot=excluded.slot,verified=MAX(verified,excluded.verified)`).bind(row.sig.signature,wallet,source.name,source.kind,n(row.sig.slot)||null,row.tx?1:0).run()}}

function heliusSource(source={}){return s(source.name)==='helius-standard-rpc'||s(source.url).includes('helius-rpc.com')}
export function heliusWindowCursor(value=''){const cursor=s(value);return cursor.startsWith(HELIUS_CURSOR_PREFIX)?cursor.slice(HELIUS_CURSOR_PREFIX.length):'';}
export function buildHeliusWindowConfig({from,to,paginationToken='',limit=100}={}){
  const fromSec=finite(from),toSec=finite(to);if(fromSec==null||toSec==null)return null;
  const low=Math.max(0,Math.trunc(Math.min(fromSec,toSec))),high=Math.max(low,Math.trunc(Math.max(fromSec,toSec)));
  const config={transactionDetails:'full',encoding:'jsonParsed',maxSupportedTransactionVersion:0,sortOrder:'asc',commitment:'confirmed',limit:Math.max(1,Math.min(100,Math.trunc(n(limit)||100))),filters:{blockTime:{gte:low,lte:high},status:'succeeded',tokenAccounts:'balanceChanged'}};
  if(s(paginationToken))config.paginationToken=s(paginationToken);
  return config;
}
function normalizeHeliusFullRows(result={}){
  const data=Array.isArray(result?.data)?result.data:[];
  return data.map(tx=>({sig:{signature:s(tx?.transaction?.signatures?.[0]),slot:n(tx?.slot),blockTime:n(tx?.blockTime),err:tx?.meta?.err??null},tx})).filter(row=>row.sig.signature);
}
async function backfillHeliusWindowPass(env,wallet,source,options,db){
  const config=buildHeliusWindowConfig({from:options.from,to:options.to,paginationToken:heliusWindowCursor(options.before),limit:env.HELIUS_HISTORY_WINDOW_LIMIT||100});
  if(!config)throw new Error('helius_window_unbounded');
  const reservation=await reserveProviderCredits(env,Math.max(1,Math.trunc(n(env.HELIUS_HISTORY_WINDOW_CREDITS)||HELIUS_WINDOW_CREDITS)),'helius');
  if(reservation.blocked)throw new Error('provider_budget_blocked');
  const response=await historyRpcRequest(source,'getTransactionsForAddress',[s(wallet),config],{fetchImpl:options.fetchImpl,timeoutMs:historyRpcTimeoutMs(env,options)}),result=response.result||{},txRows=normalizeHeliusFullRows(result),sigs=txRows.map(row=>row.sig);
  const decoded=txRows.flatMap(row=>decodeRpcWalletTx(row.sig,row.tx,s(wallet),'helius-getTransactionsForAddress')),
    ingested=await ingestDecodedObservations(env,s(wallet),decoded,{windowKey:`helius-window:${Math.trunc(n(options.from))}:${Math.trunc(n(options.to))}`}),
    paginationToken=s(result.paginationToken),complete=!paginationToken,nextCursor=complete?null:`${HELIUS_CURSOR_PREFIX}${paginationToken}`,
    evidenceSource={...source,name:'helius-getTransactionsForAddress',kind:'archive-rpc'};
  await provenance(db,s(wallet),evidenceSource,txRows);
  await upsertCoverage(db,s(wallet),evidenceSource,sigs,ingested.accepted,complete,{completeToGenesis:false,status:complete?'bounded-window-complete':'bounded-window-partial'});
  await sourceHealth(db,evidenceSource,'ok',response.latencyMs);
  return{ok:true,wallet:s(wallet),source:evidenceSource.name,signatures:sigs.length,transactionsFetched:txRows.length,acceptedEvents:ingested.accepted,complete,nextCursor,state:complete?'complete-window':'partial-window',boundedWindow:true};
}

export async function backfillHistoryPass(env,wallet,options={}){
  if(!isValidHistorySolanaPublicKey(wallet))throw new Error('invalid_public_wallet');
  const db=intelligenceDb(env);if(!db)throw new Error('Intelligence database binding is unavailable.');
  const source=options.source||resolveHistoryRpc(env),from=finite(options.from),to=finite(options.to),timeoutMs=historyRpcTimeoutMs(env,options);
  if(!s(source?.url))throw new Error('history_rpc_unconfigured');

  if(heliusSource(source)&&from!=null&&to!=null){
    try{return await backfillHeliusWindowPass(env,wallet,source,{...options,rpcTimeoutMs:timeoutMs},db)}
    catch(error){
      await sourceHealth(db,{...source,name:'helius-getTransactionsForAddress',kind:'archive-rpc'},'error',null,s(error?.message)).catch(()=>null);
      // Keep the standard RPC adapter as a fail-closed repair path when the
      // account plan, provider, or archival method is temporarily unavailable.
    }
  }

  const pageSize=Math.max(1,Math.min(MAX_PAGE,Math.round(n(options.pageSize||25)))),cfg={limit:pageSize,commitment:'confirmed'};
  const before=s(options.before);if(before&&!before.startsWith(HELIUS_CURSOR_PREFIX))cfg.before=before;
  try{
    if(source.name==='helius-standard-rpc'){
      const reservation=await reserveProviderCredits(env,1+Math.min(pageSize,MAX_TX),'helius');
      if(reservation.blocked)throw new Error('provider_budget_blocked');
    }
    const sigResult=await historyRpcRequest(source,'getSignaturesForAddress',[s(wallet),cfg],{fetchImpl:options.fetchImpl,timeoutMs}),sigs=Array.isArray(sigResult.result)?sigResult.result:[];
    let txLatency=0;
    const txRows=await mapLimit(sigs.slice(0,MAX_TX),TX_CONCURRENCY,async sig=>{try{const tx=await historyRpcRequest(source,'getTransaction',[sig.signature,{commitment:'confirmed',maxSupportedTransactionVersion:0,encoding:'jsonParsed'}],{fetchImpl:options.fetchImpl,timeoutMs});txLatency+=tx.latencyMs;return{sig,tx:tx.result}}catch(error){return{sig,tx:null,error:s(error?.message)}}});
    const decoded=txRows.flatMap(x=>decodeRpcWalletTx(x.sig,x.tx,s(wallet),source.name)),ingested=await ingestDecodedObservations(env,s(wallet),decoded,{windowKey:'progressive-history'}),nextCursor=s(sigs[sigs.length-1]?.signature),complete=sigs.length<pageSize||!nextCursor;
    await provenance(db,s(wallet),source,txRows);await upsertCoverage(db,s(wallet),source,sigs,ingested.accepted,complete);await sourceHealth(db,source,'ok',Math.round((sigResult.latencyMs+txLatency)/Math.max(1,1+txRows.length)));
    return{ok:true,wallet:s(wallet),source:source.name,signatures:sigs.length,transactionsFetched:txRows.filter(x=>x.tx).length,acceptedEvents:ingested.accepted,complete,nextCursor:complete?null:nextCursor,state:complete?'complete-history':'partial-history'};
  }catch(error){await sourceHealth(db,source,'error',null,s(error?.message)).catch(()=>null);throw error}
}