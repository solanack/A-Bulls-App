/* Demand-driven Replay market hydration.
 * Public Replay reads stay cache-first: this module runs only from waitUntil after an
 * empty indexed OHLC read, fetches one exact Solana base/quote pool from GeckoTerminal,
 * and persists source-labeled candles for the next Replay poll. No price path is inferred.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';

const ADDRESS_RE=/^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const PROVIDER='geckoterminal';
const LEASE_SECONDS=45;
const EMPTY_COOLDOWN_SECONDS=300;
const ERROR_COOLDOWN_SECONDS=60;
const s=value=>String(value==null?'':value).trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finitePositive=value=>{const out=Number(value);return Number.isFinite(out)&&out>0?out:null;};
const nowSec=()=>Math.floor(Date.now()/1000);
const jsonHeaders={accept:'application/json;version=20230203','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)'};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function relationAddress(value){const id=s(value);return id.startsWith('solana_')?id.slice('solana_'.length):id;}
function leaseKey({mint,quoteMint,bucketSeconds,from,to}){return `replay-market:v1:${s(mint)}:${s(quoteMint)}:${Math.trunc(n(bucketSeconds)||60)}:${Math.trunc(n(from))}:${Math.trunc(n(to))}`;}
function candleSpec(bucketSeconds){const seconds=Math.max(60,Math.trunc(n(bucketSeconds)||60));if(seconds===60)return{timeframe:'minute',aggregate:1,bucketSeconds:60};if(seconds===300)return{timeframe:'minute',aggregate:5,bucketSeconds:300};if(seconds===900)return{timeframe:'minute',aggregate:15,bucketSeconds:900};if(seconds===3600)return{timeframe:'hour',aggregate:1,bucketSeconds:3600};if(seconds===14400)return{timeframe:'hour',aggregate:4,bucketSeconds:14400};if(seconds===43200)return{timeframe:'hour',aggregate:12,bucketSeconds:43200};if(seconds===86400)return{timeframe:'day',aggregate:1,bucketSeconds:86400};return null;}
async function first(stmt){try{return await stmt.first();}catch{return null;}}

export function chooseExactReplayPool(payload={},mint='',quoteMint=''){
  const wantedMint=s(mint),wantedQuote=s(quoteMint),rows=Array.isArray(payload?.data)?payload.data:[];
  for(const row of rows){const base=relationAddress(row?.relationships?.base_token?.data?.id),quote=relationAddress(row?.relationships?.quote_token?.data?.id);if(!base||!quote)continue;if(!((base===wantedMint&&quote===wantedQuote)||(base===wantedQuote&&quote===wantedMint)))continue;const address=s(row?.attributes?.address)||relationAddress(row?.id);if(ADDRESS_RE.test(address))return Object.freeze({address,base,quote});}
  return null;
}

export function normalizeGeckoOhlcvRows(list=[],bucketSeconds=60,from=0,to=Number.MAX_SAFE_INTEGER){
  const rows=Array.isArray(list)?list:[],normalized=[];
  for(const item of rows){if(!Array.isArray(item)||item.length<5)continue;const timestamp=Math.trunc(n(item[0])),open=finitePositive(item[1]),high=finitePositive(item[2]),low=finitePositive(item[3]),close=finitePositive(item[4]);if(timestamp<from||timestamp>to||open==null||high==null||low==null||close==null)continue;normalized.push(Object.freeze({bucket_start:timestamp,bucket_seconds:bucketSeconds,open,high,low,close}));}
  const byBucket=new Map();for(const row of normalized)byBucket.set(row.bucket_start,row);return Object.freeze([...byBucket.values()].sort((a,b)=>a.bucket_start-b.bucket_start));
}

async function leaseRow(db,key){return first(db.prepare(`SELECT lease_until,last_state,last_error,updated_at FROM intelligence_scheduler_leases WHERE lease_key=? LIMIT 1`).bind(key));}
async function markLease(db,key,state,error=null,{leaseUntil=0,startedAt=null,completedAt=null}={}){await db.prepare(`INSERT INTO intelligence_scheduler_leases(lease_key,lease_until,last_started_at,last_completed_at,last_state,last_error,run_count,updated_at) VALUES(?,?,?,?,?,?,1,unixepoch()) ON CONFLICT(lease_key) DO UPDATE SET lease_until=excluded.lease_until,last_started_at=COALESCE(excluded.last_started_at,last_started_at),last_completed_at=COALESCE(excluded.last_completed_at,last_completed_at),last_state=excluded.last_state,last_error=excluded.last_error,run_count=CASE WHEN excluded.last_state='running' THEN run_count+1 ELSE run_count END,updated_at=unixepoch()`).bind(key,leaseUntil,startedAt,completedAt,state,error).run();}

export async function replayMarketHydrationState(env={},input={}){
  const mint=s(input.mint),quoteMint=s(input.quoteMint),bucketSeconds=Math.trunc(n(input.bucketSeconds)||60),from=Math.trunc(n(input.from)),to=Math.trunc(n(input.to)),candleCount=Math.max(0,Math.trunc(n(input.candleCount)));
  if(candleCount>0)return Object.freeze({provider:PROVIDER,needed:false,requested:false,pending:false,state:'ready',disclosure:'Indexed OHLC is ready for Replay.'});
  if(!ADDRESS_RE.test(mint)||!ADDRESS_RE.test(quoteMint)||!candleSpec(bucketSeconds))return Object.freeze({provider:PROVIDER,needed:false,requested:false,pending:false,state:'not-required',disclosure:'Replay market hydration requires a supported Solana base/quote pair and candle bucket.'});
  const db=intelligenceDb(env);if(!db)return Object.freeze({provider:PROVIDER,needed:true,requested:false,pending:false,state:'unavailable',disclosure:'Market candle cache is unavailable; no price path was invented.'});
  const now=nowSec(),row=await leaseRow(db,leaseKey({mint,quoteMint,bucketSeconds,from,to})),state=s(row?.last_state),updated=Math.trunc(n(row?.updated_at)),leaseUntil=Math.trunc(n(row?.lease_until));
  if(state==='running'&&leaseUntil>now)return Object.freeze({provider:PROVIDER,needed:true,requested:false,pending:true,state:'running',disclosure:'Historical market candles are being indexed for this Replay and will appear automatically.'});
  if(state==='empty'&&updated&&now-updated<EMPTY_COOLDOWN_SECONDS)return Object.freeze({provider:PROVIDER,needed:true,requested:false,pending:false,state:'unavailable',reason:s(row?.last_error)||'no_exact_quote_market',disclosure:'No exact source-labeled OHLC market was available for this base/quote selection. No chart path was invented.'});
  if(state==='error'&&updated&&now-updated<ERROR_COOLDOWN_SECONDS)return Object.freeze({provider:PROVIDER,needed:true,requested:false,pending:false,state:'unavailable',reason:s(row?.last_error)||'market_source_error',disclosure:'Historical market hydration is temporarily unavailable. Replay receipts remain authoritative.'});
  return Object.freeze({provider:PROVIDER,needed:true,requested:true,pending:true,state:'queued',disclosure:'Historical market candles were queued automatically for this Replay.'});
}

async function fetchJson(url,fetchImpl,maxAttempts=2){
  let lastStatus=0;
  for(let attempt=0;attempt<Math.max(1,maxAttempts);attempt+=1){
    const response=await fetchImpl(url,{headers:jsonHeaders});
    lastStatus=response?.status||0;
    if(response?.ok){const payload=await response.json();if(!payload||typeof payload!=='object')throw new Error('geckoterminal_invalid_response');return payload;}
    const retryable=lastStatus===429||lastStatus>=500;
    if(!retryable||attempt+1>=maxAttempts)throw new Error(`geckoterminal_http_${lastStatus}`);
    await sleep(200*(attempt+1));
  }
  throw new Error(`geckoterminal_http_${lastStatus}`);
}

export async function discoverExactReplayPool(env={},mint='',quoteMint='',{fetchImpl=providerFetch}={}){
  const pages=Math.max(1,Math.min(5,Math.trunc(n(env.REPLAY_MARKET_POOL_PAGES)||3));
  for(let page=1;page<=pages;page+=1){
    const poolsUrl=`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/pools?include=base_token,quote_token&page=${page}`;
    const payload=await fetchJson(poolsUrl,fetchImpl);
    const pool=chooseExactReplayPool(payload,mint,quoteMint);
    if(pool)return pool;
    if(!Array.isArray(payload?.data)||payload.data.length===0)break;
  }
  return null;
}

export async function hydrateReplayMarketCandles(env={},input={}, {fetchImpl=providerFetch}={}){
  const db=intelligenceDb(env);if(!db)return{ok:false,state:'unavailable',error:'intelligence_db_unavailable'};
  const mint=s(input.mint),quoteMint=s(input.quoteMint),from=Math.max(0,Math.trunc(n(input.from))),to=Math.max(from,Math.trunc(n(input.to))),requestedBucket=Math.trunc(n(input.bucketSeconds)||60),spec=candleSpec(requestedBucket);
  if(!ADDRESS_RE.test(mint)||!ADDRESS_RE.test(quoteMint)||!spec)return{ok:false,state:'unavailable',error:'invalid_replay_market_subject'};
  const key=leaseKey({mint,quoteMint,bucketSeconds:requestedBucket,from,to}),now=nowSec(),existing=await leaseRow(db,key);if(s(existing?.last_state)==='running'&&n(existing?.lease_until)>now)return{ok:true,state:'running',deduped:true};
  await markLease(db,key,'running',null,{leaseUntil:now+LEASE_SECONDS,startedAt:now});
  try{
    const indexed=await first(db.prepare(`SELECT COUNT(*) count FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ?`).bind(mint,quoteMint,spec.bucketSeconds,from,to));if(n(indexed?.count)>0){await markLease(db,key,'complete',null,{completedAt:nowSec()});return{ok:true,state:'ready',candles:Math.trunc(n(indexed.count)),source:'indexed'};}
    const pool=await discoverExactReplayPool(env,mint,quoteMint,{fetchImpl});
    if(!pool){await markLease(db,key,'empty','no_exact_quote_pool',{completedAt:nowSec()});return{ok:true,state:'unavailable',candles:0,reason:'no_exact_quote_pool'};}
    const wanted=Math.max(1,Math.ceil((to-from)/spec.bucketSeconds)+2),maxPages=Math.min(3,Math.max(1,Math.ceil(wanted/1000)));let cursor=to+spec.bucketSeconds,rows=[];
    for(let page=0;page<maxPages;page++){
      const url=`https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pool.address)}/ohlcv/${spec.timeframe}?aggregate=${spec.aggregate}&before_timestamp=${Math.trunc(cursor)}&limit=1000&currency=token&token=${encodeURIComponent(mint)}`,payload=await fetchJson(url,fetchImpl),list=payload?.data?.attributes?.ohlcv_list,normalized=normalizeGeckoOhlcvRows(list,spec.bucketSeconds,from,to);rows.push(...normalized);const raw=Array.isArray(list)?list:[],timestamps=raw.map(item=>Array.isArray(item)?Math.trunc(n(item[0])):0).filter(Boolean);if(!timestamps.length)break;const earliest=Math.min(...timestamps);if(earliest<=from)break;cursor=earliest-1;
    }
    const byBucket=new Map();for(const row of rows)byBucket.set(row.bucket_start,row);rows=[...byBucket.values()].sort((a,b)=>a.bucket_start-b.bucket_start);
    if(!rows.length){await markLease(db,key,'empty','no_ohlcv_rows_in_window',{completedAt:nowSec()});return{ok:true,state:'unavailable',candles:0,reason:'no_ohlcv_rows_in_window'};}
    const source=JSON.stringify([`${PROVIDER}:${pool.address}`]),statements=rows.map(row=>db.prepare(`INSERT INTO intelligence_price_candles(mint,quote_mint,bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json,updated_at) VALUES(?,?,?,?,?,?,?,?,0,0,0,0,0.85,?,unixepoch()) ON CONFLICT(mint,quote_mint,bucket_start,bucket_seconds) DO UPDATE SET open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,confidence=MAX(confidence,excluded.confidence),source_set_json=excluded.source_set_json,updated_at=unixepoch()`).bind(mint,quoteMint,row.bucket_start,row.bucket_seconds,row.open,row.high,row.low,row.close,source));
    for(let index=0;index<statements.length;index+=50)await db.batch(statements.slice(index,index+50));
    await markLease(db,key,'complete',null,{completedAt:nowSec()});return{ok:true,state:'ready',candles:rows.length,source:PROVIDER,pool:pool.address};
  }catch(error){const code=s(error?.message||error)||'market_hydration_failed';await markLease(db,key,'error',code,{completedAt:nowSec()}).catch(()=>null);return{ok:false,state:'unavailable',error:code};}
}