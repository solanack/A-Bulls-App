/* Demand-driven Replay market hydration.
 * Public Replay reads stay cache-first. Empty OHLC requests use authenticated
 * CoinGecko Onchain when configured, then public GeckoTerminal. Every request is
 * chain-qualified before provider lookup; no price path is inferred.
 */
import { intelligenceDb } from './intelligence-indexer.mjs';
import { providerFetch } from './intelligence-fetch.mjs';
import { canonicalChainAddress,normalizeChainKey,providerChainConfig,resolveChain,sameChainAddress } from './intelligence-chain-registry.mjs';

const PROVIDER='onchain-market';
const LEASE_SECONDS=60;
const EMPTY_COOLDOWN_SECONDS=300;
const ERROR_COOLDOWN_SECONDS=20;
const s=value=>String(value==null?'':value).trim();
const n=value=>Number.isFinite(Number(value))?Number(value):0;
const finitePositive=value=>{const out=Number(value);return Number.isFinite(out)&&out>0?out:null;};
const nowSec=()=>Math.floor(Date.now()/1000);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function relationAddress(value,network=''){
  const id=s(value),prefix=network?`${network}_`:'';
  if(prefix&&id.toLowerCase().startsWith(prefix.toLowerCase()))return id.slice(prefix.length);
  const underscore=id.indexOf('_');return underscore>0?id.slice(underscore+1):id;
}
function normalizeReplayIdentity(input={}){
  const chain=normalizeChainKey(input.chain??input.chainKey??input.network??'solana'),mint=canonicalChainAddress(chain,input.mint??input.token??''),quoteMint=canonicalChainAddress(chain,input.quoteMint??input.quote_mint??'');
  return{chain,mint,quoteMint};
}
function leaseKey({chain,mint,quoteMint,bucketSeconds,from,to}){return`replay-market:v4:${s(chain)}:${s(mint)}:${s(quoteMint)}:${Math.trunc(n(bucketSeconds)||60)}:${Math.trunc(n(from))}:${Math.trunc(n(to))}`;}
function candleSpec(bucketSeconds){const seconds=Math.max(60,Math.trunc(n(bucketSeconds)||60));if(seconds===60)return{timeframe:'minute',aggregate:1,bucketSeconds:60};if(seconds===300)return{timeframe:'minute',aggregate:5,bucketSeconds:300};if(seconds===900)return{timeframe:'minute',aggregate:15,bucketSeconds:900};if(seconds===3600)return{timeframe:'hour',aggregate:1,bucketSeconds:3600};if(seconds===14400)return{timeframe:'hour',aggregate:4,bucketSeconds:14400};if(seconds===43200)return{timeframe:'hour',aggregate:12,bucketSeconds:43200};if(seconds===86400)return{timeframe:'day',aggregate:1,bucketSeconds:86400};return null;}
async function first(stmt){try{return await stmt.first();}catch{return null;}}

export function exactReplayPools(payload={},mint='',quoteMint='',chain='solana',network='solana'){
  const chainKey=normalizeChainKey(chain),wantedMint=canonicalChainAddress(chainKey,mint),wantedQuote=canonicalChainAddress(chainKey,quoteMint),rows=Array.isArray(payload?.data)?payload.data:[],out=[],seen=new Set();
  if(!wantedMint||!wantedQuote)return Object.freeze([]);
  for(const row of rows){
    const baseRaw=relationAddress(row?.relationships?.base_token?.data?.id,network),quoteRaw=relationAddress(row?.relationships?.quote_token?.data?.id,network),base=canonicalChainAddress(chainKey,baseRaw),quote=canonicalChainAddress(chainKey,quoteRaw);
    if(!base||!quote||!((sameChainAddress(chainKey,base,wantedMint)&&sameChainAddress(chainKey,quote,wantedQuote))||(sameChainAddress(chainKey,base,wantedQuote)&&sameChainAddress(chainKey,quote,wantedMint))))continue;
    const address=canonicalChainAddress(chainKey,s(row?.attributes?.address)||relationAddress(row?.id,network));if(!address||seen.has(address))continue;
    seen.add(address);out.push(Object.freeze({address,base,quote}));
  }
  return Object.freeze(out);
}

export function chooseExactReplayPool(payload={},mint='',quoteMint='',chain='solana',network='solana'){return exactReplayPools(payload,mint,quoteMint,chain,network)[0]||null;}

export function normalizeGeckoOhlcvRows(list=[],bucketSeconds=60,from=0,to=Number.MAX_SAFE_INTEGER){
  const rows=Array.isArray(list)?list:[],normalized=[];
  for(const item of rows){if(!Array.isArray(item)||item.length<5)continue;const timestamp=Math.trunc(n(item[0])),open=finitePositive(item[1]),high=finitePositive(item[2]),low=finitePositive(item[3]),close=finitePositive(item[4]);if(timestamp<from||timestamp>to||open==null||high==null||low==null||close==null)continue;normalized.push(Object.freeze({bucket_start:timestamp,bucket_seconds:bucketSeconds,open,high,low,close}));}
  const byBucket=new Map();for(const row of normalized)byBucket.set(row.bucket_start,row);return Object.freeze([...byBucket.values()].sort((a,b)=>a.bucket_start-b.bucket_start));
}

async function leaseRow(db,key){return first(db.prepare(`SELECT lease_until,last_state,last_error,updated_at FROM intelligence_scheduler_leases WHERE lease_key=? LIMIT 1`).bind(key));}
async function markLease(db,key,state,error=null,{leaseUntil=0,startedAt=null,completedAt=null}={}){await db.prepare(`INSERT INTO intelligence_scheduler_leases(lease_key,lease_until,last_started_at,last_completed_at,last_state,last_error,run_count,updated_at) VALUES(?,?,?,?,?,?,1,unixepoch()) ON CONFLICT(lease_key) DO UPDATE SET lease_until=excluded.lease_until,last_started_at=COALESCE(excluded.last_started_at,last_started_at),last_completed_at=COALESCE(excluded.last_completed_at,last_completed_at),last_state=excluded.last_state,last_error=excluded.last_error,run_count=CASE WHEN excluded.last_state='running' THEN run_count+1 ELSE run_count END,updated_at=unixepoch()`).bind(key,leaseUntil,startedAt,completedAt,state,error).run();}

export async function replayMarketHydrationState(env={},input={}){
  const {chain,mint,quoteMint}=normalizeReplayIdentity(input),bucketSeconds=Math.trunc(n(input.bucketSeconds)||60),from=Math.trunc(n(input.from)),to=Math.trunc(n(input.to)),candleCount=Math.max(0,Math.trunc(n(input.candleCount)));
  if(candleCount>0)return Object.freeze({provider:PROVIDER,chain,needed:false,requested:false,pending:false,state:'ready',disclosure:'Indexed OHLC is ready for Replay.'});
  if(!mint||!quoteMint||!candleSpec(bucketSeconds))return Object.freeze({provider:PROVIDER,chain,needed:false,requested:false,pending:false,state:'not-required',disclosure:'Replay market hydration requires a supported chain-qualified base/quote pair and candle bucket.'});
  const db=intelligenceDb(env);if(!db)return Object.freeze({provider:PROVIDER,chain,needed:true,requested:false,pending:false,state:'unavailable',disclosure:'Market candle cache is unavailable; no price path was invented.'});
  const now=nowSec(),row=await leaseRow(db,leaseKey({chain,mint,quoteMint,bucketSeconds,from,to})),state=s(row?.last_state),updated=Math.trunc(n(row?.updated_at)),leaseUntil=Math.trunc(n(row?.lease_until));
  if(state==='running'&&leaseUntil>now)return Object.freeze({provider:PROVIDER,chain,needed:true,requested:false,pending:true,state:'running',disclosure:'Historical market candles are being indexed for this Replay and will appear automatically.'});
  if(state==='empty'&&updated&&now-updated<EMPTY_COOLDOWN_SECONDS)return Object.freeze({provider:PROVIDER,chain,needed:true,requested:false,pending:false,state:'unavailable',reason:s(row?.last_error)||'no_exact_quote_market',disclosure:'No exact source-labeled OHLC market was available for this base/quote selection. No chart path was invented.'});
  if(state==='error'&&updated&&now-updated<ERROR_COOLDOWN_SECONDS)return Object.freeze({provider:PROVIDER,chain,needed:true,requested:false,pending:false,state:'unavailable',reason:s(row?.last_error)||'market_source_error',disclosure:'Historical market hydration is temporarily unavailable. Replay receipts remain authoritative.'});
  return Object.freeze({provider:PROVIDER,chain,needed:true,requested:true,pending:true,state:'queued',disclosure:'Historical market candles were queued automatically for this Replay.'});
}

export function replayMarketProviders(env={}){
  const key=s(env.COINGECKO_API_KEY),mode=s(env.COINGECKO_API_MODE).toLowerCase(),providers=[];
  if(key&&mode!=='pro')providers.push(Object.freeze({name:'coingecko-demo-onchain',base:'https://api.coingecko.com/api/v3/onchain',headers:{'x-cg-demo-api-key':key}}));
  if(key&&mode!=='demo')providers.push(Object.freeze({name:'coingecko-pro-onchain',base:'https://pro-api.coingecko.com/api/v3/onchain',headers:{'x-cg-pro-api-key':key}}));
  providers.push(Object.freeze({name:'geckoterminal-public',base:'https://api.geckoterminal.com/api/v2',headers:{}}));
  return Object.freeze(providers);
}

function retryDelay(response,attempt){const raw=s(response?.headers?.get?.('retry-after')),seconds=Number(raw);if(Number.isFinite(seconds)&&seconds>0)return Math.min(4000,Math.max(25,seconds*1000));return Math.min(2500,700*(attempt+1));}

async function fetchMarketPath(env,path,fetchImpl=providerFetch,{preferredProvider=''}={}){
  const configured=[...replayMarketProviders(env)],preferred=s(preferredProvider),providers=preferred?[...configured.filter(item=>item.name===preferred),...configured.filter(item=>item.name!==preferred)]:configured,errors=[];
  for(const provider of providers){let lastStatus=0;for(let attempt=0;attempt<2;attempt+=1){const response=await fetchImpl(`${provider.base}${path}`,{headers:{accept:'application/json','user-agent':'A-Bulls-App/1.0 (+https://abullsapp.com)',...provider.headers}});lastStatus=response?.status||0;if(response?.ok){const payload=await response.json();if(!payload||typeof payload!=='object'){errors.push(`${provider.name}:invalid_response`);break;}return Object.freeze({payload,provider:provider.name});}const retryable=lastStatus===429||lastStatus>=500;if(retryable&&attempt===0){await sleep(retryDelay(response,attempt));continue;}errors.push(`${provider.name}:http_${lastStatus}`);break;}}
  throw new Error(`market_sources_exhausted:${errors.join(',')||'unknown'}`);
}

export async function discoverExactReplayPools(env={},mint='',quoteMint='',{fetchImpl=providerFetch,chain='solana'}={}){
  const chainKey=normalizeChainKey(chain),base=canonicalChainAddress(chainKey,mint),quote=canonicalChainAddress(chainKey,quoteMint),provider=providerChainConfig(chainKey,base||mint,env);if(!base||!quote||!provider)return Object.freeze([]);
  const pages=Math.max(1,Math.min(5,Math.trunc(n(env.REPLAY_MARKET_POOL_PAGES)||3))),candidateLimit=Math.max(1,Math.min(8,Math.trunc(n(env.REPLAY_MARKET_POOL_CANDIDATES)||4))),out=[],seen=new Set();
  for(const network of provider.geckoNetworks){let preferredProvider='';for(let page=1;page<=pages&&out.length<candidateLimit;page+=1){try{const path=`/networks/${encodeURIComponent(network)}/tokens/${encodeURIComponent(base)}/pools?include=base_token,quote_token&page=${page}`;const response=await fetchMarketPath(env,path,fetchImpl,{preferredProvider});preferredProvider=response.provider;for(const pool of exactReplayPools(response.payload,base,quote,chainKey,network)){if(seen.has(pool.address))continue;seen.add(pool.address);out.push(Object.freeze({...pool,provider:response.provider,network,chain:chainKey}));if(out.length>=candidateLimit)break;}if(!Array.isArray(response.payload?.data)||response.payload.data.length===0)break;}catch(error){if(out.length)break;if(page===1)break;}}if(out.length>=candidateLimit)break;}
  return Object.freeze(out);
}
export async function discoverExactReplayPool(env={},mint='',quoteMint='',options={}){return(await discoverExactReplayPools(env,mint,quoteMint,options))[0]||null;}

async function fetchPoolWindow(env,pool,mint,from,to,spec,fetchImpl){
  const chain=normalizeChainKey(pool.chain||'solana'),base=canonicalChainAddress(chain,mint);if(!base)return Object.freeze({rows:Object.freeze([]),provider:pool.provider,pool:pool.address,network:pool.network});
  const wanted=Math.max(1,Math.ceil((to-from)/spec.bucketSeconds)+2),maxPages=Math.min(3,Math.max(1,Math.ceil(wanted/1000)));let cursor=to+spec.bucketSeconds,rows=[],provider=pool.provider;
  for(let page=0;page<maxPages;page++){const path=`/networks/${encodeURIComponent(pool.network)}/pools/${encodeURIComponent(pool.address)}/ohlcv/${spec.timeframe}?aggregate=${spec.aggregate}&before_timestamp=${Math.trunc(cursor)}&limit=1000&currency=token&token=${encodeURIComponent(base)}`;const response=await fetchMarketPath(env,path,fetchImpl,{preferredProvider:provider});provider=response.provider;const list=response.payload?.data?.attributes?.ohlcv_list,normalized=normalizeGeckoOhlcvRows(list,spec.bucketSeconds,from,to);rows.push(...normalized);const raw=Array.isArray(list)?list:[],timestamps=raw.map(item=>Array.isArray(item)?Math.trunc(n(item[0])):0).filter(Boolean);if(!timestamps.length)break;const earliest=Math.min(...timestamps);if(earliest<=from)break;cursor=earliest-1;}
  const byBucket=new Map();for(const row of rows)byBucket.set(row.bucket_start,row);return Object.freeze({rows:Object.freeze([...byBucket.values()].sort((a,b)=>a.bucket_start-b.bucket_start)),provider,pool:pool.address,network:pool.network});
}

async function indexedCandleCount(db,chain,mint,quoteMint,spec,from,to){
  if(chain==='solana'){const legacy=await first(db.prepare(`SELECT COUNT(*) count FROM intelligence_price_candles WHERE mint=? AND quote_mint=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ?`).bind(mint,quoteMint,spec.bucketSeconds,from,to));if(n(legacy?.count)>0)return Math.trunc(n(legacy.count));}
  const row=await first(db.prepare(`SELECT COUNT(*) count FROM intelligence_price_candles_v2 WHERE chain_key=? AND asset_address=? AND quote_asset_address=? AND bucket_seconds=? AND bucket_start BETWEEN ? AND ?`).bind(chain,mint,quoteMint,spec.bucketSeconds,from,to));return Math.trunc(n(row?.count));
}

function v2CandleStatement(db,chain,mint,quoteMint,row,source){return db.prepare(`INSERT INTO intelligence_price_candles_v2(chain_key,asset_address,quote_asset_address,bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,0,0,0,0,0.85,?,unixepoch()) ON CONFLICT(chain_key,asset_address,quote_asset_address,bucket_start,bucket_seconds) DO UPDATE SET open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,confidence=MAX(confidence,excluded.confidence),source_set_json=excluded.source_set_json,updated_at=unixepoch()`).bind(chain,mint,quoteMint,row.bucket_start,row.bucket_seconds,row.open,row.high,row.low,row.close,source);}
function legacyCandleStatement(db,mint,quoteMint,row,source){return db.prepare(`INSERT INTO intelligence_price_candles(mint,quote_mint,bucket_start,bucket_seconds,open,high,low,close,volume_base,volume_quote,swap_count,wallet_count,confidence,source_set_json,updated_at) VALUES(?,?,?,?,?,?,?,?,0,0,0,0,0.85,?,unixepoch()) ON CONFLICT(mint,quote_mint,bucket_start,bucket_seconds) DO UPDATE SET open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,confidence=MAX(confidence,excluded.confidence),source_set_json=excluded.source_set_json,updated_at=unixepoch()`).bind(mint,quoteMint,row.bucket_start,row.bucket_seconds,row.open,row.high,row.low,row.close,source);}

export async function hydrateReplayMarketCandles(env={},input={}, {fetchImpl=providerFetch}={}){
  const db=intelligenceDb(env);if(!db)return{ok:false,state:'unavailable',error:'intelligence_db_unavailable'};
  const {chain,mint,quoteMint}=normalizeReplayIdentity(input),from=Math.max(0,Math.trunc(n(input.from))),to=Math.max(from,Math.trunc(n(input.to))),requestedBucket=Math.trunc(n(input.bucketSeconds)||60),spec=candleSpec(requestedBucket);
  if(!mint||!quoteMint||!spec)return{ok:false,state:'unavailable',error:'invalid_replay_market_subject'};
  const key=leaseKey({chain,mint,quoteMint,bucketSeconds:requestedBucket,from,to}),now=nowSec(),existing=await leaseRow(db,key);if(s(existing?.last_state)==='running'&&n(existing?.lease_until)>now)return{ok:true,state:'running',deduped:true,chain};
  await markLease(db,key,'running',null,{leaseUntil:now+LEASE_SECONDS,startedAt:now});
  try{
    const indexed=await indexedCandleCount(db,chain,mint,quoteMint,spec,from,to);if(indexed>0){await markLease(db,key,'complete',null,{completedAt:nowSec()});return{ok:true,state:'ready',chain,candles:indexed,source:'indexed'};}
    const pools=await discoverExactReplayPools(env,mint,quoteMint,{fetchImpl,chain});if(!pools.length){await markLease(db,key,'empty','no_exact_quote_pool',{completedAt:nowSec()});return{ok:true,state:'unavailable',chain,candles:0,reason:'no_exact_quote_pool'};}
    let selected=null;for(const pool of pools){const candidate=await fetchPoolWindow(env,pool,mint,from,to,spec,fetchImpl);if(candidate.rows.length){selected=candidate;break;}}
    if(!selected){await markLease(db,key,'empty',`no_ohlcv_rows_in_window:${pools.length}_exact_pools_checked`,{completedAt:nowSec()});return{ok:true,state:'unavailable',chain,candles:0,reason:'no_ohlcv_rows_in_window',poolsChecked:pools.length};}
    const source=JSON.stringify([`${selected.provider}:${selected.network}:${selected.pool}`]),statements=[];for(const row of selected.rows){statements.push(v2CandleStatement(db,chain,mint,quoteMint,row,source));if(chain==='solana')statements.push(legacyCandleStatement(db,mint,quoteMint,row,source));}
    for(let index=0;index<statements.length;index+=50)await db.batch(statements.slice(index,index+50));
    await markLease(db,key,'complete',null,{completedAt:nowSec()});return{ok:true,state:'ready',chain,candles:selected.rows.length,source:selected.provider,network:selected.network,pool:selected.pool,poolsChecked:pools.findIndex(pool=>pool.address===selected.pool)+1};
  }catch(error){const code=s(error?.message||error)||'market_hydration_failed';await markLease(db,key,'error',code,{completedAt:nowSec()}).catch(()=>null);return{ok:false,state:'unavailable',chain,error:code};}
}

export const __replayMarketHydrationContract=Object.freeze({chainQualified:true,legacySolanaDualWrite:true,providers:Object.freeze(['coingecko-onchain','geckoterminal-public']),noSyntheticCandles:true});
